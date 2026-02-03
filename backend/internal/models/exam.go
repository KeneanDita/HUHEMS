package models

import (
	"time"

	"github.com/google/uuid"
)

type Exam struct {
	BaseModel

	Title       string `gorm:"not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`

	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"createdById"`
	CreatedBy   User      `gorm:"foreignKey:CreatedByID" json:"-"`

	Published bool `gorm:"not null;default:false" json:"published"`

	StartTime *time.Time `json:"startTime"`
	EndTime   *time.Time `json:"endTime"`

	// DurationMinutes is the time limit for the exam attempt.
	// A value <= 0 means "no time limit".
	DurationMinutes int `gorm:"not null;default:30" json:"durationMinutes"`

	MaxAttempts      int `gorm:"not null;default:1" json:"maxAttempts"`
	QuestionsPerPage int `gorm:"not null;default:5" json:"questionsPerPage"`

	Questions []Question `gorm:"foreignKey:ExamID" json:"-"`
}
