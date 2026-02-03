package controllers

import (
	"net/http"
	"sort"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type examReportResponse struct {
	ExamID uuid.UUID `json:"examId"`

	AttemptsTotal   int64            `json:"attemptsTotal"`
	SubmittedTotal  int64            `json:"submittedTotal"`
	AverageScore    float64          `json:"averageScore"`
	MinScore        float64          `json:"minScore"`
	MaxScore        float64          `json:"maxScore"`
	QuestionsTotal  int              `json:"questionsTotal"`
	AnswersTotal    int              `json:"answersTotal"`
	CorrectTotal    int              `json:"correctTotal"`
	QuestionReports []questionReport `json:"questionReports"`
}

type questionReport struct {
	QuestionID uuid.UUID `json:"questionId"`
	Text       string    `json:"text"`
	Type       string    `json:"type"`

	AnswersTotal int `json:"answersTotal"`
	CorrectTotal int `json:"correctTotal"`

	ChoiceCounts []choiceCount `json:"choiceCounts"`
}

type choiceCount struct {
	ChoiceID uuid.UUID `json:"choiceId"`
	Text     string    `json:"text"`
	Count    int       `json:"count"`
	Correct  bool      `json:"correct"`
	Order    int       `json:"order"`
}

func AdminExamReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		// Attempts summary
		var attemptsTotal int64
		if err := db.Model(&models.ExamAttempt{}).Where("exam_id = ?", examID).Count(&attemptsTotal).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempts"})
			return
		}
		var submittedTotal int64
		if err := db.Model(&models.ExamAttempt{}).Where("exam_id = ? AND submitted = true", examID).Count(&submittedTotal).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load attempts"})
			return
		}

		avgScore := 0.0
		minScore := 0.0
		maxScore := 0.0
		if submittedTotal > 0 {
			row := db.Model(&models.ExamAttempt{}).
				Select("COALESCE(AVG(score), 0) as avg, COALESCE(MIN(score), 0) as min, COALESCE(MAX(score), 0) as max").
				Where("exam_id = ? AND submitted = true", examID).Row()
			_ = row.Scan(&avgScore, &minScore, &maxScore)
		}

		// Questions + choices
		var questions []models.Question
		if err := db.Where("exam_id = ?", examID).Order("created_at asc").Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		questionIDs := make([]uuid.UUID, 0, len(questions))
		for _, q := range questions {
			questionIDs = append(questionIDs, q.ID)
		}

		choicesByQuestion := map[uuid.UUID][]models.Choice{}
		correctSets := map[uuid.UUID]map[string]struct{}{}
		choiceText := map[string]models.Choice{}
		if len(questionIDs) > 0 {
			var choices []models.Choice
			if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				choicesByQuestion[ch.QuestionID] = append(choicesByQuestion[ch.QuestionID], ch)
				choiceText[ch.ID.String()] = ch
				if ch.IsCorrect {
					set := correctSets[ch.QuestionID]
					if set == nil {
						set = map[string]struct{}{}
						correctSets[ch.QuestionID] = set
					}
					set[ch.ID.String()] = struct{}{}
				}
			}
		}

		// Submitted attempt IDs
		attemptIDs := []uuid.UUID{}
		if submittedTotal > 0 {
			var attempts []models.ExamAttempt
			if err := db.Select("id").Where("exam_id = ? AND submitted = true", examID).Find(&attempts).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load submitted attempts"})
				return
			}
			attemptIDs = make([]uuid.UUID, 0, len(attempts))
			for _, a := range attempts {
				attemptIDs = append(attemptIDs, a.ID)
			}
		}

		answersByQuestion := map[uuid.UUID][]models.StudentAnswer{}
		if len(attemptIDs) > 0 {
			var answers []models.StudentAnswer
			if err := db.Where("attempt_id IN ?", attemptIDs).Find(&answers).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load answers"})
				return
			}
			for _, ans := range answers {
				answersByQuestion[ans.QuestionID] = append(answersByQuestion[ans.QuestionID], ans)
			}
		}

		resp := examReportResponse{
			ExamID:         examID,
			AttemptsTotal:  attemptsTotal,
			SubmittedTotal: submittedTotal,
			AverageScore:   avgScore,
			MinScore:       minScore,
			MaxScore:       maxScore,
			QuestionsTotal: len(questions),
		}

		correctTotal := 0
		answersTotal := 0

		for _, q := range questions {
			qChoices := choicesByQuestion[q.ID]
			sort.SliceStable(qChoices, func(i, j int) bool { return qChoices[i].Order < qChoices[j].Order })
			counts := map[string]int{}

			qAnswers := answersByQuestion[q.ID]
			qCorrect := 0
			for _, ans := range qAnswers {
				answersTotal++
				// Count selections.
				for _, cid := range ans.SelectedChoiceIDs {
					counts[cid]++
				}

				if isAnswerCorrect(q.Type, correctSets[q.ID], ans.SelectedChoiceIDs) {
					qCorrect++
					correctTotal++
				}
			}

			choiceCounts := make([]choiceCount, 0, len(qChoices))
			for _, ch := range qChoices {
				choiceCounts = append(choiceCounts, choiceCount{
					ChoiceID: ch.ID,
					Text:     ch.Text,
					Count:    counts[ch.ID.String()],
					Correct:  ch.IsCorrect,
					Order:    ch.Order,
				})
			}

			resp.QuestionReports = append(resp.QuestionReports, questionReport{
				QuestionID:   q.ID,
				Text:         q.Text,
				Type:         q.Type,
				AnswersTotal: len(qAnswers),
				CorrectTotal: qCorrect,
				ChoiceCounts: choiceCounts,
			})
		}

		resp.AnswersTotal = answersTotal
		resp.CorrectTotal = correctTotal

		c.JSON(http.StatusOK, resp)
	}
}
