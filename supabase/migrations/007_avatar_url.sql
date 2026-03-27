ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

ALTER TABLE public.profiles ADD CONSTRAINT avatar_url_max_length
  CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);
ALTER TABLE public.profiles ADD CONSTRAINT avatar_url_format
  CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://');
