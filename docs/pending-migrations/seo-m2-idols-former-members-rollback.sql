-- Rollback of seo-m2-idols-former-members.sql: marks the two rows active again.
update public.idols set active = true
where (id = 115 and name = 'Heeseung') or (id = 36 and name = 'Danielle');
