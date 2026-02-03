package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type adminExamCreateRequest struct {
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	StartTime        *time.Time `json:"startTime"`
	EndTime          *time.Time `json:"endTime"`
	DurationMinutes  int        `json:"durationMinutes"`
	MaxAttempts      int        `json:"maxAttempts"`
	QuestionsPerPage int        `json:"questionsPerPage"`
}

type adminExamUpdateRequest struct {
	Title            *string    `json:"title"`
	Description      *string    `json:"description"`
	StartTime        *time.Time `json:"startTime"`
	EndTime          *time.Time `json:"endTime"`
	DurationMinutes  *int       `json:"durationMinutes"`
	MaxAttempts      *int       `json:"maxAttempts"`
	QuestionsPerPage *int       `json:"questionsPerPage"`
	Published        *bool      `json:"published"`
}

func AdminExamsList(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var exams []models.Exam
		if err := db.Preload("CreatedBy").Order("created_at desc").Find(&exams).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exams"})
			return
		}
		c.JSON(http.StatusOK, exams)
	}
}

func AdminExamsCreate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		createdByAny, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
			return
		}
		createdBy, _ := createdByAny.(uuid.UUID)

		var req adminExamCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}
		req.Title = strings.TrimSpace(req.Title)
		if req.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "title is required"})
			return
		}

		if req.MaxAttempts <= 0 {
			req.MaxAttempts = 1
		}
		if req.QuestionsPerPage <= 0 {
			req.QuestionsPerPage = 5
		}
		if req.DurationMinutes <= 0 {
			// Default to 30 minutes if not specified.
			req.DurationMinutes = 30
		}

		exam := models.Exam{
			Title:            req.Title,
			Description:      strings.TrimSpace(req.Description),
			CreatedByID:      createdBy,
			Published:        false,
			StartTime:        req.StartTime,
			EndTime:          req.EndTime,
			DurationMinutes:  req.DurationMinutes,
			MaxAttempts:      req.MaxAttempts,
			QuestionsPerPage: req.QuestionsPerPage,
		}

		if err := db.Create(&exam).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to create exam"})
			return
		}

		c.JSON(http.StatusCreated, exam)
	}
}

func AdminExamsGet(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		var exam models.Exam
		if err := db.Preload("CreatedBy").First(&exam, "id = ?", examID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "exam not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exam"})
			return
		}

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
		if len(questionIDs) > 0 {
			var choices []models.Choice
			if err := db.Where("question_id IN ?", questionIDs).Order("\"order\" asc").Find(&choices).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
				return
			}
			for _, ch := range choices {
				choicesByQuestion[ch.QuestionID] = append(choicesByQuestion[ch.QuestionID], ch)
			}
		}

		// Attach choices for JSON convenience.
		for i := range questions {
			questions[i].Choices = choicesByQuestion[questions[i].ID]
		}

		c.JSON(http.StatusOK, gin.H{
			"exam":      exam,
			"questions": questions,
		})
	}
}

func AdminExamsUpdate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		var req adminExamUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
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

		if req.Title != nil {
			t := strings.TrimSpace(*req.Title)
			if t == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "title cannot be empty"})
				return
			}
			exam.Title = t
		}
		if req.Description != nil {
			exam.Description = strings.TrimSpace(*req.Description)
		}
		if req.StartTime != nil {
			exam.StartTime = req.StartTime
		}
		if req.EndTime != nil {
			exam.EndTime = req.EndTime
		}
		if req.MaxAttempts != nil {
			if *req.MaxAttempts <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "maxAttempts must be >= 1"})
				return
			}
			exam.MaxAttempts = *req.MaxAttempts
		}
		if req.DurationMinutes != nil {
			if *req.DurationMinutes <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "durationMinutes must be >= 1"})
				return
			}
			exam.DurationMinutes = *req.DurationMinutes
		}
		if req.QuestionsPerPage != nil {
			if *req.QuestionsPerPage <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "questionsPerPage must be >= 1"})
				return
			}
			exam.QuestionsPerPage = *req.QuestionsPerPage
		}
		if req.Published != nil {
			// Only allow unpublish here. Publishing requires validation via /publish.
			if *req.Published && !exam.Published {
				c.JSON(http.StatusBadRequest, gin.H{"message": "use /admin/exams/:id/publish to publish an exam"})
				return
			}
			exam.Published = *req.Published
		}

		if err := db.Save(&exam).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update exam"})
			return
		}

		c.JSON(http.StatusOK, exam)
	}
}

func AdminExamsDelete(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			var questions []models.Question
			if err := tx.Where("exam_id = ?", examID).Find(&questions).Error; err != nil {
				return err
			}
			if len(questions) > 0 {
				ids := make([]uuid.UUID, 0, len(questions))
				for _, q := range questions {
					ids = append(ids, q.ID)
				}
				if err := tx.Where("question_id IN ?", ids).Delete(&models.Choice{}).Error; err != nil {
					return err
				}
				if err := tx.Where("id IN ?", ids).Delete(&models.Question{}).Error; err != nil {
					return err
				}
			}

			if err := tx.Delete(&models.Exam{}, "id = ?", examID).Error; err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to delete exam"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func AdminExamsPublish(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
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

		var questions []models.Question
		if err := db.Where("exam_id = ?", examID).Find(&questions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load questions"})
			return
		}
		if len(questions) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "cannot publish an exam with no questions"})
			return
		}

		questionIDs := make([]uuid.UUID, 0, len(questions))
		for _, q := range questions {
			questionIDs = append(questionIDs, q.ID)
		}

		var choices []models.Choice
		if err := db.Where("question_id IN ?", questionIDs).Find(&choices).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load choices"})
			return
		}

		type qAgg struct {
			TotalChoices   int
			CorrectChoices int
		}
		agg := map[uuid.UUID]*qAgg{}
		for _, q := range questions {
			agg[q.ID] = &qAgg{}
		}
		for _, ch := range choices {
			a := agg[ch.QuestionID]
			if a == nil {
				continue
			}
			a.TotalChoices++
			if ch.IsCorrect {
				a.CorrectChoices++
			}
		}

		for _, q := range questions {
			a := agg[q.ID]
			if a == nil || a.TotalChoices < 2 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "each question must have at least 2 choices"})
				return
			}
			if a.CorrectChoices == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "each question must have at least 1 correct choice"})
				return
			}
			if q.Type == string(models.QuestionTypeSingleChoice) && a.CorrectChoices != 1 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "single_choice questions must have exactly 1 correct choice"})
				return
			}
		}

		if exam.DurationMinutes <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "durationMinutes must be set before publishing"})
			return
		}

		exam.Published = true
		if err := db.Save(&exam).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to publish exam"})
			return
		}

		c.JSON(http.StatusOK, exam)
	}
}
