// gen-review.mjs (lot A1): writes the owner's review list from data/a1-facts.json and two exports of the local L04 replay. No secret.
//   A1_CACHE=<scratch> node scripts/anime/a1/gen-review.mjs <series.tsv> <out-of-pool.tsv> <output.md>
// series.tsv: slug|title|manga year|anime year|studios json; out-of-pool.tsv: series|name|spoiler_level|identity_spoiler|status
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wikitext } from './http.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const { characters, series } = JSON.parse(readFileSync(join(HERE, 'data/a1-facts.json'), 'utf8'))
const [, , seriesTsv, outTsv, output] = process.argv
const info = Object.fromEntries(readFileSync(seriesTsv, 'utf8').trim().split('\n').map((l) => { const [slug, title, manga, anime, studios] = l.split('|'); return [slug, { title, manga, anime, studios: JSON.parse(studios) }] }))
const out = readFileSync(outTsv, 'utf8').trim().split('\n').map((l) => { const [s, name, level, id, status] = l.split('|'); return { s, name, level, id, status } })
const ORDER = ['one-piece', 'naruto', 'demon-slayer', 'jujutsu-kaisen', 'dragon-ball', 'attack-on-titan', 'my-hero-academia', 'bleach', 'hunter-x-hunter', 'chainsaw-man', 'frieren', 'black-clover']
const has3 = (c) => ['gender', 'species', 'role_at_debut'].every((f) => c.values[f])
const link = (v, extra = '') => (v ? `[${v.value}](${v.source_url})${extra}` : 'vide')
const bySeries = (s) => characters.filter((c) => c.series === s)
const first12 = series.filter((s) => ORDER.includes(s.slug))
const noSeasons = ORDER.filter((s) => info[s].studios.length && info[s].studios.every((x) => !Array.isArray(x.seasons)))
const strict = characters.filter((c) => has3(c) && !noSeasons.includes(c.series)).length
const inferred = characters.filter((c) => c.values.species?.inferred).map((c) => c.name)
const roleL04 = characters.filter((c) => c.values.role_at_debut?.evidence?.startsWith('L04 role')).length
const firsts = characters.filter((c) => c.values.first_appearance).length
const voices = characters.filter((c) => c.values.voice_actor_ja).length
const complete = characters.filter(has3).length
const dem = (slug) => series.find((s) => s.slug === slug).demographic

