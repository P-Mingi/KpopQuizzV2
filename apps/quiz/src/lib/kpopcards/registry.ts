// KpopCards: the one API object of the page, set by the provider (CardsProvider) and read by the small modules that are not components (economy-api.ts: craft, wish,
// focus). In the fixture mode of a development server it is the seeded mock, otherwise the fetch client.
import type { KpopCardsApi } from './contract';

let current: KpopCardsApi | null = null;
export const setKcApi = (api: KpopCardsApi | null): void => { current = api; };
export const getKcApi = (): KpopCardsApi | null => current;
export const newKey = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
