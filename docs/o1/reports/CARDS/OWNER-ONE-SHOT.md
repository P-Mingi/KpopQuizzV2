# KpopCards : ta page, dans l'ordre

Neuf étapes. Ne saute rien, ne change pas l'ordre. Claude n'a aucun accès à la production : tout ce qui touche Supabase et Vercel, c'est toi.

## Les étapes

1. **CI verte** sur la tête de la PR : https://github.com/P-Mingi/KpopQuizzV2/pull/231. Si un test est rouge, ne va pas plus loin. Ce qui compte : `unit` et `e2e`. Les aperçus Vercel `fandomverse` et `otakuquiz` échouent toujours sur cette branche (pas de variables Preview, c'est voulu : on saute l'aperçu du hub) ; `kpopquiz` passe.

2. **Sauvegarde.** Supabase, Database, Backups : une sauvegarde de moins de 24 heures doit exister (fais-en une si ton offre le permet). Une sauvegarde plus vieille ne compte pas.

3. **Le SQL, en deux fichiers.** Ouvre le SQL Editor de Supabase. Jamais entre 23:50 et 00:30 UTC.
   - Colle `docs/pending-migrations/cards/ALL-099-115.sql` et lance. Il contient les 15 fichiers (099, 102, 099b, 103, 104, 105, 106, 107, 108, 110, 111, 112, 113, 114, 115) dans une seule transaction. Une garde refuse de tourner entre 23:50 et 00:30 UTC, quand une carte est possédée ou un paquet ouvert, ou quand 102 est déjà appliqué.
   - Puis colle `docs/pending-migrations/cards/ALL-verify.sql` (un seul SELECT, en lecture seule). La dernière ligne, `TOUT_OK`, doit valoir `true`.
   - Autre façon, depuis un terminal (sans `-1` : le fichier a son propre begin/commit) :
     `psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/ALL-099-115.sql`
   - Si ça échoue : rien n'a changé, tout est dans une transaction. Lis le message. Si l'éditeur dit qu'une transaction est encore ouverte, lance `rollback;`, puis dis-le à Claude avec le message. Ne relance pas à l'aveugle.

4. **Variables Vercel, Production** (tableau plus bas). Pose-les avant la fusion : les pages KpopCards statiques lisent `NET_CARDS` au build, et une variable publique n'est prise qu'au build. Redéploie si tu en changes une après.

5. **Le domaine** `kpopcards.bunnyverse.org` (facultatif, ne bloque rien). Vercel, projet `fandomverse` seulement, Settings, Domains : ajoute `kpopcards.bunnyverse.org` et pose l'enregistrement DNS que Vercel affiche (un CNAME vers `cname.vercel-dns.com.` pour un sous-domaine, comme `www` à l'étape H6 du RUNBOOK). Ce n'est qu'un alias : le code (`apps/quiz/src/lib/site/routing.ts`, `HUB_REDIRECTS`) renvoie tout chemin en 308 vers `https://bunnyverse.org/kpopcards/...`. Aucun domaine pour `kpopquiz` ni `otakuquiz`.

6. **Fusionne la PR #231**, puis attends que les 3 déploiements, `kpopquiz`, `otakuquiz` et `fandomverse`, soient Ready.

7. **L'admin** (connecte-toi, passe le code TOTP) :
   - Images non libres : https://bunnyverse.org/anime/admin?tab=photos&kind=chars, bouton « Supprimer les images non libres ». L'aperçu doit annoncer environ 1 068 images (1 012 + 56). Au-dessus de 1 100, le bouton refuse. Tape `SUPPRIMER`, puis « Supprimer maintenant ».
   - Photos à relire : https://bunnyverse.org/anime/admin?tab=photos&kind=cards, filtre « À relire » (44 photos). Pour chacune, « Approuver » ou « Refuser ».
   - Puis, sur la même page, « Reconstruire le catalogue ». Le message dit combien de cartes attendent leur fichier : c'est normal, l'étape 8 les coupe.

8. **Le script du terminal**, dans ton dépôt : `git pull`, puis `pnpm --filter quiz owner:cards`.
   - Il lit `apps/quiz/.env.local` et veut `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_DB_URL`.
   - `SUPABASE_DB_URL` : Supabase, bouton Connect, la chaîne de connexion. Mets-la dans `apps/quiz/.env.local` seulement. Jamais dans Vercel, jamais dans git, jamais dans le chat.
   - Il te fait retaper l'hôte du projet, refuse tant que `ALL-verify.sql` ne rend pas `TOUT_OK`, puis fait dans l'ordre : fichiers des cartes (aperçu, confirmation tapée, publication), puis photos de Kpopdle (aperçu, confirmation tapée, publication).
   - Entre l'étape 3 et ce script, ne touche pas aux membres Kpopdle ajoutés par 099 et 099b (case « à relire ») : le contrôle attend qu'ils le restent. Si tu as approuvé une photo sans reconstruire le catalogue, le contrôle le dit (`TOUT_OK` false) : reconstruis, puis relance.
   - Pourquoi après l'admin : la publication ne coupe que les photos vivantes (statut `auto` ou `approved`). Une photo approuvée à l'étape 7 est donc coupée dans ce passage unique. Faite avant, elle aurait demandé un second passage.

9. **Le premier vrai paquet** : https://bunnyverse.org/kpopcards, connecté avec ton compte. Dès qu'un paquet est ouvert ou une carte possédée, « Reconstruire le catalogue » est refusé pour toujours : il ne reste que « Ajouter au catalogue ».

## Variables Vercel (Production)

