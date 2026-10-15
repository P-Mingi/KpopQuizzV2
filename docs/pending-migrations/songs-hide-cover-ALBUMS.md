# songs.hide_cover: the albums it touches (for owner review)

Read on 2026-10-15 from the real catalogue (4,291 songs, read only). Generated from the same data by the
code classifier (`apps/quiz/src/lib/soundtrack-album.ts`) and checked against the SQL of
`songs-hide-cover.sql`: both pick the identical list (same md5 of the sorted "album:count" lines,
`9f9bf1f3208816ef0dab8d17a4491b82`).

**Total: 147 albums, 177 songs, 167 of them active.** The 10 non-active songs are the KPop Demon
Hunters soundtrack songs (status `soundtrack`), whose covers are already hidden today by track id.

What changes for a player: on the blind test reveal (every playlist, the daily blind test, ranked) and on
the Verse song page, these songs show the existing no-cover look instead of the Deezer cover. The audio,
the title, the artist and the album name stay. Nothing else changes.

## 1. The rules (same order in the code and in the SQL)

Whole words only, case insensitive. "First rule" in the table is the first rule an album matches.

| Rule | Catches | Albums (first rule) |
| --- | --- | --- |
| soundtrack | Soundtrack(s), Sound Track, the catalogue's "Sountrack" typo | 112 |
| OST | the word OST, except an album titled only "OST" | 27 |
| from the Netflix | "(from the Netflix Series ...)" | 1 |
| Disney+ Original | "(... from the Disney+ Original)" (both such albums also say Soundtrack) | 0 |
| original / TV series | "Music from the HBO Original Series", "Original TV Series" | 3 |
| from the series | "(from the series Arcane League of Legends)" | 1 |
| motion picture | "Original Motion Picture", "K-POPS! Motion Picture" | 2 |
| from ... the movie | "Messy (From F1® The Movie)" | 1 |

Worth a look before you run the file (all matched on purpose, all are soundtracks, but not dramas):

- Game soundtracks: `EPIC SEVEN (Original Soundtrack) 'Energetic'` (Kwon Eunbi), `THE GIRLS (BLACKPINK THE GAME OST)` (BLACKPINK).
- Musical and webtoon: `School OZ - Hologram Musical (Original Sound Track)` (Seulgi), `Melting (Maybe Meant to Be X DINDIN, YUJU) (Original Webtoon Soundtrack)` (Yuju).
- Films: `Messy (From F1® The Movie)` (Rose, also in the TikTok viral playlist), `FAST X` and `Angel Pt. 2` (Jimin), `GOAT (Original Motion Picture Soundtrack)` (Cortis), `K-POPS!` (Chungha, G-Dragon, Jay Park, NMIXX, Dean), `Golden Slumbers` (Lee Hi).
- The KPop Demon Hunters albums (12 songs) also match. Their covers are already hidden by track id; nothing changes for them.

A cover hidden by an album name stays hidden even if `hide_cover` is later set back to false: showing
one of these covers again needs a code change. The column can only add hidden covers.

## 2. The albums (147)

