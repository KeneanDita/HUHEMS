package controllers

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/Keneandita/huhems-backend/internal/auth"
	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type adminStudentsImportResponse struct {
	CreatedStudents int `json:"createdStudents"`
}

type studentCSVColIndex struct {
	username   int
	email      int
	password   int
	fullName   int
	year       int
	department int
}

func looksLikeStudentHeader(record []string) bool {
	if len(record) == 0 {
		return false
	}
	first := strings.ToLower(strings.TrimSpace(record[0]))
	return first == "username" || first == "email" || first == "full_name" || first == "fullname" || first == "name"
}

func resolveStudentCSVCols(header []string) (studentCSVColIndex, bool) {
	idx := studentCSVColIndex{username: -1, email: -1, password: -1, fullName: -1, year: -1, department: -1}
	for i, raw := range header {
		k := strings.ToLower(strings.TrimSpace(raw))
		switch k {
		case "username", "user", "login":
			idx.username = i
		case "email", "mail":
			idx.email = i
		case "password", "pass":
			idx.password = i
		case "full_name", "fullname", "name", "full name":
			idx.fullName = i
		case "year", "level":
			idx.year = i
		case "department", "dept":
			idx.department = i
		}
	}
	ok := idx.username >= 0 && idx.email >= 0 && idx.password >= 0 && idx.fullName >= 0 && idx.year >= 0 && idx.department >= 0
	return idx, ok
}

// AdminStudentsImportCSV imports student accounts from a CSV file.
//
// Supported CSV format (with optional header row):
//
//	username,email,password,fullName,year,department
func AdminStudentsImportCSV(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "file is required"})
			return
		}
		defer func() { _ = file.Close() }()

		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != "" && ext != ".csv" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "file must be a .csv"})
			return
		}

		var role models.Role
		if err := db.First(&role, "name = ?", "student").Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "student role not configured"})
			return
		}

		const maxBytes = 5 * 1024 * 1024
		reader := csv.NewReader(bufio.NewReader(io.LimitReader(file, maxBytes)))

		records := make([][]string, 0, 128)
		for {
			rec, err := reader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "invalid CSV: " + err.Error()})
				return
			}
			records = append(records, rec)
			if len(records) > 1000 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "too many rows (max 1000)"})
				return
			}
		}

		if len(records) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "CSV is empty"})
			return
		}

		col := studentCSVColIndex{username: 0, email: 1, password: 2, fullName: 3, year: 4, department: 5}
		start := 0
		if looksLikeStudentHeader(records[0]) {
			if resolved, ok := resolveStudentCSVCols(records[0]); ok {
				col = resolved
				start = 1
			}
		}

		type rowPayload struct {
			rowNum     int
			username   string
			email      string
			passHash   string
			fullName   string
			year       int
			department string
		}

		payloads := make([]rowPayload, 0, len(records)-start)
		for i := start; i < len(records); i++ {
			rec := records[i]
			get := func(idx int) string {
				if idx < 0 || idx >= len(rec) {
					return ""
				}
				return rec[idx]
			}

			rowNum := i + 1
			username := strings.TrimSpace(get(col.username))
			email := strings.TrimSpace(strings.ToLower(get(col.email)))
			password := strings.TrimSpace(get(col.password))
			fullName := strings.TrimSpace(get(col.fullName))
			yearRaw := strings.TrimSpace(get(col.year))
			department := strings.TrimSpace(get(col.department))

			if username == "" && email == "" && password == "" && fullName == "" && yearRaw == "" && department == "" {
				continue
			}

			if username == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: username is required", rowNum)})
				return
			}
			if email == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: email is required", rowNum)})
				return
			}
			if _, err := mail.ParseAddress(email); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: invalid email", rowNum)})
				return
			}
			if password == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: password is required", rowNum)})
				return
			}
			if len(password) < 8 {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: password must be at least 8 characters", rowNum)})
				return
			}
			if fullName == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: fullName is required", rowNum)})
				return
			}
			year, err := strconv.Atoi(yearRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: invalid year", rowNum)})
				return
			}
			if year <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: year must be >= 1", rowNum)})
				return
			}
			if department == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("row %d: department is required", rowNum)})
				return
			}

			hash, err := auth.HashPassword(password)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to hash password"})
				return
			}

			payloads = append(payloads, rowPayload{rowNum: rowNum, username: username, email: email, passHash: hash, fullName: fullName, year: year, department: department})
		}

		if len(payloads) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "no students found"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			for _, p := range payloads {
				user := models.User{Username: p.username, Email: p.email, PasswordHash: p.passHash, RoleID: role.ID}
				if err := tx.Create(&user).Error; err != nil {
					return fmt.Errorf("row %d: failed to create user: %w", p.rowNum, err)
				}
				student := models.Student{UserID: user.ID, FullName: p.fullName, Year: p.year, Department: p.department}
				if err := tx.Create(&student).Error; err != nil {
					return fmt.Errorf("row %d: failed to create student: %w", p.rowNum, err)
				}
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "failed to import students: " + err.Error()})
			return
		}

		c.JSON(http.StatusCreated, adminStudentsImportResponse{CreatedStudents: len(payloads)})
	}
}
