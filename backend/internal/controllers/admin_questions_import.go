package controllers

import (
	"bufio"
	"encoding/csv"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/Keneandita/huhems-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type adminQuestionsImportResponse struct {
	CreatedQuestions int `json:"createdQuestions"`
}

type csvColIndex struct {
	text    int
	typeCol int
	choices int
	correct int
}

func normalizeQuestionTypeCSV(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	switch v {
	case "single", "singlechoice", "single_choice", "single-choice", "sc":
		return string(models.QuestionTypeSingleChoice)
	case "multi", "multiple", "multichoice", "multi_choice", "multi-choice", "mc":
		return string(models.QuestionTypeMultiChoice)
	default:
		return strings.TrimSpace(v)
	}
}

func splitPipeList(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parts := strings.Split(value, "|")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t == "" {
			continue
		}
		out = append(out, t)
	}
	return out
}

func parseCorrectSpec(value string, choices []string) ([]int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	// Accept either "1|3" or "1,3" etc.
	value = strings.ReplaceAll(value, ",", "|")
	parts := splitPipeList(value)
	idx := make([]int, 0, len(parts))
	seen := map[int]struct{}{}

	allNumeric := true
	for _, p := range parts {
		if _, err := strconv.Atoi(p); err != nil {
			allNumeric = false
			break
		}
	}

	if allNumeric {
		// Disambiguation: if the numeric values fit within the number of choices,
		// interpret them as 1-based indices; otherwise treat them as answer text.
		allInRange := true
		parsed := make([]int, 0, len(parts))
		for _, p := range parts {
			n, err := strconv.Atoi(strings.TrimSpace(p))
			if err != nil {
				return nil, err
			}
			if n <= 0 {
				return nil, errInvalid("correct indices must be 1-based")
			}
			parsed = append(parsed, n)
			if n > len(choices) {
				allInRange = false
			}
		}
		if allInRange {
			for _, n := range parsed {
				if _, ok := seen[n]; ok {
					continue
				}
				seen[n] = struct{}{}
				idx = append(idx, n)
			}
			return idx, nil
		}
		// Fall through: treat as choice text (e.g. "80").
	}

	// Treat as exact choice text(s). Match case-insensitively against the parsed choices.
	for _, token := range parts {
		match := 0
		matchIndex := 0
		for i, ch := range choices {
			if strings.EqualFold(strings.TrimSpace(ch), token) {
				match++
				matchIndex = i + 1 // 1-based
			}
		}
		if match == 0 {
			return nil, errInvalid("correct value not found in choices: " + token)
		}
		if match > 1 {
			return nil, errInvalid("correct value matches multiple choices: " + token)
		}
		if _, ok := seen[matchIndex]; ok {
			continue
		}
		seen[matchIndex] = struct{}{}
		idx = append(idx, matchIndex)
	}
	return idx, nil
}

func looksLikeHeader(record []string) bool {
	if len(record) == 0 {
		return false
	}
	first := strings.ToLower(strings.TrimSpace(record[0]))
	return first == "text" || first == "question" || first == "question_text" || first == "questiontext"
}

func resolveCSVCols(header []string) (csvColIndex, bool) {
	idx := csvColIndex{text: -1, typeCol: -1, choices: -1, correct: -1}
	for i, raw := range header {
		k := strings.ToLower(strings.TrimSpace(raw))
		switch k {
		case "text", "question", "question_text", "questiontext":
			idx.text = i
		case "type", "question_type", "questiontype":
			idx.typeCol = i
		case "choices", "options":
			idx.choices = i
		case "correct", "correct_indices", "correctindices", "answer", "answers":
			idx.correct = i
		}
	}
	ok := idx.text >= 0 && idx.typeCol >= 0 && idx.choices >= 0 && idx.correct >= 0
	return idx, ok
}

