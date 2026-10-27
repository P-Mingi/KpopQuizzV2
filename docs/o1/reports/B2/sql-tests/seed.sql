insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 'b2-local@example.com');
insert into public.profiles (id, username) values ('00000000-0000-0000-0000-0000000000b2', 'b2_local');
insert into public.groups (name, slug, display_color, text_color) values ('B2 Local Group', 'b2-local-group', '#111111', '#ffffff');
insert into public.quizzes (creator_id, group_id, title, slug, questions)
select '00000000-0000-0000-0000-0000000000b2', id, 'B2 local quiz', 'b2-local-quiz', '[1,2,3]'::jsonb from public.groups where slug = 'b2-local-group';
