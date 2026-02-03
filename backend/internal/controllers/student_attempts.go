package controllers

import (
	"net/http"
	"sort"
	"time"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func attemptDeadline(attempt models.ExamAttempt, durationMinutes int) (time.Time, bool) {
	if durationMinutes <= 0 {
		return time.Time{}, false
	}
	if attempt.StartTime.IsZero() {
		return time.Time{}, false
	}
	return attempt.StartTime.Add(time.Duration(durationMinutes) * time.Minute), true
}

type attemptScore struct {
	score          float64
	correctTotal   int
	questionsTotal int
}

func computeAttemptScore(db *gorm.DB, attempt models.ExamAttempt) (attemptScore, []models.Question, error) {
	var questions []models.Question
	if err := db.Where("exam_id = ?", attempt.ExamID).Order("created_at asc").Find(&questions).Error; err != nil {
		return attemptScore{}, nil, err
	}

	questionIDs := make([]uuid.UUID, 0, len(questions))
	for _, q := range questions {
		questionIDs = append(questionIDs, q.ID)
	}

	correctSets := map[uuid.UUID]map[string]struct{}{}
	if len(questionIDs) > 0 {
		var choices []models.Choice
		if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
			return attemptScore{}, nil, err
		}
		for _, ch := range choices {
			if !ch.IsCorrect {
				continue
			}
			set := correctSets[ch.QuestionID]
			if set == nil {
				set = map[string]struct{}{}
				correctSets[ch.QuestionID] = set
			}
			set[ch.ID.String()] = struct{}{}
		}
	}

	answersByQuestion := map[uuid.UUID]models.StudentAnswer{}
	{
		var answers []models.StudentAnswer
		if err := db.Where("attempt_id = ?", attempt.ID).Find(&answers).Error; err != nil {
			return attemptScore{}, nil, err
		}
		for _, a := range answers {
			answersByQuestion[a.QuestionID] = a
		}
	}

	correctTotal := 0
	for _, q := range questions {
		ans := answersByQuestion[q.ID]
		if isAnswerCorrect(q.Type, correctSets[q.ID], []string(ans.SelectedChoiceIDs)) {
			correctTotal++
		}
	}

	score := 0.0
	if len(questions) > 0 {
		score = (float64(correctTotal) / float64(len(questions))) * 100.0
	}

	return attemptScore{score: score, correctTotal: correctTotal, questionsTotal: len(questions)}, questions, nil
}

func ensureEmptyAnswersExist(db *gorm.DB, attemptID uuid.UUID, questionIDs []uuid.UUID) error {
	if len(questionIDs) == 0 {
		return nil
	}

	var existing []models.StudentAnswer
	if err := db.Select("question_id").Where("attempt_id = ? AND question_id IN ?", attemptID, questionIDs).Find(&existing).Error; err != nil {
		return err
	}

	seen := map[uuid.UUID]struct{}{}
	for _, a := range existing {
		seen[a.QuestionID] = struct{}{}
	}

	for _, qid := range questionIDs {
		if _, ok := seen[qid]; ok {
			continue
		}
		ans := models.StudentAnswer{AttemptID: attemptID, QuestionID: qid, SelectedChoiceIDs: pq.StringArray{}, Flagged: false}
		if err := db.Create(&ans).Error; err != nil {
			return err
		}
	}

	return nil
}

func finalizeAttemptIfExpired(db *gorm.DB, attemptID uuid.UUID) (*models.ExamAttempt, *attemptScore, error) {
	tx := db.Begin()
	if tx.Error != nil {
		return nil, nil, tx.Error
	}
	defer func() { _ = tx.Rollback() }()

	var attempt models.ExamAttempt
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&attempt, "id = ?", attemptID).Error; err != nil {
		return nil, nil, err
	}

	var exam models.Exam
	if err := tx.Select("duration_minutes").First(&exam, "id = ?", attempt.ExamID).Error; err != nil {
		return nil, nil, err
	}

	deadline, hasDeadline := attemptDeadline(attempt, exam.DurationMinutes)
	expired := hasDeadline && time.Now().UTC().After(deadline)
	if !expired {
		if err := tx.Commit().Error; err != nil {
			return nil, nil, err
		}
		return &attempt, nil, nil
	}

	// If already submitted, just return (idempotent behavior).
	if attempt.Submitted {
		if err := tx.Commit().Error; err != nil {
			return nil, nil, err
		}
		return &attempt, nil, nil
	}

	sc, questions, err := computeAttemptScore(tx, attempt)
	if err != nil {
		return nil, nil, err
	}

	questionIDs := make([]uuid.UUID, 0, len(questions))
	for _, q := range questions {
		questionIDs = append(questionIDs, q.ID)
	}
	if err := ensureEmptyAnswersExist(tx, attempt.ID, questionIDs); err != nil {
		return nil, nil, err
	}

	end := time.Now().UTC()
	if hasDeadline {
		end = deadline
	}
	attempt.Submitted = true
	attempt.Score = sc.score
	attempt.EndTime = &end

	if err := tx.Save(&attempt).Error; err != nil {
		return nil, nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, nil, err
	}
	return &attempt, &sc, nil
}