// AdminExamQuestionsImportCSV imports questions from a CSV file.
//
// Supported CSV format (with optional header row):
//
//	text,type,choices,correct
//
// Where:
//   - type: single_choice or multi_choice (also accepts single/multi)
//   - choices: pipe-separated list, e.g. "A|B|C|D"
//   - correct: either pipe-separated 1-based indices into choices (e.g. "3" or "1|4"),
//     or exact choice text value(s) (e.g. "Central Processing Unit").
func AdminExamQuestionsImportCSV(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		examID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid exam id"})
			return
		}

		// Ensure exam exists.
		var exam models.Exam
		if err := db.First(&exam, "id = ?", examID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"message": "exam not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load exam"})
			return
		}

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

		// Limit size to avoid abuse.
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

		col := csvColIndex{text: 0, typeCol: 1, choices: 2, correct: 3}
		start := 0
		if looksLikeHeader(records[0]) {
			if resolved, ok := resolveCSVCols(records[0]); ok {
				col = resolved
				start = 1
			}
		}

		// Validate/build payloads.
		type rowPayload struct {
			text    string
			qType   string
			choices []adminChoiceInput
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

			text := strings.TrimSpace(get(col.text))
			typeRaw := strings.TrimSpace(get(col.typeCol))
			choicesRaw := strings.TrimSpace(get(col.choices))
			correctRaw := strings.TrimSpace(get(col.correct))

			// Skip blank lines.
			if text == "" && typeRaw == "" && choicesRaw == "" && correctRaw == "" {
				continue
			}

			if text == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": text is required"})
				return
			}

			qType := normalizeQuestionTypeCSV(typeRaw)
			if qType != string(models.QuestionTypeSingleChoice) && qType != string(models.QuestionTypeMultiChoice) {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": invalid question type"})
				return
			}

			choiceTexts := splitPipeList(choicesRaw)
			if len(choiceTexts) < 2 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": at least 2 choices are required"})
				return
			}
			if len(choiceTexts) > 10 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": too many choices (max 10)"})
				return
			}

			correctIdx, err := parseCorrectSpec(correctRaw, choiceTexts)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": invalid correct value(s): " + err.Error()})
				return
			}
			if len(correctIdx) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": at least 1 correct choice is required"})
				return
			}
			if qType == string(models.QuestionTypeSingleChoice) && len(correctIdx) != 1 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": single_choice must have exactly 1 correct choice"})
				return
			}

			correctSet := map[int]struct{}{}
			for _, n := range correctIdx {
				if n < 1 || n > len(choiceTexts) {
					c.JSON(http.StatusBadRequest, gin.H{"message": "row " + strconv.Itoa(i+1) + ": correct index out of range"})
					return
				}
				correctSet[n] = struct{}{}
			}

			choices := make([]adminChoiceInput, 0, len(choiceTexts))
			for j, ct := range choiceTexts {
				order := j + 1
				_, ok := correctSet[order]
				choices = append(choices, adminChoiceInput{Text: ct, IsCorrect: ok, Order: order})
			}

			payloads = append(payloads, rowPayload{text: text, qType: qType, choices: choices})
			if len(payloads) > 500 {
				c.JSON(http.StatusBadRequest, gin.H{"message": "too many questions (max 500)"})
				return
			}
		}

		if len(payloads) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "no questions found"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			for _, p := range payloads {
				q := models.Question{ExamID: examID, Text: p.text, Type: p.qType}
				if err := tx.Create(&q).Error; err != nil {
					return err
				}

				choices := make([]models.Choice, 0, len(p.choices))
				for _, ch := range p.choices {
					choices = append(choices, models.Choice{
						QuestionID: q.ID,
						Text:       strings.TrimSpace(ch.Text),
						IsCorrect:  ch.IsCorrect,
						Order:      ch.Order,
					})
				}
				if err := tx.Create(&choices).Error; err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to import questions: " + err.Error()})
			return
		}

		c.JSON(http.StatusCreated, adminQuestionsImportResponse{CreatedQuestions: len(payloads)})
	}
}
