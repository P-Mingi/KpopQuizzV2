'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { UxPage } from '@/components/ux-v1/page';
import { Icon } from '@/components/ux-v1/icon';
import { UxAvatar } from '@/components/ux-v1/avatar';
import { BadgeMedal } from '@/components/ux-v1/badge-medal';
import { PersonName } from '@/components/ux-v1/person-name';
import { Segmented } from '@/components/ux-v1/segmented';
import { UxSwitch } from '@/components/ux-v1/form';
import { Sheet } from '@/components/ux-v1/sheet';
import { ConfirmSheet } from '@/components/ux-v1/confirm-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { createBrowserClient } from '@/lib/supabase/client';
import { clearMe } from '@/lib/auth/use-me';
import { RESERVED_USERNAMES } from '@/lib/constants';
import { badgeRarity } from '@/lib/badges';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { AVATAR_PRESETS, AVATAR_PRESET_KEYS, NAME_ACCENTS, NAME_ACCENT_KEYS, NAME_FONTS, NAME_FONT_KEYS } from '@/lib/passport-flair';
import { BIAS_MAX, PASSPORT_THEMES, PASSPORT_THEME_KEYS, ULT_MAX } from '@/lib/passport-themes';
import { applyTheme, storedTheme } from '@/lib/ux-v1/a0/theme';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { cssUrl } from '@/lib/ux-v1/p10/passport-model';
import { formFromRow, formProblems, prefsPayload, profilePayload, usernameProblem } from '@/lib/ux-v1/p10/settings-model';

import { HeaderPicker } from './header-picker';
import { clearHeader, announceHeader } from './header-actions';

import type { ThemeChoice } from '@/lib/ux-v1/a0/theme';
import type { ProfileForm, ProfileRow, UsernameStatus } from '@/lib/ux-v1/p10/settings-model';

interface Loaded {
  row: ProfileRow & { xp: number; avatar_bg: string; avatar_text: string; header_url: string | null };
  groups: Array<{ id: number; slug: string; name: string }>;
  earned: Array<{ id: string; name: string }>;
  provider: string | null;
}

// Prototype rows (settings > Notifications) mapped to the live categories
// (lib/notification-types NOTIFICATION_CATEGORIES, saved by /api/notifications/prefs).
const NOTIF_ROWS: Array<{ key: string; label: string; sub: string }> = [
  { key: 'your_quizzes', label: 'Your quizzes', sub: 'Plays milestones, comments and reactions' },
  { key: 'social', label: 'Social', sub: 'New followers, cheers and score battles' },
  { key: 'following', label: 'Following', sub: 'New quizzes from people you follow' },
  { key: 'achievements', label: 'Achievements', sub: 'Badges, streak milestones, groups mastered' },
  { key: 'announcements', label: 'From the KpopQuiz team', sub: 'Big updates only, a few times a year' },
];
const EMAIL_ROWS = [
  { key: 'email_streak', label: 'Streak reminder by email', sub: 'One email at 8 pm when your streak is at risk' },
  { key: 'email_recap', label: 'Weekly recap by email', sub: 'Your week in scores, every Monday' },
];

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function subscribeTheme(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', onChange);
  return () => { obs.disconnect(); window.removeEventListener('storage', onChange); };
}

const PROVIDER_LABEL: Record<string, string> = { google: 'Google', discord: 'Discord', email: 'Email link', twitter: 'X', github: 'GitHub' };

/** Radio pill ("fopt") used by every Your look picker: role=radio + roving focus via arrow keys in the group. */
function Opt({ on, onPick, children, className, style, label }: { on: boolean; onPick: () => void; children: React.ReactNode; className?: string; style?: React.CSSProperties; label?: string }): React.ReactElement {
  return (
    <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} aria-label={label} className={['p10-fopt', className ?? ''].filter(Boolean).join(' ')} style={style} onClick={onPick}>
      {children}
    </button>
  );
}

/** Arrow keys move the choice inside a radiogroup (native radio behaviour). */
function radioKeys(e: React.KeyboardEvent<HTMLDivElement>): void {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  if (!items.length) return;
  const i = Math.max(0, items.indexOf(document.activeElement as HTMLElement));
  const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  e.preventDefault();
  items[n]?.focus();
  items[n]?.click();
}

function RadioGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={['p10-flair-row', className ?? ''].filter(Boolean).join(' ')} role="radiogroup" aria-label={label} onKeyDown={radioKeys}>{children}</div>;
}

/**
 * The v11 settings page (DESIGN-SPEC 16.7 settings, 17.8 Your look; prototype
 * view "settings"). Reads exactly what the legacy page reads (browser client:
 * profiles, groups, user_badges; GET /api/notifications/prefs), plus the main
 * group's members (public idols roster) for the bias chips. Every profile change
 * waits in the save bar and goes through the EXISTING /api/auth/update-profile
 * with the legacy payload shape, changed fields only; notification switches go
 * through the EXISTING /api/notifications/prefs. Theme and sounds are device
 * settings (localStorage), applied at once, as today.
 */
export function UxSettings(): React.ReactElement {
  const router = useRouter();
  const toast = useUxToast();
  const [state, setState] = useState<'loading' | 'signed-out' | 'error' | 'ready'>('loading');
  const [data, setData] = useState<Loaded | null>(null);
  const [base, setBase] = useState<ProfileForm | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [prefsBase, setPrefsBase] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [customBias, setCustomBias] = useState('');
  const [uStatus, setUStatus] = useState<UsernameStatus>('same');
  const [uError, setUError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [exporting, setExporting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useSyncExternalStore<ThemeChoice>(subscribeTheme, storedTheme, () => 'system');

  // ---- load (reads only) ----
  useEffect(() => {
    let cancelled = false;
    setSound(isSoundEnabled());
    void (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setState('signed-out'); return; }
        const [{ data: row }, { data: groups }, { data: badges }] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, display_name, avatar_url, avatar_bg, avatar_text, bio, ult_groups, bias, profile_theme, name_accent, name_font, pinned_badge_id, avatar_kind, avatar_ref, xp, stan_since, header_url')
            .eq('id', user.id)
            .single(),
          supabase.from('groups').select('id, slug, name').order('name'),
          supabase.from('user_badges').select('badge_definitions!inner(id, name)').eq('user_id', user.id),
        ]);
        if (cancelled) return;
        if (!row) { setState('error'); return; }
        const r = row as Loaded['row'];
        const earned = ((badges ?? []) as Array<{ badge_definitions: { id: string; name: string } | Array<{ id: string; name: string }> }>)
          .map((b) => (Array.isArray(b.badge_definitions) ? b.badge_definitions[0] : b.badge_definitions))
          .filter((b): b is { id: string; name: string } => Boolean(b));
        const provider = (user.app_metadata?.provider as string | undefined) ?? user.identities?.[0]?.provider ?? null;
        setData({ row: r, groups: (groups ?? []) as Loaded['groups'], earned, provider });
        const f = formFromRow(r);
        setBase(f);
        setForm(f);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    void (async () => {
      try {
        const res = await fetch('/api/notifications/prefs', { credentials: 'include' });
        if (res.ok) {
          const d = (await res.json()) as { categories?: Record<string, boolean> };
          if (!cancelled) { setPrefsBase(d.categories ?? {}); setPrefs(d.categories ?? {}); }
        }
      } catch { /* defaults: all on */ } finally { if (!cancelled) setPrefsLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- bias chips: members of the main group (public idols roster) ----
  const mainSlug = form?.ult_groups[0] ?? null;
  const mainGroup = useMemo(() => data?.groups.find((g) => g.slug === mainSlug) ?? null, [data, mainSlug]);
  useEffect(() => {
    if (!mainGroup) { setMembers([]); return; }
    let cancelled = false;
    void (async () => {
      try {
        const { data: rows } = await createBrowserClient().from('idols').select('name, ord').eq('group_id', mainGroup.id).eq('active', true).order('ord');
        if (!cancelled) setMembers([...new Set(((rows ?? []) as Array<{ name: string }>).map((m) => m.name).filter(Boolean))].slice(0, 16));
      } catch { if (!cancelled) setMembers([]); }
    })();
    return () => { cancelled = true; };
  }, [mainGroup]);

  // ---- username availability (GET /api/auth/check-username, debounced) ----
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!form || !base) return;
    if (form.username === base.username) { setUStatus('same'); setUError(''); return; }
    const problem = usernameProblem(form.username, RESERVED_USERNAMES as readonly string[]);
    if (problem) { setUStatus('invalid'); setUError(problem); return; }
    setUStatus('checking');
    setUError('');
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(form.username)}`);
        if (!res.ok) { setUStatus('invalid'); setUError('Could not check this name'); return; }
        const d = (await res.json()) as { available: boolean };
        setUStatus(d.available ? 'available' : 'taken');
        setUError(d.available ? '' : 'Already taken');
      } catch { setUStatus('invalid'); setUError('Could not check this name'); }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [form, base]);

  const set = useCallback(<K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => {
    setSaveError(null);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }, []);

  const payload = form && base ? profilePayload(base, form) : {};
  const prefsDiff = prefsPayload(prefsBase, prefs);
  const dirty = Object.keys(payload).length > 0 || Object.keys(prefsDiff).length > 0;
  const problems = form ? formProblems(form) : [];
  const canSave = dirty && !saving && problems.length === 0 && (form?.username === base?.username || uStatus === 'available');

  const discard = (): void => { setForm(base); setPrefs(prefsBase); setCustomBias(''); setSaveError(null); toast('Changes discarded'); };

  const save = async (): Promise<void> => {
    if (!canSave || !form || !base) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (Object.keys(payload).length > 0) {
        const res = await fetch('/api/auth/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        const d = (await res.json().catch(() => ({}))) as { error?: string; profile?: ProfileRow };
        if (!res.ok) { setSaveError(d.error ?? 'We could not save your changes.'); return; }
        const saved = d.profile ? formFromRow(d.profile) : form;
        setBase(saved);
        setForm(saved);
      }
      if (Object.keys(prefsDiff).length > 0) {
        const res = await fetch('/api/notifications/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories: prefsDiff }), credentials: 'include' });
        const d = (await res.json().catch(() => ({}))) as { error?: string; categories?: Record<string, boolean> };
        if (!res.ok) { setSaveError(d.error ?? 'We could not save your notification settings.'); return; }
        const cats = d.categories ?? prefs;
        setPrefsBase(cats);
        setPrefs(cats);
      }
      setUStatus('same');
      clearMe();
      toast('Settings saved');
      router.refresh();
    } catch {
      setSaveError('We could not reach the server. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try { await createBrowserClient().auth.signOut(); } catch { /* local session is cleared anyway */ }
    clearMe();
    router.push('/');
  };

  const download = async (): Promise<void> => {
    setExporting(true);
    try {
      const res = await fetch('/api/ux-v1/p10/export', { credentials: 'include' });
      if (!res.ok) { toast('We could not prepare your file. Try again.'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kpopquiz-${data?.row.username ?? 'data'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Your data file is downloading');
    } catch {
      toast('We could not prepare your file. Try again.');
    } finally {
      setExporting(false);
    }
  };

  if (state === 'loading' || (state === 'ready' && (!form || !data))) {
    return (
      <UxPage width="text" className="p10-settings">
        <header className="ux-ph"><h1>Settings</h1><p>Your profile, passport look, notifications and account.</p></header>
        <p className="p10-loading" role="status">Loading your settings</p>
      </UxPage>
    );
  }
  if (state !== 'ready' || !form || !data) {
    return (
      <UxPage width="text" className="p10-settings">
        <header className="ux-ph"><h1>Settings</h1><p>Your profile, passport look, notifications and account.</p></header>
        <div className="ux-empty">
          <b>{state === 'signed-out' ? 'Sign in to change your settings' : 'We could not load your settings'}</b>
          {state === 'signed-out' ? <Link className="ux-btn ux-btn-primary" href="/login?returnTo=/settings">Sign in</Link> : 'Reload the page to try again.'}
        </div>
      </UxPage>
    );
  }

  const row = data.row;
  const lvl = getLevelInfo(row.xp ?? 0);
  const levelText = `Lv ${lvl.level} ${getTitleForLevel(lvl.level).en}`;
  const name = form.display_name.trim() || form.username;
  const photo = form.avatar_kind === 'preset' ? null : form.avatar_url || null;
  const preset = form.avatar_kind === 'preset' && form.avatar_ref ? AVATAR_PRESETS[form.avatar_ref] : undefined;
  const byslug = new Map(data.groups.map((g) => [g.slug, g]));
  const biasOptions = [...new Set([...members, ...(form.bias && !members.includes(form.bias) ? [form.bias] : [])])];
  const provider = data.provider ? PROVIDER_LABEL[data.provider] ?? data.provider : null;

  const avatar = <UxAvatar name={name} src={photo} size={64} bg={preset?.bg ?? row.avatar_bg} fg={preset?.fg ?? row.avatar_text} />;

  return (
    <UxPage width="text" className="p10-settings">
      <header className="ux-ph"><h1>Settings</h1><p>Your profile, passport look, notifications and account.</p></header>

      {/* ---------- Profile ---------- */}
      <section className="ux-sec" aria-labelledby="p10-s-profile">
        <h2 className="ux-h2" id="p10-s-profile">Profile</h2>
        <div className="p10-photo">
          {avatar}
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => setPhotoOpen(true)} aria-haspopup="dialog">Change photo</button>
        </div>
        <div className="ux-field">
          <label htmlFor="p10-s-name">Display name</label>
          <input className="ux-inp" id="p10-s-name" value={form.display_name} maxLength={40} autoComplete="nickname" onChange={(e) => set('display_name', e.target.value)} />
        </div>
        <div className="ux-field">
          <label htmlFor="p10-s-user">Username <small>kpopquiz.org/u/{form.username || base?.username}</small></label>
          <input className="ux-inp" id="p10-s-user" value={form.username} maxLength={20} autoComplete="username" spellCheck={false} aria-invalid={uStatus === 'invalid' || uStatus === 'taken' ? true : undefined} aria-describedby="p10-s-user-h" onChange={(e) => set('username', e.target.value.toLowerCase())} />
          <p className={uStatus === 'invalid' || uStatus === 'taken' ? 'ux-err' : 'ux-help'} id="p10-s-user-h" role={uStatus === 'invalid' || uStatus === 'taken' ? 'alert' : undefined}>
            {uStatus === 'checking' ? 'Checking' : uStatus === 'available' ? 'Available. Changing it breaks old links to your passport.' : uError || 'Changing it breaks old links to your passport.'}
          </p>
        </div>
        <div className="ux-field">
          <label htmlFor="p10-s-bio">Bio <small className="ux-num">{form.bio.length} / 160</small></label>
          <textarea className="ux-inp" id="p10-s-bio" value={form.bio} maxLength={160} rows={3} onChange={(e) => set('bio', e.target.value)} />
        </div>
      </section>

      {/* ---------- Fandom ---------- */}
      <section className="ux-sec" aria-labelledby="p10-s-fandom">
        <h2 className="ux-h2" id="p10-s-fandom">Fandom</h2>
        <p className="p10-lead">Your main group decides which fandom your points go to in the fandom war.</p>
        <div className="ux-chips p10-fandom" role="group" aria-label="Your groups">
          {form.ult_groups.map((slug, i) => {
            const g = byslug.get(slug);
            const gname = g?.name ?? slug;
            const bg = cssUrl(groupPhotoUrl(slug));
            return (
              <span key={slug} className="p10-gchip">
                <span className="ux-gav" aria-hidden="true" style={bg ? { backgroundImage: bg } : undefined}>{bg ? null : gname.slice(0, 1)}</span>
                {gname}{i === 0 ? ' · main' : ''}
                <button type="button" className="p10-gchip-x" aria-label={`Remove ${gname}`} onClick={() => set('ult_groups', form.ult_groups.filter((s) => s !== slug))}><Icon name="x" size="sm" /></button>
              </span>
            );
          })}
          {form.ult_groups.length < ULT_MAX ? (
            <button type="button" className="ux-chip" onClick={() => setGroupOpen(true)} aria-haspopup="dialog"><Icon name="plus" size="sm" />Add a group</button>
          ) : null}
        </div>
        <p className="ux-help">Up to {ULT_MAX} groups. The first one is your main group.</p>
        <div className="ux-field">
          <label htmlFor="p10-s-stan">Stan since <small>Optional</small></label>
          <select className="ux-inp p10-select" id="p10-s-stan" value={form.stan_since} onChange={(e) => set('stan_since', e.target.value)}>
            <option value="">Not set</option>
            {Array.from({ length: new Date().getFullYear() - 1991 }, (_, k) => new Date().getFullYear() - k).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </section>

      {/* ---------- Your look ---------- */}
      <section className="ux-sec" id="look" aria-labelledby="p10-s-look">
        <h2 className="ux-h2" id="p10-s-look">Your look</h2>
        <p className="p10-lead">How your name shows on your passport and next to everything you post, comment or score.</p>
        <div className="ux-personprev p10-personprev" aria-live="polite">
          <UxAvatar name={name} src={photo} size={40} bg={preset?.bg ?? row.avatar_bg} fg={preset?.fg ?? row.avatar_text} />
          <span>
            <PersonName name={name} accent={form.name_accent} font={form.name_font} bias={form.bias} />
            <span className="p10-prev-sub">{levelText} · how you appear in Community</span>
          </span>
        </div>

        <div className="ux-field">
          <div className="ux-flabel" id="p10-s-acc">Name colour</div>
          <RadioGroup label="Name colour">
            {NAME_ACCENT_KEYS.map((k) => (
              <Opt key={k} on={form.name_accent === k} onPick={() => set('name_accent', k)}>
                <i className={`p10-dot ${k === 'default' ? 'is-ink' : `ux-acc-${k}`}`} aria-hidden="true" />{NAME_ACCENTS[k]!.label}
              </Opt>
            ))}
          </RadioGroup>
        </div>
        <div className="ux-field">
          <div className="ux-flabel">Name font</div>
          <RadioGroup label="Name font">
            {NAME_FONT_KEYS.map((k) => (
              <Opt key={k} on={form.name_font === k} onPick={() => set('name_font', k)}>
                <span style={{ fontFamily: NAME_FONTS[k]!.family === 'inherit' ? undefined : NAME_FONTS[k]!.family }}>{name} · {NAME_FONTS[k]!.label}</span>
              </Opt>
            ))}
          </RadioGroup>
        </div>
        <div className="ux-field">
          <div className="ux-flabel">Bias tag <small>Up to {BIAS_MAX} characters</small></div>
          <RadioGroup label="Bias tag">
            {biasOptions.map((m) => <Opt key={m} on={form.bias === m} onPick={() => set('bias', m)}>{m}</Opt>)}
            <Opt on={!form.bias} onPick={() => set('bias', '')}>No bias tag</Opt>
          </RadioGroup>
          <form className="ux-urlrow" onSubmit={(e) => {
            e.preventDefault();
            const v = customBias.trim().slice(0, BIAS_MAX);
            if (!v) { document.getElementById('p10-s-bias')?.focus(); return; }
            set('bias', v);
            setCustomBias('');
          }}>
            <label className="ux-sr" htmlFor="p10-s-bias">Custom bias tag</label>
            <input className="ux-inp" id="p10-s-bias" maxLength={BIAS_MAX} placeholder="Or type your own, like 3RACHA" value={customBias} onChange={(e) => setCustomBias(e.target.value)} />
            <button type="submit" className="ux-btn ux-btn-ghost">Use</button>
          </form>
        </div>
        <div className="ux-field">
          <div className="ux-flabel">Passport theme <small>Colours your header and XP bar</small></div>
          <RadioGroup label="Passport theme" className="p10-swatches">
            {PASSPORT_THEME_KEYS.map((k) => (
              <Opt key={k} on={form.profile_theme === k} onPick={() => set('profile_theme', k)} className="p10-sw" style={{ background: PASSPORT_THEMES[k]!.swatch }} label={PASSPORT_THEMES[k]!.label}>{null}</Opt>
            ))}
          </RadioGroup>
        </div>
        <div className="ux-field">
          <div className="ux-flabel">Header picture <small>1500 x 300 works best</small></div>
          <div className="p10-flair-row">
            <HeaderPicker variant="settings" label="Change header picture" />
            <button
              type="button"
              className="ux-btn ux-btn-quiet"
              onClick={async () => {
                const r = await clearHeader();
                if (!r.ok) { toast(r.error); return; }
                announceHeader(null);
                toast('Header uses your theme colour');
              }}
            >
              Use the theme colour
            </button>
          </div>
        </div>
        <div className="ux-field">
          <div className="ux-flabel">Pinned badge <small>Shows next to your name on your passport card</small></div>
          {data.earned.length > 0 ? (
            <RadioGroup label="Pinned badge">
              {data.earned.map((b) => (
                <Opt key={b.id} on={form.pinned_badge_id === b.id} onPick={() => set('pinned_badge_id', b.id)} className={`ux-r-${badgeRarity(b.id)}`}>
                  <BadgeMedal id={b.id} earned size={22} />{b.name}
                </Opt>
              ))}
              <Opt on={!form.pinned_badge_id} onPick={() => set('pinned_badge_id', null)}>No pinned badge</Opt>
            </RadioGroup>
          ) : <p className="ux-help">Earn a badge to pin it here. Your first quiz earns First steps.</p>}
        </div>
      </section>

      {/* ---------- Notifications ---------- */}
      <section className="ux-sec" aria-labelledby="p10-s-notifs">
        <h2 className="ux-h2" id="p10-s-notifs">Notifications</h2>
        <div className="ux-rows p10-srows">
          {NOTIF_ROWS.map((r) => (
            <div className="p10-srow" key={r.key}>
              <span className="p10-srow-g"><b id={`p10-n-${r.key}`}>{r.label}</b><small>{r.sub}</small></span>
              <UxSwitch checked={prefs[r.key] !== false} disabled={!prefsLoaded} label={r.label} onChange={(v) => { setSaveError(null); setPrefs((p) => ({ ...p, [r.key]: v })); }} />
            </div>
          ))}
          {EMAIL_ROWS.map((r) => (
            <div className="p10-srow" key={r.key}>
              <span className="p10-srow-g"><b>{r.label}</b><small>{r.sub}</small><small className="p10-soon">Not available yet: KpopQuiz does not send emails yet.</small></span>
              <UxSwitch checked={false} disabled label={r.label} onChange={() => undefined} />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Appearance ---------- */}
      <section className="ux-sec" aria-labelledby="p10-s-look2">
        <h2 className="ux-h2" id="p10-s-look2">Appearance</h2>
        <Segmented label="Appearance" options={THEME_OPTIONS} value={theme} onChange={(v) => applyTheme(v)} className="p10-apseg" />
        <div className="p10-srow p10-srow-first">
          <span className="p10-srow-g"><b>Sounds in games</b><small>Taps, chimes and the results fanfare</small></span>
          <UxSwitch checked={sound} label="Sounds in games" onChange={(v) => { setSound(v); setSoundEnabled(v); }} />
        </div>
      </section>

      {/* ---------- Account ---------- */}
      <section className="ux-sec" aria-labelledby="p10-s-account">
        <h2 className="ux-h2" id="p10-s-account">Account</h2>
        <div className="ux-rows p10-srows">
          <div className="p10-srow">
            <span className="p10-srow-g"><b>Sign-in method</b><small>{data.provider && data.provider !== 'email' ? `${provider} · email links work too, no password needed` : 'Email link · no password needed'}</small></span>
          </div>
          <div className="p10-srow">
            <span className="p10-srow-g"><b>Download your data</b><small>Your profile, plays, quizzes, badges and comments as a file</small></span>
            <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void download(); }} disabled={exporting} aria-busy={exporting || undefined}>{exporting ? 'Preparing' : 'Download'}</button>
          </div>
          <div className="p10-srow">
            <span className="p10-srow-g"><b>Sign out</b><small>On this device</small></span>
            <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void signOut(); }}>Sign out</button>
          </div>
          <div className="p10-srow">
            <span className="p10-srow-g"><b className="p10-danger">Delete account</b><small>Removes your passport. Your published quizzes stay, credited to a deleted user.</small></span>
            <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm p10-danger" onClick={() => setDeleteOpen(true)} aria-haspopup="dialog">Delete</button>
          </div>
        </div>
      </section>

      {dirty ? (
        <div className="p10-savebar" role="region" aria-label="Unsaved changes">
          <span>{saveError ?? (problems[0] ?? 'You have unsaved changes')}</span>
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={discard} disabled={saving}>Discard</button>
          <button type="button" className="ux-btn ux-btn-primary ux-btn-sm" onClick={() => { void save(); }} disabled={!canSave} aria-busy={saving || undefined}>{saving ? 'Saving' : 'Save changes'}</button>
        </div>
      ) : null}

      <PhotoSheet
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        form={form}
        onPhoto={(url) => { set('avatar_url', url); if (form.avatar_kind === 'preset') { set('avatar_kind', 'photo'); set('avatar_ref', null); } }}
        onPreset={(k) => { set('avatar_kind', 'preset'); set('avatar_ref', k); }}
        onUsePhoto={() => { set('avatar_kind', 'photo'); set('avatar_ref', null); }}
        onRemove={() => { set('avatar_url', ''); }}
      />
      <GroupSheet
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        groups={data.groups}
        picked={form.ult_groups}
        onPick={(slug) => { if (!form.ult_groups.includes(slug) && form.ult_groups.length < ULT_MAX) set('ult_groups', [...form.ult_groups, slug]); setGroupOpen(false); }}
      />
      <ConfirmSheet
        open={deleteOpen}
        title="Delete your account?"
        body={<>Your passport, scores and badges are removed. Your published quizzes stay, credited to a deleted user. We do it by hand for now: send us the request from the contact page and we confirm by email.</>}
        confirmLabel="Go to the contact page"
        cancelLabel="Keep my account"
        onConfirm={() => { setDeleteOpen(false); router.push('/contact'); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </UxPage>
  );
}

function PhotoSheet({ open, onClose, form, onPhoto, onPreset, onUsePhoto, onRemove }: {
  open: boolean; onClose: () => void; form: ProfileForm;
  onPhoto: (url: string) => void; onPreset: (k: string) => void; onUsePhoto: () => void; onRemove: () => void;
}): React.ReactElement | null {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={() => { setErr(null); onClose(); }} title="Profile photo" width={480}>
      <form className="ux-urlrow" onSubmit={(e) => {
        e.preventDefault();
        const v = url.trim();
        if (!/^https:\/\//i.test(v) || v.length > 500) { setErr('Paste a link that starts with https://'); return; }
        setErr(null); onPhoto(v); setUrl(''); onClose();
      }}>
        <label className="ux-sr" htmlFor="p10-photo-url">Photo link</label>
        <input className="ux-inp" id="p10-photo-url" type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={err ? true : undefined} />
        <button className="ux-btn ux-btn-ghost" type="submit">Use</button>
      </form>
      {err ? <p className="ux-err" role="alert">{err}</p> : <p className="ux-help">A direct link to a JPG or PNG. It shows next to your name.</p>}
      <div className="ux-or">or pick a colour</div>
      <div className="p10-flair-row" role="radiogroup" aria-label="Colour avatar" onKeyDown={radioKeys}>
        {AVATAR_PRESET_KEYS.map((k) => {
          const p = AVATAR_PRESETS[k]!;
          const on = form.avatar_kind === 'preset' && form.avatar_ref === k;
          return <button key={k} type="button" role="radio" aria-checked={on} tabIndex={on || (form.avatar_kind !== 'preset' && k === AVATAR_PRESET_KEYS[0]) ? 0 : -1} aria-label={p.label} className="p10-fopt p10-sw" style={{ background: p.bg }} onClick={() => { onPreset(k); onClose(); }} />;
        })}
      </div>
      <div className="ux-sh-right p10-photo-acts">
        {form.avatar_kind === 'preset' && form.avatar_url ? <button type="button" className="ux-btn ux-btn-quiet" onClick={() => { onUsePhoto(); onClose(); }}>Use my photo</button> : null}
        {form.avatar_url ? <button type="button" className="ux-btn ux-btn-quiet" onClick={() => { onRemove(); onClose(); }}>Remove photo</button> : null}
      </div>
    </Sheet>
  );
}

function GroupSheet({ open, onClose, groups, picked, onPick }: {
  open: boolean; onClose: () => void; groups: Array<{ slug: string; name: string }>; picked: string[]; onPick: (slug: string) => void;
}): React.ReactElement | null {
  const [q, setQ] = useState('');
  const list = groups.filter((g) => !picked.includes(g.slug) && g.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);
  return (
    <Sheet open={open} onClose={() => { setQ(''); onClose(); }} title="Add a group" width={480}>
      <label className="ux-sr" htmlFor="p10-group-q">Search groups</label>
      <input className="ux-inp" id="p10-group-q" type="search" placeholder={`Search ${groups.length} groups`} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      {list.length > 0 ? (
        <ul className="p10-glist">
          {list.map((g) => {
            const bg = cssUrl(groupPhotoUrl(g.slug));
            return (
              <li key={g.slug}>
                <button type="button" className="p10-gpick" onClick={() => { setQ(''); onPick(g.slug); }}>
                  <span className="ux-gav" aria-hidden="true" style={bg ? { backgroundImage: bg } : undefined}>{bg ? null : g.name.slice(0, 1)}</span>
                  {g.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="ux-help" role="status">No group matches.</p>}
    </Sheet>
  );
}
