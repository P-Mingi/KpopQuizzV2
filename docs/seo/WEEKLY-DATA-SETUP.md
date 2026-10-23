# Données SEO de la semaine et e-mail du lundi: la mise en place

SEO Mission 3, partie C. Version du 15 octobre 2026.

Ce que ça fait, une fois branché:
- Chaque lundi à 10 h UTC, le site lit Search Console (requête, page, pays, appareil) et Bing
  Webmaster (requêtes, pages, requête par page, liens entrants) et range tout dans la base.
- Chaque lundi à 11 h UTC, tu reçois un e-mail court (15 lignes au plus), à toi seul.
- Une fois par mois, tu déposes l'export Bing AI Performance sur /admin/seo/import et la part de
  citations par famille de requêtes se calcule seule.

Tant que rien n'est branché, rien ne casse: le job écrit "clé absente" dans ses journaux et
s'arrête proprement. Aucun e-mail ne part sans les trois variables Resend de l'étape 3.

Temps total pour toi: environ 35 minutes, une seule fois.

Règle pour les secrets: ils vont uniquement dans les variables d'environnement de Vercel. Jamais
dans le dépôt, jamais dans un e-mail, jamais dans un chat (même avec le worker).

## Étape 0. Créer les tables (5 min)

Le fichier est prêt: `docs/pending-migrations/seo-weekly-data.sql` (et son retour arrière
`seo-weekly-data-rollback.sql`). Il crée six tables et trois vues, lisibles par le serveur
seulement.

1. Ouvre supabase.com, projet de kpopquiz.org.
2. Menu de gauche: **SQL Editor**, puis **New query**.
3. Colle tout le contenu de `seo-weekly-data.sql`, puis **Run**.
4. Le résultat doit dire "Success. No rows returned".

Tu peux aussi dire "applique seo-weekly-data" au worker: il l'applique pour toi.

## Étape 1. Search Console: un compte de service Google (15 min)

Un compte de service est un petit compte robot qui a seulement le droit de lire tes données.

1. Ouvre **console.cloud.google.com** avec le compte Google qui gère Search Console.
2. En haut de la page, clique sur le sélecteur de projet, puis **Nouveau projet**.
   Nom: `kpopquiz-seo`. Clique **Créer**. Attends quelques secondes, puis sélectionne ce projet.
3. Menu (les trois traits en haut à gauche) > **API et services** > **Bibliothèque**.
   Cherche **Google Search Console API**, ouvre-la, clique **Activer**.
4. Menu > **IAM et administration** > **Comptes de service** > **Créer un compte de service**.
   - Nom: `kpopquiz-seo-reader`.
   - Clique **Créer et continuer**.
   - Rôle: n'en choisis aucun, clique **Continuer**, puis **OK**.
5. Clique sur le compte que tu viens de créer, onglet **Clés** > **Ajouter une clé** >
   **Créer une clé** > choisis **JSON** > **Créer**. Un fichier `.json` se télécharge.
   C'est la clé: garde-la privée.
6. Sur la page du compte, copie son **adresse e-mail** (elle se termine par
   `.iam.gserviceaccount.com`).
7. Ouvre **search.google.com/search-console**, choisis la propriété **kpopquiz.org**.
   En bas à gauche: **Paramètres** > **Utilisateurs et autorisations** > **Ajouter un utilisateur**.
   - Colle l'adresse du compte de service.
   - Autorisation: **Restreint** (la lecture suffit).
   - Clique **Ajouter**.
8. Ouvre **vercel.com**, projet du site, **Settings** > **Environment Variables**.
   - Key: `GSC_SERVICE_ACCOUNT_JSON`
   - Value: ouvre le fichier `.json` avec TextEdit, sélectionne tout, copie, colle ici.
   - Environments: coche **Production** seulement.
   - Clique **Save**.
9. Range le fichier `.json` dans ton gestionnaire de mots de passe, puis supprime-le de
   Téléchargements.
10. Seulement si ta propriété Search Console est de type "préfixe d'URL" (elle s'affiche comme
    `https://kpopquiz.org/`) et pas "domaine": ajoute aussi `GSC_SITE_URL` avec la valeur
    `https://kpopquiz.org/`. Sinon ne fais rien: la valeur par défaut est `sc-domain:kpopquiz.org`.

Si Google refuse de créer la clé (message sur une "règle d'administration"), ton compte dépend
d'une organisation qui l'interdit: dis-le au worker, il y a d'autres façons de faire.

