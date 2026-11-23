-- L34-l1-kpopdle-fill.sql (lane DLE-KPOP, run O1, owner 2026-11-22: "I don't want any '?'. Double check everybody and put all the missing information.")
--
-- What:   no cell of Kpopdle Idol may show "?" and every value shown is the verified one. A cell shows "?" when the idol's value of a column is empty (gender, agency,
--         nationality, debut, generation; group, birth and role are never empty). This file fills what is empty and corrects what contradicts the verified truth below,
--         for the idols the game reads (the view's own filter: active, reviewed, not detached, adult on the day it runs), keyed by Wikidata QID (idols) and by name or slug (groups):
--         1. idols.gender: the Wikidata P21 value (female or male) of 281 adult QIDs; filled when empty, changed when it differs (the 174 values MusicBrainz also gives agree);
--         2. idols.nationality: the countries of Wikidata P27, one label per country ("China" for the Wikidata label "People's Republic of China", the label the K2 rows use),
--            sorted, comma separated. Filled when empty. A value already there is changed only when it shares NO country with the truth (a contradiction), after the same label
--            normalisation (so "Canada" against Canada and South Korea stays, and so does a single-country K1 value that is one of the truth's countries). Two values are not Wikidata's:
--            Wendy (Q17478642, Wikidata has no citizenship) is South Korea from English Wikipedia, and Jay of ENHYPEN (Q105717862, one unreferenced Wikidata claim for the United States
--            besides South Korea) is the vaguer true value South Korea;
--         3. idols.debut_year: filled when empty only, with the value the owner-approved files hold (021a, 021c, 021d, L19: first official release as a member of a debuted group);
--            a value already there is never changed (a row someone edited is the owner's);
--         4. groups.record_label: the main Korean company that forms and manages the group, from the label of the English Wikipedia infobox (the same company names as L19 and 021d);
--            filled when empty, changed when it differs after lower-casing and dropping every non letter or digit ("Big Hit Music" and "BigHit Music" are the same). The names go into
--            public.agencies (022) like L19 does (only the missing ones, created_at 2026-11-22 00:00 UTC so the rollback deletes exactly those);
--         5. groups.generation: the published rule on the group's debut year (1st <= 2002, 2nd 2003-2011, 3rd 2012-2017, 4th 2018-2022, 5th >= 2023); filled when empty or without
--            a digit 1 to 5, changed when its digit differs from the rule;
--         6. one public.entity_sources row per written value (source wikidata with the QID, or wikipedia with the revision read on 2026-11-22; stamped fetched_at 2026-11-22 00:00 UTC;
--            an existing row for the same entity, field and source is kept);
--         7. dle_refresh_entities('kpopdle-idol') when the game has a snapshot: an idol that becomes complete becomes a possible answer. Nothing is removed from the pool, the bank and
--            the calendar are not touched (never dle_build_bank).
--         Every UPDATE has a WHERE (QID or name or slug, plus the guard "empty or contradicting"); the old value of every changed cell is first saved in public.kpopdle_fill_backup
--         (closed to the browser roles; the first saved value is kept) so the rollback puts the exact old value back, only where the row still holds the value this file wrote.
--         Never touched: birth dates, positions (the role), active, needs_review, any idol that is under 18 or inactive, any other column. No picture is read or written.
--         Sources read on 2026-11-22: Wikidata (wbgetentities P21, P27, P463 of the 281 QIDs), English Wikipedia (infobox label and years_active, lead sentence; revision ids in the rows below).
--         Not sources: kprofiles, fandom wikis, any fan database.
-- Needs:  019, 020, 021a, 021c, 021d, 021e, 022 (public.agencies), 011 (entity_sources.source_url); L19 and L20 first (this file keeps their labels). Safe in any order after them.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. The calendar is not
--         touched. The idols that become complete (S.Coups, DK, The8, Kai, Jay, Wendy and whoever else production holds with an empty cell) become possible answers: the pool grows, the
--         bank is not rebuilt.
-- Effect: kpopquiz.org: the nationality or gender of the filled idols and the Label line of the groups whose label was empty or contradicted (data only, no template change).
-- Verify: select count(*) from public.dle_src_kpop_idol s where exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0);   expect 0
-- Verify: select count(*) from public.dle_entities where game_id = 'kpopdle-idol' and in_pool and not can_be_target;   expect 0
-- Verify: select count(*) from public.idols i where i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (nullif(btrim(i.gender), '') is null or nullif(btrim(i.nationality), '') is null or i.debut_year is null);   expect 0
-- Verify: select count(*) from public.groups g where g.site_id = 'kpop' and exists (select 1 from public.idols i where i.group_id = g.id and i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date) and (nullif(btrim(g.record_label), '') is null or (nullif(btrim(g.generation), '') is null and g.inception_date is null));   expect 0
-- Verify: select string_agg(id || '=' || gender || '/' || nationality, ',' order by id) from public.idols where id in (39, 46, 48, 175);   expect 39=male/South Korea,46=male/South Korea,48=male/China,175=male/South Korea
-- Verify: select string_agg(id || '=' || nationality, ',' order by id) from public.idols where id in (104, 116);   expect 104=South Korea,116=South Korea
-- Verify: select record_label from public.groups where site_id = 'kpop' and slug = 'fifty-fifty';   expect Attrakt
-- Undo:   L34-l1-kpopdle-fill.rollback.sql (puts back the exact previous values from the backup table, only where a row still holds what this file wrote; drops the table).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l34$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

declare
  -- Verified truth by Wikidata QID: gender, nationality, debut year (only where the owner-approved files hold one); ns, nu, nr: another source of the nationality (default Wikidata, its item, the QID).
  v_idols jsonb := '[
{"qid":"Q101161002","gender":"female","nat":"South Korea","debut":2020},
{"qid":"Q101161168","gender":"female","nat":"Japan","debut":2020},
{"qid":"Q101161289","gender":"female","nat":"South Korea","debut":2020},
{"qid":"Q101161499","gender":"female","nat":"China","debut":2020},
{"qid":"Q104370500","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q104604557","gender":"male","nat":"Japan","debut":2020},
{"qid":"Q104723121","gender":"male","nat":"Taiwan","debut":2022},
{"qid":"Q105717862","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q105717901","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q105717977","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q105718037","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q105718407","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q10769072","gender":"male","nat":"China"},
{"qid":"Q10775090","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q10788758","gender":"male","nat":"China"},
{"qid":"Q10802388","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q108043218","gender":"male","nat":"Japan","debut":2020},
{"qid":"Q10822003","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q10834841","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q109108495","gender":"female","nat":"China"},
{"qid":"Q109108660","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q109108909","gender":"female","nat":"Japan","debut":2022},
{"qid":"Q109109100","gender":"female","nat":"South Korea"},
{"qid":"Q109120276","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q109141485","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q109307956","gender":"female","nat":"South Korea"},
{"qid":"Q109307988","gender":"female","nat":"South Korea"},
{"qid":"Q109308055","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q109308189","gender":"female","nat":"South Korea"},
{"qid":"Q109308262","gender":"female","nat":"South Korea"},
{"qid":"Q109420011","gender":"female","nat":"South Korea","debut":2021},
{"qid":"Q109420139","gender":"female","nat":"South Korea","debut":2021},
{"qid":"Q109567033","gender":"female","nat":"South Korea"},
{"qid":"Q109571132","gender":"female","nat":"Japan","debut":2021},
{"qid":"Q109572155","gender":"female","nat":"South Korea","debut":2021},
{"qid":"Q111113517","gender":"female","nat":"Japan","debut":2021},
{"qid":"Q111537648","gender":"female","nat":"United States","debut":2022},
{"qid":"Q111544443","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q111544444","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q111544446","gender":"female","nat":"Japan","debut":2022},
{"qid":"Q113455624","gender":"female","nat":"Australia, South Korea","debut":2022},
{"qid":"Q113455973","gender":"female","nat":"Australia, Vietnam","debut":2022},
{"qid":"Q113508917","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q113561403","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q113561413","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q114690500","gender":"male","nat":"Canada","debut":2020},
{"qid":"Q115933814","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q116226143","gender":"male","nat":"Japan","debut":2022},
{"qid":"Q117178583","gender":"female","nat":"South Korea","debut":2022},
{"qid":"Q117746200","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q117747301","gender":"female","nat":"South Korea"},
{"qid":"Q117805493","gender":"female","nat":"South Korea","debut":2021},
{"qid":"Q117805511","gender":"female","nat":"South Korea","debut":2021},
{"qid":"Q117805516","gender":"female","nat":"Japan","debut":2021},
{"qid":"Q117817675","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q117818064","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q121579075","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q121579089","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q121579375","gender":"male","nat":"Japan, South Korea","debut":2020},
{"qid":"Q122272723","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q122293880","gender":"male","nat":"Japan","debut":2024},
{"qid":"Q122309465","gender":"male","nat":"Japan","debut":2024},
{"qid":"Q122349180","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q122363261","gender":"male","nat":"Japan","debut":2024},
{"qid":"Q123153864","gender":"male","nat":"Japan","debut":2024},
{"qid":"Q123310101","gender":"male","nat":"South Korea, United States","debut":2023},
{"qid":"Q123528880","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q123528897","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q123528913","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q123554435","gender":"female","nat":"Japan","debut":2024},
{"qid":"Q123554436","gender":"female","nat":"Thailand","debut":2024},
{"qid":"Q123554438","gender":"female","nat":"Japan","debut":2024},
{"qid":"Q123554439","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q123554440","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q123560890","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q124091988","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q124692741","gender":"female","nat":"Switzerland","debut":2024},
{"qid":"Q124692753","gender":"female","nat":"Philippines, United States","debut":2024},
{"qid":"Q124692767","gender":"female","nat":"United States","debut":2024},
{"qid":"Q124692773","gender":"female","nat":"United States","debut":2024},
{"qid":"Q124692787","gender":"female","nat":"United States","debut":2024},
{"qid":"Q12494180","gender":"male","nat":"China","debut":2012},
{"qid":"Q12582984","gender":"female","nat":"South Korea"},
{"qid":"Q125865775","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q12605358","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q126923756","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q126923757","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q126923760","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q126923761","gender":"female","nat":"Japan","debut":2024},
{"qid":"Q127427815","gender":"male","nat":"South Korea","debut":2022},
{"qid":"Q129547871","gender":"female","nat":"South Korea, United States","debut":2024},
{"qid":"Q129548065","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q129548220","gender":"female","nat":"South Korea","debut":2024},
{"qid":"Q129548317","gender":"female","nat":"South Korea, Sweden","debut":2024},
{"qid":"Q131154617","gender":"male","nat":"South Korea","debut":2023},
{"qid":"Q131932320","gender":"female","nat":"South Korea","debut":2025},
{"qid":"Q131932322","gender":"female","nat":"South Korea","debut":2025},
{"qid":"Q131932323","gender":"female","nat":"Canada, South Korea","debut":2025},
{"qid":"Q132041926","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q132041928","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q132041929","gender":"male","nat":"China","debut":2024},
{"qid":"Q132041931","gender":"male","nat":"South Korea","debut":2024},
{"qid":"Q134575","gender":"male","nat":"South Korea","debut":2008},
{"qid":"Q135963716","gender":"male","nat":"China, Thailand","debut":2025},
{"qid":"Q135963733","gender":"male","nat":"South Korea","debut":2025},
{"qid":"Q135963739","gender":"male","nat":"Canada, South Korea","debut":2025},
{"qid":"Q15111667","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q153597","gender":"male","nat":"South Korea","debut":2008},
{"qid":"Q15934116","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q16071030","gender":"male","nat":"South Korea","debut":2014},
{"qid":"Q16075083","gender":"male","nat":"United States","debut":2014},
{"qid":"Q16098027","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q16236223","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q16688282","gender":"male","nat":"Thailand","debut":2014},
{"qid":"Q16905948","gender":"male","nat":"China","debut":2014},
{"qid":"Q17198771","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q17478642","gender":"female","ns":"wikipedia","nu":"https://en.wikipedia.org/wiki/Wendy_(singer)","nr":"rev 1385140600","nat":"South Korea","debut":2014},
{"qid":"Q17484113","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q17500581","gender":"male","nat":"South Korea","debut":2014},
{"qid":"Q17500887","gender":"male","nat":"South Korea","debut":2014},
{"qid":"Q18388296","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q18697707","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q194798","gender":"male","nat":"South Korea","debut":2006},
{"qid":"Q19483782","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q19483969","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q19603912","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q19603930","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q19730396","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q19940498","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q20514446","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q20688186","gender":"female","nat":"Japan, United States","debut":2015},
{"qid":"Q20688219","gender":"female","nat":"Taiwan","debut":2015},
{"qid":"Q20779386","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q20947093","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q20972211","gender":"male","nat":"China","debut":2015},
{"qid":"Q21060390","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q21075020","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q21623339","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21709909","gender":"female","nat":"South Korea"},
{"qid":"Q21710247","gender":"female","nat":"South Korea"},
{"qid":"Q21824862","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21824868","gender":"male","nat":"China","debut":2015},
{"qid":"Q21824887","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21824912","gender":"male","nat":"South Korea, United States","debut":2015},
{"qid":"Q21824947","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21824968","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21824990","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q21825065","gender":"male","nat":"South Korea, United States","debut":2015},
{"qid":"Q21825470","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q22338877","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q22773742","gender":"female","nat":"South Korea"},
{"qid":"Q22773776","gender":"male","nat":"Japan","debut":2016},
{"qid":"Q22773838","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q22774055","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q22804243","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q23008017","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q23012025","gender":"female","nat":"Japan","debut":2015},
{"qid":"Q233371","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q233385","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q233894","gender":"female","nat":"South Korea, United States","debut":2007},
{"qid":"Q236355","gender":"female","nat":"South Korea, United States","debut":2007},
{"qid":"Q23779926","gender":"female","nat":"Japan, South Korea","debut":2015},
{"qid":"Q240082","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q24043625","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q24276424","gender":"male","nat":"South Korea","debut":2013},
{"qid":"Q24566664","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q24572927","gender":"female","nat":"South Korea"},
{"qid":"Q24834621","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q253619","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q25374501","gender":"female","nat":"South Korea","debut":2015},
{"qid":"Q26196972","gender":"female","nat":"Australia, South Korea"},
{"qid":"Q26262599","gender":"female","nat":"South Korea","debut":2016},
{"qid":"Q26267642","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q26451151","gender":"male","nat":"Thailand","debut":2016},
{"qid":"Q26459163","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q26689986","gender":"male","nat":"Canada, South Korea","debut":2016},
{"qid":"Q26689987","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q26707663","gender":"female","nat":"Thailand","debut":2016},
{"qid":"Q26707915","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q27431345","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q27477017","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q276158","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q27655344","gender":"female","nat":"New Zealand, South Korea","debut":2016},
{"qid":"Q27655361","gender":"female","nat":"South Korea","debut":2016},
{"qid":"Q27951584","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q28549782","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q28549791","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q28653640","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q28698283","gender":"female","nat":"South Korea"},
{"qid":"Q28741579","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q28746303","gender":"male","nat":"South Korea","debut":2015},
{"qid":"Q30006465","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q30945670","gender":"male","nat":"China","debut":2016},
{"qid":"Q466975","gender":"female","nat":"South Korea","debut":2007},
{"qid":"Q4688701","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q47673408","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q47690025","gender":"male","nat":"South Korea, United States","debut":2017},
{"qid":"Q482991","gender":"male","nat":"South Korea","debut":2006},
{"qid":"Q483683","gender":"female","nat":"South Korea","debut":2009},
{"qid":"Q483842","gender":"female","nat":"South Korea","debut":2009},
{"qid":"Q483980","gender":"male","nat":"South Korea","debut":2008},
{"qid":"Q484484","gender":"male","nat":"South Korea","debut":2008},
{"qid":"Q48893612","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q491048","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q492313","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q494154","gender":"female","nat":"South Korea","debut":2009},
{"qid":"Q494692","gender":"male","nat":"South Korea","debut":2008},
{"qid":"Q495577","gender":"male","nat":"South Korea","debut":2006},
{"qid":"Q496170","gender":"female","nat":"South Korea","debut":2009},
{"qid":"Q52219380","gender":"male","nat":"China","debut":2018},
{"qid":"Q55287305","gender":"female","nat":"Taiwan","debut":2018},
{"qid":"Q55287306","gender":"female","nat":"China","debut":2018},
{"qid":"Q55694622","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56259179","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56259872","gender":"male","nat":"China","debut":2016},
{"qid":"Q56259927","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56278318","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q56476186","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56660174","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56761923","gender":"female","nat":"Thailand","debut":2018},
{"qid":"Q56816418","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56824821","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q56825122","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q57318729","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q57601775","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q58224261","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q58825704","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q58825794","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q58825825","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q59260597","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q59313184","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q59313270","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q59313326","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q59313384","gender":"female","nat":"China","debut":2017},
{"qid":"Q59313479","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q59313527","gender":"female","nat":"South Korea","debut":2014},
{"qid":"Q59313606","gender":"female","nat":"South Korea","debut":2017},
{"qid":"Q59594164","gender":"female","nat":"South Korea"},
{"qid":"Q59670293","gender":"male","nat":"Australia, South Korea","debut":2018},
{"qid":"Q59831589","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q60229471","gender":"male","nat":"China","debut":2016},
{"qid":"Q60467634","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q60644128","gender":"male","nat":"China","debut":2018},
{"qid":"Q60829936","gender":"female","nat":"South Korea","debut":2019},
{"qid":"Q60831979","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q60870263","gender":"female","nat":"South Korea","debut":2019},
{"qid":"Q60870265","gender":"female","nat":"South Korea","debut":2019},
{"qid":"Q60870266","gender":"female","nat":"South Korea","debut":2019},
{"qid":"Q60870268","gender":"female","nat":"South Korea","debut":2019},
{"qid":"Q60991892","gender":"male","nat":"South Korea","debut":2016},
{"qid":"Q60994278","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q61100297","gender":"female","nat":"South Korea","debut":2018},
{"qid":"Q61100669","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q61100678","gender":"male","nat":"Australia, South Korea","debut":2018},
{"qid":"Q61100680","gender":"male","nat":"South Korea"},
{"qid":"Q61715235","gender":"male","nat":"South Korea","debut":2019},
{"qid":"Q61715236","gender":"male","nat":"South Korea, United States","debut":2019},
{"qid":"Q62396696","gender":"male","nat":"South Korea","debut":2019},
{"qid":"Q62396828","gender":"male","nat":"South Korea","debut":2019},
{"qid":"Q62396954","gender":"male","nat":"South Korea","debut":2019},
{"qid":"Q63850969","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q6437313","gender":"male","nat":"Canada, China"},
{"qid":"Q64604849","gender":"male","nat":"Macau","debut":2019},
{"qid":"Q65054015","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q67975453","gender":"male","nat":"China","debut":2019},
{"qid":"Q67975872","gender":"male","nat":"Taiwan"},
{"qid":"Q7137681","gender":"male","nat":"South Korea","debut":2012},
{"qid":"Q85864418","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85873722","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85878532","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85878823","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85879242","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85880867","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q85884933","gender":"male","nat":"South Korea","debut":2018},
{"qid":"Q869966","gender":"female","nat":"Japan","debut":2012},
{"qid":"Q97319986","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q97320177","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q97326265","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q97352003","gender":"male","nat":"Japan","debut":2020},
{"qid":"Q97352009","gender":"male","nat":"South Korea","debut":2020},
{"qid":"Q98136886","gender":"male","nat":"South Korea","debut":2020}
]';
  -- Verified truth by group: the agency (name as groups.record_label), the generation number from the debut year, and the Wikipedia page and revision read.
  v_groups jsonb := '[
{"name":"BTS","slug":"bts","label":"BigHit Music","gen":3,"url":"https://en.wikipedia.org/wiki/BTS","rev":"1386911139"},
{"name":"BLACKPINK","slug":"blackpink","label":"YG Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Blackpink","rev":"1386266555"},
{"name":"Stray Kids","slug":"stray-kids","label":"JYP Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Stray_Kids","rev":"1386734558"},
{"name":"TWICE","slug":"twice","label":"JYP Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Twice","rev":"1383802108"},
{"name":"aespa","slug":"aespa","label":"SM Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Aespa","rev":"1385869925"},
{"name":"NewJeans","slug":"newjeans","label":"ADOR","gen":4,"url":"https://en.wikipedia.org/wiki/NewJeans","rev":"1386932641"},
{"name":"SEVENTEEN","slug":"seventeen","label":"Pledis Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)","rev":"1385718480"},
{"name":"(G)I-DLE","slug":"g-i-dle","label":"Cube Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/I-dle","rev":"1383781504"},
{"name":"IVE","slug":"ive","label":"Starship Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Ive_(group)","rev":"1386206986"},
{"name":"LE SSERAFIM","slug":"le-sserafim","label":"Source Music","gen":4,"url":"https://en.wikipedia.org/wiki/Le_Sserafim","rev":"1386879929"},
{"name":"NCT","slug":"nct","label":"SM Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/NCT_(group)","rev":"1386914687"},
{"name":"Red Velvet","slug":"red-velvet","label":"SM Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Red_Velvet_(group)","rev":"1384572447"},
{"name":"ATEEZ","slug":"ateez","label":"KQ Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Ateez","rev":"1384640036"},
{"name":"ENHYPEN","slug":"enhypen","label":"Belift Lab","gen":4,"url":"https://en.wikipedia.org/wiki/Enhypen","rev":"1384191788"},
{"name":"TXT","slug":"txt","label":"BigHit Music","gen":4,"url":"https://en.wikipedia.org/wiki/Tomorrow_X_Together","rev":"1387079360"},
{"name":"EXO","slug":"exo","label":"SM Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Exo","rev":"1386615843"},
{"name":"ITZY","slug":"itzy","label":"JYP Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Itzy","rev":"1385638088"},
{"name":"SHINee","slug":"shinee","label":"SM Entertainment","gen":2,"url":"https://en.wikipedia.org/wiki/Shinee","rev":"1384727298"},
{"name":"RIIZE","slug":"riize","label":"SM Entertainment","gen":5,"url":"https://en.wikipedia.org/wiki/Riize","rev":"1386590369"},
{"name":"Kep1er","slug":"kep1er","label":"WakeOne","gen":4,"url":"https://en.wikipedia.org/wiki/Kep1er","rev":"1383785431"},
{"name":"BABYMONSTER","slug":"babymonster","label":"YG Entertainment","gen":5,"url":"https://en.wikipedia.org/wiki/Babymonster","rev":"1384999188"},
{"name":"FIFTY FIFTY","slug":"fifty-fifty","label":"Attrakt","gen":4,"url":"https://en.wikipedia.org/wiki/Fifty_Fifty_(group)","rev":"1386705560"},
{"name":"LOONA","slug":"loona","label":"Blockberry Creative","gen":4,"url":"https://en.wikipedia.org/wiki/Loona","rev":"1384983346"},
{"name":"GOT7","slug":"got7","label":"JYP Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Got7","rev":"1377649604"},
{"name":"MONSTA X","slug":"monsta-x","label":"Starship Entertainment","gen":3,"url":"https://en.wikipedia.org/wiki/Monsta_X","rev":"1383793008"},
{"name":"Girls'' Generation","slug":"girls-generation","label":"SM Entertainment","gen":2,"url":"https://en.wikipedia.org/wiki/Girls''_Generation","rev":"1383778535"},
{"name":"ZEROBASEONE","slug":"zerobaseone","label":"WakeOne","gen":5,"url":"https://en.wikipedia.org/wiki/Zerobaseone","rev":"1386640681"},
{"name":"MAMAMOO","slug":"mamamoo","label":"Rainbow Bridge World","gen":3,"url":"https://en.wikipedia.org/wiki/Mamamoo","rev":"1386661109"},
{"name":"BIGBANG","slug":"bigbang","label":"YG Entertainment","gen":2,"url":"https://en.wikipedia.org/wiki/BigBang_(South_Korean_band)","rev":"1387134111"},
{"name":"KATSEYE","slug":"katseye","label":"Hybe UMG","gen":5,"url":"https://en.wikipedia.org/wiki/Katseye","rev":"1386940939"},
{"name":"ILLIT","slug":"illit","label":"Belift Lab","gen":5,"url":"https://en.wikipedia.org/wiki/Illit","rev":"1386964346"},
{"name":"TREASURE","slug":"treasure","label":"YG Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/Treasure_(band)","rev":"1383801988"},
{"name":"Dreamcatcher","slug":"dreamcatcher","label":"Dreamcatcher Company","gen":3,"url":"https://en.wikipedia.org/wiki/Dreamcatcher_(group)","rev":"1383776611"},
{"name":"TWS","slug":"tws","label":"Pledis Entertainment","gen":5,"url":"https://en.wikipedia.org/wiki/TWS_(group)","rev":"1386615201"},
{"name":"P1Harmony","slug":"p1harmony","label":"FNC Entertainment","gen":4,"url":"https://en.wikipedia.org/wiki/P1Harmony","rev":"1386243385"},
{"name":"CORTIS","slug":"cortis","label":"BigHit Music","gen":5,"url":"https://en.wikipedia.org/wiki/Cortis","rev":"1387062606"},
{"name":"Hearts2Hearts","slug":"hearts2hearts","label":"SM Entertainment","gen":5,"url":"https://en.wikipedia.org/wiki/Hearts2Hearts","rev":"1386732075"},
{"name":"&TEAM","slug":"team","label":"YX LABELS","gen":4,"url":"https://en.wikipedia.org/wiki/&Team","rev":"1383800489"},
{"name":"AKMU","slug":"akmu","label":"Cemter of Inspiration","gen":3,"url":"https://en.wikipedia.org/wiki/AKMU","rev":"1383771025"},
{"name":"ASTRO","slug":"astro","label":"Fantagio","gen":3,"url":"https://en.wikipedia.org/wiki/Astro_(South_Korean_band)","rev":"1382319710"}
]';
  c_gender integer := 0;
  c_nat integer := 0;
  c_debut integer := 0;
  c_label integer := 0;
  c_gen integer := 0;
  v_who text;
  v_under18 integer;
