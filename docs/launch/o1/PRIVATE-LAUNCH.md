# Lancement privé de bunnyverse.org et bunnyverse.org/anime

Tant que le lancement privé est actif, seul ton compte connecté voit le hub (bunnyverse.org) et OtakuQuiz (bunnyverse.org/anime).
Tout le monde d'autre voit une page "Coming soon". kpopquiz.org n'est pas concerné.

## Les trois variables (sur fandomverse ET sur otakuquiz)

Dans Vercel, environnement Production, sur les deux projets. Le plus sûr : des variables partagées d'équipe (Team, Environment Variables, Shared), liées à fandomverse et à otakuquiz. Une variable partagée n'a qu'une valeur, donc elle est la même sur les deux projets. Un projet ne doit pas avoir en plus une variable de projet du même nom : elle passerait avant la partagée.

**`PRIVATE_LAUNCH_ALLOW` et `PRIVATE_LAUNCH_KEY` doivent être strictement identiques sur fandomverse et sur otakuquiz : la valeur du cookie en dépend. Sinon tu entres sur bunnyverse.org mais pas sur /anime (ou l'inverse).**

| Nom | Valeur |
|---|---|
| `PRIVATE_LAUNCH` | `1` |
| `PRIVATE_LAUNCH_ALLOW` | la même valeur que `ADMIN_USER_IDS` (les identifiants de compte, séparés par des virgules) |
| `PRIVATE_LAUNCH_KEY` | une clé secrète, générée une fois : `openssl rand -hex 32` dans un terminal, la même sur les deux projets |

Ne mets jamais ces valeurs dans git. Après tout changement d'une des trois variables : Redeploy des deux projets.

En production, `PRIVATE_LAUNCH` absent ou vide compte comme fermé (pour tout le monde si ALLOW ou KEY manque) : seul `PRIVATE_LAUNCH=0` + Redeploy ouvre.

Si `PRIVATE_LAUNCH=1` mais que `PRIVATE_LAUNCH_ALLOW` ou `PRIVATE_LAUNCH_KEY` manque ou est invalide, le site reste fermé pour tout
le monde, toi compris (le log du build l'indique par une ligne `[private-launch]`). Il ne s'ouvre jamais par erreur.

## Entrer

1. Ouvre bunnyverse.org : la page Coming soon s'affiche.
2. Clique sur le petit lien "Sign in" en bas de la page.
3. Connecte-toi (Google ou Discord) si tu ne l'es pas déjà.
4. Tu reviens sur l'accueil et tu vois tout. Le navigateur garde l'accès 30 jours (sur bunnyverse.org et /anime).

Pour retirer l'accès de ce navigateur : bunnyverse.org/auth/private-launch/leave.

## Ouvrir au public

`PRIVATE_LAUNCH=0` (la variable partagée, ou celle de chaque projet), puis Redeploy de fandomverse et d'otakuquiz. Rien d'autre.
(`PRIVATE_LAUNCH_ALLOW` et `PRIVATE_LAUNCH_KEY` peuvent rester, ils ne servent plus.)

## Vérifier, dans cet ordre

1. Ton navigateur, connecté, après le lien "Sign in" : bunnyverse.org, bunnyverse.org/kpopdle et bunnyverse.org/anime montrent les vraies pages.
2. Puis une fenêtre privée, sur les mêmes adresses : Coming soon partout. Ce second passage prouve qu'aucun cache ne mélange les deux réponses.
3. Une fois ouvert au public : la fenêtre privée montre les vraies pages.

## Couper l'accès tout de suite

Change `PRIVATE_LAUNCH_KEY` (une nouvelle valeur de `openssl rand -hex 32`), puis Redeploy des deux projets : tout cookie déjà donné ne vaut plus rien.
