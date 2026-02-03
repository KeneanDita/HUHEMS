package models

import "github.com/google/uuid"

type QuestionType string

const (
	QuestionTypeSingleChoice QuestionType = "single_choice"
	QuestionTypeMultiChoice  QuestionType = "multi_choice"
)

type Question struct {
	BaseModel

	ExamID uuid.UUID `gorm:"type:uuid;index;not null" json:"examId"`
	Exam   Exam      `gorm:"foreignKey:ExamID" json:"-"`

	Text string `gorm:"type:text;not null" json:"text"`
	Type string `gorm:"not null" json:"type"`

	Choices []Choice `gorm:"foreignKey:QuestionID" json:"choices"`
}
