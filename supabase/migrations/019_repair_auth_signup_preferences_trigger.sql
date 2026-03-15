-- Repair the auth signup trigger that provisions a user_preferences row.
-- The live project is currently returning "Database error saving new user"
-- during auth signups, which points at a failing auth.users trigger path.

CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    hide_hover_overlay,
    date_format,
    time_format,
    theme
  )
  VALUES (
    NEW.id,
    false,
    'iso',
    '12hr',
    'system'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences();

INSERT INTO public.user_preferences (
  user_id,
  hide_hover_overlay,
  date_format,
  time_format,
  theme
)
SELECT
  users.id,
  false,
  'iso',
  '12hr',
  'system'
FROM auth.users AS users
LEFT JOIN public.user_preferences AS preferences
  ON preferences.user_id = users.id
WHERE preferences.user_id IS NULL;
