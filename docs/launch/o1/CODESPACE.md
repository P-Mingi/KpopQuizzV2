# Les sessions SQL sans le Mac : GitHub Codespaces (2026-11-06)

Un codespace est un ordinateur Linux dans le navigateur, privé à ton compte GitHub. Celui de ce dépôt (`.devcontainer/`) n'a que bash, git, python3 et le client PostgreSQL 18 : la production est en 17.6, et `pg_dump` doit être en 17 ou plus. Rien d'autre ne change : la même commande `session.sh`, les mêmes parties, les mêmes vérifications. Le Mac reste la route normale, et cette page est la route de secours.

## 1. Créer le codespace (une fois, 5 min)

1. Sur github.com/P-Mingi/KpopQuizzV2 : bouton vert **Code**, onglet **Codespaces**, puis **Create codespace on main**.
   - Si la PR du codespace n'est pas encore fusionnée : `...`, **New with options**, branche `o1/codespace`, puis **Create codespace**. La ligne de session passe d'elle-même sur `main`.
2. La première fois, compte 3 à 5 minutes de construction. Cette page s'ouvre quand c'est prêt.
3. Ouvre un terminal : menu ☰, **Terminal**, **New Terminal**. C'est bash, dans le dossier du dépôt. La dernière ligne de la construction affiche `psql (PostgreSQL) 18...` et `pg_dump (PostgreSQL) 18...`.
4. Une fois pour toutes, sur github.com : **Settings**, **Codespaces**.
   - **Default idle timeout** : 120 minutes. Sans ça, le codespace s'endort après 30 minutes sans frappe, et le terminal perd la connexion.
   - **Dotfiles** : décoché, sauf si tu connais ce dépôt. Son script tournerait ici.

## 2. La chaîne Session pooler

Un codespace n'a pas d'IPv6, et la connexion directe de Supabase est en IPv6. Il faut donc le **Session pooler**, en IPv4, sur le port 5432, avec les mêmes droits.

Dans le tableau de bord Supabase, sur le projet : bouton **Connect**, onglet **Connection String**, type **URI**, méthode **Session pooler**. Copie la chaîne telle quelle. Elle ressemble à `postgresql://postgres.rdkgouofytwfdpbxbzio:[YOUR-PASSWORD]@aws-....pooler.supabase.com:5432/postgres` :
- garde `[YOUR-PASSWORD]`, la ligne l'enlève ;
- tu tapes le mot de passe à part, sans qu'il s'affiche.

## 3. La ligne d'une session

Dans le terminal, colle la ligne. À `Session pooler :`, colle la chaîne et appuie sur Entrée. À `Mot de passe :`, tape le mot de passe (rien ne s'affiche) et appuie sur Entrée.
```
git checkout main && git pull --ff-only && read -rp 'Session pooler : ' U && read -rsp 'Mot de passe : ' PGPASSWORD && echo && export PGPASSWORD PROD_DB_URL="${U/:\[YOUR-PASSWORD\]/}" && umask 077 && mkdir -p ~/kpq-launch && F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump && pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F" && N=$(pg_restore --list "$F" | grep -c .) && echo "sauvegarde : $N lignes" && [ "$N" -gt 2000 ] && bash docs/launch/o1/session.sh D
```
- Pour une autre partie, change seulement le dernier mot : `E1b`, `E1`, `G` ou `K2`. Chacune a sa sauvegarde, comme sur le Mac (`OWNER-NOW.md`).
- E2 suit E1 dans le même terminal, sans sauvegarde : `bash docs/launch/o1/session.sh E2`.
- Les commandes que Claude te donne après une partie (les logos, par exemple) se collent dans ce même terminal : elles y trouvent la connexion.
- Si le terminal a été fermé ou que le codespace s'est endormi entre deux parties, la connexion est perdue mais pas les fichiers. Avant la commande suivante, redonne la connexion, sans sauvegarde :
```
read -rp 'Session pooler : ' U && read -rsp 'Mot de passe : ' PGPASSWORD && echo && export PGPASSWORD PROD_DB_URL="${U/:\[YOUR-PASSWORD\]/}"
```

## 4. Après : la sauvegarde

- **Où :** dans `/workspaces/kpq-launch`, qui est aussi `~/kpq-launch`, en mode 600, avec les journaux de `session.sh`. C'est hors du dossier du dépôt, et `.gitignore` refuse `*.dump` : elle ne peut pas partir dans un commit, alors que le dépôt est public. Une reconstruction du codespace la garde.
- **La télécharger** (au Mac de préférence) : menu ☰, **File**, **Add Folder to Workspace...**, puis `/workspaces/kpq-launch`. Clic droit sur le fichier `.dump`, **Download...**, dans `~/kpq-launch` du Mac. Vérifie-la sur le Mac : `pg_restore --list <fichier> | grep -c .` donne le même nombre de lignes que la session.
- **Ensuite :** efface-la dans le codespace avec `rm ~/kpq-launch/*.dump`. Après la dernière session (K2), supprime le codespace : github.com/codespaces, `...`, **Delete**.

## 5. Les risques vus

1. **Les données personnelles.** La sauvegarde contient le schéma `auth` : e-mails, empreintes de mots de passe et jetons. Elle est sur le disque du codespace, chez GitHub (Microsoft), privée à ton compte et chiffrée au repos. C'est quand même une copie de plus, chez un hébergeur qui jusqu'ici n'avait que le code. Garde-la le moins longtemps possible : télécharge-la, vérifie-la, efface-la. Ne la télécharge pas sur le téléphone. GitHub supprime un codespace inutilisé après 30 jours, avec ce qu'il contient.
2. **Le mot de passe.** Il est tapé sans affichage et ne vit que dans le terminal (`PGPASSWORD`). Il disparaît quand le terminal se ferme, et il n'entre pas dans l'historique. Ne le mets ni dans un secret Codespaces, ni dans un fichier.
3. **Le dépôt est public.** N'importe qui peut ouvrir son propre codespace sur ce dépôt. Il y trouve psql et rien d'autre : aucun secret, aucune sauvegarde. Les tiens restent dans ton codespace.
4. **Les restrictions réseau de Supabase.** Si elles sont activées, le codespace est refusé (`connexion refusée`). N'ouvre pas tout : passe par le Mac.
5. **Les extensions.** Ce codespace n'en a besoin d'aucune. N'en installe pas.
