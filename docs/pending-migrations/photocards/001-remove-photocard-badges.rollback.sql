-- Rollback of 001-remove-photocard-badges.sql: the 6 definitions, byte for byte as read in production on 2026-11-06.
-- The 3 earned rows (1 player) are not in this public file: restore them from the backup of the session if ever needed.
-- Prints: definitions_present. Expect 6.
begin;
insert into public.badge_definitions (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order, icon, site_id) values
  ('pc_first', 'First Card', 'Started a photocard collection.', 'star', '#F3ECFB', '#B79BE0', '#4A2E73', 30, null, 'kpop'),
  ('pc_collector', 'Collector', 'Owns 25 or more photocards.', 'stack', '#E7F1FB', '#8FB6E4', '#274A70', 31, null, 'kpop'),
  ('pc_set', 'Full Set', 'Completed every card of a group''s set.', 'gem', '#FBECF2', '#E29BBB', '#732E4E', 32, null, 'kpop'),
  ('quest_collector_1', 'Collector I', 'Complete a photocard set.', 'cards', '#EEF1F4', '#9AA7B2', '#3A454E', 140, null, 'kpop'),
  ('quest_collector_5', 'Collector II', 'Complete 5 photocard sets.', 'cards', '#EEF1F4', '#9AA7B2', '#3A454E', 141, null, 'kpop'),
  ('quest_collector_25', 'Collector III', 'Complete 25 photocard sets.', 'cards', '#EEF1F4', '#9AA7B2', '#3A454E', 142, null, 'kpop')
on conflict (id) do nothing;
select count(*) as definitions_present from public.badge_definitions
where id in ('pc_first', 'pc_collector', 'pc_set', 'quest_collector_1', 'quest_collector_5', 'quest_collector_25');
commit;
