# Recommandations pour la page de confidentialité (lot H1)

Pour le propriétaire. 18 points du brouillon `privacy-draft.md`, dans l'ordre.
Réponse : cochez "Oui" si vous suivez la recommandation, "Non" sinon.
Décisions déjà prises, appliquées ci-dessous :
- boîtes de l'organisation : contact@otakuquiz.org et contact@fanquiz.org
- pas de connexion Discord sur les nouveaux domaines (Google et email seulement)
- comptes Team : <username>@team.otakuquiz.org, domaine qui ne reçoit aucun mail

## 1. Date et titre de la page de confidentialité

Recommandation : Garder le titre "Privacy Policy" et la ligne "Draft of 21 October 2026" tant que le responsable n'est pas nommé. Au lancement : mettre la vraie date ("Last updated"), retirer le bandeau brouillon, rendre la page indexable et l'ajouter au sitemap le jour de la mise en ligne.

Réponse : Oui / Non

## 2. Responsable du traitement (nom ou société, pays, adresse postale)

Recommandation : Pas de recommandation : c'est à vous de donner ce nom. Le code n'en contient aucun.

Réponse : Nom du responsable : à fournir

## 3. Les trois sites ont le même propriétaire

Recommandation : Oui, confirmer la phrase. Sur la page complète, garder les deux autres sites par type (site idoles, site anime) : cela évite de changer les tests. Les trois noms restent dans l'avis court.

Réponse : Oui / Non

## 4. Modes de connexion au lancement

Recommandation : Décision prise : Google et lien par email sur OtakuQuiz et FanQuiz, pas de Discord. Garder la phrase Discord pour KpopQuiz seulement, et écrire "de Google ou de Discord" pour le nom et l'avatar reçus. Les comptes Team ne se connectent pas par lien : rien à publier à leur sujet.

Réponse : Oui / Non

## 5. Bloc "The sites you joined" : ajouter la condition

Recommandation : Oui. Dire aussi pour les sites rejoints "seulement si vous le rendez public". En base, ce choix est coupé par défaut (show_elsewhere = false). Le texte doit dire ce que fait le code. C'est un changement de copie à faire dans un lot à part.

Réponse : Oui / Non

## 6. Valeurs publiées : ticket 10 min, code 60 s, journal 90 jours, IP hachée

Recommandation : Oui, publier ces valeurs telles quelles (elles viennent des contrats). Préciser que l'IP est hachée et jamais gardée en clair. Publier ce paragraphe seulement quand PASSPORT_JUMP est activé.

Réponse : Oui / Non

## 7. Profil KpopQuiz (bio, bandeau, groupes favoris) : "keeps for itself"

Recommandation : Oui, mais ajouter une ligne : sur KpopQuiz, bio, bandeau et groupes favoris font partie du profil du compte. Le bloc partagé reste limité au pseudo et à l'avatar. Avant la mise en ligne, vérifier qu'aucun autre site n'affiche ces champs.

Réponse : Oui / Non

## 8. Statistiques et publicité sur les trois sites

Recommandation : Ne pas écrire "aucune analyse". Le code charge Vercel Web Analytics (@vercel/analytics, layout.tsx, sur tous les sites) avec six événements, sans pseudo, email ni identifiant. Écrire : "Nous mesurons l'audience avec Vercel Web Analytics : pas de cookie, pas de suivi entre sites, pas de pub." Une mesure sans cookie et agrégée ne demande pas de bandeau en pratique UE. À confirmer : aucune publicité (le code n'en contient pas). Si vous en ajoutez, il faudra un bandeau de consentement.

Réponse : Oui / Non

## 9. Usages de kq_sl, verse_nav et world (et durées)

Recommandation : Oui, les textes sont bons. Ajouter les durées vues dans le code : kq_sl 1 jour, nq_anon 1 an. Ce sont des cookies de fonctionnement, sans consentement. Garder la liste par type de cookie, pas par site.

Réponse : Oui / Non

## 10. Aucun cookie ajouté hors /auth/ sur kpopquiz.org

Recommandation : Oui. Règle de sortie : tout nouveau cookie ou stockage local s'ajoute d'abord à la liste de la page, puis au code. Vérifier la liste à chaque mise en ligne.

Réponse : Oui / Non

## 11. Prestataire d'envoi des emails (Resend) et région Supabase

Recommandation : Oui, nommer Resend : le code porte RESEND_API_KEY et SEND_EMAIL_HOOK_SECRET (emails de connexion et avis de suppression). Ne nommer la région Supabase que si vous la connaissez et qu'elle est dans l'UE (à lire dans le tableau de bord Supabase). Le domaine team.otakuquiz.org ne reçoit aucun mail : aucun email de connexion n'y arrive, rien à publier.

Réponse : Oui / Non

## 12. Suppression : 7 jours de délai, quiz gardés sous "deleted user"

Recommandation : Oui. Le schéma confirme que l'option "supprimer" efface bien les quiz (keep_quizzes = false) et que le défaut est de les garder. Texte conseillé : "Vos quiz publiés restent sous \"deleted user\" sauf si vous choisissez de les supprimer aussi." Garder les 10 minutes de connexion récente.

Réponse : Oui / Non

## 13. Quitter KpopQuiz et supprimer un compte KpopQuiz seul

Recommandation : Oui, ajouter une ligne : "Pour effacer vos données KpopQuiz, supprimez tout votre passeport depuis les réglages." Nommer l'écran quand les réglages du hub existeront. D'ici là, renvoyer vers contact@fanquiz.org.

Réponse : Oui / Non

## 14. Vos droits et le délai de 30 jours

Recommandation : Oui, garder 30 jours. Lister : accès, correction, suppression, opposition, portabilité, et le droit de saisir l'autorité de contrôle de votre pays (la CNIL en France). Sans route d'export pour l'instant, la portabilité se fait sur demande par email.

Réponse : Oui / Non

## 15. Âge minimum (13 ans)

Recommandation : Ne pas garder le 13 repris tel quel. Plus prudent : 15 ans si le responsable est en France, sinon l'âge de son pays (16 par défaut en UE). En dessous, accord d'un parent. Aligner ensuite la page de kpopquiz.org.

Réponse : Oui / Non

## 16. Adresse de contact de la page

Recommandation : Décision prise : contact@fanquiz.org sur la page FanQuiz et l'avis court, contact@otakuquiz.org sur OtakuQuiz. Créer les deux boîtes et les surveiller avant le lancement. Mettre contact@fanquiz.org à la place du placeholder du registre du hub.

Réponse : Oui / Non

## 17. Où montrer l'avis court du passeport, et faut-il un "OK"

Recommandation : Le montrer dans la fenêtre de connexion (une ligne et le lien vers fanquiz.org/privacy) et dans les réglages. Pas de case ni de "OK" : c'est une information, pas un consentement. Ne jamais pré-cocher quoi que ce soit.

Réponse : Oui / Non

## 18. Points non décidés : durées de conservation, export, date d'effet, droit applicable, clause de changement

Recommandation : Conservation : données de jeu gardées tant que le compte existe, effacées 7 jours après la suppression du passeport, journal de passage 90 jours. Export : sur demande par email, sous 30 jours. Date d'effet : le jour de publication. Droit applicable : celui du pays du responsable (dépend du point 2). Changements : "Nous l'indiquons sur le site avant l'entrée en vigueur et nous mettons la date à jour."

Réponse : Oui / Non
