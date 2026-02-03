package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	BaseModel

	Username          string     `gorm:"uniqueIndex;not null"`
	Email             string     `gorm:"uniqueIndex;not null"`
	PasswordHash      string     `gorm:"not null"`
	LastLoginAt       *time.Time `json:"lastLoginAt"`
	PasswordChangedAt *time.Time `json:"passwordChangedAt"`

	RoleID uuid.UUID `gorm:"type:uuid;not null"`
	Role   Role      `gorm:"foreignKey:RoleID"`
}