type studentAttemptView struct {
	ID        uuid.UUID  `json:"id"`
	ExamID    uuid.UUID  `json:"examId"`
	StartTime time.Time  `json:"startTime"`
	EndTime   *time.Time `json:"endTime"`
	Score     float64    `json:"score"`
	Submitted bool       `json:"submitted"`
}

type studentExamView struct {
	ID               uuid.UUID `json:"id"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	DurationMinutes  int       `json:"durationMinutes"`
	QuestionsPerPage int       `json:"questionsPerPage"`
}

type studentChoiceView struct {
	ID    uuid.UUID `json:"id"`
	Text  string    `json:"text"`
	Order int       `json:"order"`
}

type studentQuestionView struct {
	ID                uuid.UUID           `json:"id"`
	Text              string              `json:"text"`
	Type              string              `json:"type"`
	Choices           []studentChoiceView `json:"choices"`
	SelectedChoiceIDs []string            `json:"selectedChoiceIds"`
	Flagged           bool                `json:"flagged"`
}

type studentAttemptDetailResponse struct {
	Attempt   studentAttemptView    `json:"attempt"`
	Exam      studentExamView       `json:"exam"`
	Questions []studentQuestionView `json:"questions"`
}

func isAttemptExpired(db *gorm.DB, attempt models.ExamAttempt) (bool, error) {
	var exam models.Exam
	if err := db.Select("duration_minutes").First(&exam, "id = ?", attempt.ExamID).Error; err != nil {
		return false, err
	}

	if exam.DurationMinutes <= 0 {
		return false, nil
	}
	if attempt.StartTime.IsZero() {
		return false, nil
	}

	deadline := attempt.StartTime.Add(time.Duration(exam.DurationMinutes) * time.Minute)
	return time.Now().UTC().After(deadline), nil
}

func StudentAttemptGet(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attemptID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid attempt id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var attempt models.ExamAttempt
		if err := db.First(&attempt, "id = ?", attemptID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "attempt not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt"})
			return
		}
		if attempt.StudentID != studentID {
			c.JSON(http.StatusForbidden, gin.H{"message": "forbidden"})
			return
		}

		// Server-side auto-submit when time is up.
		if !attempt.Submitted {
			if finalized, _, err := finalizeAttemptIfExpired(db, attempt.ID); err == nil && finalized != nil {
				attempt = *finalized
			}
		}

		var exam models.Exam
		if err := db.First(&exam, "id = ?", attempt.ExamID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exam"})
			return
		}

		var questions []models.Question
		if err := db.Where("exam_id = ?", exam.ID).Order("created_at asc").Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		questionIDs := make([]uuid.UUID, 0, len(questions))
		for _, q := range questions {
			questionIDs = append(questionIDs, q.ID)
		}

		choicesByQuestion := map[uuid.UUID][]models.Choice{}
		if len(questionIDs) > 0 {
			var choices []models.Choice
			if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				choicesByQuestion[ch.QuestionID] = append(choicesByQuestion[ch.QuestionID], ch)
			}
		}

		answersByQuestion := map[uuid.UUID]models.StudentAnswer{}
		{
			var answers []models.StudentAnswer
			if err := db.Where("attempt_id = ?", attempt.ID).Find(&answers).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answers"})
				return
			}
			for _, a := range answers {
				answersByQuestion[a.QuestionID] = a
			}
		}

		resp := studentAttemptDetailResponse{
			Attempt: studentAttemptView{
				ID:        attempt.ID,
				ExamID:    attempt.ExamID,
				StartTime: attempt.StartTime,
				EndTime:   attempt.EndTime,
				Score:     attempt.Score,
				Submitted: attempt.Submitted,
			},
			Exam: studentExamView{
				ID:               exam.ID,
				Title:            exam.Title,
				Description:      exam.Description,
				DurationMinutes:  exam.DurationMinutes,
				QuestionsPerPage: exam.QuestionsPerPage,
			},
		}

		for _, q := range questions {
			choices := choicesByQuestion[q.ID]
			sort.SliceStable(choices, func(i, j int) bool { return choices[i].Order < choices[j].Order })
			viewChoices := make([]studentChoiceView, 0, len(choices))
			for _, ch := range choices {
				viewChoices = append(viewChoices, studentChoiceView{ID: ch.ID, Text: ch.Text, Order: ch.Order})
			}
			ans := answersByQuestion[q.ID]
			resp.Questions = append(resp.Questions, studentQuestionView{
				ID:                q.ID,
				Text:              q.Text,
				Type:              q.Type,
				Choices:           viewChoices,
				SelectedChoiceIDs: []string(ans.SelectedChoiceIDs),
				Flagged:           ans.Flagged,
			})
		}

		c.JSON(http.StatusOK, resp)
	}
}

type studentAnswerUpdateRequest struct {
	QuestionID        uuid.UUID `json:"questionId"`
	SelectedChoiceIDs []string  `json:"selectedChoiceIds"`
}

func StudentAttemptAnswer(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attemptID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid attempt id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var req studentAnswerUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}
		if req.QuestionID == uuid.Nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "questionId is required"})
			return
		}

		var attempt models.ExamAttempt
		if err := db.First(&attempt, "id = ?", attemptID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "attempt not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt"})
			return
		}
		if attempt.StudentID != studentID {
			c.JSON(http.StatusForbidden, gin.H{"message": "forbidden"})
			return
		}
		if attempt.Submitted {
			c.JSON(http.StatusBadRequest, gin.H{"message": "attempt already submitted"})
			return
		}

		expired, err := isAttemptExpired(db, attempt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to validate time limit"})
			return
		}
		if expired {
			_, _, _ = finalizeAttemptIfExpired(db, attempt.ID)
			c.JSON(http.StatusBadRequest, gin.H{"message": "time is up"})
			return
		}

		var question models.Question
		if err := db.First(&question, "id = ?", req.QuestionID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "question not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load question"})
			return
		}
		if question.ExamID != attempt.ExamID {
			c.JSON(http.StatusBadRequest, gin.H{"message": "question does not belong to exam"})
			return
		}

		if question.Type == string(models.QuestionTypeSingleChoice) && len(req.SelectedChoiceIDs) > 1 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "single_choice allows only 1 selection"})
			return
		}

		// Validate selected IDs belong to the question.
		valid := map[string]struct{}{}
		{
			var choices []models.Choice
			if err := db.Select("id").Where("question_id = ?", question.ID).Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				valid[ch.ID.String()] = struct{}{}
			}
		}
		for _, cid := range req.SelectedChoiceIDs {
			if _, ok := valid[cid]; !ok {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid choice id"})
				return
			}
		}

		var ans models.StudentAnswer
		if err := db.First(&ans, "attempt_id = ? AND question_id = ?", attempt.ID, question.ID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				ans = models.StudentAnswer{AttemptID: attempt.ID, QuestionID: question.ID, SelectedChoiceIDs: pq.StringArray{}, Flagged: false}
				if err := db.Create(&ans).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to create answer"})
					return
				}
				// fallthrough to save
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answer"})
				return
			}
		}

		ans.SelectedChoiceIDs = pq.StringArray(req.SelectedChoiceIDs)
		if err := db.Save(&ans).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to save answer"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

type studentFlagUpdateRequest struct {
	QuestionID uuid.UUID `json:"questionId"`
	Flagged    bool      `json:"flagged"`
}

func StudentAttemptFlag(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attemptID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid attempt id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var req studentFlagUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}
		if req.QuestionID == uuid.Nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "questionId is required"})
			return
		}

		var attempt models.ExamAttempt
		if err := db.First(&attempt, "id = ?", attemptID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "attempt not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt"})
			return
		}
		if attempt.StudentID != studentID {
			c.JSON(http.StatusForbidden, gin.H{"message": "forbidden"})
			return
		}
		if attempt.Submitted {
			c.JSON(http.StatusBadRequest, gin.H{"message": "attempt already submitted"})
			return
		}

		expired, err := isAttemptExpired(db, attempt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to validate time limit"})
			return
		}
		if expired {
			_, _, _ = finalizeAttemptIfExpired(db, attempt.ID)
			c.JSON(http.StatusBadRequest, gin.H{"message": "time is up"})
			return
		}

		var ans models.StudentAnswer
		if err := db.First(&ans, "attempt_id = ? AND question_id = ?", attempt.ID, req.QuestionID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				ans = models.StudentAnswer{AttemptID: attempt.ID, QuestionID: req.QuestionID, SelectedChoiceIDs: pq.StringArray{}, Flagged: req.Flagged}
				if err := db.Create(&ans).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update flag"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answer"})
				return
			}
		} else {
			ans.Flagged = req.Flagged
			if err := db.Save(&ans).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update flag"})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

type studentSubmitResponse struct {
	Score          float64 `json:"score"`
	CorrectTotal   int     `json:"correctTotal"`
	QuestionsTotal int     `json:"questionsTotal"`
}

func StudentAttemptSubmit(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attemptID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid attempt id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var attempt models.ExamAttempt
		if err := db.First(&attempt, "id = ?", attemptID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "attempt not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt"})
			return
		}
		if attempt.StudentID != studentID {
			c.JSON(http.StatusForbidden, gin.H{"message": "forbidden"})
			return
		}
		if attempt.Submitted {
			// Idempotent submit: return OK so client-side auto-submit doesn't fail on races.
			sc, _, err := computeAttemptScore(db, attempt)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt score"})
				return
			}
			c.JSON(http.StatusOK, studentSubmitResponse{Score: attempt.Score, CorrectTotal: sc.correctTotal, QuestionsTotal: sc.questionsTotal})
			return
		}

		expired, err := isAttemptExpired(db, attempt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to validate time limit"})
			return
		}

		// Load questions + correct sets.
		var questions []models.Question
		if err := db.Where("exam_id = ?", attempt.ExamID).Order("created_at asc").Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		questionIDs := make([]uuid.UUID, 0, len(questions))
		for _, q := range questions {
			questionIDs = append(questionIDs, q.ID)
		}

		correctSets := map[uuid.UUID]map[string]struct{}{}
		if len(questionIDs) > 0 {
			var choices []models.Choice
			if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				if !ch.IsCorrect {
					continue
				}
				set := correctSets[ch.QuestionID]
				if set == nil {
					set = map[string]struct{}{}
					correctSets[ch.QuestionID] = set
				}
				set[ch.ID.String()] = struct{}{}
			}
		}

		answersByQuestion := map[uuid.UUID]models.StudentAnswer{}
		{
			var answers []models.StudentAnswer
			if err := db.Where("attempt_id = ?", attempt.ID).Find(&answers).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answers"})
				return
			}
			for _, a := range answers {
				answersByQuestion[a.QuestionID] = a
			}
		}

		// Enforce: all questions must be answered before submission (unless time is up).
		if !expired {
			for _, q := range questions {
				ans, ok := answersByQuestion[q.ID]
				if !ok || len(ans.SelectedChoiceIDs) == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"message": "all questions must be answered before submitting"})
					return
				}
			}
		}

		correctTotal := 0
		for _, q := range questions {
			ans := answersByQuestion[q.ID]
			if isAnswerCorrect(q.Type, correctSets[q.ID], []string(ans.SelectedChoiceIDs)) {
				correctTotal++
			}
		}

		score := 0.0
		if len(questions) > 0 {
			score = (float64(correctTotal) / float64(len(questions))) * 100.0
		}

		now := time.Now().UTC()
		attempt.Submitted = true
		attempt.Score = score
		if exam, ok := func() (*models.Exam, bool) {
			var ex models.Exam
			if err := db.Select("duration_minutes").First(&ex, "id = ?", attempt.ExamID).Error; err != nil {
				return nil, false
			}
			return &ex, true
		}(); ok {
			if deadline, has := attemptDeadline(attempt, exam.DurationMinutes); has && now.After(deadline) {
				attempt.EndTime = &deadline
			} else {
				attempt.EndTime = &now
			}
		} else {
			attempt.EndTime = &now
		}

		if err := db.Save(&attempt).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to submit attempt"})
			return
		}

		c.JSON(http.StatusOK, studentSubmitResponse{Score: score, CorrectTotal: correctTotal, QuestionsTotal: len(questions)})
	}
}

type studentResultQuestion struct {
	QuestionID        uuid.UUID `json:"questionId"`
	Text              string    `json:"text"`
	Type              string    `json:"type"`
	SelectedChoiceIDs []string  `json:"selectedChoiceIds"`
	CorrectChoiceIDs  []string  `json:"correctChoiceIds"`
	IsCorrect         bool      `json:"isCorrect"`
	Flagged           bool      `json:"flagged"`
}

type studentResultResponse struct {
	AttemptID      uuid.UUID               `json:"attemptId"`
	ExamID         uuid.UUID               `json:"examId"`
	Score          float64                 `json:"score"`
	CorrectTotal   int                     `json:"correctTotal"`
	QuestionsTotal int                     `json:"questionsTotal"`
	Questions      []studentResultQuestion `json:"questions"`
}

func StudentAttemptResult(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		attemptID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid attempt id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var attempt models.ExamAttempt
		if err := db.First(&attempt, "id = ?", attemptID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "attempt not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempt"})
			return
		}
		if attempt.StudentID != studentID {
			c.JSON(http.StatusForbidden, gin.H{"message": "forbidden"})
			return
		}
		if !attempt.Submitted {
			// If time is up, auto-submit server-side and allow viewing results.
			finalized, _, err := finalizeAttemptIfExpired(db, attempt.ID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to finalize attempt"})
				return
			}
			if finalized == nil || !finalized.Submitted {
				c.JSON(http.StatusBadRequest, gin.H{"message": "attempt not submitted"})
				return
			}
			attempt = *finalized
		}

		var questions []models.Question
		if err := db.Where("exam_id = ?", attempt.ExamID).Order("created_at asc").Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		questionIDs := make([]uuid.UUID, 0, len(questions))
		for _, q := range questions {
			questionIDs = append(questionIDs, q.ID)
		}

		correctSets := map[uuid.UUID]map[string]struct{}{}
		correctIDs := map[uuid.UUID][]string{}
		if len(questionIDs) > 0 {
			var choices []models.Choice
			if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				if !ch.IsCorrect {
					continue
				}
				set := correctSets[ch.QuestionID]
				if set == nil {
					set = map[string]struct{}{}
					correctSets[ch.QuestionID] = set
				}
				id := ch.ID.String()
				set[id] = struct{}{}
				correctIDs[ch.QuestionID] = append(correctIDs[ch.QuestionID], id)
			}
		}

		answersByQuestion := map[uuid.UUID]models.StudentAnswer{}
		{
			var answers []models.StudentAnswer
			if err := db.Where("attempt_id = ?", attempt.ID).Find(&answers).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answers"})
				return
			}
			for _, a := range answers {
				answersByQuestion[a.QuestionID] = a
			}
		}

		resp := studentResultResponse{AttemptID: attempt.ID, ExamID: attempt.ExamID, Score: attempt.Score, QuestionsTotal: len(questions)}

		correctTotal := 0
		for _, q := range questions {
			ans := answersByQuestion[q.ID]
			isCorrect := isAnswerCorrect(q.Type, correctSets[q.ID], []string(ans.SelectedChoiceIDs))
			if isCorrect {
				correctTotal++
			}
			sort.Strings(correctIDs[q.ID])
			resp.Questions = append(resp.Questions, studentResultQuestion{
				QuestionID:        q.ID,
				Text:              q.Text,
				Type:              q.Type,
				SelectedChoiceIDs: []string(ans.SelectedChoiceIDs),
				CorrectChoiceIDs:  correctIDs[q.ID],
				IsCorrect:         isCorrect,
				Flagged:           ans.Flagged,
			})
		}
		resp.CorrectTotal = correctTotal

		c.JSON(http.StatusOK, resp)
	}
}
