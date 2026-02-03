package controllers

import (
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/Keneandita/huhems-backend/internal/auth"
	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type adminStudentView struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"userId"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	FullName   string    `json:"fullName"`
	Year       int       `json:"year"`
	Department string    `json:"department"`
	CreatedAt  time.Time `json:"createdAt"`
}

type adminStudentCreateRequest struct {
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	FullName   string `json:"fullName"`
	Year       int    `json:"year"`
	Department string `json:"department"`
}

type adminStudentUpdateRequest struct {
	Username   *string `json:"username"`
	Email      *string `json:"email"`
	FullName   *string `json:"fullName"`
	Year       *int    `json:"year"`
	Department *string `json:"department"`
}

func AdminStudentsList(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var students []models.Student
		if err := db.Preload("User").Order("created_at desc").Find(&students).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load students"})
			return
		}

		resp := make([]adminStudentView, 0, len(students))
		for _, s := range students {
			resp = append(resp, adminStudentView{
				ID:         s.ID,
				UserID:     s.UserID,
				Username:   s.User.Username,
				Email:      s.User.Email,
				FullName:   s.FullName,
				Year:       s.Year,
				Department: s.Department,
				CreatedAt:  s.CreatedAt,
			})
		}

		c.JSON(http.StatusOK, resp)
	}
}

func AdminStudentsCreate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req adminStudentCreateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}

		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		req.FullName = strings.TrimSpace(req.FullName)
		req.Department = strings.TrimSpace(req.Department)

		if req.Username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "username is required"})
			return
		}
		if req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "email is required"})
			return
		}
		if req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "password is required"})
			return
		}
		if len(req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "password must be at least 8 characters"})
			return
		}
		if req.FullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "fullName is required"})
			return
		}
		if req.Year <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "year must be >= 1"})
			return
		}
		if req.Department == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "department is required"})
			return
		}

		var role models.Role
		if err := db.First(&role, "name = ?", "student").Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "student role not configured"})
			return
		}

		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to hash password"})
			return
		}

		var createdStudent models.Student
		err = db.Transaction(func(tx *gorm.DB) error {
			user := models.User{
				Username:     req.Username,
				Email:        req.Email,
				PasswordHash: hash,
				RoleID:       role.ID,
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			student := models.Student{
				UserID:     user.ID,
				FullName:   req.FullName,
				Year:       req.Year,
				Department: req.Department,
				User:       user,
			}
			if err := tx.Create(&student).Error; err != nil {
				return err
			}
			createdStudent = student
			return nil
		})
		if err != nil {
			// Most common failures: unique constraints on username/email.
			c.JSON(http.StatusBadRequest, gin.H{"message": "failed to create student (username/email may already exist)"})
			return
		}

		c.JSON(http.StatusCreated, adminStudentView{
			ID:         createdStudent.ID,
			UserID:     createdStudent.UserID,
			Username:   createdStudent.User.Username,
			Email:      createdStudent.User.Email,
			FullName:   createdStudent.FullName,
			Year:       createdStudent.Year,
			Department: createdStudent.Department,
			CreatedAt:  createdStudent.CreatedAt,
		})
	}
}

func AdminStudentsDelete(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student id"})
			return
		}

		var student models.Student
		if err := db.Preload("User").First(&student, "id = ?", studentID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "student not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load student"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			// Delete dependent rows in a safe order.
			var attempts []models.ExamAttempt
			if err := tx.Select("id").Where("student_id = ?", student.ID).Find(&attempts).Error; err != nil {
				return err
			}

			attemptIDs := make([]uuid.UUID, 0, len(attempts))
			for _, a := range attempts {
				attemptIDs = append(attemptIDs, a.ID)
			}

			if len(attemptIDs) > 0 {
				if err := tx.Where("attempt_id IN ?", attemptIDs).Delete(&models.StudentAnswer{}).Error; err != nil {
					return err
				}
			}

			if err := tx.Where("student_id = ?", student.ID).Delete(&models.ExamAttempt{}).Error; err != nil {
				return err
			}

			if err := tx.Delete(&models.Student{}, "id = ?", student.ID).Error; err != nil {
				return err
			}

			if err := tx.Delete(&models.User{}, "id = ?", student.UserID).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to delete student"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func AdminStudentsUpdate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		studentID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student id"})
			return
		}

		var req adminStudentUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}

		if req.Username == nil && req.Email == nil && req.FullName == nil && req.Year == nil && req.Department == nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "no fields to update"})
			return
		}

		var student models.Student
		if err := db.Preload("User").First(&student, "id = ?", studentID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "student not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load student"})
			return
		}

		studentUpdates := map[string]any{}
		userUpdates := map[string]any{}
		var normalizedEmail string
		if req.Username != nil {
			v := strings.TrimSpace(*req.Username)
			if v == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "username cannot be empty"})
				return
			}
			userUpdates["username"] = v
		}
		if req.Email != nil {
			normalizedEmail = strings.TrimSpace(strings.ToLower(*req.Email))
			if normalizedEmail == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "email cannot be empty"})
				return
			}
			if _, err := mail.ParseAddress(normalizedEmail); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid email"})
				return
			}
			userUpdates["email"] = normalizedEmail
		}
		if req.FullName != nil {
			v := strings.TrimSpace(*req.FullName)
			if v == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "fullName cannot be empty"})
				return
			}
			studentUpdates["full_name"] = v
		}
		if req.Year != nil {
			if *req.Year <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "year must be >= 1"})
				return
			}
			studentUpdates["year"] = *req.Year
		}
		if req.Department != nil {
			v := strings.TrimSpace(*req.Department)
			if v == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "department cannot be empty"})
				return
			}
			studentUpdates["department"] = v
		}

		if len(studentUpdates) == 0 && len(userUpdates) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "no valid fields to update"})
			return
		}

		if err := db.Transaction(func(tx *gorm.DB) error {
			if len(studentUpdates) > 0 {
				if err := tx.Model(&models.Student{}).Where("id = ?", student.ID).Updates(studentUpdates).Error; err != nil {
					return err
				}
			}
			if len(userUpdates) > 0 {
				if err := tx.Model(&models.User{}).Where("id = ?", student.UserID).Updates(userUpdates).Error; err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			errMsg := strings.ToLower(err.Error())
			if strings.Contains(errMsg, "duplicate") || strings.Contains(errMsg, "unique") {
				c.JSON(http.StatusBadRequest, gin.H{"message": "failed to update student (username/email may already exist)"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update student"})
			return
		}

		if err := db.Preload("User").First(&student, "id = ?", studentID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load updated student"})
			return
		}

		c.JSON(http.StatusOK, adminStudentView{
			ID:         student.ID,
			UserID:     student.UserID,
			Username:   student.User.Username,
			Email:      student.User.Email,
			FullName:   student.FullName,
			Year:       student.Year,
			Department: student.Department,
			CreatedAt:  student.CreatedAt,
		})
	}
}
