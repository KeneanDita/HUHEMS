package controllers

import (
	"net/http"
	"time"

	"github.com/Keneandita/huhems-backend/internal/middleware"
	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type studentExamListItem struct {
	ID               uuid.UUID `json:"id"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	MaxAttempts      int       `json:"maxAttempts"`
	DurationMinutes  int       `json:"durationMinutes"`
	QuestionsPerPage int       `json:"questionsPerPage"`
	QuestionCount    int       `json:"questionCount"`
}

func getStudentID(c *gin.Context, db *gorm.DB) (uuid.UUID, bool) {
	v, ok := c.Get(string(middleware.ContextUserID))
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
		return uuid.Nil, false
	}
	userID, ok := v.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
		return uuid.Nil, false
	}

	var student models.Student
	if err := db.First(&student, "user_id = ?", userID).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "student profile not found"})
		return uuid.Nil, false
	}
	return student.ID, true
}

func StudentExamsList(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var exams []models.Exam
		if err := db.Where("published = true").Order("created_at desc").Find(&exams).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exams"})
			return
		}

		examIDs := make([]uuid.UUID, 0, len(exams))
		for _, e := range exams {
			examIDs = append(examIDs, e.ID)
		}

		counts := map[uuid.UUID]int{}
		if len(examIDs) > 0 {
			type row struct {
				ExamID uuid.UUID
				Cnt    int
			}
			rows := []row{}
			if err := db.Model(&models.Question{}).
				Select("exam_id, COUNT(*) as cnt").
				Where("exam_id IN ?", examIDs).
				Group("exam_id").
				Scan(&rows).Error; err == nil {
				for _, r := range rows {
					counts[r.ExamID] = r.Cnt
				}
			}
		}

		resp := make([]studentExamListItem, 0, len(exams))
		for _, e := range exams {
			resp = append(resp, studentExamListItem{
				ID:               e.ID,
				Title:            e.Title,
				Description:      e.Description,
				MaxAttempts:      e.MaxAttempts,
				DurationMinutes:  e.DurationMinutes,
				QuestionsPerPage: e.QuestionsPerPage,
				QuestionCount:    counts[e.ID],
			})
		}

		c.JSON(http.StatusOK, resp)
	}
}

type startAttemptResponse struct {
	AttemptID uuid.UUID `json:"attemptId"`
}

func StudentExamStartAttempt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		var exam models.Exam
		if err := db.First(&exam, "id = ?", examID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "exam not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exam"})
			return
		}
		if !exam.Published {
			c.JSON(http.StatusForbidden, gin.H{"message": "exam is not published"})
			return
		}

		// If there's an active attempt, reuse it.
		var active models.ExamAttempt
		if err := db.Where("exam_id = ? AND student_id = ? AND submitted = false", examID, studentID).
			Order("created_at desc").
			First(&active).Error; err == nil {
			c.JSON(http.StatusOK, startAttemptResponse{AttemptID: active.ID})
			return
		}

		// Enforce max attempts (count submitted attempts).
		var submittedCount int64
		if err := db.Model(&models.ExamAttempt{}).
			Where("exam_id = ? AND student_id = ? AND submitted = true", examID, studentID).
			Count(&submittedCount).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to check attempts"})
			return
		}
		if exam.MaxAttempts > 0 && int(submittedCount) >= exam.MaxAttempts {
			c.JSON(http.StatusForbidden, gin.H{"message": "attempt limit reached"})
			return
		}

		// Load questions for answer rows.
		var questions []models.Question
		if err := db.Select("id").Where("exam_id = ?", examID).Order("created_at asc").Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		if len(questions) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "exam has no questions"})
			return
		}

		attempt := models.ExamAttempt{
			StudentID: studentID,
			ExamID:    examID,
			StartTime: time.Now().UTC(),
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&attempt).Error; err != nil {
				return err
			}

			answers := make([]models.StudentAnswer, 0, len(questions))
			for _, q := range questions {
				answers = append(answers, models.StudentAnswer{
					AttemptID:         attempt.ID,
					QuestionID:        q.ID,
					SelectedChoiceIDs: pq.StringArray{},
					Flagged:           false,
				})
			}
			if err := tx.Create(&answers).Error; err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to start attempt"})
			return
		}

		c.JSON(http.StatusCreated, startAttemptResponse{AttemptID: attempt.ID})
	}
}
