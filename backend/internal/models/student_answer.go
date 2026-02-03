package models

import (
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type StudentAnswer struct {
	BaseModel

	AttemptID uuid.UUID   `gorm:"type:uuid;index;not null"`
	Attempt   ExamAttempt `gorm:"foreignKey:AttemptID"`

	QuestionID uuid.UUID `gorm:"type:uuid;index;not null"`
	Question   Question  `gorm:"foreignKey:QuestionID"`

	// UUIDs encoded as strings. Stored as text[] for simplicity.
	SelectedChoiceIDs pq.StringArray `gorm:"type:text[]"`
	Flagged           bool           `gorm:"not null;default:false"`
}
