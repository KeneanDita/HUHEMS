package controllers

import (
	"net/http"
	"strings"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type adminChoiceInput struct {
	Text      string `json:"text"`
	IsCorrect bool   `json:"isCorrect"`
	Order     int    `json:"order"`
}

type adminQuestionCreateRequest struct {
	Text    string             `json:"text"`
	Type    string             `json:"type"`
	Choices []adminChoiceInput `json:"choices"`
}

type adminQuestionUpdateRequest struct {
	Text    *string            `json:"text"`
	Type    *string            `json:"type"`
	Choices []adminChoiceInput `json:"choices"`
}

func AdminExamQuestionsCreate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		// Ensure exam exists.
		var exam models.Exam
		if err := db.First(&exam, "id = ?", examID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "exam not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exam"})
			return
		}

		var req adminQuestionCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}
		req.Text = strings.TrimSpace(req.Text)
		req.Type = strings.TrimSpace(req.Type)
		if req.Text == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "text is required"})
			return
		}
		if req.Type != string(models.QuestionTypeSingleChoice) && req.Type != string(models.QuestionTypeMultiChoice) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid question type"})
			return
		}
		if len(req.Choices) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "at least 2 choices are required"})
			return
		}

		correct := 0
		for _, ch := range req.Choices {
			if strings.TrimSpace(ch.Text) == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "choice text cannot be empty"})
				return
			}
			if ch.IsCorrect {
				correct++
			}
		}
		if correct == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "at least 1 correct choice is required"})
			return
		}
		if req.Type == string(models.QuestionTypeSingleChoice) && correct != 1 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "single_choice must have exactly 1 correct choice"})
			return
		}

		var question models.Question
		err = db.Transaction(func(tx *gorm.DB) error {
			question = models.Question{
				ExamID: examID,
				Text:   req.Text,
				Type:   req.Type,
			}
			if err := tx.Create(&question).Error; err != nil {
				return err
			}

			choices := make([]models.Choice, 0, len(req.Choices))
			for i, input := range req.Choices {
				order := input.Order
				if order == 0 {
					order = i + 1
				}
				choices = append(choices, models.Choice{
					QuestionID: question.ID,
					Text:       strings.TrimSpace(input.Text),
					IsCorrect:  input.IsCorrect,
					Order:      order,
				})
			}
			if err := tx.Create(&choices).Error; err != nil {
				return err
			}
			question.Choices = choices
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to create question"})
			return
		}

		c.JSON(http.StatusCreated, question)
	}
}

func AdminQuestionsUpdate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		questionID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid question id"})
			return
		}

		var req adminQuestionUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}

		var question models.Question
		if err := db.First(&question, "id = ?", questionID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "question not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load question"})
			return
		}

		if req.Text != nil {
			q := strings.TrimSpace(*req.Text)
			if q == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "text cannot be empty"})
				return
			}
			question.Text = q
		}
		if req.Type != nil {
			t := strings.TrimSpace(*req.Type)
			if t != string(models.QuestionTypeSingleChoice) && t != string(models.QuestionTypeMultiChoice) {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid question type"})
				return
			}
			question.Type = t
		}

		// If choices are provided, replace them.
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Save(&question).Error; err != nil {
				return err
			}

			if req.Choices != nil {
				if len(req.Choices) < 2 {
					return gin.Error{Err: errInvalid("at least 2 choices are required"), Type: gin.ErrorTypeBind}
				}

				correct := 0
				for _, ch := range req.Choices {
					if strings.TrimSpace(ch.Text) == "" {
						return gin.Error{Err: errInvalid("choice text cannot be empty"), Type: gin.ErrorTypeBind}
					}
					if ch.IsCorrect {
						correct++
					}
				}
				if correct == 0 {
					return gin.Error{Err: errInvalid("at least 1 correct choice is required"), Type: gin.ErrorTypeBind}
				}
				if question.Type == string(models.QuestionTypeSingleChoice) && correct != 1 {
					return gin.Error{Err: errInvalid("single_choice must have exactly 1 correct choice"), Type: gin.ErrorTypeBind}
				}

				if err := tx.Where("question_id = ?", question.ID).Delete(&models.Choice{}).Error; err != nil {
					return err
				}

				choices := make([]models.Choice, 0, len(req.Choices))
				for i, input := range req.Choices {
					order := input.Order
					if order == 0 {
						order = i + 1
					}
					choices = append(choices, models.Choice{
						QuestionID: question.ID,
						Text:       strings.TrimSpace(input.Text),
						IsCorrect:  input.IsCorrect,
						Order:      order,
					})
				}
				if err := tx.Create(&choices).Error; err != nil {
					return err
				}
				question.Choices = choices
			}

			return nil
		})

		// Handle validation errors bubbled via gin.Error.
		if err != nil {
			if ge, ok := err.(gin.Error); ok && ge.Type == gin.ErrorTypeBind {
				c.JSON(http.StatusBadRequest, gin.H{"message": ge.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update question"})
			return
		}

		// Return current question + choices.
		var choices []models.Choice
		_ = db.Where("question_id = ?", question.ID).Order("\"order\" asc").Find(&choices).Error
		question.Choices = choices

		c.JSON(http.StatusOK, question)
	}
}

func AdminQuestionsDelete(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		questionID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid question id"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("question_id = ?", questionID).Delete(&models.Choice{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&models.Question{}, "id = ?", questionID).Error; err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to delete question"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

type invalidError string

func (e invalidError) Error() string { return string(e) }

func errInvalid(message string) error { return invalidError(message) }
