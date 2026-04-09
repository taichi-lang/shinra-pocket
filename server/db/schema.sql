-- Shinra Pocket — PostgreSQL Schema
-- Run: psql -U postgres -d shinra_pocket -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(32)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rating        INTEGER      NOT NULL DEFAULT 1000,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_rating   ON users (rating DESC);

-- ============================================================
-- Game Results
-- ============================================================
CREATE TABLE IF NOT EXISTS game_results (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type   VARCHAR(32)  NOT NULL,
  player1_id  UUID         NOT NULL REFERENCES users(id),
  player2_id  UUID         NOT NULL REFERENCES users(id),
  winner_id   UUID                  REFERENCES users(id),  -- NULL = draw
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_results_type      ON game_results (game_type);
CREATE INDEX IF NOT EXISTS idx_game_results_player1   ON game_results (player1_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player2   ON game_results (player2_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created   ON game_results (created_at DESC);

-- ============================================================
-- Rankings (simple +1/-1 system, starting at 100)
-- ============================================================
CREATE TABLE IF NOT EXISTS rankings (
  user_id      UUID PRIMARY KEY REFERENCES users(id),
  display_name TEXT         NOT NULL DEFAULT 'Player',
  rating       INTEGER      NOT NULL DEFAULT 100,
  wins         INTEGER      NOT NULL DEFAULT 0,
  losses       INTEGER      NOT NULL DEFAULT 0,
  draws        INTEGER      NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rankings_rating ON rankings (rating DESC);

-- Legacy per-game-type rankings (kept for migration compatibility)
CREATE TABLE IF NOT EXISTS rankings_legacy (
  user_id    UUID        NOT NULL REFERENCES users(id),
  game_type  VARCHAR(32) NOT NULL,
  wins       INTEGER     NOT NULL DEFAULT 0,
  losses     INTEGER     NOT NULL DEFAULT 0,
  rating     INTEGER     NOT NULL DEFAULT 1000,
  PRIMARY KEY (user_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_rankings_legacy_rating ON rankings_legacy (game_type, rating DESC);

-- ============================================================
-- Serial Codes
-- ============================================================
CREATE TABLE IF NOT EXISTS serial_codes (
  code                TEXT PRIMARY KEY,
  tickets             INTEGER      NOT NULL DEFAULT 1,
  expires_at          TIMESTAMPTZ,
  max_redemptions     INTEGER      NOT NULL DEFAULT 0,
  current_redemptions INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS serial_code_redemptions (
  code        TEXT         NOT NULL,
  device_id   TEXT         NOT NULL,
  redeemed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code, device_id)
);

-- ============================================================
-- Banned Users
-- ============================================================
CREATE TABLE IF NOT EXISTS banned_users (
  user_id   UUID PRIMARY KEY REFERENCES users(id),
  reason    TEXT         NOT NULL DEFAULT '',
  banned_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