| Album | Songs | Active | Artist(s) | First rule |
| --- | --- | --- | --- | --- |
| 1000won Lawyer (Original Soundtrack), Pt. 5 | 1 | 1 | Tiger JK | soundtrack |
| 18 again, Pt. 1 (Original Television Soundtrack) | 1 | 1 | Soyou | soundtrack |
| A Shoulder to Cry On OST | 1 | 1 | OMEGA X | OST |
| A Way Station (Original Soundtrack) "In Memory" | 1 | 1 | Ailee | soundtrack |
| Aftertaste (Inspired by the Original Motion Picture K-POPS!) | 1 | 1 | Dean | motion picture |
| Alice (Original Soundtrack) Part.1 | 1 | 1 | Yuju | soundtrack |
| All About Eve (MBC DRAMA) OST | 1 | 1 | Fin.K.L | OST |
| All about my romance (Original Soundtrack) | 1 | 1 | AKMU | soundtrack |
| Angel Pt. 2 (feat. Jimin of BTS, Charlie Puth and Muni Long / FAST X Soundtrack) (FAST X Soundtrack) | 1 | 1 | Jimin | soundtrack |
| Are You Human? (Original Television Soundtrack), Pt.1 | 1 | 1 | VIXX | soundtrack |
| BUTTON GAME (Original Television Soundtrack) Pt.1 | 1 | 1 | Lee Young Ji | soundtrack |
| Backstreet Rookie (Original Television Soundtrack), Pt.1 | 1 | 1 | Kang Daniel | soundtrack |
| Backstreet Rookie (Original Television Soundtrack), Pt.5 | 1 | 1 | Colde | soundtrack |
| Big Mouth (Original Television Soundtrack) Pt. 1 | 1 | 1 | Justhis | soundtrack |
| Bitch X Rich (Original Television Soundtrack) Pt. 1 | 1 | 1 | Kid Milli | soundtrack |
| Borrow your night (Original Soundtrack from Even If This Love Disappears Tonight) | 1 | 1 | PLAVE | soundtrack |
| Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series) | 1 | 1 | fromis_9 | soundtrack |
| CART OST | 1 | 1 | D.O. | OST |
| CASTAWAY DIVA OST Part.5 | 1 | 1 | THE BOYZ | OST |
| Cheat On Me If You Can (Original Television Soundtrack), Pt.1 | 1 | 1 | Suran | soundtrack |
| Chocolate, Pt.5 (Original Television Soundtrack) | 1 | 1 | Ailee | soundtrack |
| Cinderella & Four Knights (Original Soundtrack) | 1 | 1 | Jessi | soundtrack |
| Cinderella & Four Knights, Pt. 1 (Original Soundtrack) | 2 | 2 | BTOB | soundtrack |
| City Hunter (Original Television Soundtrack) | 1 | 1 | Girl's Day | soundtrack |
| Come Play (Kordhell Remix) (from the series Arcane League of Legends) | 1 | 1 | Stray Kids | from the series |
| Crash Landing on You OST Part 11 | 1 | 1 | IU | OST |
| Dear Hyeri, Pt. 4 (Original Soundtrack) | 2 | 2 | PLAVE | soundtrack |
| Descendants Of The Sun Pt.2 (Original Television Soundtrack) | 1 | 1 | Chen | soundtrack |
| Do You Like Brahms? (Original Television Soundtrack) Pt. 3 | 1 | 1 | Chen | soundtrack |
| Do You Like Brahms? (Original Television Soundtrack) Pt. 7 | 1 | 1 | Jo Yuri | soundtrack |
| Doctor Slump (Original Television Soundtrack) Pt.1 | 1 | 1 | Seulgi | soundtrack |
| Doctor Slump (Original Television Soundtrack) Pt.3 | 1 | 1 | Chen | soundtrack |
| Don't Dare To Dream (Original Television Soundtrack) | 1 | 1 | Suran | soundtrack |
| Doom at Your Service (Original Television Soundtrack) Pt. 1 | 1 | 1 | Ailee | soundtrack |
| Doom at Your Service (Original Television Soundtrack) Pt. 3 | 1 | 1 | Baekhyun | soundtrack |
| EPIC SEVEN (Original Soundtrack) 'Energetic' | 1 | 1 | Kwon Eunbi | soundtrack |
| Empress Ki (Original Television Soundtrack) | 1 | 1 | Soyou | soundtrack |
| FAST X (Original Motion Picture Soundtrack) | 1 | 1 | Jimin | soundtrack |
| FAST X (Sped Up / Original Motion Picture Soundtrack) | 1 | 1 | Jimin | soundtrack |
| Falling (Run On OST Part.10) | 1 | 1 | Yuju | OST |
| Falsify (Original Soundtrack) Part. 1 | 1 | 1 | Suran | soundtrack |
| Flame (from the Netflix Series "Jentry Chau vs the Underworld") | 1 | 1 | KATSEYE | from the Netflix |
| FlexxCop OST Part.4 | 1 | 1 | Daesung | OST |
| For All Time (Original Soundtrack) | 1 | 1 | Ailee | soundtrack |
| Forecasting Love and Weather (Original Television Soundtrack), Pt. 2 | 1 | 1 | Onew | soundtrack |
| Forecasting Love and Weather (Original Television Soundtrack), Pt. 8 | 1 | 1 | Giriboy | soundtrack |
| GOAT (Original Motion Picture Soundtrack) | 1 | 1 | Cortis | soundtrack |
| GOOD BOY (Original Television Soundtrack), Pt. 6 | 2 | 2 | JUNNY | soundtrack |
| Girl Who Sees Smell (Original Television Soundtrack), Pt.2 | 1 | 1 | Yuju | soundtrack |
| Golden Slumbers (Original Motion Pictures Soundtrack Special Track) | 1 | 1 | Lee Hi | soundtrack |
| Gunshot (Original Television Soundtrack From "Duty After School") | 1 | 1 | Justhis | soundtrack |
| Gyeongseong Creature OST Part 1 | 1 | 1 | Suho | OST |
| HWARANG, Pt. 2 (Music from the Original TV Series) | 2 | 2 | V | original / TV series |
| HWARANG, Pt. 4 (Music from the Original TV Series) | 2 | 2 | Seulgi | original / TV series |
| HYENA (Original Television Soundtrack) | 1 | 1 | Giriboy | soundtrack |
| Hotel del Luna (Original Television Soundtrack) Pt. 13 | 1 | 1 | Taeyong | soundtrack |
| Hotel del Luna (Original Television Soundtrack) Pt. 6 | 1 | 1 | Chungha | soundtrack |
| It's Okay to Not Be Okay (Original Television Soundtrack), Pt.1 | 2 | 2 | Heize | soundtrack |
| It's Okay to Not Be Okay (Original Television Soundtrack), Pt.2 | 1 | 1 | Sam Kim | soundtrack |
| Jentry Chau vs the Underworld (Soundtrack from the Netflix Series) | 1 | 1 | Jessi | soundtrack |
| Jirisan (Original Television Soundtrack) Pt. 4 | 1 | 1 | Jin | soundtrack |
| Joseon Attorney (Original Television Soundtrack, Pt. 4) | 1 | 1 | Soyou | soundtrack |
| K-POPS! (Music from and inspired by K-POPS! Motion Picture) | 4 | 4 | NMIXX, Chungha, G-Dragon, Jay Park | motion picture |
| KPOPPED (Apple TV+ Original Series Soundtrack) Vol. 1 | 1 | 1 | Kep1er | soundtrack |
| KPop Demon Hunters (Soundtrack from the Netflix Film / Deluxe Version) | 1 | 0 | Jinu | soundtrack |
| KPop Demon Hunters (Soundtrack from the Netflix Film) | 11 | 2 | TWICE, HUNTR/X, Saja Boys, Jokers, Rumi and Jinu, MeloMance | soundtrack |
| KickKickKickKick (Original Television Soundtrack) | 1 | 1 | Loco | soundtrack |
| Kiss Sixth Sense, Pt. 1 (Original Soundtrack from the Disney+ Original) | 1 | 1 | Yuju | soundtrack |
| Kiss Sixth Sense, Pt. 4 (Original Soundtrack from the Disney+ Original) | 1 | 1 | Suran | soundtrack |
| Knight Flower OST Part.2 | 1 | 1 | Lee Young Ji | OST |
| Let Me Dance (The Spies Who Loved Me OST Special Track) | 1 | 1 | EVERGLOW | OST |
| Love Is Enough (from Sold Out On You (Original Soundtrack) Part 10) | 2 | 2 | PLAVE | soundtrack |
| Love Is Enough (from Sold Out On You (Original Soundtrack) Part 7) | 2 | 2 | Nayeon | soundtrack |
| Lovestruck in the City (Original Television Soundtrack) Special | 1 | 1 | Suran | soundtrack |
| MIRACLE (Original Television Soundtrack) Pt. 4 | 1 | 1 | Weki Meki | soundtrack |
| Melting (Maybe Meant to Be X DINDIN, YUJU) (Original Webtoon Soundtrack) | 1 | 1 | Yuju | soundtrack |
| Messy (From F1® The Movie) | 1 | 1 | Rose | from ... the movie |
| Midnight [Do You Like Brahms? (Original Television Soundtrack), Special Track] | 1 | 1 | Heize | soundtrack |
| Mr. Queen (Original Television Soundtrack), Pt. 4 | 1 | 1 | Soyou | soundtrack |
| My Dangerous Wife, Pt. 4 (Original Television Soundtrack) | 1 | 1 | Sogumm | soundtrack |
| My Lovely Girl (Original Television Soundtrack), Pt. 1 | 1 | 1 | Loco | soundtrack |
| My Strange Hero (Original Television Soundtrack) | 1 | 1 | Yuju | soundtrack |
| Nevertheless, (Original Television Soundtrack, Pt. 6) | 1 | 1 | Sam Kim | soundtrack |
| Nice to Not Meet You (Original Television Soundtrack) Pt. 4 | 1 | 1 | Daesung | soundtrack |
| Oh My Baby (Original Television Soundtrack) Pt. 2 | 1 | 1 | Soyou | soundtrack |
| One Ordinary Day (Original Television Soundtrack), Pt. 4 | 1 | 1 | VICTON | soundtrack |
| Our Beloved Summer (Original Television Soundtrack), Pt. 5 | 1 | 1 | V | soundtrack |
| Our Beloved Summer (Original Television Soundtrack), Pt. 8 | 1 | 1 | Sam Kim | soundtrack |
| Partner (Original Television Soundtrack) | 1 | 1 | Super Junior-K.R.Y. | soundtrack |
| Perfect Crown OST Part.1 | 1 | 1 | BIBI | OST |
| Perfect Crown OST Part.2 | 1 | 1 | KiiiKiii | OST |
| Perfect Crown OST Part.3 | 1 | 1 | BOYNEXTDOOR | OST |
| Perfect Crown OST Part.4 | 1 | 1 | RIIZE | OST |
| Perfect Crown OST Part.6 | 1 | 1 | WOODZ | OST |
| Perfect Crown OST Part.9 | 1 | 1 | Sam Kim | OST |
| Poison (Crime Puzzle Original Soundtrack) | 1 | 1 | Ash Island | soundtrack |
| Queen of Tears (Original Television Soundtrack), Pt.3 | 2 | 2 | Heize | soundtrack |
| Record of Youth (Original Television Soundtrack) Pt. 3 | 1 | 1 | Baekhyun | soundtrack |
| Record of Youth (Original Television Soundtrack) Pt. 4 | 1 | 1 | Wheein | soundtrack |
| Romantic Doctor 2 (Original Television Soundtrack) Pt. 4 | 1 | 1 | Heize | soundtrack |
| Rookie Cops (Original Television Soundtrack) Pt. 5 | 1 | 1 | Dvwn | soundtrack |
| Rookie Historian GooHaeRyung (Original Television Soundtrack), Pt. 2 | 2 | 2 | Yoon Mirae | soundtrack |
| SHE WAS PRETTY OST | 1 | 1 | Soyou | OST |
| SISYPHUS: THE MYTH (Original Television Soundtracks, Pt. 3) | 1 | 1 | Ailee | soundtrack |
| School 2017 (Orignial Television Soundtrack) | 1 | 1 | Gugudan | soundtrack |
| School OZ - Hologram Musical (Original Sound Track) | 1 | 1 | Seulgi | soundtrack |
| Strong Woman Do Bong Soon, Pt. 2 (Original Television Soundtrack) | 1 | 1 | Suran | soundtrack |
| Strong Woman Do Bong Soon, Pt. 5 (Original Television Soundtrack) | 1 | 1 | MAMAMOO | soundtrack |
| Super Star (From "Dream High 2, Pt. 4 (Original Television Soundtrack)") | 1 | 1 | Ailee | soundtrack |
| Surely Tomorrow (Original Television Soundtrack) Vol.3 | 1 | 1 | Heize | soundtrack |
| THE GIRLS (BLACKPINK THE GAME OST) | 1 | 1 | BLACKPINK | OST |
| Taxidriver (Original Soundtrack) Part.5 | 2 | 2 | Simon Dominic | soundtrack |
| Tempted OST Part.1 | 1 | 1 | MOMOLAND | OST |
| The Crowned Clown (Original Television Soundtrack) | 1 | 1 | Seulgi | soundtrack |
| The Escape of the Seven OST Part.1 | 1 | 1 | Solar | OST |
| The Fiery Priest 2 (Original Soundtrack) Part.2 | 2 | 2 | PLAVE | soundtrack |
| The Idol Episode 4 (Music from the HBO Original Series) | 1 | 1 | Jennie | original / TV series |
| The King's Affection OST Part.1 | 1 | 1 | Super Junior-K.R.Y. | OST |
| The Law Cafe (Original Television Soundtrack), Pt.2 | 2 | 2 | Jo Yuri | soundtrack |
| The Law Cafe (Original Television Soundtrack), Pt.4 | 1 | 1 | Dvwn | soundtrack |
| The Player (Original Television Soundtrack) Pt. 1 | 1 | 1 | Dok2 | soundtrack |
| The Tale Of Nokdu (Original Television Soundtrack), Pt. 3 | 2 | 2 | Woozi | soundtrack |
| The Tale of Lady Ok (Original Television Soundtrack), Pt. 2 | 1 | 1 | Ailee | soundtrack |
| The Third Charm (Original Television Soundtrack), Pt. 6 | 1 | 1 | Soyou | soundtrack |
| The story of Park’s marriage contract (Original Television Sountrack) | 1 | 1 | Yuju | soundtrack |
| Themselves (Original Soundtrack) Chapter. 2 | 1 | 1 | Heize | soundtrack |
| Today's Webtoon (Original Television Soundtrack) Pt. 1 | 2 | 2 | Jihyo | soundtrack |
| Touch your heart OST | 1 | 1 | Chen | OST |
| True Beauty Season 1, Part.1 (Original Soundtrack) | 2 | 2 | Jo Yuri | soundtrack |
| True to Love, Pt. 7 (Original Soundtrack) | 2 | 2 | VIVIZ | soundtrack |
| Twelve OST Part.1 | 1 | 1 | Tiger JK | OST |
| Unexpected Business Season 3 "Los Angeles": When You Go To Na-Seong (Original Television Soundtrack) | 1 | 1 | Daesung | soundtrack |
| We Are All Trying Here (Original Soundtrack) Part.3 | 1 | 1 | Taeyeon | soundtrack |
| Whats wrong with secretary kim OST Part.3 | 1 | 1 | GFRIEND | OST |
| When the Camellia Blooms (Original Television Soundtrack) Pt.9 | 1 | 1 | Heize | soundtrack |
| When the Stars Gossip OST Part.1 | 1 | 1 | BIG Naughty | OST |
| When the Stars Gossip OST Part.3 | 1 | 1 | Jin | OST |
| Would You Marry Me?, Pt. 3 (Original Soundtrack) | 1 | 1 | NCT WISH | soundtrack |
| You Are Mine (A Business Proposal OST Part.2) | 1 | 1 | VICTON | OST |
| You are my destiny, Pt.6 (Original Sound Track) | 1 | 1 | Ailee | soundtrack |
| 국가대표 와이프 (Original Television Soundtrack) Pt. 2 | 1 | 1 | MOMOLAND | soundtrack |
| 꽃보다 남자 (Original Television Soundtrack) | 1 | 1 | SHINee | soundtrack |
| 꽃보다 남자 (Original Television Soundtrack) Pt. 2 | 1 | 1 | SS501 | soundtrack |
| 내일 (Original Television Soundtrack) Pt.3 | 1 | 1 | Suran | soundtrack |
| 아름다운 세상 (Original Soundtrack) | 1 | 1 | Tiger JK | soundtrack |
| 아름다워 Beautiful (심포유 Heart 4 U Original Soundtrack) | 1 | 1 | Chen | soundtrack |
| 장난스런 키스 (Original Soundtrack) | 1 | 1 | Soyou | soundtrack |

