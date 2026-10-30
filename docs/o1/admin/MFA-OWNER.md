# Code admin (TOTP) : mode d'emploi du owner (5 minutes)

ADMIN-1, 2026-10-30. L'admin de kpopquiz.org et de bunnyverse.org/anime demande maintenant, en plus du mot de passe, un code à 6 chiffres donné par une application. Tout autre visiteur reçoit une page 404, comme pour une adresse qui n'existe pas.

## 1. Vérifier Supabase (1 minute, une seule fois)

1. Ouvrir Supabase, le projet de production.
2. Aller dans **Authentication > Multi-Factor**.
3. Vérifier que **TOTP (App Authenticator)** est activé. S'il ne l'est pas, l'activer et enregistrer.

Rien d'autre à changer dans Supabase. `ADMIN_USER_IDS` reste la liste des comptes admin, dans Vercel, comme avant.

## 2. Mettre en place le code (3 minutes, juste après le déploiement)

La mise en place n'est ouverte que pendant cette étape, par un interrupteur serveur : `ADMIN_MFA_ENROL_OPEN`. Tant qu'il n'est pas là, un compte de la liste sans code reçoit la même 404 que tout le monde, y compris vous juste après le déploiement : c'est normal. Pendant qu'il est là, un mot de passe volé pourrait aussi mettre en place son propre code : le laisser quelques minutes seulement.

1. Dans Vercel, projet `kpopquiz`, **Settings > Environment Variables** : ajouter `ADMIN_MFA_ENROL_OPEN` = `1` (Production), puis redéployer. Le faire sur `kpopquiz` seul suffit : le code vaut aussi pour OtakuQuiz.
2. Se connecter sur kpopquiz.org avec le compte admin, puis ouvrir `/admin`.
3. L'admin envoie sur la page **Turn on the admin code**. Cliquer **Show the QR code**.
4. Scanner le QR code avec l'application du téléphone (Google Authenticator, Microsoft Authenticator, Authy, ou autre).
5. Ajouter le même code dans le gestionnaire de mots de passe (1Password, Bitwarden, le trousseau Apple ou autre) : scanner le QR code, ou coller la clé affichée sous le QR code. Les deux applications donnent alors les mêmes chiffres : si le téléphone est perdu, le gestionnaire suffit.
6. Taper les 6 chiffres affichés et cliquer **Turn on and continue**. L'admin s'ouvre.
7. Refaire 2 à 6 pour chaque autre compte de `ADMIN_USER_IDS`, avec ses deux applications, ou retirer ce compte de la liste.
8. Retirer `ADMIN_MFA_ENROL_OPEN` de Vercel et redéployer. Vérifier : `/admin` demande toujours les 6 chiffres.

Le même code sert pour bunnyverse.org/anime/admin (même compte, même base).

## 3. Les fois suivantes

Se connecter, ouvrir `/admin`, taper les 6 chiffres de l'une des deux applications. Rien d'autre.

## 4. Secours : plus aucune application ne donne le code

Seulement si le téléphone ET le gestionnaire de mots de passe sont perdus.

1. Dans Supabase, **Authentication > Users** : copier l'UID du compte admin.
2. Dans **SQL Editor**, lancer d'abord cette lecture, en remplaçant `VOTRE_ID` par l'UID copié :

```sql
select id, factor_type, status, friendly_name, created_at
from auth.mfa_factors
where user_id = 'VOTRE_ID';
```

3. Si ce sont bien vos codes, les supprimer, puis supprimer les sessions ouvertes du compte (même remplacement) :

```sql
delete from auth.mfa_factors
where user_id = 'VOTRE_ID';

delete from auth.sessions
where user_id = 'VOTRE_ID';
```

4. Changer le mot de passe du compte (**Authentication > Users**, ou la page de mot de passe oublié du site) : le téléphone perdu ou le gestionnaire perdu peut l'avoir emporté.
5. Remettre un code tout de suite : refaire toute l'étape 2, interrupteur compris. Sans interrupteur, ce compte reçoit une 404 sur `/admin`.

