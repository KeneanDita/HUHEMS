package models

type Role struct {
	BaseModel
	Name string `gorm:"uniqueIndex;not null"`
}
