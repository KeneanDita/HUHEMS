package models

import "github.com/google/uuid"

type Student struct {
	BaseModel

	UserID uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	User   User      `gorm:"foreignKey:UserID"`

	FullName   string `gorm:"not null"`
	Year       int    `gorm:"not null"`
	Department string `gorm:"not null"`
}
