# Compte de service Google pour le suivi d'indexation

Stratégie SEO du 27 octobre 2026, phase 2. Version du 27 octobre 2026.

## Ce que ça fait, une fois branché

Chaque jour, le site interroge Google pour savoir où en est chaque page /q/ : indexée, explorée
mais pas indexée, découverte, en double. Il utilise l'API URL Inspection de Search Console.
- Il range le résultat dans la base (tables `seo_index_status` et `seo_index_checks`, SQL
  `docs/pending-migrations/seo-index-status.sql`).
- Une page non indexée depuis 21 jours entre dans la file : explications vérifiées, liens
  internes, puis nouvelle soumission.
- Un tableau sort chaque semaine.

Tant que rien n'est branché, rien ne casse : le job note « clé absente » dans ses journaux et
s'arrête proprement.

Temps pour toi : environ 20 minutes, une seule fois, puis 5 minutes pour otakuquiz.org après son
lancement.

Règle pour les secrets : ils vont uniquement dans les variables d'environnement de Vercel. Jamais
dans le dépôt, jamais dans un e-mail, jamais dans un chat (même avec moi).

## Limites de Google (source : developers.google.com/webmaster-tools/limits)

- 2 000 inspections par jour et par propriété Search Console, et 600 par minute. Donc environ
  2 000 pages /q/ par jour pour kpopquiz.org, et autant pour otakuquiz.org.
- Le job inspecte d'abord les pages jamais inspectées, puis les plus anciennes.
- L'API dit si une page est indexée. Elle ne permet pas de demander l'indexation d'une page
  (le bouton « Demander une indexation » n'existe pas dans l'API). La « nouvelle soumission » de
  la boucle passe par le sitemap (date de modification honnête après un vrai changement, puis
  nouvel envoi du sitemap) et par IndexNow pour Bing.

## Étape 1. Créer le compte de service (une seule fois, 15 min)

Si tu as déjà créé le compte `kpopquiz-seo-reader` pour les données de la semaine (guide de
#113), garde-le et passe à l'étape 2 : le même compte sert aux deux.

1. Ouvre **console.cloud.google.com** avec le compte Google qui gère Search Console.
2. En haut, clique sur le sélecteur de projet, puis **Nouveau projet**. Nom : `kpopquiz-seo`.
   Clique **Créer**, attends quelques secondes, puis sélectionne ce projet.
3. Menu (les trois traits en haut à gauche) > **API et services** > **Bibliothèque**. Cherche
   **Google Search Console API**, ouvre-la, clique **Activer**.
4. Menu > **IAM et administration** > **Comptes de service** > **Créer un compte de service**.
   - Nom : `kpopquiz-seo-reader`.
   - Clique **Créer et continuer**.
   - Rôle : n'en choisis aucun, clique **Continuer**, puis **OK**.
5. Clique sur le compte créé, onglet **Clés** > **Ajouter une clé** > **Créer une clé** >
   **JSON** > **Créer**. Un fichier `.json` se télécharge : c'est la clé, garde-la privée.
6. Sur la page du compte, copie son **adresse e-mail** (elle finit par
   `.iam.gserviceaccount.com`).

Si Google refuse de créer la clé (message sur une « règle d'administration »), ton compte dépend
d'une organisation qui l'interdit : dis-le moi, il existe d'autres façons de faire.

## Étape 2. Donner l'accès à la propriété kpopquiz.org (2 min)

1. Ouvre **search.google.com/search-console**, choisis la propriété **kpopquiz.org**.
2. En bas à gauche : **Paramètres** > **Utilisateurs et autorisations** > **Ajouter un
   utilisateur**.
3. Colle l'adresse e-mail du compte de service.
4. Autorisation : **Complet**. La lecture suffirait pour inspecter les pages, mais renvoyer le
   sitemap (la nouvelle soumission de la boucle) demande le niveau Complet. Le compte ne peut
   rien faire d'autre : pas de suppression de propriété, pas d'ajout d'utilisateur.
5. Clique **Ajouter**.

Si un compte existait déjà en **Restreint** (guide de #113), passe-le en **Complet** : clique
sur les trois points à droite de son nom > **Modifier l'autorisation** > **Complet**.

## Étape 3. Ranger la clé dans Vercel (3 min)

1. Ouvre **vercel.com**, projet du site kpopquiz.org, **Settings** > **Environment Variables**.
2. Si `GSC_SERVICE_ACCOUNT_JSON` existe déjà, ne fais rien de plus ici.
3. Sinon : Key `GSC_SERVICE_ACCOUNT_JSON`, Value : ouvre le fichier `.json` avec TextEdit,
   sélectionne tout, copie, colle ici. Environments : **Production** seulement. **Save**.
4. Seulement si ta propriété Search Console est de type « préfixe d'URL » (elle s'affiche comme
   `https://kpopquiz.org/`) et pas « domaine » : ajoute aussi `GSC_SITE_URL` avec la valeur
   `https://kpopquiz.org/`. Sinon ne fais rien : la valeur par défaut est
   `sc-domain:kpopquiz.org`.
5. Range le fichier `.json` dans ton gestionnaire de mots de passe, puis supprime-le de
   Téléchargements.

## Étape 4. otakuquiz.org, après son lancement (5 min)

1. Vérifie la propriété **otakuquiz.org** dans Search Console (de préférence de type
   « domaine », par un enregistrement DNS).
2. Ajoute le même compte de service à cette propriété, autorisation **Complet** (étape 2).
3. Dans Vercel, sur le projet qui sert otakuquiz.org :
   - s'il s'agit d'un autre projet que kpopquiz.org, ajoute-y aussi `GSC_SERVICE_ACCOUNT_JSON`
     (même valeur) ;
   - seulement pour une propriété « préfixe d'URL », ajoute `GSC_SITE_URL` avec
     `https://otakuquiz.org/`.
4. Dis-moi que c'est fait : je lance une première inspection de contrôle et je te donne le
   résultat.

## Comment vérifier que ça marche

Après le déploiement du job (phase 2), je lance une inspection de 5 pages connues :
- une page indexée doit revenir « Submitted and indexed » ;
- une page de l'export du 26 octobre doit revenir « Crawled - currently not indexed ».

Si Google répond « permission denied », l'autorisation de l'étape 2 manque ou n'est pas
**Complet**.

## Ce que je ne fais jamais

- Je ne vois ni ne copie la clé : elle reste dans Vercel.
- Je ne demande jamais d'indexation en masse ni par un moyen détourné.
- Je ne soumets une page que si son contenu a vraiment changé.