## 3. Look like soundtrack tie-ins, but no rule catches them (owner decides)

Their album name carries no soundtrack word, so neither the code nor the SQL hides them. Not verified
against a source. To hide them, uncomment step 3 of `songs-hide-cover.sql` (the 12 ids are there), or
set `hide_cover = true` on any of them later: the site honours it within 10 minutes once the column exists.

| Album | Artist | Song id | Why it looks like a soundtrack |
| --- | --- | --- | --- |
| Because of Tears (from "Secret") | Ailee | 1ed013ef-f028-41e8-b16a-b668e64fc4b2 | `(from "Title")` naming of a drama song |
| I Stay (From "Ne Zha 2") | Kep1er | 15d26394-0873-4f90-ad6b-02db7835e63d | Ne Zha 2 is an animated film |
| Love Me Back (From "Operation: True Love") | fromis_9 | 2ed78a44-05a8-4f2b-93c2-7fc612ed47a2 | `(From "Title")` naming |
| Psycho (From "Operation: True Love") | izna | 75ec375d-3c84-42ad-9e55-d5656e0276dd | same title as above |
| Barbie Dreams (feat. Kaliii) [From Barbie The Album] | FIFTY FIFTY | fa4ba79a-745a-4a99-93e9-9f929d179806 | Barbie film album |
| Sam Kim X MY DEMON | Sam Kim | efe91ef5-702b-4a0b-bd75-d0685daaecd5 | "My Demon" is a drama title |
| Come on baby tonight (Ditto X VIVIZ) | VIVIZ | 7ad7e890-c4cc-4af8-914b-65ed7aa9139e | "Ditto" is a film title |
| Your Day (Romance 101 X Loco) | Loco | a3e0f453-7066-4569-9967-452ed0216c76 | "Romance 101" tie-in |
| STAY THE NIGHT (She is My Type♡ X GRAY) | Gray | 5acfcd8b-0667-490c-947d-8631b6558ad2 | "She is My Type♡" tie-in |
| Sweet Love (She is My Type♡ X Crush) | Crush | c8ceaf85-fc5f-4c6e-9559-73b5817608e7 | same tie-in |
| Angel Pt. 1 (feat. Jimin of BTS, JVKE & Muni Long) (Trailer Version) | Jimin | 493e07b5-7019-457d-8c3a-9a8181badac2 | FAST X trailer single (Pt. 2 is matched) |
| Music from THE SPECIALS | UNIS | 5e31f50b-04d8-45e8-bd67-bc8f40879e7d | "Music from ..." naming |

