package controllers

import "github.com/Keneandita/huhems-backend/internal/models"

func isAnswerCorrect(questionType string, correctSet map[string]struct{}, selected []string) bool {
	if correctSet == nil {
		return false
	}
	selectedSet := map[string]struct{}{}
	for _, id := range selected {
		selectedSet[id] = struct{}{}
	}

	// Must match exactly.
	if len(selectedSet) != len(correctSet) {
		return false
	}
	for id := range correctSet {
		if _, ok := selectedSet[id]; !ok {
			return false
		}
	}

	// For single_choice, enforce exactly one.
	if questionType == string(models.QuestionTypeSingleChoice) && len(correctSet) != 1 {
		return false
	}

	return true
}
