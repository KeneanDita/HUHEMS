package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL     string
	JWTSecret string
	Port      string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		DBURL:     os.Getenv("DB_URL"),
		JWTSecret: os.Getenv("JWT_SECRET"),
		Port:      os.Getenv("PORT"),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.DBURL == "" {
		return Config{}, fmt.Errorf("DB_URL is required")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}
