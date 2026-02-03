package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	BaseModel

	UserID uuid.UUID `gorm:"type:uuid;index;not null"`
	User   User      `gorm:"foreignKey:UserID"`

	Action   string    `gorm:"not null"`
	EntityID uuid.UUID `gorm:"type:uuid;index;not null"`

	Timestamp time.Time `gorm:"autoCreateTime"`
}
