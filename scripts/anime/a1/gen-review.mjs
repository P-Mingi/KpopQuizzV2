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
L.push('**Tes réponses, appliquées dans L13 :**')
L.push('')
L.push('1. **Espèce.** Goku `saiyan`, Nezuko `demon`, Denji `hybrid` : l\'espèce que tout le monde connaît. Isshin `human`. Le contrat dit "la première espèce vue" : ces trois-là s\'en écartent par ta décision, c\'est signalé à O1.')
L.push('2. **Uryu** : `quincy`.')
L.push('3. **Les cinq rôles proposés sont acceptés.** Levi, Pochita, Power et Aki : `supporting`. Uryu : `antagonist`. L04 ne bouge pas, ces valeurs sont seulement dans L13.')
L.push('4. **Démographie sans magazine d\'origine** : `none` pour les séries nées d\'un roman léger ou d\'un jeu (The Apothecary Diaries, Re:Zero, Sword Art Online, That Time I Got Reincarnated as a Slime, Violet Evergarden, Steins;Gate).')
L.push('5. **Deux séries ont changé de magazine** : JoJo `shonen`, Vinland Saga `seinen`.')
L.push('6. **Hunter x Hunter** : les voix de la série de 2011 (Madhouse), comme le studio dans L04.')
L.push('7. **Muzan** `male`, **Panda** espèce `panda`, **Urahara** `human` : ils deviennent des cibles. **Hange et Angel Devil** : genre vide, pas des cibles. **Levi** : première apparition vide. Les mots d\'espèce rares sont acceptés.')
L.push(`8. **Pour O1, à vérifier avant le lancement :** le contrat prend le studio dans les \`seasons\` qui contiennent 1. Dans L04, ${noSeasons.map((s) => info[s].title).join(', ')} n\'ont pas de \`seasons\`. Si la vue de 023 suit le contrat à la lettre, ces séries n\'ont pas de studio et il reste ${strict} cibles au lieu de ${complete}. Le pool reste au-dessus du minimum.`)
L.push('')
L.push(`**Le minimum du pool :** 023 n'existe pas encore sur cette branche. La valeur par défaut de 019 et le jeu idol disent 40. On a ${complete} cibles, ou ${strict} dans le pire cas du point 8.`)
L.push('')
L.push('**À noter :** One Piece et Black Clover n\'ont que 6 personnages dans le pool (le reste est marqué spoiler dans L04). Ça suffit pour le jeu toutes séries, pas pour un Otakudle de chaque série.')
L.push('')
L.push('**Comment lire :** chaque valeur est un lien vers sa source. `main` principal, `supporting` secondaire, `antagonist` antagoniste, `other` autre. `(déduit)` : la page ne dit pas "humain" mot à mot, elle décrit une personne (soldat, élève, mère), ' + `${inferred.length} cas. \`(L04)\` : le rôle vient de L04, la page citée liste le personnage sans dire son rôle mot à mot, ${roleL04} cas. Le chapitre vient du manga, pas d'épisode. Vide : pas de source sûre, ce n'est pas bloquant pour la première apparition ou le doubleur. Si une ligne te gêne, écris non dans la dernière colonne.`)
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

L.push('## Ce qui reste vide, et d\'où viennent tes choix')
L.push('')
L.push('| Personnage | Valeur | Ce que disent les sources | Dans L13 |')
L.push('|---|---|---|---|')
const q = (name, field, says, prop) => L.push(`| ${name} | ${field} | ${says} | ${prop} |`)
q('Hange Zoë', 'genre', '[Wikidata](https://www.wikidata.org/wiki/Q97236961) : non binaire. [Wikipedia](https://en.wikipedia.org/wiki/List_of_Attack_on_Titan_characters) : Kodansha a retiré les pronoms de genre. Le contrat ne garde que female ou male.', 'vide, pas une cible')
q('Angel Devil', 'genre', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Chainsaw_Man_characters) : apparence androgyne, mais "he". Pas de fiche Wikidata.', 'vide, pas une cible')
q('Levi Ackerman', 'première apparition', '[Wikipedia](https://en.wikipedia.org/wiki/Levi_Ackerman) : un récit annexe de 2010, pas un chapitre.', 'vide, pas d\'indice 5')
q('Muzan Kibutsuji', 'genre', '[Wikipedia](https://en.wikipedia.org/wiki/Muzan_Kibutsuji) : "He is the very first demon". [Wikidata](https://www.wikidata.org/wiki/Q116252649) : genre non divulgué.', '`male`, source Wikipedia')
q('Panda', 'espèce', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Jujutsu_Kaisen_characters) : "Cursed Corpse", dont la forme passe entre "panda, gorilla, and triceratops". [Wikidata](https://www.wikidata.org/wiki/Q105152626) : être surnaturel, animal.', '`panda`, source Wikipedia')
q('Kisuke Urahara', 'espèce', '[Wikipedia](https://en.wikipedia.org/wiki/List_of_Bleach_characters) : patron de la boutique Urahara au début, ancien shinigami révélé plus tard. [Wikidata](https://www.wikidata.org/wiki/Q1196931) : être surnaturel. Rien ne dit "humain" mot à mot.', '`human` (déduit), comme Isshin')
L.push('')
L.push('**Autres points :**')
L.push('')
L.push('- Netero a deux voix dans la série de 2011 : Ichirō Nagai jusqu\'à l\'épisode 114, puis Banjō Ginga. J\'ai gardé la première.')
L.push('- Asta et Yuno ont aussi une voix dans un OVA de 2016 (Shun Horie, Sōma Saitō). J\'ai gardé la série télé, celle de L04.')
L.push('- Bulma, Chi-Chi, Gol D. Roger et Hannes ont changé de voix. J\'ai gardé la première voix donnée par la source.')
L.push(`- ${characters.length - firsts} personnages n'ont pas de première apparition : ni Wikidata ni la page Wikipedia ne la donnent, ou tu l'as voulu vide (Levi). Ils n'auront pas l'indice 5.`)
L.push('')
const md = `${L.join('\n')}\n`
if (/[\u2013\u2014]/.test(md)) throw new Error('em or en dash in the review list')
writeFileSync(output, md)
console.log(`wrote ${output}: ${md.length} chars`)