Pourquoi supprimer les sessions : une session déjà ouverte resterait à `aal2`. L'admin la refuse déjà, car le compte n'a plus de code vérifié, mais elle ne doit pas revivre quand le nouveau code sera en place.

Ne jamais coller un vrai UID dans un fichier du dépôt : seulement dans l'éditeur SQL de Supabase.

## 5. Ce qui ne change pas

- robots.txt n'a pas changé. Les pages admin et leurs routes disent `noindex` et `no-store` dans leurs en-têtes.
- Les crons de Vercel passent toujours par `CRON_SECRET`.
- Côté base, aucune fonction ni règle SQL ne donne un droit admin à un compte connecté (détail dans `docs/o1/admin/SQL-ADMIN-1.md`) : aucune migration à appliquer pour ADMIN-1.

## 6. Si `ADMIN_USER_IDS` est vide ou absente

Toutes les routes et pages admin répondent 404, pour tout le monde. Les crons ne changent pas : ils passent par `CRON_SECRET`. Seuls leurs boutons dans l'admin ne sont plus accessibles.

Pour réparer : remettre la variable dans Vercel et redéployer, ou revenir au déploiement précédent (**Deployments > Instant Rollback**). Rien à défaire en SQL.

## 7. Vérifier les rôles Verse des comptes de la liste (1 minute, une seule fois)

Un compte admin qui a aussi une ligne `curator` ou `space_admin` dans une communauté garde ce rôle-là avec son seul mot de passe, sans code : ce rôle vient de la base, pas de `requireAdmin`. Lancer cette lecture dans **SQL Editor**, en remplaçant les `VOTRE_ID` par les UID de `ADMIN_USER_IDS` (seulement dans l'éditeur, jamais dans un fichier du dépôt) :

```sql
select user_id, group_id, role, status
from public.space_members
where user_id in ('VOTRE_ID_1', 'VOTRE_ID_2')
  and role in ('curator', 'space_admin');
```

- Aucune ligne : rien à faire.
- Des lignes : un admin à `aal2` a déjà tous les droits sur toutes les communautés, ces lignes ne lui apportent rien et laissent un droit sans code. Les repasser en `member`, ligne par ligne, après avoir vérifié qu'aucune autre personne n'a besoin que ce compte reste curateur :

```sql
update public.space_members
set role = 'member', updated_at = now()
where user_id = 'VOTRE_ID' and group_id = LE_GROUP_ID;
```

## 8. Vérification du premier déploiement (2 minutes, sur une preview ou juste après le déploiement)

Avec `ADMIN_MFA_ENROL_OPEN=1` sur le projet vérifié (étape 2), sinon un compte sans code reçoit une 404 normale et ces deux tests ne disent rien.

1. **La liste est bien lue par le middleware.** Connecté avec un compte de `ADMIN_USER_IDS`, ouvrir `/admin` : la page des 6 chiffres ou la page de mise en place doit s'afficher. Si c'est une 404 : la variable n'est pas vue sur ce déploiement (mauvais environnement Vercel, ou pas de redéploiement depuis son ajout). Corriger puis redéployer.
2. **OtakuQuiz derrière les Microfrontends accepte le code.** Sur `https://bunnyverse.org/anime/admin` (ou sa preview), taper les 6 chiffres, ou cliquer **Show the QR code** sur la page de mise en place : le formulaire doit passer. S'il échoue, regarder dans l'onglet Réseau du navigateur le POST vers `/anime/api/admin/k7q2m` : une 404 veut dire que le contrôle de même origine refuse l'hôte transmis par le proxy. La section "Review fixes", finding 8, de la description de la PR dit quoi changer. L'admin kpopquiz.org n'est pas concerné.
3. Retirer l'interrupteur et redéployer (étape 2, point 8). Faire aussi le contrôle de la section 7.