const L = []
L.push('# Lot A1 : relecture des personnages Otakudle')
L.push('')
L.push('Fait le 2026-10-30 depuis Wikidata et Wikipedia en anglais seulement. Rien en prod, rien de poussé. Le fichier SQL du jour du lancement : `docs/pending-migrations/multisite/launch/L13-A1-character-facts.sql`.')
L.push('')
L.push('## En 2 minutes')
L.push('')
L.push(`**${complete} personnages ont les 3 faits** (genre, espèce, rôle au début) sur ${characters.length} du pool des 12 séries. Démographie : 50 séries sur 50. Première apparition : ${firsts} personnages. Doubleur : ${voices}.`)
L.push('')
L.push('| Série | Dans le pool | Avec les 3 faits | Hors du pool (spoiler) |')
L.push('|---|---|---|---|')
for (const s of ORDER) L.push(`| ${info[s].title} | ${bySeries(s).length} | ${bySeries(s).filter(has3).length} | ${out.filter((o) => o.s === s).length} |`)
L.push(`| **Total** | **${characters.length}** | **${complete}** | **${out.length}** |`)
L.push('')
L.push('**Ce que tu dois décider :**')
L.push('')
L.push('1. **Espèce montrée en premier.** Le contrat dit : la première espèce vue, jamais une révélation. J\'ai donc mis `human` pour Goku (Saiyan révélé plus tard), Nezuko (devient démon dans le chapitre 1), Denji (devient hybride dans le chapitre 1) et Isshin (ancien shinigami révélé plus tard). Si tu préfères l\'espèce que tout le monde connaît pour Goku, Nezuko ou Denji, dis-le : `saiyan`, `demon`, `hybrid`.')
L.push('2. **Uryu en `quincy`.** Wikidata et Wikipedia le disent. À toi de confirmer qu\'il se présente comme tel dès son arrivée. Sinon : `human`.')
L.push('3. **Cinq rôles changent par rapport à L04.** Levi : `supporting` (Wikipedia le dit mot à mot). Uryu : `antagonist` (Wikipedia : antagoniste au début). Pochita, Power et Aki : `supporting` (la page Chainsaw Man ne met que Denji en personnage principal de la partie 1). L04 ne bouge pas, ces valeurs sont seulement dans L13.')
L.push('4. **Démographie sans magazine d\'origine.** Le contrat dit : le magazine de l\'œuvre d\'origine, `none` sinon. Roman léger ou jeu à l\'origine, donc `none` : The Apothecary Diaries, Re:Zero, Sword Art Online, That Time I Got Reincarnated as a Slime, Violet Evergarden, Steins;Gate. Autre choix : le manga adapté, selon Wikipedia : Apothecary `seinen`, Re:Zero `seinen`, SAO `seinen`, Slime `shonen`.')
L.push('5. **Deux séries ont changé de magazine.** JoJo : `shonen` (1987 à 2004 en shonen, seinen depuis 2005). Vinland Saga : `seinen` (6 mois en shonen en 2005, puis seinen). Dis-moi si tu inverses.')
L.push('6. **Doubleurs de Hunter x Hunter.** Le contrat veut la première adaptation, qui est la série de 1999. Mais L04 donne Madhouse (2011) comme studio de la première adaptation. J\'ai laissé vide : voir les deux distributions dans Questions. Quel choix ?')
L.push('7. **Cinq personnages sans les 3 faits, donc pas des cibles :** Muzan, Hange, Angel Devil, Panda, Urahara. Détails et propositions dans Questions.')
L.push(`8. **Pour O1, à vérifier avant le lancement :** le contrat prend le studio dans les \`seasons\` qui contiennent 1. Dans L04, ${noSeasons.map((s) => info[s].title).join(', ')} n\'ont pas de \`seasons\`. Si la vue de 023 suit le contrat à la lettre, ces séries n\'ont pas de studio et il reste ${strict} cibles au lieu de ${complete}. Le pool reste au-dessus du minimum.`)
L.push('')
L.push(`**Le minimum du pool :** 023 n'existe pas encore sur cette branche. La valeur par défaut de 019 et le jeu idol disent 40. On a ${complete} cibles, ou ${strict} dans le pire cas du point 8.`)
L.push('')
L.push('**À noter :** One Piece et Black Clover n\'ont que 6 personnages dans le pool (le reste est marqué spoiler dans L04). Ça suffit pour le jeu toutes séries, pas pour un Otakudle de chaque série.')
L.push('')
L.push('**Comment lire :** chaque valeur est un lien vers sa source. `main` principal, `supporting` secondaire, `antagonist` antagoniste, `other` autre. `(déduit)` : la page ne dit pas "humain" mot à mot, elle décrit une personne (soldat, élève, mère), ' + `${inferred.length} cas. \`(L04)\` : le rôle vient de L04, la page citée liste le personnage sans dire son rôle mot à mot, ${roleL04} cas. Le chapitre vient du manga, pas d'épisode. Vide : pas de source sûre, ce n'est pas bloquant pour la première apparition ou le doubleur. Écris oui ou non dans la dernière colonne.`)
L.push('')

const pages = new Map()
async function pageText(url) { const title = decodeURI(url.split('/wiki/')[1]).replace(/_/g, ' '); if (!pages.has(title)) pages.set(title, (await wikitext(title)).text); return pages.get(title) }
for (const s of ORDER) {
  const d = dem(s)
  const url = d.source_url
  const text = await pageText(url)
  const year = info[s].manga || info[s].anime
  const firstStudios = info[s].studios.filter((x) => !Array.isArray(x.seasons) || x.seasons.includes(1)).map((x) => x.name)
  for (const n of firstStudios) if (!text.includes(n.replace(/^Studio /, ''))) console.error(`warn: ${s}: studio ${n} not in ${url}`)
  if (!text.includes(year)) console.error(`warn: ${s}: year ${year} not in ${url}`)
  L.push(`## ${info[s].title}`)
  L.push('')
  L.push(`Démographie : [${d.value}](${url}). Année : [${year}](${url}). Studio de la première adaptation : ${firstStudios.map((n) => `[${n}](${url})`).join(', ')}.`)
  L.push('')
  L.push('| Personnage | Genre | Espèce | Rôle au début | Première apparition | Doubleur | OK ? (oui / non) |')
  L.push('|---|---|---|---|---|---|---|')
  for (const c of bySeries(s)) {
    const v = c.values
    const role = v.role_at_debut ? link(v.role_at_debut, v.role_at_debut.value !== c.l04_role ? ` (L04 : ${c.l04_role})` : v.role_at_debut.evidence.startsWith('L04 role') ? ' (L04)' : '') : 'vide'
    L.push(`| ${c.name} | ${link(v.gender)} | ${link(v.species, v.species?.inferred ? ' (déduit)' : '')} | ${role} | ${link(v.first_appearance)} | ${link(v.voice_actor_ja)} | |`)
  }
  L.push('')
  const o = out.filter((x) => x.s === s)
  L.push('**Hors du pool (spoiler), aucune ligne de faits :** ' + (o.length ? o.map((x) => `${x.name} (${x.status !== 'published' ? x.status : x.id === 't' ? 'identité cachée' : `spoiler ${x.level}`})`).join(', ') : 'aucun') + '.')
  L.push('')
}

