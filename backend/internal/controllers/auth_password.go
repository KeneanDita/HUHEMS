package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/Keneandita/huhems-backend/internal/auth"
	"github.com/Keneandita/huhems-backend/internal/middleware"
	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type changePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func AuthChangePassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDAny, ok := c.Get(string(middleware.ContextUserID))
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
			return
		}
		userID, _ := userIDAny.(uuid.UUID)

		var req changePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}

		req.OldPassword = strings.TrimSpace(req.OldPassword)
		req.NewPassword = strings.TrimSpace(req.NewPassword)

		if req.OldPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "oldPassword is required"})
			return
		}
		if req.NewPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "newPassword is required"})
			return
		}
		if len(req.NewPassword) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "newPassword must be at least 8 characters"})
			return
		}
		if req.NewPassword == req.OldPassword {
			c.JSON(http.StatusBadRequest, gin.H{"message": "newPassword must be different from oldPassword"})
			return
		}

		var user models.User
		if err := db.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
			return
		}

		if err := auth.ComparePassword(user.PasswordHash, req.OldPassword); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "old password is incorrect"})
			return
		}

		hash, err := auth.HashPassword(req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to hash password"})
			return
		}

		if err := db.Model(&models.User{}).Where("id = ?", user.ID).Update("password_hash", hash).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update password"})
			return
		}

		now := time.Now().UTC()
		if err := db.Model(&models.User{}).Where("id = ?", user.ID).Update("password_changed_at", &now).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to update password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "password updated"})
	}
}
