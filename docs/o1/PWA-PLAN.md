# Appli installable (PWA) : le plan, à coder juste après le jour J

O1, 2026-11-02, sur la demande du propriétaire. Rien n'est codé avant que les quatre jeux, OtakuQuiz et Bunnyverse soient en ligne.

## 1. Périmètre

Une appli par site, chacune installable seule :

| Site | Nom affiché | Ouvre sur | Couleur |
|---|---|---|---|
| bunnyverse.org | Bunnyverse | `/` (le hub, ses jeux, le Terrier) | celle du hub |
| kpopquiz.org | KpopQuiz | `/` | rose, l'icône du lapin blanc de #186 |

OtakuQuiz vit sous `bunnyverse.org/anime` : il passe par l'appli Bunnyverse, pas d'appli à lui.

## 2. Manifeste

- `site.webmanifest` existe déjà sur kpopquiz.org (#186) : on y ajoute `start_url: "/?source=pwa"`, `scope: "/"`, `display: "standalone"`, `id`, `theme_color`, `background_color`, et les icônes 192 et 512 avec `purpose: "any"` puis une icône `maskable` à part (marge de sécurité de 20 %).
- Bunnyverse : un manifeste à lui, servi seulement sur la build du hub (le routage des fichiers du hub, `isHubUnknownPage`, l'exempte déjà).
- Aucune adresse publique ne change ; `?source=pwa` ne crée pas de page (canonique inchangée).

## 3. Service worker minimal

- Un fichier `sw.js` par site, à la racine, `Cache-Control: no-cache` pour qu'une nouvelle version arrive vite.
- Il ne met en cache que les fichiers statiques versionnés (`/_next/static/**`, les icônes). Jamais les pages HTML, jamais les réponses d'API, jamais Supabase : un joueur voit toujours la page du jour.
- Hors ligne : une petite page « Pas de connexion » en cache, montrée seulement quand la page demandée ne répond pas.
- Désinstallation propre : une variable serveur permet de servir un `sw.js` qui se désinscrit, en cas de problème.

## 4. La bannière d'installation

- En bas de l'écran, petite, fermable. Fermée : elle ne revient pas avant 30 jours (`localStorage`, sans compte).
- Elle apparaît après 2 ou 3 quiz terminés, ou après une victoire à un jeu du jour. Jamais à la première visite, jamais pendant un quiz ou une partie, jamais en plein écran, jamais si l'appli est déjà installée (`display-mode: standalone`).
- Android et Chrome de bureau : on garde l'événement `beforeinstallprompt` ; le bouton « Installer » ouvre la fenêtre du navigateur.
- iPhone et iPad (Safari) : pas de fenêtre possible ; la bannière montre un petit guide en deux gestes : « Partager », puis « Sur l'écran d'accueil ».
- En anglais et en français, comme les pages.

## 5. Preuves avant de fusionner

- kpopquiz.org : comparaison de 60 pages ; seules les balises du `<head>` (manifeste, `theme-color`) peuvent changer, et la bannière est absente du HTML servi (elle ne s'affiche qu'après des parties).
- Lighthouse « Installable » vert sur les deux sites ; installation testée à la main sur un Android et un iPhone.
- Les tests vérifient que le service worker ne met en cache aucune page HTML.

## 6. Ensuite seulement

Les notifications (« le Kpopdle du jour est sorti ») : un autre lot, avec son consentement explicite, son heure d'envoi et la gestion des désabonnements. Rien n'est prévu pour les notifications dans le premier lot.
