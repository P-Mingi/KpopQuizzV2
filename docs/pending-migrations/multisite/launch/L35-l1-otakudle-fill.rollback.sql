-- L35-l1-otakudle-fill.rollback.sql (undo of L35-l1-otakudle-fill.sql)
--
-- What:   every value L35 wrote goes back to empty (each only while it still holds the value L35 wrote), the studios of Kagurabachi and Omniscient Reader's Viewpoint go back to an empty list,
--         the three "unspecified" genders go back to empty and the gender check of 023 (female, male) is put back. The snapshot dle_entities is refreshed when the game has one.
-- Verify: select count(*) from public.character_facts where gender = 'unspecified';   expect 0
-- Verify: select count(*) from public.character_facts where voice_actor_ja is null;   expect 54
-- Verify: select count(*) from public.character_facts where species is null;   expect 86
-- Verify: select count(*) from public.character_facts where role_at_debut is null;   expect 26
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l35r$
begin
-- the body is one inner block (its declare section), so the outer block starts with begin (editor-safe-sql.test.ts)
declare
  fixes constant jsonb := '[
{"id": "F001", "series": "attack-on-titan", "slug": "hange-zoe", "col": "gender", "old_v": null, "new_v": "unspecified"},
{"id": "F002", "series": "hunter-x-hunter", "slug": "neferpitou", "col": "gender", "old_v": null, "new_v": "unspecified"},
{"id": "F003", "series": "kaiju-no-8", "slug": "kaiju-no-9", "col": "gender", "old_v": null, "new_v": "unspecified"},
{"id": "F004", "series": "that-time-i-got-reincarnated-as-a-slime", "slug": "rimuru-tempest", "col": "gender", "old_v": null, "new_v": "male"},
{"id": "F005", "series": "bleach", "slug": "ulquiorra-cifer", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F006", "series": "dragon-ball", "slug": "caulifla", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F007", "series": "dragon-ball", "slug": "kale", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F008", "series": "dragon-ball", "slug": "gogeta", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F009", "series": "dragon-ball", "slug": "king-kai", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F010", "series": "dragon-ball", "slug": "porunga", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F011", "series": "dragon-ball", "slug": "uub", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F012", "series": "dragon-ball", "slug": "vegito", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F013", "series": "hunter-x-hunter", "slug": "zeno-zoldyck", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F014", "series": "one-piece", "slug": "bartolomeo", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F015", "series": "one-piece", "slug": "bellamy", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F016", "series": "one-piece", "slug": "carrot", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F017", "series": "one-piece", "slug": "diamante", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F018", "series": "one-piece", "slug": "don-krieg", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F019", "series": "one-piece", "slug": "inuarashi", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F020", "series": "one-piece", "slug": "kin-emon", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F021", "series": "one-piece", "slug": "kozuki-hiyori", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F022", "series": "one-piece", "slug": "kyros", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F023", "series": "one-piece", "slug": "marco", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F024", "series": "one-piece", "slug": "nekomamushi", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F025", "series": "one-piece", "slug": "neptune", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F026", "series": "one-piece", "slug": "perona", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F027", "series": "one-piece", "slug": "rebecca", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F028", "series": "one-piece", "slug": "shirahoshi", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F029", "series": "one-piece", "slug": "silvers-rayleigh", "col": "role_at_debut", "old_v": null, "new_v": "supporting"},
{"id": "F030", "series": "one-piece", "slug": "vinsmoke-reiju", "col": "role_at_debut", "old_v": null, "new_v": "antagonist"},
{"id": "F031", "series": "attack-on-titan", "slug": "kenny-ackerman", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F032", "series": "blue-lock", "slug": "jinpachi-ego", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F033", "series": "blue-lock", "slug": "meguru-bachira", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F034", "series": "blue-lock", "slug": "rin-itoshi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F035", "series": "blue-lock", "slug": "sae-itoshi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F036", "series": "blue-lock", "slug": "yoichi-isagi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F037", "series": "code-geass", "slug": "lloyd-asplund", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F038", "series": "fruits-basket", "slug": "machi-kuragi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F039", "series": "haikyu", "slug": "asahi-azumane", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F040", "series": "haikyu", "slug": "kenma-kozume", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F041", "series": "haikyu", "slug": "koshi-sugawara", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F042", "series": "haikyu", "slug": "ryunosuke-tanaka", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F043", "series": "haikyu", "slug": "tadashi-yamaguchi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F044", "series": "haikyu", "slug": "tetsuro-kuroo", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F045", "series": "haikyu", "slug": "yu-nishinoya", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F046", "series": "hunter-x-hunter", "slug": "alluka-zoldyck", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F047", "series": "hunter-x-hunter", "slug": "komugi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F048", "series": "hunter-x-hunter", "slug": "pariston-hill", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F049", "series": "jojo", "slug": "bruno-bucciarati", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F050", "series": "kagurabachi", "slug": "akemura-soga", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F051", "series": "kagurabachi", "slug": "seiichi-samura", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F052", "series": "kaguya-sama-love-is-war", "slug": "papa-shirogane", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F053", "series": "kaguya-sama-love-is-war", "slug": "tsubasa-tanuma", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F054", "series": "my-hero-academia", "slug": "endeavor", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F055", "series": "my-hero-academia", "slug": "hawks", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F056", "series": "my-hero-academia", "slug": "overhaul", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F057", "series": "my-hero-academia", "slug": "stain", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F058", "series": "my-hero-academia", "slug": "twice", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F059", "series": "one-piece", "slug": "eneru", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F060", "series": "one-piece", "slug": "nerona-imu", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F061", "series": "one-piece", "slug": "scratchmen-apoo", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F062", "series": "oshi-no-ko", "slug": "frill-shiranui", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F063", "series": "oshi-no-ko", "slug": "melt-narushima", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F064", "series": "oshi-no-ko", "slug": "minami-kotobuki", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F065", "series": "oshi-no-ko", "slug": "sakuya-kamoshida", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F066", "series": "oshi-no-ko", "slug": "taiki-himekawa", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F067", "series": "oshi-no-ko", "slug": "taishi-gotanda", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F068", "series": "sakamoto-days", "slug": "akira-akao", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F069", "series": "sakamoto-days", "slug": "boiled", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F070", "series": "sakamoto-days", "slug": "gaku", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F071", "series": "sakamoto-days", "slug": "heisuke-mashimo", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F072", "series": "sakamoto-days", "slug": "kanaguri", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F073", "series": "sakamoto-days", "slug": "kei-uzuki", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F074", "series": "sakamoto-days", "slug": "osaragi", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F075", "series": "sakamoto-days", "slug": "rion-akao", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F076", "series": "sakamoto-days", "slug": "shin-asakura", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F077", "series": "sakamoto-days", "slug": "shishiba", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F078", "series": "sakamoto-days", "slug": "yoichi-nagumo", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F079", "series": "slam-dunk", "slug": "eiji-sawakita", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F080", "series": "slam-dunk", "slug": "nobunaga-kiyota", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F081", "series": "sword-art-online", "slug": "eugeo", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F082", "series": "tokyo-revengers", "slug": "chifuyu-matsuno", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F083", "series": "tokyo-revengers", "slug": "hakkai-shiba", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F084", "series": "tokyo-revengers", "slug": "hinata-tachibana", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F085", "series": "tokyo-revengers", "slug": "izana-kurokawa", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F086", "series": "tokyo-revengers", "slug": "kazutora-hanemiya", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F087", "series": "tokyo-revengers", "slug": "ken-ryuguji", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F088", "series": "tokyo-revengers", "slug": "shuji-hanma", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F089", "series": "tokyo-revengers", "slug": "taiju-shiba", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F090", "series": "tokyo-revengers", "slug": "takashi-mitsuya", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F091", "series": "tower-of-god", "slug": "endorsi-jahad", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F092", "series": "tower-of-god", "slug": "phantaminum", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F093", "series": "violet-evergarden", "slug": "dietfried-bougainvillea", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F094", "series": "violet-evergarden", "slug": "gilbert-bougainvillea", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F095", "series": "violet-evergarden", "slug": "leon-stephanotis", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F096", "series": "violet-evergarden", "slug": "oscar-webster", "col": "species", "old_v": null, "new_v": "human"},
{"id": "F097", "series": "dandadan", "slug": "peeny-weeny", "col": "species", "old_v": null, "new_v": "alien"},
{"id": "F098", "series": "dragon-ball", "slug": "hit", "col": "species", "old_v": null, "new_v": "hit-race"},
{"id": "F099", "series": "dragon-ball", "slug": "mr-popo", "col": "species", "old_v": null, "new_v": "genie"},
{"id": "F100", "series": "hunter-x-hunter", "slug": "meruem", "col": "species", "old_v": null, "new_v": "chimera-ant"},
{"id": "F101", "series": "one-piece", "slug": "arlong", "col": "species", "old_v": null, "new_v": "fish-man"},
{"id": "F102", "series": "one-piece", "slug": "carrot", "col": "species", "old_v": null, "new_v": "mink"},
{"id": "F103", "series": "one-piece", "slug": "hajrudin", "col": "species", "old_v": null, "new_v": "giant"},
{"id": "F104", "series": "one-piece", "slug": "hatchan", "col": "species", "old_v": null, "new_v": "fish-man"},
{"id": "F105", "series": "one-piece", "slug": "hody-jones", "col": "species", "old_v": null, "new_v": "fish-man"},
{"id": "F106", "series": "one-piece", "slug": "inuarashi", "col": "species", "old_v": null, "new_v": "mink"},
{"id": "F107", "series": "one-piece", "slug": "jack", "col": "species", "old_v": null, "new_v": "fish-man"},
{"id": "F108", "series": "one-piece", "slug": "nekomamushi", "col": "species", "old_v": null, "new_v": "mink"},
{"id": "F109", "series": "one-piece", "slug": "neptune", "col": "species", "old_v": null, "new_v": "merfolk"},
{"id": "F110", "series": "one-piece", "slug": "shirahoshi", "col": "species", "old_v": null, "new_v": "merfolk"},
{"id": "F111", "series": "solo-leveling", "slug": "ashborn", "col": "species", "old_v": null, "new_v": "monarch"},
{"id": "F112", "series": "solo-leveling", "slug": "beru", "col": "species", "old_v": null, "new_v": "shadow"},
{"id": "F113", "series": "solo-leveling", "slug": "igris", "col": "species", "old_v": null, "new_v": "shadow"},
{"id": "F114", "series": "solo-leveling", "slug": "sillad", "col": "species", "old_v": null, "new_v": "snow-folk"},
{"id": "F115", "series": "sword-art-online", "slug": "yui", "col": "species", "old_v": null, "new_v": "artificial-intelligence"},
{"id": "F116", "series": "tower-of-god", "slug": "headon", "col": "species", "old_v": null, "new_v": "creature"},
{"id": "F117", "series": "attack-on-titan", "slug": "falco-grice", "col": "voice_actor_ja", "old_v": null, "new_v": "Natsuki Hanae"},
{"id": "F118", "series": "attack-on-titan", "slug": "kenny-ackerman", "col": "voice_actor_ja", "old_v": null, "new_v": "Kazuhiro Yamaji"},
{"id": "F119", "series": "attack-on-titan", "slug": "pieck-finger", "col": "voice_actor_ja", "old_v": null, "new_v": "Manami Numakura"},
{"id": "F120", "series": "attack-on-titan", "slug": "ymir", "col": "voice_actor_ja", "old_v": null, "new_v": "Saki Fujita"},
{"id": "F121", "series": "attack-on-titan", "slug": "zeke-yeager", "col": "voice_actor_ja", "old_v": null, "new_v": "Takehito Koyasu"},
{"id": "F122", "series": "dragon-ball", "slug": "caulifla", "col": "voice_actor_ja", "old_v": null, "new_v": "Yuka Komatsu"},
{"id": "F123", "series": "dragon-ball", "slug": "kale", "col": "voice_actor_ja", "old_v": null, "new_v": "Yukana"},
{"id": "F124", "series": "death-note", "slug": "near", "col": "voice_actor_ja", "old_v": null, "new_v": "Noriko Hidaka"},
{"id": "F125", "series": "dandadan", "slug": "evil-eye", "col": "voice_actor_ja", "old_v": null, "new_v": "Mutsumi Tamura"},
{"id": "F126", "series": "fruits-basket", "slug": "machi-kuragi", "col": "voice_actor_ja", "old_v": null, "new_v": "Ai Kakuma"},
{"id": "F127", "series": "fruits-basket", "slug": "yuki-sohma", "col": "voice_actor_ja", "old_v": null, "new_v": "Aya Hisakawa"},
{"id": "F128", "series": "fruits-basket", "slug": "kazuma-sohma", "col": "voice_actor_ja", "old_v": null, "new_v": "Norihiro Inoue"},
{"id": "F129", "series": "jojo", "slug": "bruno-bucciarati", "col": "voice_actor_ja", "old_v": null, "new_v": "Yūichi Nakamura"},
{"id": "F130", "series": "jojo", "slug": "polnareff", "col": "voice_actor_ja", "old_v": null, "new_v": "Fuminori Komatsu"},
{"id": "F131", "series": "jojo", "slug": "rohan-kishibe", "col": "voice_actor_ja", "old_v": null, "new_v": "Takahiro Sakurai"},
{"id": "F132", "series": "jojo", "slug": "yoshikage-kira", "col": "voice_actor_ja", "old_v": null, "new_v": "Toshiyuki Morikawa"},
{"id": "F133", "series": "kaiju-no-8", "slug": "kaiju-no-9", "col": "voice_actor_ja", "old_v": null, "new_v": "Hiroyuki Yoshino"},
{"id": "F134", "series": "sakamoto-days", "slug": "akira-akao", "col": "voice_actor_ja", "old_v": null, "new_v": "Mao Ichimichi"},
{"id": "F135", "series": "slam-dunk", "slug": "mitsuyoshi-anzai", "col": "voice_actor_ja", "old_v": null, "new_v": "Tomomichi Nishimura"},
{"id": "F136", "series": "slam-dunk", "slug": "nobunaga-kiyota", "col": "voice_actor_ja", "old_v": null, "new_v": "Toshiyuki Morikawa"},
{"id": "F137", "series": "violet-evergarden", "slug": "dietfried-bougainvillea", "col": "voice_actor_ja", "old_v": null, "new_v": "Hidenobu Kiuchi"},
{"id": "F138", "series": "violet-evergarden", "slug": "gilbert-bougainvillea", "col": "voice_actor_ja", "old_v": null, "new_v": "Daisuke Namikawa"},
{"id": "F139", "series": "violet-evergarden", "slug": "leon-stephanotis", "col": "voice_actor_ja", "old_v": null, "new_v": "Yūto Uemura"},
{"id": "F140", "series": "violet-evergarden", "slug": "oscar-webster", "col": "voice_actor_ja", "old_v": null, "new_v": "Satoshi Taki"}
]';
  studs constant jsonb := '[
{"series": "kagurabachi", "old_v": [], "new_v": [{"name": "Cypic"}]},
{"series": "omniscient-readers-viewpoint", "old_v": [], "new_v": [{"name": "Aniplex"}]}
]';
  c record; cid bigint; cur text; ck record;
  n_changed integer := 0;
