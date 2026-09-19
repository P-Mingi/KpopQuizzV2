# Donnees reelles au 19 septembre (GSC 3 mois + Vercel Analytics 3 mois)

Sources: export Search Console du 19 sep (Pages.csv, Requetes.csv, 381 pages, 725 requetes),
dashboard Vercel Analytics (3 mois, production). Fichiers GSC commites dans docs/refonte/gsc/.

## Correction de calibrage (honnete)
- Web Analytics ETAIT actif (mon check API du 19 sep visait le mauvais scope: erreur de l'auditeur,
  corrigee). Trois mois de donnees existent.
- Les 17 139 hits/jour sur /q/[slug] (logs runtime) incluaient les BOTS. Trafic humain reel:
  14 952 visiteurs et 113 972 pages vues sur 3 mois, environ 165 visiteurs/jour. Bounce 42%.
  Croissance forte: visiteurs +251%, pages vues +299% vs les 3 mois precedents.

## SEO organique (GSC, 3 mois): 3 100 clics, 45 618 impressions, x4,9 de croissance
- Clics par mois: juin 375, dernier mois 1 850. Le momentum est reel.
- Par section: hubs groupes -quiz/-trivia 1 680 clics (54%), home 722, pages /q/ 248,
  blindtest 190, articles/news/pulse 102, catalogues quiz 81.
- Les hubs FRAIS gagnent: cortis-quiz 608 clics, illit-quiz 401, seventeen-quiz 252. La
  fraicheur comeback/debut est l'arme SEO numero un du site.
- Blindtest deja place sans effort: "blind test kpop" pos 5,2 (48 clics), "kpop blind test"
  pos 3,6 (29 clics), plus une longue traine "guess the song / song quiz" naissante. Le
  territoire est confirme prenable.
- Bing est le referrer numero un (4,6K visiteurs vs Google 2,9K): la marge de progression
  cote Google est enorme.

## La kill list au complet: 48 clics organiques en 3 mois (1,5% du total)
- /games (hub): 17 clics. name-them-all/name-all: 12. personality/which-: 10.
  this-or-that: 7. rankings: 1. sort-it, match-up, tier-list, battle: 0 ou 1.
- VERDICT DONNEES: le kill coute quasi rien en acquisition SEO. La question Name Them All est
  tranchee par les chiffres: 12 clics en 3 mois, il meurt avec le reste. L'intention "name all
  X members/songs" existe (requetes a 0-2 clics) et pourra etre captee plus tard par un TYPE
  de quiz dans la maison quiz, sans produit dedie.
- NUANCE ENGAGEMENT INTERNE, en connaissance de cause: Vercel montre /battle 2K visiteurs,
  /games 1,7K, /games/this-or-that 1,3K sur 3 mois. Ce trafic est pousse par la nav et les
  cross-promos internes (event cross_promo_click 1,1K), pas par Google. Le kill ne perd donc
  presque pas d'acquisition, mais il supprime des surfaces d'engagement interne: la refonte
  doit rediriger cette energie vers quiz et blindtest (parcours, pas seulement 301).

## Ce que ca valide ou corrige dans les decisions
- Articles/News/Pulse gardes par le owner: VALIDE par la donnee (102 clics, 2 755 impressions).
- Kill de la page games entiere + battle + personality + this-or-that + rankings + tier lists:
  cout SEO mesure quasi nul. GO.
- Monetisation: 15K visiteurs/3 mois est tres loin des seuils pub (50K sessions/MOIS pour les
  regies premium). Confirme la strategie: produit et SEO d'abord, pub plus tard.

## Ce qui manque encore (owner, dashboard Supabase uniquement)
1. Le plan exact paye aujourd'hui (org, montant).
2. La taille de base affichee dans Settings puis Usage.
3. L'egress du mois en cours.
