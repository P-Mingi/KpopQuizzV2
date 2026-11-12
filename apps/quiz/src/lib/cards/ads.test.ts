// Bunnyverse Cards, lane B: the ads layer. Hidden with no publisher id; US requests child-directed; consent regions fail closed; the grant is called
// only from adViewed; a dismissed ad grants nothing; no ad available hides the button.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { adsContext, ATTR_CHILD_DIRECTED, cmpSrc, consentAllows, createRewardController, scriptAttributes } from './ads';

import type { RewardBreak, RewardState } from './ads';

const ENV = { NET_CARDS_ADS: '1', NEXT_PUBLIC_NET_CARDS_ADS: '1', NEXT_PUBLIC_CARDS_ADSENSE_CLIENT: 'ca-pub-1234567890123456', NEXT_PUBLIC_CARDS_BANNER_SLOT: '1234567890' };

describe('context', () => {
  it('no publisher id, or a flag off, or another site: disabled, no script attributes', () => {
    expect(adsContext({ ...ENV, NEXT_PUBLIC_CARDS_ADSENSE_CLIENT: undefined }, 'FR', 'hub').enabled).toBe(false);
    expect(adsContext({ ...ENV, NEXT_PUBLIC_CARDS_ADSENSE_CLIENT: 'pub-1' }, 'FR', 'hub').enabled).toBe(false);
    expect(adsContext({ ...ENV, NET_CARDS_ADS: '0' }, 'FR', 'hub').enabled).toBe(false);
    expect(adsContext({ ...ENV, NEXT_PUBLIC_NET_CARDS_ADS: undefined }, 'FR', 'hub').enabled).toBe(false);
    expect(adsContext(ENV, 'FR', 'kpop').enabled).toBe(false);
    expect(adsContext(ENV, 'FR', 'anime').enabled).toBe(false);
    const off = adsContext({}, 'FR', 'hub');
    expect(scriptAttributes(off)).toBeNull();
    expect(cmpSrc(off)).toBeNull();
  });
  it('a bad banner slot is dropped, the rewarded button does not need it', () => {
    const c = adsContext({ ...ENV, NEXT_PUBLIC_CARDS_BANNER_SLOT: 'abc' }, 'FR', 'hub');
    expect(c.enabled).toBe(true);
    expect(c.bannerSlot).toBeNull();
  });
  it('US is child-directed, others are not; the attribute is on the tag only for US', () => {
    const us = adsContext(ENV, 'us', 'hub');
    expect(us.childDirected).toBe(true);
    expect(scriptAttributes(us)![ATTR_CHILD_DIRECTED]).toBe('1');
    const jp = adsContext(ENV, 'JP', 'hub');
    expect(jp.childDirected).toBe(false);
    expect(ATTR_CHILD_DIRECTED in scriptAttributes(jp)!).toBe(false);
    expect(scriptAttributes(jp)!.src).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456');
  });
  it('consent regions: EEA, UK, Switzerland and an unknown country need the CMP; the US and Japan do not', () => {
    for (const c of ['FR', 'DE', 'NO', 'IS', 'GB', 'CH', null]) expect(adsContext(ENV, c, 'hub').consentRequired, String(c)).toBe(true);
    for (const c of ['US', 'JP', 'KR', 'BR']) expect(adsContext(ENV, c, 'hub').consentRequired, c).toBe(false);
  });
});

describe('consent', () => {
  const fr = adsContext(ENV, 'FR', 'hub');
  const us = adsContext(ENV, 'US', 'hub');
  it('no ad request in a consent region before the CMP answers or without purpose 1', () => {
    expect(consentAllows(fr, null)).toBe(false);
    expect(consentAllows(fr, { eventStatus: 'cmpuishown', purpose: { consents: { '1': true } } })).toBe(false);
    expect(consentAllows(fr, { eventStatus: 'useractioncomplete', purpose: { consents: { '1': false } } })).toBe(false);
    expect(consentAllows(fr, { eventStatus: 'useractioncomplete', purpose: { consents: { '1': true } } })).toBe(true);
    expect(consentAllows(fr, { gdprApplies: false })).toBe(true);
  });
  it('outside the regions no CMP is needed', () => { expect(consentAllows(us, null)).toBe(true); });
});

describe('rewarded flow', () => {
  function setup(opts: { ticket?: string | null } = {}) {
    let brk: RewardBreak | null = null;
    const states: RewardState[] = [];
    const grant = vi.fn(async () => undefined);
    const ticket = vi.fn(async () => (opts.ticket === undefined ? 't1' : opts.ticket));
    const adBreak = vi.fn((o: RewardBreak) => { brk = o; });
    const c = createRewardController({ adBreak, ticket, grant, onState: (s) => states.push(s) });
    return { c, get brk() { return brk!; }, states, grant, ticket, adBreak };
  }
  it('no ad available (adBreakDone without beforeReward): hidden, no ticket, no grant', () => {
    const s = setup();
    s.c.probe();
    s.brk.adBreakDone({ breakStatus: 'noAdPreloaded' });
    expect(s.states).toEqual(['hidden']);
    expect(s.ticket).not.toHaveBeenCalled();
    expect(s.grant).not.toHaveBeenCalled();
  });
  it('an ad is offered: ready; click takes a ticket, then shows; adViewed grants once with that ticket', async () => {
    const s = setup();
    s.c.probe();
    const show = vi.fn();
    s.brk.beforeReward(show);
    expect(s.states).toEqual(['ready']);
    await s.c.click();
    expect(s.ticket).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledTimes(1);
    expect(s.grant).not.toHaveBeenCalled();
    s.brk.adViewed();
    expect(s.grant).toHaveBeenCalledWith('t1');
    s.brk.adViewed();
    expect(s.grant).toHaveBeenCalledTimes(1);
  });
  it('a dismissed ad grants nothing', async () => {
    const s = setup();
    s.c.probe();
    s.brk.beforeReward(vi.fn());
    await s.c.click();
    s.brk.adDismissed();
    s.brk.adBreakDone({ breakStatus: 'dismissed' });
    expect(s.grant).not.toHaveBeenCalled();
  });
  it('no ticket (daily limit): hidden, the ad is never shown', async () => {
    const s = setup({ ticket: null });
    s.c.probe();
    const show = vi.fn();
    s.brk.beforeReward(show);
    await s.c.click();
    expect(show).not.toHaveBeenCalled();
    expect(s.states.at(-1)).toBe('hidden');
  });
  it('the grant is reached from adViewed only', () => {
    const src = readFileSync('src/lib/cards/ads.ts', 'utf8');
    expect(src.match(/d\.grant\(/g)?.length).toBe(1);
    expect(src.slice(src.indexOf('adViewed: () => {'), src.indexOf('adDismissed: () => {'))).toContain('d.grant(');
  });
});
