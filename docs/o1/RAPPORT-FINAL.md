# Run O1 : rapport final (2026-10-20)

## Résumé
1. Les lots (a) à (e) sont fusionnés dans o1/integration au commit 9928503 (pas dans main), plus deux corrections : la correction après la passe e2e et un échappement du signe copyright. Rien n'est écrit en prod.
2. otakuquiz.org sur o1-dev : les jumelles de kpopquiz.org, 3 séries de test (Death Note, One Piece, Spy x Family) avec fiche, arcs, personnages, génériques et protection anti-spoiler, /series, le quiz du jour par site et les outils d'admin par site.
3. fanquiz.org sur o1-dev : la page réseau (les sites, ce que partage le passeport, les vues connecté et déconnecté), avec ses propres robots.txt et sitemap.
4. Le passeport partagé : on est connecté sur kpopquiz.org, on passe par /auth/passport/out?to=anime et on arrive connecté sur otakuquiz.org. XP et badges sont comptés par site. Le SQL 001 à 015 est appliqué sur o1-dev.
5. kpopquiz.org n'a pas bougé : le comparateur de production (via le proxy en lecture seule) a trouvé les 60 pages identiques à chaque fusion. Trois écarts ont été jugés à la main (D-054, D-058, D-067) : des coupures de flux et une heure relative.
6. Les tests : la passe e2e sur o1-dev donne 41 réussis, 0 échec, 11 sautés (aucun pour un défaut de l'application). 3124 tests unitaires, tsc 0 erreur, contrôle de la règle 18 ok.
7. Pour tester, depuis le dossier .claude/worktrees/o1 : `bash apps/quiz/e2e/o1/O1/run-dev.sh --with-jump`. Le script active SITE_SCOPE, construit les 3 sites contre o1-dev, les lance, joue tous les tests puis les arrête, en 15 à 25 minutes environ. Le compte rendu va dans docs/o1/reports/C3/e2e-dev.md.
8. Le coût depuis le nouveau procédé :
   - Les agents : environ 5,4 M de jetons, en taille de contexte finale, et non en facture complète.
   - ORCH : environ 2,8 M de jetons nouveaux, plus environ 90 M relus en cache (environ 9 M au prix du cache).
   - Avant le nouveau procédé, les agents avaient pris environ 19,9 M.
9. Ce qui reste avant le lancement est détaillé ci-dessous : environ 280 à 380 heures-agent, de l'ordre de 8 à 13 M de jetons d'agents, plus ta part (prod, infrastructure, validation du contenu).
10. Le plus gros manque est le contenu : 3 séries de test au lieu de 30, et aucun quiz réel.

## Ce qui reste à faire avant le lancement

### 1. Le contenu (agents, puis ta validation éditoriale)
- Les 27 autres séries, avec arcs, personnages, génériques et 30 jeux de faits (K1) : 36 à 50 h-agent.
- Les 30 créateurs de l'équipe et environ 600 quiz de catalogue (K2) : 45 à 65 h-agent.
- La banque du quiz du jour anime (100), 10 « Quel personnage », 15 « Nomme-les tous », 5 « Ceci ou cela » (K3) : 14 à 20 h-agent.
- Les données des génériques : identifiants Deezer, 10 playlists, le pool du générique du jour (K4) : 12 à 16 h-agent.
- Le groupe « anime-mix », que le chargeur ne crée pas encore et dont le quiz du jour anime a besoin : moins d'une heure.

### 2. Ta part en prod (toi seul)
- Relire et fusionner o1/integration dans main (une PR).
- Appliquer le SQL en prod, après sauvegarde et dans l'ordre :
  - 001, 002 et L01 ;
  - 003 à 007, après le code sur main ;
  - 008 avec sa preuve d'équivalence, avant T-14 ;
  - 009, le déploiement puis 010 dans une même session, loin du cron de 00:05 UTC ;
  - 011 à 015 ;
  - enfin les fichiers de lancement L02 à L12.
- Activer SITE_SCOPE=1 au build et au serveur des 3 projets. Il faut l'activer avant que du contenu anime arrive en prod : sinon des pages kpop pré-rendues listent des quiz anime. Ensuite, activer PASSPORT_JUMP.

### 3. L'infrastructure des deux domaines (toi)
- Les projets Vercel otakuquiz.org (NEXT_PUBLIC_SITE_ID=anime) et fanquiz.org (NEXT_PUBLIC_SITE_ID=hub), avec NEXT_PUBLIC_UX_V1=1 et NEXT_PUBLIC_UX_V12=1, plus les domaines et le DNS.
- Les variables : PASSPORT_TICKET_SECRET (identique sur les 3 sites), NET_IP_HASH_SALT, les clés Supabase, SITE_SCOPE, PASSPORT_JUMP.
- Les clients Google et Discord pour les deux domaines, et les adresses de redirection Supabase Auth.
- L'expéditeur des emails : le domaine d'envoi pour otakuquiz.org et fanquiz.org.

### 4. Les fonctions reportées (agents)
- Les emails aux couleurs de chaque site, la connexion par email sur otakuquiz (/auth/confirm), la suppression de compte et « quitter un site » (SQL 016, B7) : 16 à 22 h-agent. Cela dépend de la partie D de la Mission U.
- Le menu réseau, /api/n/me et le suivi « via » (B6) : 12 à 16 h-agent.
- L'interface du passeport sur otakuquiz et la fiche de connexion anime (P1) : 18 à 24 h-agent.
- La suite de fanquiz : /passport, /settings et /u, aujourd'hui de simples copies (H1) : 10 à 15 h-agent.
- Le blind test des génériques avec Deezer (O6) : 14 à 18 h-agent. Cela dépend de la partie B de la Mission U.
- Les formats « Quel personnage », « Nomme-les tous » et « Ceci ou cela » (O5) : 12 à 16 h-agent.
- La création de quiz par série (O4) : 12 à 16 h-agent.
- Les ponts du premier jour : faits croisés, article de l'équipe, email à la liste d'attente (X1) : 10 à 14 h-agent.
- La chaîne éditoriale anime : contrôles C1 à C14, paquets de relecture, /admin/review (E1) : 24 à 32 h-agent.
- De petits restes :
  - Le signalement de spoiler compte dans report_count de handle_new_report et peut masquer un quiz à 5 signalements (K1-3).
  - /api/auth/me appelle getLevelInfo sans site.
  - /api/passport/redeem n'a pas sa limite 429.
  - L'aide tx-cookie de B4 manque : le test des cookies est sauté.

### 5. Les finitions (agents, et toi pour les textes)
- Il reste du texte K-pop sur des pages anime non testées : u/[username], name-all, le hub vide, les tuiles « Ways to play » et la page dmca.
- Le texte de confidentialité réseau (G16, toi). Aujourd'hui, /privacy sur fanquiz est la copie kpop.
- Les paramètres de build de /q/[slug] ne sont pas filtrés par site, et le cas de /daily côté anime reste à trancher.
- Les contrôles finaux, de 8 à 12 h-agent chacun sauf la vérification visuelle :
  - la vérification visuelle et l'accessibilité (C1, 6 à 10 h) ;
  - le backend, les données et la sécurité (C2) ;
  - la QA, le SEO, la parity et la performance (C3) ;
  - le kit de lancement : guide, scripts de bascule, répétition (L1).
- Les parties A à D de la Mission U, à fusionner sur main, sont des dépendances de O6, B7 et X1.
