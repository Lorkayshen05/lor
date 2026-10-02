-- AI Quest (PHP + MySQL) — Stage 3/4 schema
-- Run this once in your MySQL client before using the app.

CREATE DATABASE IF NOT EXISTS ai_quest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_quest;

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
