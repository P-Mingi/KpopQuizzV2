-- Set logo_url for groups that have local logo files in /public/logos/
UPDATE public.groups SET logo_url = '/logos/blackpink.svg' WHERE slug = 'blackpink';
