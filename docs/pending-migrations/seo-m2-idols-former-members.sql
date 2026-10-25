-- OWNER-GATED. Marks two former members as inactive in public.idols, the table that feeds
-- Name all members, the hub member rows and every other surface that lists current members.
-- Both Wikidata and the Wikipedia Members sections list them as former members:
--   Heeseung left ENHYPEN in March 2026 (idols id 115);
--   Danielle left NewJeans in December 2025 (idols id 36).
-- Today "Name all ENHYPEN" and "Name all NewJeans" still expect them.
-- Follows the convention of the other former members in the table (active = false,
-- detached_at left null). Nothing is deleted. Rollback: seo-m2-idols-former-members-rollback.sql.

update public.idols set active = false
where (id = 115 and name = 'Heeseung') or (id = 36 and name = 'Danielle');

-- Check: both rows are now inactive.
select id, name, active from public.idols where id in (115, 36);
