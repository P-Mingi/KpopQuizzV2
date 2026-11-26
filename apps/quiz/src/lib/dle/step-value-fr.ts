// Otakudle in two steps (L42, owner request of 2026-11-26): the values of step 2 are stored in English (docs/anime/data/dle/step2). On the French page a value that is a common word reads in French;
// a proper noun (Konohagakure, Survey Corps, Black Bulls, Karasuno) stays as stored. A value that is not here is shown as stored: otakudle-two-steps-data.test.ts lists the words that must never be left.
// "Not stated" is a deliberate value (the Wikipedia page gives none) and a normal category: "Non précisé".
const PAIRS: readonly (readonly [en: string, fr: string])[] = [
  ['None', 'Aucun'], ['None of the above', 'Aucun de ceux-là'], ['Human', 'Humain'], ['Other', 'Autre'], ['Others', 'Autres'], ['Not stated', 'Non précisé'], ['No', 'Non'], ['Yes', 'Oui'],
  ['Not stated as one', 'Non précisé'], ['Not stated as a pilot', 'Non précisé'], ['Not stated as demon', 'Non précisé'], ['Neither', 'Ni l’un ni l’autre'],
  ['Student', 'Élève'], ['Students', 'Élèves'], ['Classmate', 'Camarade de classe'], ['Classmates', 'Camarades de classe'], ['Sorcerer', 'Sorcier'], ['Demon', 'Démon'], ['Demons', 'Démons'],
  ['Main characters', 'Personnages principaux'], ['Main character', 'Personnage principal'], ['Main protagonist', 'Protagoniste principal'], ['Protagonist', 'Protagoniste'], ['Main', 'Principal'],
  ['Main antagonist', 'Antagoniste principal'], ['Antagonist', 'Antagoniste'], ['Antagonists', 'Antagonistes'], ['Supporting', 'Secondaire'], ['Supporting characters', 'Personnages secondaires'],
  ['Major supporting characters', 'Personnages secondaires majeurs'], ['Other characters', 'Autres personnages'], ['Other recurring characters', 'Autres personnages récurrents'], ['Recurring characters', 'Personnages récurrents'],
  ['Movie-only characters', 'Personnages des films seulement'], ['Minor character', 'Personnage mineur'], ['Other groups', 'Autres groupes'], ['Other members', 'Autres membres'], ['Other players', 'Autres joueurs'],
  ['Other villains', 'Autres méchants'], ['Other U.A. students', 'Autres élèves de l’U.A.'], ['Other ghouls', 'Autres goules'], ['Other demon', 'Autre démon'], ['Unranked demon', 'Démon sans rang'],
  ['Upper Rank', 'Rang supérieur'], ['Lower Rank', 'Rang inférieur'], ['Hero', 'Héros'], ['Villain', 'Méchant'], ['Villains', 'Méchants'], ['Pro hero', 'Héros professionnel'], ['Pro heroes', 'Héros professionnels'],
  ['Fighter', 'Combattant'], ['Knight', 'Chevalier'], ['Knight or retainer', 'Chevalier ou serviteur'], ['Mage', 'Mage'], ['Mages', 'Mages'], ['Captain', 'Capitaine'], ['Vice-captain', 'Vice-capitaine'],
  ['Wing spiker', 'Attaquant de couloir'], ['Setter', 'Passeur'], ['Middle blocker', 'Central'], ['Libero', 'Libéro'], ['Manager', 'Manager'], ['Point guard', 'Meneur'], ['Shooting guard', 'Arrière'],
  ['Small forward', 'Ailier'], ['Power forward', 'Ailier fort'], ['Forward', 'Attaquant'], ['Center', 'Pivot'], ['Cheer squad', 'Équipe de supporters'],
  ['Modern world', 'Monde moderne'], ['Stone World', 'Monde de pierre'], ['Rear palace', 'Palais intérieur'], ['Guardian', 'Gardien'], ['Regular', 'Régulier'], ['Civilians', 'Civils'], ['Civilian', 'Civil'], ['Commoner', 'Roturier'],
  ['Spirit', 'Esprit'], ['Spirits and Such', 'Esprits et compagnie'], ['Client', 'Client'], ['Police', 'Police'], ['Police officer', 'Policier'], ['Law enforcement', 'Forces de l’ordre'], ['Detective', 'Détective'],
  ['Hitman or killer', 'Tueur à gages'], ['Former hitman', 'Ancien tueur à gages'], ['Former cop', 'Ancien policier'], ['Former soldier', 'Ancien soldat'], ['Bounty hunter', 'Chasseur de primes'], ['Hunter', 'Chasseur'],
  ['Hunter Exam applicant', 'Candidat à l’examen des Hunters'], ['Applicant', 'Candidat'], ['Candidate', 'Candidat'], ['Recruit', 'Recrue'], ['Pilot', 'Pilote'], ['Pilots one', 'Pilote un Eva'],
  ['Alien', 'Extraterrestre'], ['Dragon Slayer', 'Tueur de dragons'], ['Student council', 'Conseil des élèves'], ['Alchemist', 'Alchimiste'], ['State Alchemist', 'Alchimiste d’État'], ['State Military', 'Armée d’État'],
  ['Curse', 'Malédiction'], ['Curse user', 'Utilisateur de malédictions'], ['Sword', 'Épée'], ['Claw', 'Griffe'], ['Support or crafter', 'Soutien ou artisan'], ['Support', 'Soutien'], ['Leadership', 'Direction'],
  ['Leader', 'Chef'], ['Consort', 'Consort'], ['Guitar', 'Guitare'], ['Vocalist', 'Chant'], ['Drums', 'Batterie'], ['Bass', 'Basse'], ['Kaiju', 'Kaiju'], ['Idol agency', 'Agence d’idols'], ['Film and TV', 'Cinéma et télévision'],
  ['Stage theatre', 'Théâtre'], ['Entertainment', 'Divertissement'], ['Media', 'Médias'], ['Manga', 'Manga'], ['School', 'École'], ['University', 'Université'], ['Hospital', 'Hôpital'], ['Laboratory', 'Laboratoire'],
  ['Office worker', 'Employé de bureau'], ['Researcher', 'Chercheur'], ['Scientist', 'Scientifique'], ['Mad scientist', 'Savant fou'], ['Hacker', 'Pirate informatique'], ['Informant', 'Informateur'], ['Journalist', 'Journaliste'],
  ['Part-time worker', 'Travailleur à temps partiel'], ['Landlord', 'Propriétaire'], ['Underworld', 'Pègre'], ['Mafia', 'Mafia'], ['Criminal', 'Criminel'], ['Soldier', 'Soldat'], ['Army', 'Armée'], ['Military', 'Armée'],
  ['Military Police', 'Police militaire'], ['Imperial army', 'Armée impériale'], ['Garrison Regiment', 'Régiment de garnison'], ['Apothecary', 'Apothicaire'], ['Wizard King', 'Roi-mage'], ['Executive', 'Cadre'],
  ['Guild masters', 'Maîtres de guilde'], ['Hero Party', 'Groupe du héros'], ['Titan War veteran', 'Vétéran de la guerre des Titans'], ['Sorcery', 'Sorcellerie'], ['Healing', 'Soin'], ['Smithing', 'Forge'],
  ['Guide', 'Guide'], ['Ranker', 'Ranker'], ['Irregular', 'Irrégulier'], ['Servant', 'Serviteur'], ['Royal family', 'Famille royale'], ['Danish royal family', 'Famille royale danoise'], ['Prince', 'Prince'], ['Noble', 'Noble'],
  ['Postal staff', 'Personnel de la poste'], ['Slave', 'Esclave'], ['Landowner', 'Propriétaire terrien'], ['Navy', 'Marine'], ['Sailor', 'Marin'], ['Viking', 'Viking'], ['Assassin', 'Assassin'], ['Slayer', 'Pourfendeur'],
  ['Demon Slayer', 'Pourfendeur de démons'], ['Demon Slayer Corps', 'Corps des pourfendeurs de démons'], ['Blood Demon Art', 'Art démoniaque'], ['Hashira', 'Pilier'], ['Twelve Kizuki', 'Douze Lunes'],
  ['Soul Reaper', 'Shinigami'], ['Devils and Fiends', 'Diables et fiends'], ['Devil Hunter', 'Chasseur de diables'], ['Priest', 'Prêtre'], ['Elf', 'Elfe'], ['Dwarf', 'Nain'], ['Warrior', 'Guerrier'], ['Dragon', 'Dragon'],
  ['Half-demon', 'Demi-démon'], ['Chimera Ants', 'Fourmis chimères'], ['Ogre', 'Ogre'], ['Homunculus', 'Homoncule'], ['Homunculi', 'Homoncules'], ['Witch', 'Sorcière'], ['Witch Cult', 'Culte de la Sorcière'], ['Shaman', 'Chaman'],
  ['Slime', 'Slime'], ['Hobgoblin', 'Hobgobelin'], ['Direwolf', 'Loup-garou géant'], ['Orc', 'Orc'], ['Lizardman', 'Homme-lézard'], ['Dragonoid', 'Dragonide'], ['Fairy', 'Fée'], ['Deathman', 'Homme-mort'], ['Vampire', 'Vampire'],
  ['Monster', 'Monstre'], ['Beast', 'Bête'], ['Insect', 'Insecte'], ['Dog', 'Chien'], ['Rat', 'Rat'], ['Cat', 'Chat'], ['Snake', 'Serpent'], ['Ox', 'Bœuf'], ['Rabbit', 'Lapin'], ['Boar', 'Sanglier'], ['Tiger', 'Tigre'],
  ['Ram', 'Bélier'], ['Monkey', 'Singe'], ['Horse', 'Cheval'], ['Water', 'Eau'], ['Thunder', 'Foudre'], ['Flame', 'Flamme'], ['Sound', 'Son'], ['Love', 'Amour'], ['Mist', 'Brume'], ['Flower', 'Fleur'], ['Wind', 'Vent'],
  ['Stone', 'Pierre'], ['Serpent', 'Serpent'], ['Thief', 'Voleur'], ['Teacher', 'Enseignant'], ['Writer', 'Écrivain'], ['Web novelist', 'Romancier web'], ['Actress', 'Actrice'], ['Lawyer', 'Avocat'], ['Reader', 'Lecteur'], ['Author', 'Auteur'],
  ['Space station crew', 'Équipage de la station spatiale'], ['Third Child', 'Troisième Enfant'], ['First Child', 'Premier Enfant'], ['Second Child', 'Deuxième Enfant'], ['Fifth Child', 'Cinquième Enfant'],
  ['Moon', 'Lune'], ['Mercury', 'Mercure'], ['Venus', 'Vénus'], ['Himself', 'Lui-même'], ['Works for him', 'Travaille pour lui'], ['Child', 'Enfant'], ['Real-world person', 'Personne réelle'], ['Ally', 'Allié'], ['Advisor', 'Conseiller'],
  ['Family', 'Famille'], ['The family', 'La famille'], ['Sohma family', 'Famille Sohma'], ['Jahad family', 'Famille Jahad'], ['Gotō family', 'Famille Gotō'], ['Shinomiya family', 'Famille Shinomiya'], ['Forger family', 'Famille Forger'],
  ['Honda family', 'Famille Honda'], ['Zoldyck family', 'Famille Zoldyck'], ['Yagyu family', 'Famille Yagyu'], ['Shirogane family', 'Famille Shirogane'], ['Desmond family', 'Famille Desmond'],
  ['Tohru’s friends', 'Amis de Tohru'], ['Tohru\'s friends', 'Amis de Tohru'], ['Sand Siblings', 'Fratrie du Sable'], ['Legendary Sannin', 'Sannin légendaires'], ['Public Safety Organization', 'Organisation de sécurité publique'],
  ['Black Organization', 'Organisation noire'], ['X\'s Organization', 'Organisation de X'], ['Junior Detective League', 'Ligue des détectives juniors'], ['Junior high council', 'Conseil du collège'],
  ['Disciplinary committee', 'Comité de discipline'], ['Mass media club', 'Club des médias'], ['Kaiju disposal company', 'Société d’élimination des kaijus'], ['Defense Force headquarters', 'Quartier général des Forces de défense'],
  ['Nerv staff', 'Personnel de Nerv'], ['U.A. faculty', 'Professeurs de l’U.A.'], ['Team Natsu', 'Équipe Natsu'], ['Team Guy', 'Équipe Gai'], ['Team 7', 'Équipe 7'], ['Team 8', 'Équipe 8'], ['Team 10', 'Équipe 10'],
  ['Team Konohamaru', 'Équipe Konohamaru'], ['Team Isu', 'Équipe Isu'], ['Team Z', 'Équipe Z'], ['S-Class wizards', 'Mages de classe S'], ['Training Corps', 'Corps d’entraînement'], ['With an organization', 'Avec une organisation'],
  ['Squad 5', 'Escouade 5'], ['Squad 6', 'Escouade 6'], ['Squad 10', 'Escouade 10'], ['Squad 11', 'Escouade 11'], ['Squad 12', 'Escouade 12'], ['Squad 13', 'Escouade 13'],
  ['First Division', 'Première division'], ['Second Division', 'Deuxième division'], ['Third Division', 'Troisième division'], ['Fifth Division', 'Cinquième division'], ['First Selection', 'Première sélection'], ['Second Selection', 'Deuxième sélection'],
  ['Demon Lords', 'Seigneurs démons'], ['Kingdom of Science', 'Royaume de la Science'], ['Petrification Kingdom', 'Royaume de la Pétrification'], ['Tsukasa Empire', 'Empire de Tsukasa'], ['Holy Britannian Empire', 'Saint Empire de Britannia'],
  ['Eastern Empire', 'Empire de l’Est'], ['Kingdom of Ingrassia', 'Royaume d’Ingrassia'], ['Western Holy Empire', 'Saint Empire de l’Ouest'], ['Rear Palace', 'Palais intérieur'], ['Palace official', 'Fonctionnaire du palais'],
  ['Maid cafe', 'Maid café'], ['Maid cafe worker', 'Employé de maid café'], ['Verdigris House district', 'Quartier de la Maison Verdigris'], ['Building owners\' leader', 'Chef des propriétaires'], ['Sakamoto\'s Convenience Store', 'Supérette de Sakamoto'],
  ['TV repair store', 'Magasin de réparation de télévisions'], ['Space', 'Espace'], ['Ministry of Foreign Affairs', 'Ministère des Affaires étrangères'], ['Berlint City Hall', 'Hôtel de ville de Berlint'], ['American colony', 'Colonie américaine'],
  ['United States', 'États-Unis'], ['South Korea', 'Corée du Sud'], ['Norway', 'Norvège'], ['Germany', 'Allemagne'], ['Japan', 'Japon'], ['China', 'Chine'], ['India', 'Inde'], ['Greenland', 'Groenland'],
  ['Prosecutors', 'Procureurs'], ['Syndicate member', 'Membre du syndicat'], ['Red Dragon Crime Syndicate', 'Syndicat du crime Dragon rouge'], ['L\'s team', 'Équipe de L'], ['Sword', 'Épée'],
  ['Class 1-A', 'Classe 1-A'], ['Other U.A. students', 'Autres élèves de l’U.A.'], ['Joi faction', 'Faction Joi'], ['Soga clan', 'Clan Soga'], ['Enchanted Blade Bearers', 'Porteurs de lames enchantées'], ['Golden Dawn', 'Aube dorée'],
  ['Crimson Lion Kings', 'Rois-lions cramoisis'], ['Silver Eagles', 'Aigles d’argent'], ['Black Dragons', 'Dragons noirs'], ['Vice president', 'Vice-président'], ['President', 'Président'], ['Secretary', 'Secrétaire'], ['Treasurer', 'Trésorier'], ['Cleaner', 'Nettoyeur'], ['No own entry', 'Sans fiche propre'],
  ['Blackbell household', 'Maison Blackbell'], ['Iga ninjas', 'Ninjas d’Iga'], ['Ketil\'s farm', 'Ferme de Ketil'], ['Chihiro\'s group', 'Groupe de Chihiro'], ['Frieren\'s party', 'Groupe de Frieren'],
  ['Askeladd\'s company', 'Compagnie d’Askeladd'], ['Bebop crew', 'Équipage du Bebop'], ['Guild', 'Guilde'], ['Ashford Academy', 'Académie Ashford'], ['Shijo Group', 'Groupe Shijo'], ['Mitsuura Group', 'Groupe Mitsuura'], ['Black Vinegar Middle School', 'Collège Black Vinegar'],
  ['Salt Middle School', 'Collège Salt'], ['League of Villains', 'Ligue des Vilains'], ['The Order', 'L’Ordre'], ['Eden Academy', 'Académie Eden'],
];

const BY_EN: ReadonlyMap<string, string> = new Map(PAIRS);

/** The French words of one value of step 2; the value as stored when it is a proper noun or has no entry. */
export function stepValueFr(v: string): string {
  return BY_EN.get(v) ?? v;
}

/** Every English value that has a French word (the data test reads it). */
export const STEP_VALUE_FR_KEYS: readonly string[] = [...BY_EN.keys()];
