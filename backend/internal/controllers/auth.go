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

type loginRequest struct {
	UsernameOrEmail string `json:"usernameOrEmail"`
	Password        string `json:"password"`
}

type loginResponse struct {
	Token      string `json:"token"`
	Role       string `json:"role"`
	FirstLogin bool   `json:"firstLogin"`
	User       struct {
		ID       uuid.UUID `json:"id"`
		Username string    `json:"username"`
		Email    string    `json:"email"`
	} `json:"user"`
}

func AuthLogin(db *gorm.DB, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req loginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid request"})
			return
		}

		req.UsernameOrEmail = strings.TrimSpace(req.UsernameOrEmail)
		if req.UsernameOrEmail == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "missing credentials"})
			return
		}

		var user models.User
		err := db.Preload("Role").Where("username = ?", req.UsernameOrEmail).
			Or("email = ?", req.UsernameOrEmail).
			First(&user).Error
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "invalid credentials"})
			return
		}

		if err := auth.ComparePassword(user.PasswordHash, req.Password); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "invalid credentials"})
			return
		}

		firstLogin := user.LastLoginAt == nil
		now := time.Now().UTC()
		if err := db.Model(&models.User{}).Where("id = ?", user.ID).Update("last_login_at", &now).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to record login"})
			return
		}

		token, err := auth.SignToken(user.ID, user.Role.Name, jwtSecret, 24*time.Hour)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to sign token"})
			return
		}

		var resp loginResponse
		resp.Token = token
		resp.Role = user.Role.Name
		resp.FirstLogin = firstLogin
		resp.User.ID = user.ID
		resp.User.Username = user.Username
		resp.User.Email = user.Email

		c.JSON(http.StatusOK, resp)
	}
}

func AuthMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDAny, ok := c.Get(string(middleware.ContextUserID))
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
			return
		}

		userID, _ := userIDAny.(uuid.UUID)
		var user models.User
		if err := db.Preload("Role").First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "not authenticated"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":                   user.ID,
			"username":             user.Username,
			"email":                user.Email,
			"role":                 user.Role.Name,
			"passwordChangedAt":    user.PasswordChangedAt,
			"passwordNeverChanged": user.PasswordChangedAt == nil,
		})
	}
}