`This Is Pengsoo (From "Billboard Project, Vol. 1")` (Tiger JK) has the same `(From "...")` naming but
is a project album, not a soundtrack: one reason a `(From "...")` rule was not added.

## 4. Near misses checked: not soundtracks, covers kept

Every album name containing ost, sound, track, drama, film, movie, series, original or picture that no
rule matches, plus the traps the mission named:

| Album | Artist | Why it is kept |
| --- | --- | --- |
| OST | Ash Island | a 2024 single whose song is titled "OST (Feat. CHANMINA)" (Deezer: record type single, label MIDNIGHT RECORDS) |
| DRAMA | 9Muses | album title |
| Drama - The 4th Mini Album | aespa | album title |
| LOST | 9Muses | "ost" inside a word |
| lost | Dvwn | "ost" inside a word |
| Lost and Found | VERIVERY | "ost" inside a word |
| nostalgia | VICTON, JUNNY | "ost" inside a word |
| Ghost | BABYMONSTER | "ost" inside a word |
| Ghost Light, Ghost Light (Nightcore) | EVERGLOW | "ost" inside a word |
| Ghost of You | Ash Island | "ost" inside a word |
| MOVIE | JUNNY | album title |
| The Movie Star | Bewhy | album title |
| Like A Film : 4 Songs | Giriboy | album title |
| Filmhaye Farsi | THE BOYZ | album title |
| SERIES 'O' [ROUND 0 : WHO], SERIES 'O' [ROUND 3 : WHOLE] | VERIVERY | album series title |
| LOSE YOUR SHXT ('Hearts' Series Vol. 3) | YOUNG POSSE | album series title |
| My Style (Hidden Track) | Brown Eyed Girls | "track" without "sound" |
| Sound G., Sound-G Sign | Brown Eyed Girls | album titles |
| Now (Original by Fin.K.L) | ONEUS | a cover version, "original" names the first singer |

TV music show projects (`투유 프로젝트 - 슈가맨`, `To You Project - Sugarman2`, `유플래쉬`,
`Fantastic Duo`, `KPOPSTAR Season2`, `I-LAND Part.1 Signal Song`) are not soundtracks and are kept.
