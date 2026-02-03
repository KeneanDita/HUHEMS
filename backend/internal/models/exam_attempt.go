package models

import (
	"time"

	"github.com/google/uuid"
)

type ExamAttempt struct {
	BaseModel

	StudentID uuid.UUID `gorm:"type:uuid;index;not null"`
	Student   Student   `gorm:"foreignKey:StudentID"`

	ExamID uuid.UUID `gorm:"type:uuid;index;not null"`
	Exam   Exam      `gorm:"foreignKey:ExamID"`

	StartTime time.Time
	EndTime   *time.Time

	Score     float64 `gorm:"not null;default:0"`
	Submitted bool    `gorm:"not null;default:false"`
}
