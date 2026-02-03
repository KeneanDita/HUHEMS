package routes

import (
	"github.com/Keneandita/huhems-backend/internal/controllers"
	"github.com/Keneandita/huhems-backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Register(r *gin.Engine, db *gorm.DB, jwtSecret string) {

	r.GET("/health", controllers.Health)

	r.POST("/auth/login", controllers.AuthLogin(db, jwtSecret))

	authGroup := r.Group("/")
	authGroup.Use(middleware.AuthRequired(jwtSecret))
	authGroup.GET("/auth/me", controllers.AuthMe(db))
	authGroup.PUT("/auth/password", controllers.AuthChangePassword(db))

	admin := r.Group("/admin")
	admin.Use(middleware.AuthRequired(jwtSecret), middleware.RequireRole("admin"))
	admin.GET("/exams", controllers.AdminExamsList(db))
	admin.POST("/exams", controllers.AdminExamsCreate(db))
	admin.GET("/exams/:id", controllers.AdminExamsGet(db))
	admin.PUT("/exams/:id", controllers.AdminExamsUpdate(db))
	admin.DELETE("/exams/:id", controllers.AdminExamsDelete(db))
	admin.POST("/exams/:id/publish", controllers.AdminExamsPublish(db))
	admin.GET("/exams/:id/report", controllers.AdminExamReport(db))

	admin.GET("/students", controllers.AdminStudentsList(db))
	admin.POST("/students", controllers.AdminStudentsCreate(db))
	admin.POST("/students/import", controllers.AdminStudentsImportCSV(db))
	admin.PUT("/students/:id", controllers.AdminStudentsUpdate(db))
	admin.DELETE("/students/:id", controllers.AdminStudentsDelete(db))

	admin.POST("/exams/:id/questions", controllers.AdminExamQuestionsCreate(db))
	admin.POST("/exams/:id/questions/import", controllers.AdminExamQuestionsImportCSV(db))
	admin.PUT("/questions/:id", controllers.AdminQuestionsUpdate(db))
	admin.DELETE("/questions/:id", controllers.AdminQuestionsDelete(db))

	student := r.Group("/student")
	student.Use(middleware.AuthRequired(jwtSecret), middleware.RequireRole("student"))
	student.GET("/exams", controllers.StudentExamsList(db))
	student.POST("/exams/:id/start", controllers.StudentExamStartAttempt(db))
	student.GET("/attempts/:id", controllers.StudentAttemptGet(db))
	student.POST("/attempts/:id/answer", controllers.StudentAttemptAnswer(db))
	student.POST("/attempts/:id/flag", controllers.StudentAttemptFlag(db))
	student.POST("/attempts/:id/submit", controllers.StudentAttemptSubmit(db))
	student.GET("/attempts/:id/result", controllers.StudentAttemptResult(db))
	student.GET("/results", controllers.StudentResultsList(db))
}
