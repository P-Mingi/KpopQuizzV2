# Suppression de compte : mode d'emploi

Fichiers : `account-deletion.sql` (à lancer une seule fois), `account-deletion-rollback.sql` (pour tout annuler).
Rien n'est appliqué tant que vous ne lancez pas le fichier vous-même.

## Le guide en 10 lignes

1. Une seule fois : Supabase, menu **SQL Editor**, collez tout `account-deletion.sql`, cliquez **Run**. Il crée le profil « Deleted user » et la fonction.
2. Pour chaque demande : menu **Authentication > Users**, cherchez l'e-mail de la personne, copiez son **User UID**.
3. Test à blanc : dans le SQL Editor, collez la requête A ci-dessous, remplacez `COLLER-L-UUID` par l'UID, cliquez **Run**. Rien n'est modifié.
4. Lisez la ligne `mode` : elle doit dire `dry_run (nothing was changed)`.
5. S'il y a une ligne `REFUS` : arrêtez-vous et envoyez-moi le texte de la ligne. Rien n'a été touché.
6. Lisez les lignes `action` : une table et un nombre de lignes. `quizzes.creator_id (to deleted user)` = les quiz gardés au nom de « Deleted user ».
7. La personne veut aussi effacer ses quiz ? Dans la requête B, remplacez `true, false` par `false, false`. Sinon, gardez `true, false`.
8. Pour de vrai : collez la requête B avec l'UID, **Run**. La ligne `mode` doit dire `deleted`. En cas d'erreur, rien n'est supprimé : tout est annulé.
9. Si la ligne `fichiers` est au-dessus de 0 : menu **Storage**, bucket `verse-space-assets`, dossier `community`, supprimez le dossier qui porte l'UID.
10. Répondez à la personne : son compte est supprimé (dans les 30 jours après sa demande, comme promis sur le site).

## Requête A : test à blanc (ne change rien)

```sql
with r as (select public.admin_delete_account('COLLER-L-UUID') as j)
select 'mode' as type, r.j->>'mode' as detail, null::bigint as lignes from r
union all select 'REFUS', x, null from r, jsonb_array_elements_text(r.j->'refusals') x
union all select 'action', a->>'step', (a->>'rows')::bigint from r, jsonb_array_elements(r.j->'actions') a
union all select 'fichiers', 'Storage, a supprimer a la main', (r.j->>'storage_files_left')::bigint from r;
```

## Requête B : suppression pour de vrai

`true, false` garde les quiz publiés (au nom de « Deleted user »). `false, false` les supprime aussi.

```sql
with r as (select public.admin_delete_account('COLLER-L-UUID', true, false) as j)
select 'mode' as type, r.j->>'mode' as detail, null::bigint as lignes from r
union all select 'REFUS', x, null from r, jsonb_array_elements_text(r.j->'refusals') x
union all select 'action', a->>'step', (a->>'rows')::bigint from r, jsonb_array_elements(r.j->'actions') a
union all select 'fichiers', 'Storage, a supprimer a la main', (r.j->>'storage_files_left')::bigint from r;
```

Les résultats ne montrent que des noms de tables et des nombres, jamais de donnée personnelle.
La fonction refuse toujours le profil « Deleted user » et le profil KpopQuizz Team.

## Le texte du site

**Aujourd'hui (cette PR)**, partout où le site parle de suppression :

> We delete accounts by hand. Send a request from the contact page and we delete your account within 30 days. Your published quizzes are deleted with it.

C'est vrai aujourd'hui : `quizzes.creator_id` est en ON DELETE CASCADE, donc supprimer un compte supprime ses quiz.

**Une fois la fonction en place** (après le point 1 ci-dessus), le texte à mettre à la place :

> Your published quizzes stay, credited to a deleted user, unless you ask us to delete them.

Les 4 endroits à changer à ce moment-là (petite PR, je la fais sur votre go) :