begin
perform set_config('lock_timeout', '5s', true);
perform set_config('client_min_messages', 'warning', true);

begin
  if to_regclass('public.character_facts') is null then
    raise exception 'L35 rollback: character_facts is missing';
  end if;
end;

begin
  for c in select * from jsonb_to_recordset(fixes) as t(id text, series text, slug text, col text, old_v text, new_v text) order by t.id loop
    select ch.id into cid from public.characters ch join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = c.series
      join public.character_facts f on f.character_id = ch.id where ch.slug = c.slug;
    if cid is null then
      continue;
    end if;
    execute format('select %I from public.character_facts where character_id = $1', c.col) into cur using cid;
    if cur = c.new_v then
      execute format('update public.character_facts set %I = null where character_id = $1 and %I = $2', c.col, c.col) using cid, c.new_v;
      n_changed := n_changed + 1;
    end if;
  end loop;
end;

begin
  for c in select * from jsonb_to_recordset(studs) as t(series text, old_v jsonb, new_v jsonb) loop
    update public.series s set studios = c.old_v from public.groups g
      where g.id = s.group_id and g.site_id = 'anime' and g.slug = c.series and s.studios = c.new_v;
  end loop;
end;

-- The gender check of 023 back, once no row holds unspecified.
begin
  if not exists (select 1 from public.character_facts where gender = 'unspecified') then
    for ck in select conname from pg_constraint where conrelid = 'public.character_facts'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ 'gender' loop
      execute format('alter table public.character_facts drop constraint %I', ck.conname);
    end loop;
    alter table public.character_facts add constraint character_facts_gender_check check (gender in ('female', 'male'));
  end if;
end;

begin
  if exists (select 1 from public.dle_entities where game_id = 'otakudle') then perform public.dle_refresh_entities('otakudle'); end if;
  raise notice 'L35 rollback: % values put back to empty', n_changed;
end;

notify pgrst, 'reload schema';

end;
end $o1l35r$;
