# ADMIN-1 : le pouvoir admin côté SQL (2026-10-30)

Question du owner : une fonction ou une policy SQL donne-t-elle un droit admin à un JWT d'utilisateur (une liste d'admins, `auth.jwt()`, un rôle lu dans le jeton ou dans une table) ? Si oui, ADMIN-1 y ajoute `(auth.jwt()->>'aal') = 'aal2'` par une migration additive.

**Réponse : aucune.** Aucune migration n'est préparée (pas de fichier 023 dans `docs/pending-migrations/multisite/`, pas de `docs/launch/o1/checks/V-` pour ADMIN-1).

## Ce qui a été lu

`docs/o1/contracts/schema.sql`, les 142 fichiers de `supabase/migrations/`, tout `docs/pending-migrations/` (racine, `multisite/` jusqu'à 022, `hub/`). Recherches : `auth.jwt`, `request.jwt`, `current_setting(`, `app_metadata`, `raw_app_meta`, `raw_user_meta`, `auth.role()`, `is_admin`, `admin` dans les noms de fonctions et de policies, `'admin'`, `moderator`, `space_admin`, `SECURITY DEFINER`.

## Résultat

| Objet | Ce qu'il fait | Verdict |
|---|---|---|
| `auth.jwt()`, `request.jwt.claims`, `app_metadata` | n'apparaissent dans aucun fichier SQL | rien à faire |
| `admin_delete_account` (`docs/pending-migrations/account-deletion.sql:105`) | DEFINER ; `REVOKE ALL ... FROM PUBLIC`, `FROM anon, authenticated` (`:624`, `:625`) ; `GRANT ... TO service_role` (`:626`) | fermée au JWT, confirmé en production (Q26) |
| `bt_runs_admin_stats` (`v12-g1-bt-runs.sql:166`, `v12-bundle-a.sql:181`) | `REVOKE ALL ... FROM PUBLIC, anon, authenticated` ; `GRANT ... TO service_role` (`v12-g1-bt-runs.sql:257`, `:258`) | fermée au JWT, confirmé en production (Q26) |
| `gate_notification_prefs` (`supabase/migrations/122_notification_foundation.sql:77`) | DEFINER, `RETURNS TRIGGER` : déclencheur `BEFORE INSERT` de `creator_notifications` qui jette une notification qu'un utilisateur a coupée ; elle ne lit que `notification_prefs`, ne donne aucun droit et ne s'appelle pas en RPC (une fonction trigger ne s'appelle pas directement) | aucun pouvoir admin |
| `dev_cards` "Service role can manage cards" (`060_fancard_system.sql:37`) | `auth.role() = 'service_role'` : la clé service seule | pas un JWT d'utilisateur |
| `space_members.role` (`132_verse_roles.sql:19`, `:42`) | rôles curator et space_admin, lecture publique ; aucune policy ni fonction ne s'en sert pour donner un droit | le pouvoir Verse est dans le code, désormais derrière `requireAdmin` (`lib/verse/roles.ts`, `curate.ts`) |
| `creator_notifications` | aucune policy d'insertion pour `authenticated` ; un DM admin passe par la route `api/admin/notifications/send` (requireAdmin, puis clé service) | rien à faire |

## Le vrai risque SQL n'est pas un droit admin, c'est l'inverse

Les policies nommées "admin" des tables `blind_test_songs`, `songs`, `pinterest_pins`, `pinterest_auth`, `pinterest_boards` et `quiz_pinterest_cards` sont ouvertes à tous (rôle PUBLIC, la clé anon comprise) : ADMIN-0 section 7 et 9 bis (Q25, confirmé en production). Elles ne reconnaissent pas un admin, elles donnent le droit à n'importe qui ; y ajouter `aal2` laisserait écrire tout compte connecté qui a mis en place un code. Le bon correctif est de les supprimer : c'est le correctif SQL déjà donné au owner le 2026-10-30, hors dépôt.

ADMIN-1 prépare le code à cette suppression : les deux seules écritures de l'app qui en dépendaient, `POST /api/admin/songs` et `PUT, DELETE /api/admin/songs/[id]`, écrivent maintenant avec la clé service, seulement après `requireAdmin`. Aucune écriture de l'app sur `songs` n'existe (lectures seulement).