| Endroit | Texte d'aujourd'hui | Texte une fois la fonction en place |
|---|---|---|
| Réglages, section Account, ligne « Delete account » (`components/profile/ux-v1/settings.tsx`) | Removes your passport. Your published quizzes are deleted with it. | Removes your passport. Your published quizzes stay, credited to a deleted user, unless you ask us to delete them. |
| Réglages, fenêtre « Delete your account? » (même fichier) | Your passport, scores and badges are removed. We delete accounts by hand. Send a request from the contact page and we delete your account within 30 days. Your published quizzes are deleted with it. | Your passport, scores and badges are removed. We delete accounts by hand. Send a request from the contact page and we delete your account within 30 days. Your published quizzes stay, credited to a deleted user, unless you ask us to delete them. |
| Ancienne page Réglages (`app/(site)/settings/page.tsx`, si UX_V1 est coupé) | Need to delete your account? We delete accounts by hand. Send a request from the contact page and we delete your account within 30 days. Your published quizzes are deleted with it. | même phrase, avec la dernière remplacée par « Your published quizzes stay, credited to a deleted user, unless you ask us to delete them. » |
| /privacy, section 6 « Data retention » | ... and we delete your account within 30 days. Your published quizzes are deleted with it. | ... and we delete your account within 30 days. Your published quizzes stay, credited to a deleted user, unless you ask us to delete them. |

## Notes : table par table

Lu dans le catalogue de production le 2026-10-15 (lecture seule) : 57 clés étrangères vers `profiles` ou `auth.users`.
« Deleted user » = le profil sentinelle `00000000-0000-0000-0000-00000000dead`.

### Contenu publié (suit le choix « garder les quiz »)

| Table.colonne | Règle | Décision |
|---|---|---|
| `quizzes.creator_id` | CASCADE | Gardés : les quiz publiés (et `flagged`) passent à Deleted user, ses compteurs suivent. Les quiz `draft` et `removed` sont supprimés. Avec `false` : tous supprimés. |
| `qotd_log.quiz_id` (vers quizzes) | NO ACTION | Les lignes du journal du quiz du jour d'un quiz supprimé sont supprimées. Un quiz gardé garde sa ligne. |
| `quiz_bank.published_quiz_id` (vers quizzes) | NO ACTION | Jamais touché. Si un quiz à supprimer y est relié : REFUS (sinon la rotation rouvrirait la ligne). |
| `games.creator_id` | NO ACTION | Même règle que les quiz : gardés pour Deleted user, ou supprimés avec les `game_plays` et `game_reports` de ces jeux (`game_likes` suivent en CASCADE). |
| `tier_lists.creator_id` | SET NULL | Publiques ou non listées : gardées pour Deleted user. Privées : supprimées. Avec `false` : toutes supprimées. (Sans ça, la suppression échouerait : une liste publique doit avoir un créateur.) |

### Références NO ACTION (elles bloquaient une suppression simple)

| Table.colonne | Décision |
|---|---|
| `game_plays.player_id` | Anonymisée (vidée), comme les parties de quiz. |
| `game_reports.reporter_id` | Anonymisée (vidée), comme les signalements de quiz. |
| `blind_test_plays.player_id` | Anonymisée (vidée). |
| `tot_plays.user_id` | Anonymisée (vidée). |
| `pinterest_csv_batches.created_by` | Anonymisée (vidée). |
| `bt_players.user_id` | Supprimée (profil blind test). Avant : ses `ranked_plays` (NO ACTION vers bt_players) sont supprimées, et le nom copié dans `challenges.creator_name` et `challenge_attempts.player_name` devient « Anonymous ». |
| `daily_blindtest_scores.user_id` | Supprimée. |
| `debate_votes.user_id` | Supprimée (avec les réponses et signalements attachés à ce vote, en CASCADE). |
| `activity_cheers.user_id` | Supprimée. |
| `dev_user_cards`, `dev_pack_opens`, `dev_byeol_transactions`, `dev_user_byeol` (`user_id`) | Supprimées. |

### Références SET NULL (automatique à la suppression du compte)

