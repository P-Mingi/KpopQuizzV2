# Code admin (TOTP) : mode d'emploi du owner (5 minutes)

ADMIN-1, 2026-10-30. L'admin de kpopquiz.org et de bunnyverse.org/anime demande maintenant, en plus du mot de passe, un code à 6 chiffres donné par une application. Tout autre visiteur reçoit une page 404, comme pour une adresse qui n'existe pas.

## 1. Vérifier Supabase (1 minute, une seule fois)

1. Ouvrir Supabase, le projet de production.
2. Aller dans **Authentication > Multi-Factor**.
3. Vérifier que **TOTP (App Authenticator)** est activé. S'il ne l'est pas, l'activer et enregistrer.

Rien d'autre à changer. `ADMIN_USER_IDS` reste la liste des comptes admin, dans Vercel, comme avant.

## 2. Mettre en place le code (3 minutes, juste après le déploiement)

À faire tout de suite après la mise en ligne : tant qu'aucun code n'est en place, la page de mise en place s'ouvre pour le compte admin.

1. Se connecter sur kpopquiz.org avec le compte admin, puis ouvrir `/admin`.
2. L'admin envoie sur la page **Turn on the admin code**. Cliquer **Show the QR code**.
3. Scanner le QR code avec l'application du téléphone (Google Authenticator, Microsoft Authenticator, Authy, ou autre).
4. Ajouter le même code dans le gestionnaire de mots de passe (1Password, Bitwarden, le trousseau Apple ou autre) : scanner le QR code, ou coller la clé affichée sous le QR code. Les deux applications donnent alors les mêmes chiffres : si le téléphone est perdu, le gestionnaire suffit.
5. Taper les 6 chiffres affichés et cliquer **Turn on and continue**. L'admin s'ouvre.

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

3. Si ce sont bien vos codes, les supprimer (même remplacement) :

```sql
delete from auth.mfa_factors
where user_id = 'VOTRE_ID';
```

4. Se déconnecter du site, se reconnecter, ouvrir `/admin` : la page de mise en place revient. Refaire l'étape 2.

Ne jamais coller un vrai UID dans un fichier du dépôt : seulement dans l'éditeur SQL de Supabase.

## 5. Ce qui ne change pas

- robots.txt n'a pas changé. Les pages admin et leurs routes disent `noindex` et `no-store` dans leurs en-têtes.
- Les crons de Vercel passent toujours par `CRON_SECRET`.
- Côté base, aucune fonction ni règle SQL ne donne un droit admin à un compte connecté (détail dans `docs/o1/admin/SQL-ADMIN-1.md`) : aucune migration à appliquer pour ADMIN-1.