| Nom | Valeur | Projet | État |
|---|---|---|---|
| `NET_CARDS` | `1` | fandomverse | à vérifier |
| `NEXT_PUBLIC_NET_CARDS` | `1` (l'entrée KpopCards du menu du hub, lue au build : `lib/ux-v1/a0/nav.ts`) | fandomverse | à vérifier |
| `NET_CARDS_BRIDGES` | `1` (le paquet de victoire Kpopdle, le paquet du quiz du jour) | fandomverse | à vérifier |
| `NEXT_PUBLIC_NET_CARDS_BRIDGES` | `1` (la ligne du paquet de bonus sur Kpopdle, le lien Binder du menu) | fandomverse | à vérifier |
| `CARDS_DEMO_SECRET` | généré par toi, voir plus bas | fandomverse | à vérifier |
| `PRIVATE_LAUNCH` | `1` | fandomverse et otakuquiz | à vérifier |
| `PRIVATE_LAUNCH_ALLOW`, `PRIVATE_LAUNCH_KEY` | inchangées (`docs/launch/o1/PRIVATE-LAUNCH.md`), identiques sur les deux projets | fandomverse et otakuquiz | à vérifier |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | celles de `kpopquiz` | les trois | posées le 2026-10-28 (ENV.md) |
| `SUPABASE_SERVICE_ROLE_KEY` | celle de `kpopquiz` | fandomverse et otakuquiz | à vérifier |
| `CRON_SECRET` | déjà là | fandomverse et otakuquiz | posée le 2026-10-28 (ENV.md) |
| `ADMIN_USER_IDS` | ton identifiant | otakuquiz (l'admin) | posée le 2026-10-28 (ENV.md) |

À ne pas poser maintenant (le code les lit éteintes) : `NET_CARDS_ADS`, `NEXT_PUBLIC_NET_CARDS_ADS`, `NET_CARDS_PUSH`, `NEXT_PUBLIC_NET_CARDS_PUSH`, les quatre clés VAPID. À laisser vides : `CARDS_BONUS_PER_DAY` (3), `CARDS_TIMER_PER_DAY` (40), `CARDS_ADS_PER_DAY` (10), `CARDS_AD_SHARDS` (25), le code prend ces valeurs (`lib/cards/flags.ts`). Rien de tout cela sur `kpopquiz` : le lancement privé n'existe pas sur kpopquiz.org (`lib/private-launch/config.ts`, ligne 116), donc `NET_CARDS` et `NET_CARDS_BRIDGES` y feraient apparaître les blocs KpopCards à tout le monde, vers un hub fermé.
Jamais dans Vercel : `SUPABASE_DB_URL`, `CARDS_UI_FIXTURE`.

**`CARDS_DEMO_SECRET`** : dans ton terminal, `openssl rand -base64 32 | pbcopy`, puis colle dans Vercel (rien ne s'affiche, rien ne reste dans l'historique). Cela fait 44 caractères ; le code exige au moins 16 (`DEMO_SECRET_MIN`, `lib/cards/demo.ts`) et sans lui il n'y a pas de paquet de démonstration pour les invités. Sensitive, hub seulement.

## Entre le SQL et la fusion : que voit-on ?

Le code de `main` tourne un moment sur le nouveau schéma (étapes 3 à 6).
- Tout KpopCards est derrière `NET_CARDS` (`lib/cards/flags.ts`, ligne 48 ; `ui-flag.ts`, ligne 6). Si `NET_CARDS` n'est pas à `1` dans Vercel aujourd'hui (à vérifier : aucun document ne le dit), toutes les pages et routes `/api/cards/*` répondent 404 et rien n'appelle les fonctions changées. Aucun écran ne casse.
- Si `NET_CARDS` est déjà à `1`, `main` appelle `cards_apply_pack` (`lib/cards/open-pack.ts`, ligne 24) et `cards_recycle` (`app/api/cards/recycle/route.ts`, ligne 12) : le fichier 110 supprime la première et change la seconde. Ouvrir un paquet, recycler et la publicité récompensée (éteinte) donneraient alors une erreur 500 `server`. Le reste (état du joueur, catalogue, admin) continue, car `cards_wallet` garde ses arguments.
- Aucun risque pour les autres visiteurs. Sur le hub, `PRIVATE_LAUNCH=1` envoie toute page vers « Coming soon » sans le cookie de ton navigateur (`next.config.ts`, ligne 153, `readPrivateLaunch`), et l'API Cards répond 404 à tout compte non autorisé (`lib/cards/api.ts`, lignes 68 et 72). kpopquiz.org ne lit les tables cards que par les ponts, éteints tant que `NET_CARDS` et `NET_CARDS_BRIDGES` sont absents du projet `kpopquiz` (`lib/cards-bridge/flags.ts`, ligne 9 ; `home.ts`, ligne 6) : à vérifier sur ce projet. otakuquiz est fermé comme le hub.

## Revenir en arrière

1. D'abord Vercel, **Instant Rollback** sur les 3 projets (`kpopquiz`, `otakuquiz`, `fandomverse`), vers le déploiement précédent. Cela ne touche aucune donnée.
2. Seulement si besoin : `docs/pending-migrations/cards/ALL-rollback.sql`, une transaction, les 15 retours en arrière dans l'ordre inverse. Puis il remet le catalogue de 101, celui d'avant le paquet. Il refuse, sans rien changer, dès qu'un joueur possède une carte ou a ouvert un paquet : après le premier vrai paquet, on ne revient plus en arrière par le SQL. Ensuite `ALL-verify.sql` rend `TOUT_OK` false, c'est normal.
