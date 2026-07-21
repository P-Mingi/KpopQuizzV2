-- 109 - Daily Debate question bank seed (Workstream F2b, B2).
--
-- The 60 owner-approved rows from docs/debate-question-bank.md, inserted AS-IS.
-- used_on stays null so every row is unused and eligible for the daily pick;
-- ensure_daily_debate marks one used per day. Re-runnable: guarded by a NOT
-- EXISTS on the exact question text, so running twice does not duplicate rows.
--
-- Owner runs this on the prod dashboard after 108.

insert into public.debate_questions (question, side_a, side_b)
select v.question, v.side_a, v.side_b
from (values
  ('A b-side can be better than the title track', 'Agree', 'Disagree'),
  ('First gen K-pop is underrated by new fans', 'Agree', 'Disagree'),
  ('English-language singles lose the K-pop feel', 'Agree', 'Disagree'),
  ('Survival shows make stronger idols than traditional training', 'Agree', 'Disagree'),
  ('A bad music video can ruin a good song', 'Agree', 'Disagree'),
  ('Choreography matters more than vocals in a title track', 'Agree', 'Disagree'),
  ('You can have more than one ult group', 'Agree', 'Disagree'),
  ('Photocards are the best part of a physical album', 'Agree', 'Disagree'),
  ('Remixes are almost never better than the original', 'Agree', 'Disagree'),
  ('A light stick design actually matters', 'Agree', 'Disagree'),
  ('Pre-release singles spoil the album experience', 'Agree', 'Disagree'),
  ('Long hiatuses kill a group''s momentum for good', 'Agree', 'Disagree'),
  ('Fanchants make a concert, not the setlist', 'Agree', 'Disagree'),
  ('Digital-only releases should replace physical albums', 'Agree', 'Disagree'),
  ('B-side stages deserve music show wins', 'Agree', 'Disagree'),
  ('The best K-pop era is always the one you debuted into as a fan', 'Agree', 'Disagree'),
  ('Solo debuts hit harder than subunit debuts', 'Agree', 'Disagree'),
  ('A perfect all-rounder beats a killer specialist', 'Agree', 'Disagree'),
  ('Concert livestreams are a real substitute for being there', 'Agree', 'Disagree'),
  ('Studio version first, live stages after', 'Agree', 'Disagree'),
  ('Concept photos hype a comeback more than teasers do', 'Agree', 'Disagree'),
  ('A great debut song is a curse (nothing after ever compares)', 'Agree', 'Disagree'),
  ('K-dramas OSTs count as K-pop', 'Agree', 'Disagree'),
  ('The intro track is the most skippable song on any album', 'Agree', 'Disagree'),
  ('Winter ballads beat summer bops', 'Agree', 'Disagree'),
  ('You should listen to a full album in order at least once', 'Agree', 'Disagree'),
  ('Dance practice videos are better than the actual MV', 'Agree', 'Disagree'),
  ('An iconic outfit can carry an entire era', 'Agree', 'Disagree'),
  ('Encore stages show the real vocals', 'Agree', 'Disagree'),
  ('Being multi-fandom is the only sane way to enjoy K-pop', 'Agree', 'Disagree'),
  ('Album collector or concert goer', 'Collector', 'Concert goer'),
  ('High note or rap verse', 'High note', 'Rap verse'),
  ('Girl group b-sides or boy group b-sides', 'GG b-sides', 'BG b-sides'),
  ('Retro concept or futuristic concept', 'Retro', 'Futuristic'),
  ('First listen: lyrics or melody', 'Lyrics', 'Melody'),
  ('Debut songs or latest comebacks', 'Debuts', 'Latest'),
  ('2nd gen title tracks or 4th gen title tracks', '2nd gen', '4th gen'),
  ('Dark concept or bright concept', 'Dark', 'Bright'),
  ('OT-group stan or bias-only stan', 'OT stan', 'Bias-only'),
  ('Vocal line or dance line', 'Vocal line', 'Dance line'),
  ('Korean version or Japanese version', 'Korean ver', 'Japanese ver'),
  ('Music show or festival stage', 'Music show', 'Festival'),
  ('Fansite photos or official photoshoot', 'Fansite', 'Official'),
  ('Album unboxing or streaming day one', 'Unboxing', 'Streaming'),
  ('Choreo with props or pure dance', 'Props', 'Pure dance'),
  ('Pre-debut content or post-debut content', 'Pre-debut', 'Post-debut'),
  ('Group reality show or individual vlogs', 'Reality show', 'Vlogs'),
  ('Title track repeat or full album shuffle', 'Title repeat', 'Shuffle'),
  ('Live band stage or original track stage', 'Live band', 'Original track'),
  ('Emotional ballad ending or hype song ending for a concert', 'Ballad end', 'Hype end'),
  ('Waiting for a comeback: teasers daily or drop it all at once', 'Slow tease', 'All at once'),
  ('Merch money: albums or concert tickets', 'Albums', 'Tickets'),
  ('Better flex: front row once or 5 shows from the back', 'Front row once', '5 shows back'),
  ('New fan homework: start with discography or start with variety content', 'Discography', 'Variety'),
  ('Comeback at midnight or comeback at 6pm KST', 'Midnight', '6pm KST'),
  ('Spoil the setlist before your concert or go in blind', 'Spoil me', 'Blind'),
  ('Group chat theory-crafting or clean-feed no-spoilers', 'Theories', 'No spoilers'),
  ('Anniversary VCR tears or new song premiere screams', 'VCR tears', 'Premiere screams'),
  ('Collect one group deeply or sample every comeback', 'One deep', 'Sample all'),
  ('Your ult''s worst era is still better than most groups'' best', 'Agree', 'Disagree')
) as v(question, side_a, side_b)
where not exists (
  select 1 from public.debate_questions d where d.question = v.question
);
