# Verse seed-list review (W1.2)

Owner: eyeball the two "AS FETCHED" columns. Our `name` column is canonical
and is never overwritten by ingestion; these QIDs/MBIDs only decide WHERE we
read open-data facts from. Confirm the flagship 20 before any backfill runs.

### FLAGSHIP 20 (owner reviews these first)

| Group (ours) | Wikidata QID | WD label AS FETCHED | MBID | MB name AS FETCHED | Conf | Flags |
|---|---|---|---|---|---|---|
| aespa | Q100877982 | Aespa | b51c672b... | aespa | HIGH |  |
| ATEEZ | Q59793088 | Ateez | cf0dbc16... | ATEEZ | HIGH |  |
| BABYMONSTER | Q115967938 | Babymonster | 5829cd4f... | BABYMONSTER | HIGH |  |
| BLACKPINK | Q25056945 | Blackpink | 48646387... | BLACKPINK | HIGH |  |
| BTS | Q13580495 | BTS | 0d79fe8e... | BTS | HIGH |  |
| ENHYPEN | Q99479445 | Enhypen | 95663592... | ENHYPEN | HIGH |  |
| EXO | Q494717 | EXO | b3785a55... | EXO | HIGH |  |
| (G)I-DLE | Q51885404 | I-dle | 0068ae6c... | i-dle | HIGH | MB fallback: parentheses broke the naive query |
| ITZY | Q60732823 | Itzy | bce172fc... | ITZY | HIGH |  |
| IVE | Q109375061 | Ive | b2f2216a... | IVE | HIGH |  |
| LE SSERAFIM | Q111381707 | Le Sserafim | 1ee37742... | LE SSERAFIM | HIGH |  |
| NCT | Q23725822 | NCT | 9c15986d... | NCT | HIGH | umbrella NCT (owner-confirmed); 127/Dream/U/Wish are units |
| NewJeans | Q113189277 | New Jeans | 49204a7a... | NewJeans | HIGH |  |
| NMIXX | Q109307762 | Nmixx | 2d623e82... | NMIXX | HIGH |  |
| Red Velvet | Q17466114 | Red Velvet | 4f0cb3b7... | Red Velvet | HIGH |  |
| RIIZE | Q121075203 | Riize | f3eaa943... | RIIZE | HIGH |  |
| SEVENTEEN | Q14524548 | Seventeen | e04d239e... | SEVENTEEN | HIGH |  |
| Stray Kids | Q46134670 | Stray Kids | 142b343d... | Stray Kids | HIGH |  |
| TWICE | Q20645861 | Twice | 8da127cc... | TWICE | HIGH |  |
| TXT | Q60550265 | TXT | 9d027d72... | TOMORROW X TOGETHER | REVIEW | WIKIDATA LABEL VANDALIZED at audit time ("Tacos de asada y cebollin"). QID is correct; our name stays canonical. |

### LONG-TAIL 10

| Group (ours) | Wikidata QID | WD label AS FETCHED | MBID | MB name AS FETCHED | Conf | Flags |
|---|---|---|---|---|---|---|
| 2NE1 | Q171885 | 2NE1 | e119e5ff... | 2NE1 | HIGH |  |
| Billlie | Q108888399 | Billlie‎ | 3bd894b2... | Billlie | HIGH |  |
| FIFTY FIFTY | Q116731010 | FIFTY FIFTY | 5c6b4031... | FIFTY FIFTY | REVIEW | Wikidata auto-picked wrong item ("1:1"); QID corrected by hand. |
| Hwasa | Q19603912 | Hwasa | 9c750319... | HWASA | REVIEW | Solo artist (Wikidata person entity), not a group. |
| Jennie | Q26262599 | Jennie | 779351de... | JENNIE | REVIEW | Solo artist (Wikidata person entity), not a group. |
| Kep1er | Q109077000 | Kep1er | 187da628... | Kep1er | HIGH | MB fallback: transient 503 during spike |
| NCT DREAM | Q47002841 | NCT Dream | dc7c8277... | NCT DREAM | HIGH |  |
| SHINee | Q269836 | SHINee | 70e5098b... | SHINee | HIGH |  |
| Taeyeon | Q233371 | Taeyeon | 2b786fb3... | TAEYEON | REVIEW | Solo artist (Wikidata person entity), not a group. |
| VIVIZ | Q108853211 | Viviz | 4142301a... | VIVIZ | HIGH |  |
