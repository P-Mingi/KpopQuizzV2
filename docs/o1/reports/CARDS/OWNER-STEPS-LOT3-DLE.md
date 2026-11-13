# Lot 3 DLE : les étapes du proprio

Trois choses : les photos de Kpopdle, l'aperçu privé des images d'Otakudle puis leur suppression, et la vérification avant d'ouvrir au public. Rien ici ne se fait tout seul : Claude n'a aucun accès à la production.

## 1. Les photos de Kpopdle (script du proprio, rangé dans le dépôt)

Le script est le même que celui de `out/otaku-refs-tool/kpopdle-photos.mjs`, même comportement, rangé dans `apps/quiz/scripts/cards/kpopdle-photos/`. Il donne aux idols de Kpopdle les photos déjà utilisées sur les pages membres de kpopquiz.org (`apps/quiz/public/idols`, 141 idols).

Depuis le dossier du dépôt, Node 18 ou plus récent :

```
read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY
```

Colle la clé service (rien ne s'affiche), Entrée. Elle n'est jamais affichée ni écrite par le script.

```
node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs
```

Aperçu : quel idol reçoit quel fichier, qui n'en a pas, qui existe déjà. Il ne lit que. Si la liste te va :

```
node apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs --publish
```

Options inchangées : `--replace` remplace une photo déjà posée, `--idols-dir <dossier>` ajoute d'autres fichiers « Idol Groupe.jpg ». Un fichier `kpopdle-photos-report.csv` est écrit à côté du script (hors git). Kpopdle montre les nouvelles photos après le rafraîchissement de la nuit (00:05 UTC, la route `ensure-daily-quiz` appelle `dle_daily_maintenance`). Les pages de kpopquiz.org ne changent pas.

Un idol sans photo n'a plus d'initiales sur un grand aplat : le jeu lui dessine une carte aux couleurs de son groupe, avec son nom en grandes lettres.

## 2. L'aperçu privé des images d'Otakudle (toi seul)

Les images « Official artwork » du 2026-11-11 et les CC0 de Fandom sont sous droits. Tu peux les voir dans les trois Otakudle (bunnyverse.org/otakudle, /otakudle/one-piece, /otakudle/dragon-ball) avant de les supprimer. Elles se chargent dans ton navigateur après la page, par une route d'admin : réponse 404 pour tout autre compte et pour un visiteur, jamais dans le HTML, jamais dans un cache.

1. Vercel, projet `fandomverse` (le hub), Production : `PRIVATE_LAUNCH` = `1` exactement (la valeur `1`, pas une absence de valeur, pas `true`). Toute autre valeur coupe l'aperçu : la route répond 404 et le navigateur ne demande rien.
2. Même projet : `ADMIN_USER_IDS` contient ton identifiant (comme sur le projet de l'admin). Redeploy.
3. Connecte-toi sur bunnyverse.org avec ton compte admin et passe le code TOTP (la page du code est celle de l'admin : bunnyverse.org/anime/admin). L'aperçu demande le niveau aal2, comme l'admin.
4. Ouvre bunnyverse.org/otakudle, joue : les images apparaissent dans la liste de suggestions, les lignes d'essais et la carte de la réponse, avec la mention « Owner preview » sur la carte. Dans une fenêtre privée ou avec un autre compte : rien, le jeu montre la carte habituelle.

Quand tu as vu : passe à l'étape 3. Mettre `PRIVATE_LAUNCH=0` coupe aussi l'aperçu.

## 3. Supprimer les images non libres

Admin, onglet Photos, « Personnages anime » : bouton **Supprimer les images non libres**.

1. Un clic calcule la sélection sur le serveur et montre : le nombre d'images, leurs fichiers, les fichiers orphelins, et 10 exemples. Attendu en production : environ 1 068 images (1 012 + 56). Plus de 1 100 : le bouton refuse, rien n'est supprimé.
2. Tape `SUPPRIMER`, puis « Supprimer maintenant ». Le serveur recalcule la sélection, refuse si elle n'est plus la même que celle montrée, puis supprime les lignes, leurs fichiers et les orphelins, et dit ce qu'il a supprimé.

La sélection (la même pour l'aperçu et pour le bouton) : lignes `entity_images` du site `anime`, type `character`, jamais vérifiées, et soit licence `other` avec une note qui commence par « Official artwork » créée le 2026-11-11 (jour UTC), soit licence `cc0` dont la source a pour hôte fandom.com, un sous-domaine de fandom.com, wikia.nocookie.net ou un de ses sous-domaines. Orphelins : fichiers du bucket `entity-images` sous `anime/character/`, créés le 2026-11-11 entre 21:00 et 21:30 UTC, sans ligne qui pointe vers eux. Rien d'autre n'est touché (une ligne vérifiée, une autre date, une source qui contient seulement « fandom » dans son chemin, une image de Commons).

## 4. Avant `PRIVATE_LAUNCH=0` : 0 image non libre

Dans le SQL Editor de Supabase, une requête à la fois. Attendu : `0` et `0`. Ces deux lignes sont aussi à ajouter à `docs/launch/o1/PRIVATE-LAUNCH.md` (« Ouvrir au public », ligne 4) et au RUNBOOK (L3f) : `DOCS-LAUNCH-LOT3-DLE.patch`, à côté de ce fichier (`git apply`), parce que ces deux fichiers ne sont pas à la lane CARDS.

```sql
select count(*) as non_free_images
from public.entity_images
where site_id = 'anime' and kind = 'character' and not license_verified
  and (
    (license = 'other' and starts_with(license_note, 'Official artwork')
      and created_at >= timestamptz '2026-11-11 00:00:00+00' and created_at < timestamptz '2026-11-12 00:00:00+00')
    or
    (license = 'cc0' and source_url !~ '[\s\\]'
      and substring(lower(source_url) from '^https?://(?:[^/?#@\\\s]*@)?([^/?#:@\\\s]+)(?::[0-9]*)?(?:[/?#]|$)') ~ '^([a-z0-9-]+[.])*(fandom[.]com|wikia[.]nocookie[.]net)$')
  );   -- attendu : 0
```

```sql
select count(*) as orphan_files
from storage.objects o
where o.bucket_id = 'entity-images' and starts_with(o.name, 'anime/character/')
  and o.created_at >= timestamptz '2026-11-11 21:00:00+00' and o.created_at <= timestamptz '2026-11-11 21:30:00+00'
  and not exists (
    select 1 from public.entity_images e
    where o.name = e.path or o.name = regexp_replace(e.path, '[.]webp$', '-2x.webp') or o.name = e.thumb_path
  );   -- attendu : 0
```

Une différence : n'ouvre pas, ouvre l'aperçu du bouton de nouveau, ou dis-le à Claude.
