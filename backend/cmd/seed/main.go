package main

import (
	"log"

	"github.com/Keneandita/huhems-backend/internal/auth"
	"github.com/Keneandita/huhems-backend/internal/config"
	"github.com/Keneandita/huhems-backend/internal/db"
	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	adminUsername   = "admin"
	adminPassword   = "Admin123!"
	adminEmail      = "admin@huhems.local"
	studentUsername = "student"
	studentPassword = "Student123!"
	studentEmail    = "student@huhems.local"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	database, err := db.Connect(cfg.DBURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := db.Migrate(database); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	if err := seed(database); err != nil {
		log.Fatalf("seed failed: %v", err)
	}

	log.Printf("seed complete")
	log.Printf("demo admin  -> username=%s password=%s", adminUsername, adminPassword)
	log.Printf("demo student-> username=%s password=%s", studentUsername, studentPassword)
}

func seed(db *gorm.DB) error {
	adminRole := models.Role{Name: "admin"}
	if err := db.Where("name = ?", adminRole.Name).FirstOrCreate(&adminRole).Error; err != nil {
		return err
	}

	studentRole := models.Role{Name: "student"}
	if err := db.Where("name = ?", studentRole.Name).FirstOrCreate(&studentRole).Error; err != nil {
		return err
	}

	if err := upsertUser(db, adminUsername, adminEmail, adminPassword, adminRole.ID); err != nil {
		return err
	}

	studentUser, err := upsertUserReturning(db, studentUsername, studentEmail, studentPassword, studentRole.ID)
	if err != nil {
		return err
	}

	// Create a student profile if not present.
	student := models.Student{
		UserID:     studentUser.ID,
		FullName:   "Demo Student",
		Year:       4,
		Department: "Software Engineering",
	}
	if err := db.Where("user_id = ?", student.UserID).FirstOrCreate(&student).Error; err != nil {
		return err
	}

	return nil
}

func upsertUser(db *gorm.DB, username, email, password string, roleID uuid.UUID) error {
	_, err := upsertUserReturning(db, username, email, password, roleID)
	return err
}

func upsertUserReturning(db *gorm.DB, username, email, password string, roleID uuid.UUID) (models.User, error) {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return models.User{}, err
	}

	var user models.User
	err = db.Where("username = ?", username).Or("email = ?", email).First(&user).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return models.User{}, err
	}

	if err == gorm.ErrRecordNotFound {
		user = models.User{
			Username:     username,
			Email:        email,
			PasswordHash: hash,
			RoleID:       roleID,
		}
		if err := db.Create(&user).Error; err != nil {
			return models.User{}, err
		}
		return user, nil
	}

	// Update to ensure deterministic credentials.
	user.Username = username
	user.Email = email
	user.PasswordHash = hash
	user.RoleID = roleID

	if err := db.Save(&user).Error; err != nil {
		return models.User{}, err
	}

	return user, nil
}
