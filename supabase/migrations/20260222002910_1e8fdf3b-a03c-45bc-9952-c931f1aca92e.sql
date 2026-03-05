
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users missing a profile
INSERT INTO public.profiles (user_id, full_name, email, is_active)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), email, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
