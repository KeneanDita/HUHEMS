package db

import (
	"github.com/Keneandita/huhems-backend/internal/models"
	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	// Needed for gen_random_uuid() default.
	if err := RequireExtension(db, "pgcrypto"); err != nil {
		return err
	}

	return db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Student{},
		&models.Exam{},
		&models.Question{},
		&models.Choice{},
		&models.ExamAttempt{},
		&models.StudentAnswer{},
		&models.AuditLog{},
	)
}