## Étape 2. Bing Webmaster: une clé API (5 min)

1. Ouvre **bing.com/webmasters** et connecte-toi.
2. En haut à droite, clique sur l'engrenage (**Paramètres**) > **Accès API** (API access).
   La première fois, Bing affiche ses conditions d'utilisation: lis-les et accepte-les si elles
   te conviennent.
3. Choisis **Clé API** (API Key) > **Générer une clé API**. Copie la clé. Bing ne donne qu'une
   clé par compte, valable pour tous tes sites vérifiés (source: Microsoft Learn, "Getting Access
   to the Bing Webmaster Tools API").
4. Dans Vercel, **Settings** > **Environment Variables**:
   - Key: `BING_WEBMASTER_API_KEY`, Value: la clé, **Production**, **Save**.
5. Seulement si ton site est enregistré dans Bing sous une autre adresse que
   `https://kpopquiz.org/` (par exemple avec `www`): ajoute `BING_SITE_URL` avec l'adresse exacte
   que Bing affiche.

Ce que l'API de Bing donne, et ce qu'elle ne donne pas:
- Oui: clics, impressions et positions par requête, par page, et par requête pour chaque page
  (les 25 pages les plus vues). Les liens entrants que Bing connaît: la page liée, la page qui
  fait le lien, son texte.
- Non: ni pays, ni appareil. L'API ne les fournit pas. Les lignes Bing n'ont donc pas ces colonnes.

## Étape 3. Resend: l'e-mail du lundi (10 min)

1. Ouvre **resend.com** et connecte-toi.
2. **Domains**: vérifie que **kpopquiz.org** est marqué **Verified**.
   S'il n'y est pas: **Add Domain** > `kpopquiz.org` > ajoute chez ton registrar les
   enregistrements DNS que Resend affiche > **Verify**. Ça peut prendre jusqu'à une heure.
3. **API Keys** > **Create API Key**:
   - Name: `kpopquiz-seo-report`.
   - Permission: **Sending access**, domaine **kpopquiz.org**.
   - Clique **Add**, copie la clé (elle ne s'affiche qu'une fois).
4. Dans Vercel, **Settings** > **Environment Variables**, trois variables, **Production**:
   - `RESEND_API_KEY`: la clé.
   - `SEO_REPORT_FROM`: l'expéditeur, sur ton domaine vérifié. Par exemple
     `KpopQuiz SEO <hello@kpopquiz.org>`.
   - `SEO_REPORT_TO`: ton adresse à toi. Une seule adresse: le code refuse une liste, et
     l'e-mail ne part jamais à quelqu'un d'autre.
5. Vercel > **Deployments** > sur le dernier déploiement de production, **...** > **Redeploy**.
   Les variables ne comptent qu'après un nouveau déploiement.

## Étape 4. Le premier essai (une commande)

D'abord, dans un terminal, mets le secret des crons dans une variable (Vercel > **Settings** >
**Environment Variables** > `CRON_SECRET` > l'œil pour voir la valeur):

```bash
export CRON_SECRET='colle la valeur ici'
```

Lire les données de la semaine tout de suite (sinon elles arrivent lundi):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://kpopquiz.org/api/cron/seo-weekly-data
```

La réponse dit pour chaque source `ok`, `skipped` (et pourquoi) ou `error` (et le code).

Voir l'e-mail sans l'envoyer:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://kpopquiz.org/api/cron/seo-weekly-report?dry=1"
```

**La commande du premier e-mail de test, envoyé à toi seul:**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://kpopquiz.org/api/cron/seo-weekly-report?force=1"
```

Réponse attendue: `"sent":true`. Si elle contient `"missing"`, la liste nomme les variables qui
manquent (jamais leur valeur). `force=1` permet un renvoi le même jour; sans lui, le job n'envoie
qu'un e-mail par période de 20 heures.

Sur ton ordinateur, sans rien envoyer, un aperçu avec des données d'exemple:

```bash
cd apps/quiz && npx tsx scripts/seo-weekly-email-preview.mts
```

## Étape 5. Rien d'autre à faire pour les contrôles de nuit

La ligne "contrôles de nuit" lit le dernier passage programmé de `seo-gates.yml` sur GitHub. Le
dépôt est public et Vercel donne son nom au site tout seul, donc il n'y a rien à régler.
Seulement si l'e-mail affiche "contrôles de nuit (GitHub illisible)" plusieurs lundis de suite:
ajoute `SEO_GITHUB_REPO` (valeur: `propriétaire/nom` du dépôt) et, si GitHub limite les appels,
`SEO_GITHUB_TOKEN` (un jeton GitHub "fine-grained" en lecture seule sur Actions).

## Chaque mois: l'import Bing AI Performance (4 min)

1. Bing Webmaster > **AI Performance**.
2. Onglet des requêtes: **Export** (CSV). Onglet des pages: **Export** (CSV).
3. Ouvre **https://kpopquiz.org/admin/seo/import** (connecté avec ton compte admin).
4. Choisis le mois couvert, dépose les deux fichiers. Le tableau des familles s'affiche tout de
   suite: citations, total implicite (citations divisées par la part), part, écart (les citations
   parties vers d'autres sites).
5. Clique **Enregistrer ce mois**. Le mois suivant, la colonne "Part vs mois d'avant" montre les
   baisses en rouge.

Les familles sont les clusters de `docs/seo/TARGETS.md`. Une requête qui n'entre dans aucun
cluster va dans "Autres requêtes". Pour mieux classer, ajoute la requête à la bonne ligne de
TARGETS.md: le calcul suit.

## Ce que dit l'e-mail du lundi

Au plus 15 lignes, dans cet ordre:
1. Les clics de la semaine sur Google et Bing, et l'écart avec la semaine d'avant.
2. Les lignes rouges, celles qui demandent une action:
   - contrôles de nuit en échec, ou aucun contrôle depuis 3 jours;
   - alertes IndexNow des 7 derniers jours (partie A);
   - une URL qui a reçu un lien (selon Bing) et ne répond plus 200 ou 301;
   - une page du top 20 qui perd plus de 30 % de ses clics (si elle en avait au moins 20).
3. Hausses et baisses de clics par requête (5 clics d'écart au moins).
4. Cannibalisation: une requête d'un cluster de TARGETS.md où deux URL se partagent les
   impressions (chacune 10 impressions et 10 % au moins).
5. Requêtes nouvelles sans page cible: 30 impressions au moins, absentes des 4 semaines d'avant,
   hors de tout cluster de TARGETS.md.
6. Nouveaux domaines référents (liens vus par Bing). Les intégrations: aucun journal `partner=`
   n'existe encore dans le site, l'e-mail le dit.
7. Les 5 pages à rafraîchir: celles qui ont perdu le plus de clics.
8. Les événements des 14 prochains jours, lus dans `docs/seo/CALENDAR.md` (partie E).
9. "Non branché": ce qui manque encore (une clé, une table, un fichier).
10. Le lien vers /admin/seo/import.

Si TARGETS.md ou CALENDAR.md n'est pas lisible, la section qui en a besoin est sautée et la
ligne "Non branché" le dit.

## Récapitulatif des variables (Vercel, Production)

| Variable | Obligatoire | D'où elle vient |
|---|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | pour Search Console | le fichier `.json` de l'étape 1, en entier |
| `GSC_SITE_URL` | non (défaut `sc-domain:kpopquiz.org`) | ta propriété Search Console |
| `BING_WEBMASTER_API_KEY` | pour Bing | étape 2 |
| `BING_SITE_URL` | non (défaut `https://kpopquiz.org/`) | l'adresse du site dans Bing |
| `RESEND_API_KEY` | pour l'e-mail | étape 3 |
| `SEO_REPORT_FROM` | pour l'e-mail | une adresse de ton domaine vérifié |
| `SEO_REPORT_TO` | pour l'e-mail | ton adresse, une seule |
| `SEO_GITHUB_REPO` | non | seulement si GitHub reste illisible |
| `SEO_GITHUB_TOKEN` | non | seulement si GitHub limite les appels |
| `CRON_SECRET` | existe déjà | protège les deux jobs |

## Ce qui n'est pas couvert, dit franchement

- L'API Search Console ne donne pas le rapport Liens: il reste à exporter à la main une fois par
  mois (Search Console > Liens > Exporter).
- Ahrefs Webmaster Tools (optionnel dans le plan) n'est pas branché: il faudrait une clé.
- Les données Search Console du dimanche peuvent être incomplètes le lundi matin. Le job relit
  la semaine d'avant chaque lundi et remplace ses chiffres par les chiffres définitifs.
- Aucune donnée personnelle d'utilisateur n'entre dans l'e-mail ni dans les journaux: seulement
  des requêtes agrégées par Google et Bing, des pages publiques et des compteurs.
