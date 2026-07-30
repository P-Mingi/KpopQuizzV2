import { GroupLogo } from '@/components/ui/group-logo';
import { JoinButton } from '@/components/verse/join-button';
import { CurateLink } from '@/components/verse/curate-link';
import { upcomingBirthday, comebackCountdown } from '@/lib/verse/date-engines';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';
import { BannerStickers } from '@/components/verse/presentation/sticker-layer';

import type { Space } from '@/lib/verse/space';

/**
 * V-DESIGN v2 space hero: a full-bleed editorial masthead, not a bordered card.
 * The backdrop bleeds to the canvas edges (the negative margins exactly cancel
 * the verse-scope container's own padding, so the header spans the container's
 * border-box width and never overflows). The fandom name is the one accent
 * moment (display type); vitals stay a quiet line; the live / comeback / birthday
 * signals are de-boxed into editorial rows.
 *
 * Fandom name owns the H1; group slug owns the URL. Est. year falls back to debut
 * year. War-rank chip stays gated OFF until the war map is wired (hides unranked).
 */
export function SpaceHero({ space }: { space: Space }): React.ReactElement {
  const { group, config, idols, comeback, counts } = space;
  const today = new Date();
  const estYear = config.est_year ?? (group.inception_date ? Number(group.inception_date.slice(0, 4)) : null);
  // V-SPACE-FLOW step 5 - anniversary auto-moments, curator-disableable via
  // presentation.celebrations (absent/true = on). Static accent lines only (no
  // motion, so reduced-motion needs nothing to respect).
  const celebrate = space.presentation.celebrations !== false;
  const bday = celebrate ? upcomingBirthday(idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })), today) : null;
  const anniYears = (() => {
    if (!celebrate || !group.inception_date) return 0;
    const m = group.inception_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return 0;
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return `${m[2]}-${m[3]}` === mmdd ? today.getFullYear() - Number(m[1]) : 0;
  })();
  const cbDays = comeback ? comebackCountdown(comeback.release_date, today) : -1;
  const vitals = [estYear ? `Est. ${estYear}` : null, group.generation, `${counts.members} members`, counts.albums > 0 ? `${counts.albums} releases` : null].filter(Boolean).join('  ·  ');

  // W-CUSTOM banner: treatment drives the hero backdrop. 'photo' needs an uploaded
  // banner (our public bucket, aspect reserved so zero CLS); 'gradient' is the
  // default sheen; 'solid' is a flat wash. Absent config -> the original gradient.
  // V-SPACE-FLOW step 5 - COMEBACK MODE event skin. Active inside the armed
  // window; auto-expires at render 36h after the release moment even if the
  // curator forgets to disarm. Day-level countdown (ISR-friendly).
  const cbMode = space.presentation.comebackMode ?? null;
  const nowMs = Date.now();
  const cbActive = !!cbMode && Date.parse(cbMode.startsAt) <= nowMs && nowMs <= Date.parse(cbMode.endsAt) + 36 * 3600_000;
  const cbDaysToRelease = cbMode ? Math.ceil((Date.parse(cbMode.endsAt) - nowMs) / 86400_000) : 0;
  const cbReleaseDay = cbActive && cbDaysToRelease <= 0;
  const cbPinHref = cbMode?.pinKind === 'timeline' ? `/verse/${group.slug}/timeline` : `/verse/${group.slug}/community`;

  const banner = space.presentation.banner;
  const bannerUrl = banner?.treatment === 'photo' ? spaceAssetUrl(banner.assetPath) : null;
  const backdrop = banner?.treatment === 'solid'
    ? 'var(--verse-soft)'
    : 'linear-gradient(135deg, var(--verse-soft-strong), transparent 62%)';

  return (
    <header className="verse-hero relative isolate -mx-4 -mt-6 overflow-hidden sm:-mx-6 sm:-mt-8 lg:-mx-10">
      {bannerUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="" width={1600} height={500} className="absolute inset-0 h-full w-full object-cover" aria-hidden />
          {/* Scrim keyed to --bg-primary so the masthead text stays legible in both themes. */}
          <div className="absolute inset-0" aria-hidden style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 12%, transparent) 0%, color-mix(in srgb, var(--bg-primary) 52%, transparent) 58%, color-mix(in srgb, var(--bg-primary) 90%, transparent) 100%)' }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: backdrop }} aria-hidden />
      )}
      <BannerStickers space={space} />

      <div className="relative flex flex-col gap-5 px-4 pb-7 pt-10 sm:px-6 sm:pb-8 sm:pt-12 lg:px-10">
        <div className="flex items-end gap-4 sm:gap-5">
          <GroupLogo groupName={group.name} logoUrl={group.logo_url} displayColor={group.display_color ?? '#E8457A'} textColor={group.text_color ?? '#fff'} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tertiary">Home of {group.name} fans</p>
            <h1 className="mt-1.5" style={{ fontSize: 'var(--v-type-display)', lineHeight: 0.95, fontWeight: 'var(--v-display-weight, 800)', letterSpacing: 'var(--v-display-tracking, var(--v-tracking-tight))', textTransform: 'var(--v-display-transform, none)', color: 'var(--verse-ink)' }}>{group.fandom_name}</h1>
            <p className="mt-2 text-xs text-tertiary">{vitals}</p>
          </div>
        </div>

        {config.welcome_line ? (
          <p className="leading-relaxed text-secondary" style={{ fontSize: 'var(--v-type-body)', maxWidth: 'var(--v-measure)' }}>{config.welcome_line}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <JoinButton groupId={group.id} groupSlug={group.slug} fandomName={group.fandom_name} />
          <CurateLink groupSlug={group.slug} />
          {config.sns_links.length > 0 ? (
            <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
              {config.sns_links.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold text-tertiary no-underline transition-colors hover:text-primary">{s.label}</a>
              ))}
            </span>
          ) : null}
        </div>

        {/* NOW signals - de-boxed editorial rows separated by a quiet hairline. Live
            and comeback keep a small accent tag (a real status, not decoration);
            no filled cards, no borders. LIVE NOW (W-CUSTOM step 7) is a curator
            manual toggle that auto-expires at render even if they forget. */}
        {cbActive || (space.presentation.liveNow && Date.parse(space.presentation.liveNow.expiresAt) > Date.now()) || (comeback && cbDays >= 0) || bday || anniYears > 0 ? (
          <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: 'var(--v-hairline)' }}>
            {cbActive && cbMode ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Comeback mode</span>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{cbMode.title}</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{cbReleaseDay ? 'Out now' : `D-${cbDaysToRelease}`}</span>
                <a href={cbReleaseDay ? `/verse/${group.slug}/community` : cbPinHref} className="ml-auto inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
                  {cbReleaseDay ? 'Join the release-day thread' : cbMode.pinKind === 'timeline' ? 'The era so far' : 'Comeback talk'}
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            ) : null}
            {space.presentation.liveNow && Date.parse(space.presentation.liveNow.expiresAt) > Date.now() ? (
              <a href={space.presentation.liveNow.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2.5 text-sm no-underline">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#e0245e' }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#e0245e' }} aria-hidden /> Live now
                </span>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{space.presentation.liveNow.label ?? `${group.name} is live`}</span>
                <span className="ml-auto inline-flex items-center gap-1 font-bold" style={{ color: 'var(--verse-ink)' }}>Watch
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            ) : null}
            {comeback && cbDays >= 0 ? (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--verse-accent)' }}>Comeback</span>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{comeback.title}</span>
                <span className="ml-auto font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{cbDays === 0 ? 'Out now' : `in ${cbDays} day${cbDays === 1 ? '' : 's'}`}</span>
              </div>
            ) : null}
            {anniYears > 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--verse-ink)' }}>
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--verse-accent)' }} />
                <span className="font-semibold">{anniYears} year{anniYears === 1 ? '' : 's'} of {group.name} today</span>
              </div>
            ) : null}
            {bday ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--verse-ink)' }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M12 4v3M8 5v2M16 5v2" />
                </svg>
                <span className="font-semibold">{bday.isToday ? `Happy birthday, ${bday.name}!` : `${bday.name}'s birthday in ${bday.inDays} day${bday.inDays === 1 ? '' : 's'}`}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
