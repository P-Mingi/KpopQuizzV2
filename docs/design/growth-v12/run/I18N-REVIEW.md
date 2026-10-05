# fr, es, id review of the growth strings (2026-10-05)

Reviewed by the owner's assistant (Claude, cowork session) in apps/quiz/src/lib/growth/bt-strings.ts,
bt-landing.ts and bt-themes.ts. French: full review. Spanish and Indonesian: careful review, not a native
speaker; good enough to ship, a native fan can still read them later. Apply each change as written; keep
every other string as it is. Keep the existing tests green and update a test only where it asserts one of
these exact strings.

## bt-strings.ts

| Lang | Key | Now | New |
|---|---|---|---|
| fr | correct | Correct | Bonne réponse |
| fr | announce (correct head) | Correct, plus N points. | Bonne réponse, plus N points. |
| fr | listening | écoute | en écoute |
| fr | nextIn | ... dans N secondes | singular when N is 1: "dans 1 seconde" |
| es | nextIn | ... en N segundos | singular when N is 1: "en 1 segundo" |
| fr | averageAnswer | Réponse moyenne | Temps de réponse moyen (only if the value shown is a time) |
| es | averageAnswer | Respuesta media | Tiempo medio de respuesta (same condition) |
| id | averageAnswer | Rata-rata jawaban | Rata-rata waktu jawab (same condition) |
| fr | challengeRow | Défie un ami avec exactement ces chansons | Défie tes amis sur ces mêmes chansons |
| fr | challengeNote | Ton ami joue exactement tes chansons · 48 heures | Tes amis jouent exactement tes chansons · 48 heures |
| es | challengeRow | Reta a un amigo con estas mismas canciones | Reta a tus amigos con estas mismas canciones |
| es | challengeNote | Tu amigo juega tus mismas canciones · 48 horas | Tus amigos juegan tus mismas canciones · 48 horas |
| fr | linkCopied48 | Lien copié. Il marche pendant 48 heures. | Lien copié. Il est valable 48 heures. |
| fr | linkReady48 | Ton lien est prêt ci-dessous. Il marche pendant 48 heures. | Ton lien est prêt ci-dessous. Il est valable 48 heures. |
| fr | runTitle | blind test X | keep, but write "Blind test X" wherever it starts a line or a title |

## bt-landing.ts

| Lang | Key | Now | New |
|---|---|---|---|
| fr | title | Blind test K-pop gratuit | Blind test K-pop gratuit : devine la chanson (check the SEO title length test) |
| fr | steps[2].body | Juste et rapide rapporte plus. Partage ton score ou défie un ami. | Plus tu réponds vite et juste, plus tu gagnes de points. Partage ton score ou défie tes amis. |
| fr | faqSongsA | ..., de la première à la cinquième génération, ... | ..., de la première à la cinquième génération de la K-pop, ... |
| fr | other | Aussi en | Aussi disponible en |
| es | steps[2].body | ... o reta a un amigo. | ... o reta a tus amigos. |

## bt-themes.ts

| Lang | Theme | Field | Now | New |
|---|---|---|---|---|
| es | kpop-hits-2026 | sub | Cada semana | Actualizada cada semana |
| es | kpop-hits-2026 | lead | Las canciones K-pop más grandes del año. | Los mayores éxitos K-pop del año. |
| id | kpop-hits-2026 | lead | Lagu K-pop terbesar tahun ini. | Lagu K-pop paling hits tahun ini. |
| id | kpop-hits-2025 | lead | Lagu-lagu yang menandai tahun lalu. | Lagu-lagu paling hits tahun lalu. |
