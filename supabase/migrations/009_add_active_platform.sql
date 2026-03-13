-- Add active_platform column to games table for user-selected tracking platform
ALTER TABLE games ADD COLUMN active_platform text;
