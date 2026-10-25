-- SEO Mission 2, part D (2026-10-15): two quiz profiles of former members.
-- OWNER-RUN ONLY. Data change, no schema change. Rollback: seo-m2-wma-former-members-rollback.sql.
--
-- Why: Wikidata and the group's Wikipedia article both list these two people as former
-- members (Heeseung left ENHYPEN in March 2026; Danielle left NewJeans in December 2025),
-- so the Which member are you quiz should not give them as a member result. The code
-- already leaves them out (apps/quiz/src/lib/personality/rosters.ts, currentProfiles), so
-- the pages are right before this runs; this makes the table say the same thing, so a
-- future reader of personality_profiles does not bring them back.
--
-- Effect: the two rows stay (active = false), nothing is deleted. Saved results are not
-- touched; they are simply no longer counted, as the pages already do.

begin;

update public.personality_profiles p
   set active = false
  from public.groups g
 where g.id = p.group_id
   and ((g.slug = 'enhypen' and p.member_slug = 'heeseung')
     or (g.slug = 'newjeans' and p.member_slug = 'danielle'))
   and p.active = true;

-- Expect exactly 2 rows updated; anything else: rollback.
select g.slug, p.member_slug, p.active
  from public.personality_profiles p join public.groups g on g.id = p.group_id
 where (g.slug = 'enhypen' and p.member_slug = 'heeseung')
    or (g.slug = 'newjeans' and p.member_slug = 'danielle');

commit;
