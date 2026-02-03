package main

import (
	"log"

	"github.com/Keneandita/huhems-backend/internal/config"
	"github.com/Keneandita/huhems-backend/internal/db"
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

	log.Printf("migration complete")
}
