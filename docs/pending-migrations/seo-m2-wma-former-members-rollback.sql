-- Rollback of seo-m2-wma-former-members.sql: the two profiles active again.
-- The pages keep leaving them out while rosters.json lists them as former members.

begin;

update public.personality_profiles p
   set active = true
  from public.groups g
 where g.id = p.group_id
   and ((g.slug = 'enhypen' and p.member_slug = 'heeseung')
     or (g.slug = 'newjeans' and p.member_slug = 'danielle'));

commit;
