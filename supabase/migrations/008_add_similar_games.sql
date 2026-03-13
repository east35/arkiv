-- Add similar_games column to games table for storing IGDB recommendations
ALTER TABLE games ADD COLUMN similar_games jsonb NOT NULL DEFAULT '[]';
