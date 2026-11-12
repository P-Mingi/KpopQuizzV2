// Bunnyverse Cards, lane U: what the page of one card needs, from the catalog, a card number and the optional ?lock=<rarity>. Pure.
// Unknown number: null (the page answers 404). A ?lock for an edition that does not exist yet shows that edition's lock sentence.
import { EDITIONS, LOCK_SENTENCES, RARITIES, RARITY_NAMES, creditLine } from './rules';
import { SOLOIST, ladderRarities, lockReasonOf, slimCard } from './ui-model';

import type { Rarity } from './types';
import type { DetailProps, Rung } from '@/components/cards/card-detail';
import type { UiCard, UiCatalog, UiEntity, UiPhoto } from './ui-types';

export interface Detail {
  props: Omit<DetailProps, 'credit'>;
  card: UiCard;
  photo: UiPhoto | null;
  entity: UiEntity;
  /** True when the page shows an edition that cannot exist yet. */
  locked: boolean;
}

const NUM = /^BV\d+-\d{4,}$/;
export function isCardNum(v: string): boolean {
  return NUM.test(v);
}

export function buildDetail(cat: UiCatalog, num: string, lock: string | null): Detail | null {
  if (!isCardNum(num)) return null;
  const card = cat.cards.find((c) => c.num === num);
  const entity = card ? cat.entities.find((e) => e.id === card.entity) : undefined;
  if (!card || !entity) return null;
  const mine = cat.cards.filter((c) => c.entity === entity.id);
  // Lot 2: a rung of a group is its pair (left half first); the rung points at the first card, the mate is the other half.
  const ladder: Rung[] = ladderRarities(entity.kind).map((r) => {
    const cs = mine.filter((x) => x.rarity === r).sort((a, b) => (a.part ?? 0) - (b.part ?? 0) || a.n - b.n);
    const c = cs[0];
    const m = c && (c.part === 1) ? cs.find((x) => x.part === 2 && x.n === c.pairN) : undefined;
    return { rarity: r, card: c ? slimCard(c, entity.eventType ?? null) : null, ...(m ? { mate: slimCard(m, entity.eventType ?? null) } : {}), reason: lockReasonOf(entity.lockReasons, r), anchor: card.num };
  });
  const half = card.part === 1 || card.part === 2 ? card.part : 0;
  const mateCard = half && card.pairN != null ? cat.cards.find((x) => x.n === card.pairN && x.entity === card.entity) : undefined;
  const pair: DetailProps['pair'] = half ? { side: half === 1 ? 'left' : 'right', mate: mateCard ? slimCard(mateCard, entity.eventType ?? null) : null } : null;
  const lockR = RARITIES.find((r) => r === lock);
  const missing = lockR ? ladder.find((x) => x.rarity === lockR && !x.card) : undefined;
  const locked = !!missing;
  const shown: Rarity = locked ? (lockR as Rarity) : card.rarity;
  const edition = `${EDITIONS[card.rarity].name} · ${RARITY_NAMES[card.rarity]}`;
  // A fact the database does not hold (no debut year) is left out, never shown empty (no invented value either). A person without a group
  // line is a soloist (decision 18, review 1 finding 12: 101 gives a person a group line only when the idols row sits in another group);
  // a soloist's debut year is the solo debut, so it is not "with the group".
  const year = entity.debutYear ?? null;
  const groupLine = entity.group || SOLOIST;
  const allFacts: [string, string | null][] =
    entity.kind === 'idol' ? [['Group', groupLine], ['Debut', year !== null ? (entity.group ? `${year}, with the group` : String(year)) : null], ['Edition', edition], ['Number', card.num]]
    : entity.kind === 'group' ? [['Debut', year !== null ? String(year) : null], ['Disbanded', entity.endYear ? String(entity.endYear) : null], ['Edition', edition], ...(half ? [['Part', `${half === 1 ? 'Left' : 'Right'} half, ${half} of 2`] as [string, string]] : []), ['Number', card.num]]
    : [['Type', entity.eventType ?? 'Event'], ['Year', year !== null ? String(year) : null], ['Edition', edition], ['Number', card.num]];
  const facts = allFacts.filter((f): f is [string, string] => f[1] !== null && f[1] !== '');
  const subParts = entity.kind === 'idol' ? [groupLine, year !== null ? `debut ${year}` : null]
    : entity.kind === 'group' ? ['Group', year !== null ? `debut ${year}` : null, entity.endYear ? `disbanded ${entity.endYear}` : null] : [entity.eventType ?? 'Event', year !== null ? String(year) : null];
  const sub = subParts.filter((x): x is string => !!x).join(' · ');
  const missingRungs = ladder.filter((x) => !x.card);
  let why: DetailProps['why'] = null;
  // Amendment 1: a group has locked Era and Full Art pockets too, for the same reason, so it gets the same explanation.
  if ((entity.kind === 'idol' || entity.kind === 'group') && missingRungs.length > 0) {
    const sentences = [...new Set(missingRungs.map((x) => (x.reason ? LOCK_SENTENCES[x.reason] : null)).filter((s): s is string => !!s))];
    const noSr = missingRungs.some((x) => x.rarity === 'SR');
    const noL = missingRungs.some((x) => x.rarity === 'L');
    const need = noSr && noL ? 'The Era and Full Art editions need a second and a third free photo.'
      : noL ? 'The Full Art edition needs a third free photo, from another event.' : 'The Era edition needs a second free photo, from another event.';
    why = { title: `Why ${entity.name} has ${ladder.length - missingRungs.length} editions`, sentences, need };
  }
  const props: Omit<DetailProps, 'credit'> = {
    card: locked ? null : slimCard(card, entity.eventType ?? null),
    lockedRarity: locked ? shown : null,
    entityName: entity.name, entityKind: entity.kind, sub, facts,
    backCredit: !locked && card.photo ? creditLine(card.photo, card.photo.slot) : null,
    ladder, why, pair: locked ? null : pair,
    lockSentence: locked ? (missing!.reason ? LOCK_SENTENCES[missing!.reason] : 'No free photo can make this edition yet.') : null,
  };
  return { props, card, photo: card.photo, entity, locked };
}
