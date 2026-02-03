package models

import "github.com/google/uuid"

type Choice struct {
	BaseModel

	QuestionID uuid.UUID `gorm:"type:uuid;index;not null" json:"questionId"`
	Question   Question  `gorm:"foreignKey:QuestionID" json:"-"`

	Text      string `gorm:"type:text;not null" json:"text"`
	IsCorrect bool   `gorm:"not null;default:false" json:"isCorrect"`
	Order     int    `gorm:"not null" json:"order"`
}