L.push('## Questions')
L.push('')
L.push('Rien de cela n\'est dans le SQL. Réponds, et je régénère L13.')
L.push('')
L.push('| Personnage | Valeur | Ce que disent les sources | Ma proposition |')
L.push('|---|---|---|---|')
const q = (name, field, says, prop) => L.push(`| ${name} | ${field} | ${says} | ${prop} |`)
q('Muzan Kibutsuji', 'genre', '[Wikidata](https://www.wikidata.org/wiki/Q116252649) : genre non divulgué. [Wikipedia](https://en.wikipedia.org/wiki/List_of_Demon_Slayer:_Kimetsu_no_Yaiba_characters) : "he".', '`male`, il apparaît en homme')
q('Hange Zoë', 'genre', '[Wikidata](https://www.wikidata.org/wiki/Q97236961) : non binaire. [Wikipedia](https://en.wikipedia.org/wiki/List_of_Attack_on_Titan_characters) : Kodansha a retiré les pronoms de genre. Le contrat ne garde que female ou male.', 'laisser vide, pas une cible')
q('Angel Devil', 'genre', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Chainsaw_Man_characters) : apparence androgyne, mais "he". Pas de fiche Wikidata.', 'laisser vide, pas une cible')
q('Panda', 'espèce', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Jujutsu_Kaisen_characters) : "Cursed Corpse". À toi de confirmer : au début, on voit un panda qui parle, et ce mot vient plus tard. [Wikidata](https://www.wikidata.org/wiki/Q105152626) : être surnaturel, animal.', '`panda`, ce qu\'on voit en premier')
q('Kisuke Urahara', 'espèce', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Bleach_characters) : patron d\'une boutique au début, ancien shinigami révélé plus tard. [Wikidata](https://www.wikidata.org/wiki/Q1196931) : être surnaturel. Rien ne dit "humain" au début.', '`human`, comme Isshin')
L.push('')
L.push('**Doubleurs de Hunter x Hunter**, selon la [page Wikipedia](https://en.wikipedia.org/wiki/List_of_Hunter_%C3%97_Hunter_characters) :')
L.push('')
L.push('| Personnage | Série de 1999 | Série de 2011 (Madhouse) |')
L.push('|---|---|---|')
for (const [n, a, b] of [['Gon Freecss', 'Junko Takeuchi', 'Megumi Han'], ['Killua Zoldyck', 'Kanako Mitsuhashi', 'Mariya Ise'], ['Kurapika', 'Yuki Kaida', 'Miyuki Sawashiro'], ['Leorio Paradinight', 'Hozumi Gōda', 'Keiji Fujiwara'], ['Hisoka Morrow', 'Hiroki Takahashi', 'Daisuke Namikawa'], ['Isaac Netero', 'Bunmei Tobayama', 'Ichirō Nagai'], ['Ging Freecss', 'Hiroki Tōchi', 'Rikiya Koyama'], ['Silva Zoldyck', 'Kouji Ishii', 'Kouichi Yamadera']]) L.push(`| ${n} | ${a} | ${b} |`)
L.push('')
L.push('**Autres points :**')
L.push('')
L.push('- Asta et Yuno ont aussi une voix dans un OVA de 2016 (Shun Horie, Sōma Saitō). J\'ai gardé la série télé, celle de L04.')
L.push('- Bulma, Chi-Chi, Gol D. Roger et Hannes ont changé de voix. J\'ai gardé la première voix donnée par la source.')
L.push('- Levi : la première apparition selon Wikipedia est un récit annexe de 2010, pas un chapitre. L\'indice dira `Side story "Captain Levi"`. Dis-moi si tu préfères vide.')
L.push('- Mots d\'espèce rares à valider : `creature` (Pilaf, Wikidata), `pig` (Oolong), `curse` (Sukuna), `mod-soul` (Kon), `fiend` (Power), `hybrid` (Katana Man).')
L.push(`- ${characters.length - firsts} personnages n'ont pas de première apparition : ni Wikidata ni la page Wikipedia ne la donnent. Ils n'auront pas l'indice 5.`)
L.push('')
const md = `${L.join('\n')}\n`
if (/[\u2013\u2014]/.test(md)) throw new Error('em or en dash in the review list')
writeFileSync(output, md)
console.log(`wrote ${output}: ${md.length} chars`)
