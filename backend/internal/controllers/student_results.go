package controllers

import (
	"net/http"
	"time"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type studentResultsListItem struct {
	AttemptID uuid.UUID  `json:"attemptId"`
	ExamID    uuid.UUID  `json:"examId"`
	ExamTitle string     `json:"examTitle"`
	Score     float64    `json:"score"`
	StartTime time.Time  `json:"startTime"`
	EndTime   *time.Time `json:"endTime"`
}

func StudentResultsList(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID, ok := getStudentID(c, db)
		if !ok {
			return
		}

		// We intentionally keep this lightweight (no per-question breakdown here).
		// Students can click into a specific attempt result for details.
		var rows []studentResultsListItem
		err := db.Model(&models.ExamAttempt{}).
			Select(
				"exam_attempts.id as attempt_id, exam_attempts.exam_id as exam_id, exams.title as exam_title, exam_attempts.score as score, exam_attempts.start_time as start_time, exam_attempts.end_time as end_time",
			).
			Joins("JOIN exams ON exams.id = exam_attempts.exam_id").
			Where("exam_attempts.student_id = ? AND exam_attempts.submitted = true", studentID).
			Order("exam_attempts.end_time DESC NULLS LAST, exam_attempts.created_at DESC").
			Scan(&rows).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load results"})
			return
		}

		c.JSON(http.StatusOK, rows)
	}
}