`activity_events.user_id` (et `display_name` remplacé par « Deleted user » avant, car c'est une copie du nom), `battle_results.user_id`, `bt_runs.player_id`, `community_challenges.author`, `community_debates.author`, `community_replies.author`, `creator_notifications.sender_id`, `editorial_drafts.created_by`, `editorial_drafts.reviewed_by` (voir refus), `pending_questions.author_user_id`, `personality_results.user_id`, `plays.player_id`, `reports.reporter_id`, `trivia.created_by`.

### Références CASCADE (supprimées automatiquement avec le compte)

`profiles.id`, `players.id` (puis `player_group_mastery`, `player_achievements`, `daily_challenge_plays`; `bt_plays.player_id` vidé), `likes`, `follows` (deux colonnes, compteurs mis à jour par le trigger), `user_badges`, `game_likes`, `tier_list_likes`, `tier_list_assets`, `dev_share_links`, `quiz_comments` (et les réponses et likes sous ces commentaires), `quiz_comment_replies`, `quiz_comment_likes`, `quiz_comment_reply_likes`, `quiz_reactions`, `like_xp_awards`, `creator_notifications.user_id`, `community_likes`, `community_debate_votes`, `notification_prefs`, `passport_group_snapshots`, `group_quiz_alerts`, `byeol_daily_caps`, `byeol_reward_history`, `ranked_runs`, `ranked_legends`, `editorial_accounts` (voir refus). Côté Auth : identités, sessions, jetons.

### Refus (la fonction s'arrête, rien n'est touché)

- `editorial_accounts` : un compte éditorial (staff). `editorial_drafts.account_id` est en RESTRICT. À traiter à la main.
- `editorial_drafts.reviewed_by` sur un brouillon approuvé ou publié : la règle `editorial_drafts_reviewed_chk` exige un relecteur. À traiter à la main.
- Une future table en NO ACTION que la fonction ne connaît pas encore : la fonction le dit et s'arrête.

### Tables Verse sans clé étrangère

Exactement comme `apps/quiz/src/lib/verse/account-cleanup.ts` (repris en SQL dans la fonction) :
supprimées : `verse_binders`, `verse_profile_shelf`, `verse_profile_shelf_settings`, `photocard_collection`, `collectible_collection`, `verse_essay_reactions`, `profile_section_visibility` ;
vidées : `verse_essay_series.created_by`, `verse_threads.created_by`.

Trouvées en plus dans le catalogue (le fichier TS ne les couvre pas) :
supprimées (données privées) : `verse_watchlists`, `space_members` (ligne du membre), `space_poll_votes`, `verse_drafts` ;
vidées : `space_members.invited_by`, `space_members.blocked_by`, `space_polls.created_by`, `verse_essays.reviewed_by`, `verse_flags.reporter`, `verse_flags.resolved_by`, `verse_space_assets.uploaded_by`, `verse_space_assets.reviewed_by`, `idols.created_by`, `photocards.created_by`, `collectibles.created_by`, `verse_banned_terms.created_by`, `community_autohidden.restored_by`, `verse_edit_suggestions.author`, `verse_edit_suggestions.reviewer`, `verse_content.locked_by` ;
passées à Deleted user (contenu partagé, auteur obligatoire) : `verse_discussions.author`, `verse_essays.author`, `pages.created_by`, `page_revisions.author`, `verse_revisions.author`, `verse_pages.created_by`, `entity_overrides.author`.

Colonnes hachées, impossibles à relier au compte, laissées telles quelles : `battle_results.player_hash`, `pending_questions.author_hash`, `reports.reporter_hash`, `share_link_plays.player_key`, `duel_votes.voter_hash`, `duel_vote_guard.voter_hash`, `pending_question_votes.voter_hash`, `discord_flex_log.voter_hash`.
`discord_quiz_scores` garde un identifiant et un pseudo Discord, sans lien avec le compte du site : non touché.

### À savoir

- Storage : la fonction compte les fichiers (dossier `verse-space-assets/community/<UID>/` et fichiers dont le compte est propriétaire) mais ne les efface pas. Les images de quiz (`quiz-images/année/mois/`) ne portent pas l'UID et restent avec les quiz.
- Les compteurs déjà calculés (par exemple `quizzes.like_count` quand un like part avec le compte) ne sont pas recalculés : c'est déjà le cas aujourd'hui quand une ligne part en CASCADE.
- Une fois des quiz gardés, la page `/u/deleted_user` existe et liste ces quiz. Si vous préférez la masquer ou ne pas faire de lien vers elle, c'est un petit changement de code à part.
- Test complet fait sur une base locale jetable (jamais en production) : test à blanc sans aucun changement, suppression avec quiz gardés, suppression avec quiz effacés, refus, droits (anon et authenticated refusés), second compte intact.
