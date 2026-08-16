-- Seed: BTS entity-level trivia (feeds the did-you-know + Verse fact rails).
-- Every row real + sourced (covenant). entity_id is the entity's own id.
-- group_id = 1 (BTS). Idempotent via the (entity_kind, entity_id, fact) unique index.
INSERT INTO public.trivia (entity_kind, entity_id, group_id, category, fact, source) VALUES
-- GROUP (entity_id '1')
('group','1',1,'history','BTS debuted on June 13, 2013 under Big Hit Entertainment.','Wikidata'),
('group','1',1,'history','The name Bangtan Sonyeondan translates as "bulletproof boy scouts", later widened for a global audience to "Beyond The Scene".','Wikipedia'),
('group','1',1,'members','BTS has seven members: RM, Jin, Suga, J-Hope, Jimin, V and Jungkook.','MusicBrainz'),
('group','1',1,'achievements','In 2020 "Dynamite" became BTS''s first number one on the US Billboard Hot 100.','Billboard'),
('group','1',1,'history','BTS''s fandom is called ARMY.','KpopVerse DB'),
-- IDOLS
('idol','1',1,'members','RM, born Kim Namjoon on September 12, 1994, is the leader of BTS.','KpopVerse DB'),
('idol','2',1,'members','Jin, born Kim Seokjin on December 4, 1992, is the oldest member of BTS.','KpopVerse DB'),
('idol','3',1,'members','Suga, born Min Yoongi on March 9, 1993, is a rapper and producer in BTS.','KpopVerse DB'),
('idol','4',1,'members','J-Hope, born Jung Hoseok on February 18, 1994, is a main dancer and rapper in BTS.','KpopVerse DB'),
('idol','5',1,'members','Jimin, born Park Jimin on October 13, 1995, is a main dancer and vocalist in BTS.','KpopVerse DB'),
('idol','6',1,'members','V, born Kim Taehyung on December 30, 1995, is a vocalist in BTS.','KpopVerse DB'),
('idol','7',1,'members','Jungkook, born September 1, 1997, is the youngest member of BTS, often called the maknae.','KpopVerse DB'),
-- ALBUMS
('album','14',1,'music','BTS''s 2016 album WINGS gave each of the seven members a solo song.','Wikipedia'),
('album','5',1,'music','Map of the Soul: 7 (2020) draws on Jungian ideas of persona and shadow.','Wikipedia')
ON CONFLICT DO NOTHING;
