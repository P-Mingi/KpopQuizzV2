// Bunnyverse Cards, lane U: what the page of one card needs, from the catalog, a card number and the optional ?lock=<rarity>. Pure.
// Unknown number: null (the page answers 404). A ?lock for an edition that does not exist yet shows that edition's lock sentence.
import { EDITIONS, LOCK_SENTENCES, RARITIES, RARITY_NAMES, creditLine } from './rules';
import { ladderRarities, lockReasonOf, slimCard } from './ui-model';

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
  const ladder: Rung[] = ladderRarities(entity.kind).map((r) => {
    const c = mine.find((x) => x.rarity === r);
    return { rarity: r, card: c ? slimCard(c, entity.eventType ?? null) : null, reason: lockReasonOf(entity.lockReasons, r), anchor: card.num };
  });
  const lockR = RARITIES.find((r) => r === lock);
  const missing = lockR ? ladder.find((x) => x.rarity === lockR && !x.card) : undefined;
  const locked = !!missing;
  const shown: Rarity = locked ? (lockR as Rarity) : card.rarity;
  const edition = `${EDITIONS[card.rarity].name} · ${RARITY_NAMES[card.rarity]}`;
  const facts: [string, string][] =
    entity.kind === 'idol' ? [['Group', entity.group ?? ''], ['Debut', `${entity.debutYear ?? ''}, with the group`], ['Edition', edition], ['Number', card.num]]
    : entity.kind === 'group' ? [['Debut', String(entity.debutYear ?? '')], ['Edition', edition], ['Number', card.num]]
    : [['Type', entity.eventType ?? 'Event'], ['Year', String(entity.debutYear ?? '')], ['Edition', edition], ['Number', card.num]];
  const sub = entity.kind === 'idol' ? `${entity.group ?? ''} · debut ${entity.debutYear ?? ''}`
    : entity.kind === 'group' ? `Group · debut ${entity.debutYear ?? ''}` : `${entity.eventType ?? 'Event'} · ${entity.debutYear ?? ''}`;
  const missingRungs = ladder.filter((x) => !x.card);
  let why: DetailProps['why'] = null;
  if (entity.kind === 'idol' && missingRungs.length > 0) {
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
    ladder, why,
    lockSentence: locked ? (missing!.reason ? LOCK_SENTENCES[missing!.reason] : 'No free photo can make this edition yet.') : null,
  };
  return { props, card, photo: card.photo, entity, locked };
}
