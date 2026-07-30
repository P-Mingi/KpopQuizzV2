import { GroupLogo } from '@/components/ui/group-logo';
import { JoinButton } from '@/components/verse/join-button';
import { CurateLink } from '@/components/verse/curate-link';
import { upcomingBirthday, comebackCountdown } from '@/lib/verse/date-engines';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';

import type { Space } from '@/lib/verse/space';

/**
 * Themed space hero. Fandom name owns the H1; group slug owns the URL. Est. year
 * falls back to debut year. War-rank chip is intentionally gated OFF until the war
 * map is wired (hides unranked). Join CTA needs an account, so it routes to login.
 */
export function SpaceHero({ space }: { space: Space }): React.ReactElement {
  const { group, config, idols, comeback, counts } = space;
  const today = new Date();
  const estYear = config.est_year ?? (group.inception_date ? Number(group.inception_date.slice(0, 4)) : null);
  const bday = upcomingBirthday(idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })), today);
  const cbDays = comeback ? comebackCountdown(comeback.release_date, today) : -1;

  // W-CUSTOM banner: treatment drives the hero backdrop. 'photo' needs an uploaded
  // banner (our public bucket, aspect reserved so zero CLS); 'gradient' is the
  // default sheen; 'solid' is a flat wash. Absent config -> the original gradient.
  const banner = space.presentation.banner;
  const bannerUrl = banner?.treatment === 'photo' ? spaceAssetUrl(banner.assetPath) : null;
  const backdrop = banner?.treatment === 'solid'
    ? 'var(--verse-soft)'
    : 'linear-gradient(135deg, var(--verse-soft-strong), transparent 60%)';

  return (
    <header className="verse-hero relative overflow-hidden rounded-2xl border border-default">
      {bannerUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt="" width={1600} height={400} className="absolute inset-0 h-full w-full object-cover" aria-hidden />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-primary) 82%, transparent))' }} aria-hidden />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: backdrop }} aria-hidden />
      )}
      <div className="relative flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <GroupLogo groupName={group.name} logoUrl={group.logo_url} displayColor={group.display_color ?? '#E8457A'} textColor={group.text_color ?? '#fff'} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold leading-none sm:text-4xl" style={{ color: 'var(--verse-ink)' }}>{group.fandom_name}</h1>
            <p className="mt-1 text-sm text-secondary sm:text-base">Home of {group.name} fans</p>
            <p className="mt-1 text-xs text-tertiary">
              {[estYear ? `Est. ${estYear}` : null, group.generation, `${counts.members} members`].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        </div>

        {config.welcome_line ? (
          <p className="max-w-2xl text-sm leading-relaxed text-secondary">{config.welcome_line}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <JoinButton groupId={group.id} groupSlug={group.slug} fandomName={group.fandom_name} />
          <CurateLink groupSlug={group.slug} />
          <span className="text-xs text-tertiary">{counts.members} members{counts.albums > 0 ? `  ·  ${counts.albums} releases` : ''}</span>
          {config.sns_links.length > 0 ? (
            <span className="ml-auto flex flex-wrap gap-2">
              {config.sns_links.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
                  className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-secondary no-underline transition-colors hover:text-primary"
                  style={{ borderColor: 'var(--verse-line)' }}>{s.label}</a>
              ))}
            </span>
          ) : null}
        </div>

        {/* Comeback mode strip (from the comebacks table) */}
        {comeback && cbDays >= 0 ? (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--verse-soft)', border: '1px solid var(--verse-line)' }}>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Comeback</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--verse-ink)' }}>{comeback.title}</span>
            <span className="ml-auto text-sm font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>
              {cbDays === 0 ? 'Out now' : `in ${cbDays} day${cbDays === 1 ? '' : 's'}`}
            </span>
          </div>
        ) : null}

        {/* Birthday strip (an idol birthday within 30 days; celebratory on the day) */}
        {bday ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--verse-ink)' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M12 4v3M8 5v2M16 5v2" />
            </svg>
            <span className="font-semibold">
              {bday.isToday ? `Happy birthday, ${bday.name}!` : `${bday.name}'s birthday in ${bday.inDays} day${bday.inDays === 1 ? '' : 's'}`}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