begin
  -- 0. Needs.
  if to_regclass('public.idols') is null or to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null or to_regclass('public.agencies') is null then
    raise exception 'L34: public.idols, groups, entity_sources and agencies (022) must all exist';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) <> 2 then
    raise exception 'L34: idols.gender or idols.debut_year is missing (apply 021a first)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then
    raise exception 'L34: entity_sources.source_url is missing (apply 011 first)';
  end if;
  if not exists (select 1 from public.dle_games where id = 'kpopdle-idol') then
    raise exception 'L34: the game kpopdle-idol is missing (apply 020 first)';
  end if;
  -- The saved old values (one row per changed cell; the first value saved is kept, a later run only moves new_value). Closed like the dle tables.
  create table if not exists public.kpopdle_fill_backup (
    file text not null,
    kind text not null check (kind in ('idol', 'group')),
    row_id integer not null,
    col text not null,
    old_value jsonb,
    new_value jsonb,
    saved_at timestamptz not null default now(),
    primary key (file, kind, row_id, col)
  );
  alter table public.kpopdle_fill_backup enable row level security;
  revoke all on table public.kpopdle_fill_backup from public, anon, authenticated;

  -- 1. Gender (Wikidata P21).
  -- gender
  insert into public.kpopdle_fill_backup as b (file, kind, row_id, col, old_value, new_value)
  select 'L34', 'idol', i.id, 'gender', to_jsonb(i.gender), to_jsonb(t.gender)
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (t.gender in ('female', 'male') and i.gender is distinct from t.gender)
  on conflict (file, kind, row_id, col) do update set new_value = excluded.new_value;
  update public.idols i set gender = t.gender
  from jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text)
  where t.qid = i.wikidata_qid and i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (t.gender in ('female', 'male') and i.gender is distinct from t.gender);
  get diagnostics c_gender = row_count;
  -- 2. Nationality: filled when empty; changed only when it shares no country with the truth.
  -- nationality
  insert into public.kpopdle_fill_backup as b (file, kind, row_id, col, old_value, new_value)
  select 'L34', 'idol', i.id, 'nationality', to_jsonb(i.nationality), to_jsonb(t.nat)
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (t.nat is not null and (nullif(btrim(i.nationality), '') is null or not exists (select 1 from regexp_split_to_table(i.nationality, '\s*[,;/]\s*') as o(c), regexp_split_to_table(t.nat, '\s*[,;/]\s*') as n(c) where case lower(btrim(o.c)) when 'people''s republic of china' then 'china' when 'united states of america' then 'united states' when 'usa' then 'united states' when 'republic of korea' then 'south korea' when 'korea' then 'south korea' when 'republic of china' then 'taiwan' else lower(btrim(o.c)) end = case lower(btrim(n.c)) when 'people''s republic of china' then 'china' when 'united states of america' then 'united states' when 'usa' then 'united states' when 'republic of korea' then 'south korea' when 'korea' then 'south korea' when 'republic of china' then 'taiwan' else lower(btrim(n.c)) end)))
  on conflict (file, kind, row_id, col) do update set new_value = excluded.new_value;
  update public.idols i set nationality = t.nat
  from jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text)
  where t.qid = i.wikidata_qid and i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (t.nat is not null and (nullif(btrim(i.nationality), '') is null or not exists (select 1 from regexp_split_to_table(i.nationality, '\s*[,;/]\s*') as o(c), regexp_split_to_table(t.nat, '\s*[,;/]\s*') as n(c) where case lower(btrim(o.c)) when 'people''s republic of china' then 'china' when 'united states of america' then 'united states' when 'usa' then 'united states' when 'republic of korea' then 'south korea' when 'korea' then 'south korea' when 'republic of china' then 'taiwan' else lower(btrim(o.c)) end = case lower(btrim(n.c)) when 'people''s republic of china' then 'china' when 'united states of america' then 'united states' when 'usa' then 'united states' when 'republic of korea' then 'south korea' when 'korea' then 'south korea' when 'republic of china' then 'taiwan' else lower(btrim(n.c)) end)));
  get diagnostics c_nat = row_count;
  -- 3. Debut year: filled when empty only.
  -- debut_year
  insert into public.kpopdle_fill_backup as b (file, kind, row_id, col, old_value, new_value)
  select 'L34', 'idol', i.id, 'debut_year', to_jsonb(i.debut_year), to_jsonb(t.debut)
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (i.debut_year is null and t.debut is not null)
  on conflict (file, kind, row_id, col) do update set new_value = excluded.new_value;
  update public.idols i set debut_year = t.debut
  from jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text)
  where t.qid = i.wikidata_qid and i.active and not i.needs_review and i.detached_at is null and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date and (i.debut_year is null and t.debut is not null);
  get diagnostics c_debut = row_count;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', i.id::text, 'gender', 'wikidata', t.qid, 'https://www.wikidata.org/wiki/' || t.qid, timestamptz '2026-11-22 00:00:00+00'
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where exists (select 1 from public.kpopdle_fill_backup b where b.file = 'L34' and b.kind = 'idol' and b.row_id = i.id and b.col = 'gender' and b.new_value = to_jsonb(i.gender))
  on conflict (entity_type, entity_id, field, source) do nothing;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', i.id::text, 'nationality', coalesce(t.ns, 'wikidata'), coalesce(t.nr, t.qid), coalesce(t.nu, 'https://www.wikidata.org/wiki/' || t.qid), timestamptz '2026-11-22 00:00:00+00'
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where exists (select 1 from public.kpopdle_fill_backup b where b.file = 'L34' and b.kind = 'idol' and b.row_id = i.id and b.col = 'nationality' and b.new_value = to_jsonb(i.nationality))
  on conflict (entity_type, entity_id, field, source) do nothing;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', i.id::text, 'debut_year', 'wikidata', t.qid, 'https://www.wikidata.org/wiki/' || t.qid, timestamptz '2026-11-22 00:00:00+00'
  from public.idols i join jsonb_to_recordset(v_idols) as t(qid text, gender text, nat text, debut integer, ns text, nu text, nr text) on t.qid = i.wikidata_qid
  where exists (select 1 from public.kpopdle_fill_backup b where b.file = 'L34' and b.kind = 'idol' and b.row_id = i.id and b.col = 'debut_year' and b.new_value = to_jsonb(i.debut_year))
  on conflict (entity_type, entity_id, field, source) do nothing;
  -- 4. Agency (groups.record_label). The new names go into public.agencies first (the slug rule of 022).
  insert into public.agencies (slug, name, sources, created_at)
  select distinct on (s.slug) s.slug, s.label, array[s.url], timestamptz '2026-11-22 00:00:00+00'
  from (select t.label, t.url, left(btrim(regexp_replace(lower(btrim(t.label)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug
        from jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text) join public.groups g on g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug)
        where nullif(btrim(g.record_label), '') is null or regexp_replace(lower(g.record_label), '[^a-z0-9]', '', 'g') <> regexp_replace(lower(t.label), '[^a-z0-9]', '', 'g')) s
  order by s.slug, s.label
  on conflict do nothing;
  insert into public.kpopdle_fill_backup as b (file, kind, row_id, col, old_value, new_value)
  select 'L34', 'group', g.id, 'record_label', to_jsonb(g.record_label), to_jsonb(t.label)
  from public.groups g join jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text) on g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug)
  where nullif(btrim(g.record_label), '') is null or regexp_replace(lower(g.record_label), '[^a-z0-9]', '', 'g') <> regexp_replace(lower(t.label), '[^a-z0-9]', '', 'g')
  on conflict (file, kind, row_id, col) do update set new_value = excluded.new_value;
  update public.groups g set record_label = t.label
  from jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text)
  where g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug) and (nullif(btrim(g.record_label), '') is null or regexp_replace(lower(g.record_label), '[^a-z0-9]', '', 'g') <> regexp_replace(lower(t.label), '[^a-z0-9]', '', 'g'));
  get diagnostics c_label = row_count;
  -- 5. Generation (the published rule on the debut year of the group).
  insert into public.kpopdle_fill_backup as b (file, kind, row_id, col, old_value, new_value)
  select 'L34', 'group', g.id, 'generation', to_jsonb(g.generation), to_jsonb(t.gen::text || case t.gen when 1 then 'st' when 2 then 'nd' when 3 then 'rd' else 'th' end || ' generation')
  from public.groups g join jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text) on g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug)
  where g.generation is null or g.generation !~ '[1-5]' or substring(g.generation from '([1-5])')::integer <> t.gen
  on conflict (file, kind, row_id, col) do update set new_value = excluded.new_value;
  update public.groups g set generation = t.gen::text || case t.gen when 1 then 'st' when 2 then 'nd' when 3 then 'rd' else 'th' end || ' generation'
  from jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text)
  where g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug) and (g.generation is null or g.generation !~ '[1-5]' or substring(g.generation from '([1-5])')::integer <> t.gen);
  get diagnostics c_gen = row_count;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'record_label', 'wikipedia', 'rev ' || t.rev, t.url, timestamptz '2026-11-22 00:00:00+00'
  from public.groups g join jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text) on g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug)
  where exists (select 1 from public.kpopdle_fill_backup b where b.file = 'L34' and b.kind = 'group' and b.row_id = g.id and b.col = 'record_label' and b.new_value = to_jsonb(g.record_label))
  on conflict (entity_type, entity_id, field, source) do nothing;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'generation', 'wikipedia', 'rev ' || t.rev, t.url, timestamptz '2026-11-22 00:00:00+00'
  from public.groups g join jsonb_to_recordset(v_groups) as t(name text, slug text, label text, gen integer, url text, rev text) on g.site_id = 'kpop' and (lower(g.name) = lower(t.name) or g.slug = t.slug)
  where exists (select 1 from public.kpopdle_fill_backup b where b.file = 'L34' and b.kind = 'group' and b.row_id = g.id and b.col = 'generation' and b.new_value = to_jsonb(g.generation))
  on conflict (entity_type, entity_id, field, source) do nothing;
  -- 6. The snapshot the players read, when the game already has one (otherwise the activation takes it). Never dle_build_bank here.
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;
  -- Self-check.
  select count(*) into v_under18 from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if v_under18 > 0 then
    raise exception 'L34: % active idol(s) are under 18', v_under18;
  end if;
  if c_gender > 400 or c_nat > 400 or c_debut > 400 or c_label > 60 or c_gen > 60 then
    raise exception 'L34: more rows changed than the truth holds (gender %, nationality %, debut %, label %, generation %)', c_gender, c_nat, c_debut, c_label, c_gen;
  end if;
  select string_agg(s.entity_id || ' ' || s.name, ', ' order by s.entity_id::integer) into v_who from public.dle_src_kpop_idol s
  where exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0);
  if v_who is not null then
    raise notice 'L34: idol(s) the game reads that still show a "?" (no QID in this file, or a value the sources do not settle): %', v_who;
  end if;
  raise notice 'L34: gender %, nationality %, debut %, agency %, generation % row(s) written', c_gender, c_nat, c_debut, c_label, c_gen;
  notify pgrst, 'reload schema';
end;
end $o1l34$;
