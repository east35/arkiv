-- Add theme preference
ALTER TABLE public.user_preferences 
ADD COLUMN theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));
