'use client';

import { useState } from 'react';

import { SOCIAL_LINKS, discordInviteWithUtm } from '@kpopquiz/shared/social-links';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--txt2)',
  marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--txt1)',
  fontSize: 14,
  fontFamily: 'inherit',
};

export function DmComposer(): React.ReactElement {
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const titleLen = title.trim().length;
  const bodyLen = body.length;
  const canSend = username.trim().length >= 2 && titleLen >= 2 && titleLen <= 80 && bodyLen <= 500;

  function applyDiscordTemplate(): void {
    setTitle('Thanks for creating a quiz!');
    setBody(
      `Hey ${username.trim() ? '@' + username.trim() : 'fan'}, thanks for sharing your quiz with the community. ` +
        `We'd love to have you in the Discord - other creators hang out there and we drop early features for them first.`,
    );
    setLinkUrl(discordInviteWithUtm('admin-dm'));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSend || status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: username.trim(),
          title: title.trim(),
          body: body.trim() || null,
          link_url: linkUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? `Failed (${res.status})` });
        return;
      }
      setStatus({ kind: 'ok', message: `Sent to @${data.recipient?.username ?? username}` });
      setTitle('');
      setBody('');
      setLinkUrl('');
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message ?? 'Network error' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label htmlFor="dm-username" style={fieldLabel}>Recipient username</label>
        <input
          id="dm-username"
          type="text"
          placeholder="e.g. drunken_spillz"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          style={fieldInput}
        />
      </div>

      <div>
        <label htmlFor="dm-title" style={fieldLabel}>Title <span style={{ color: 'var(--txt3)', fontWeight: 500 }}>{titleLen}/80</span></label>
        <input
          id="dm-title"
          type="text"
          placeholder="e.g. Thanks for creating a quiz!"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          style={fieldInput}
        />
      </div>

      <div>
        <label htmlFor="dm-body" style={fieldLabel}>Body <span style={{ color: 'var(--txt3)', fontWeight: 500 }}>{bodyLen}/500</span></label>
        <textarea
          id="dm-body"
          placeholder="Optional. Personalised note - keep it short."
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          rows={5}
          style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label htmlFor="dm-link" style={fieldLabel}>Click-through URL (optional)</label>
        <input
          id="dm-link"
          type="text"
          placeholder="https://discord.gg/... or /q/some-quiz"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          style={fieldInput}
        />
        <p style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 6, lineHeight: 1.4 }}>
          External URLs open in a new tab. Internal paths (e.g. <code>/q/slug</code>) use in-app routing.
        </p>
      </div>

      <button
        type="button"
        onClick={applyDiscordTemplate}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: 'transparent',
          color: 'var(--brand)',
          border: '1px dashed color-mix(in srgb, var(--brand) 50%, var(--border))',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Use the &ldquo;Thanks &amp; join {SOCIAL_LINKS.discord.name}&rdquo; template
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <button
          type="submit"
          disabled={!canSend || status.kind === 'sending'}
          style={{
            padding: '11px 22px',
            borderRadius: 100,
            background: canSend && status.kind !== 'sending'
              ? 'color-mix(in srgb, var(--brand) 40%, var(--brand-dark))'
              : 'var(--surface-alt)',
            color: canSend && status.kind !== 'sending' ? '#fff' : 'var(--txt3)',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: canSend && status.kind !== 'sending' ? 'pointer' : 'default',
            transition: 'background 120ms ease',
          }}
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send notification'}
        </button>

        {status.kind === 'ok' && (
          <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
            ✓ {status.message}
          </span>
        )}
        {status.kind === 'error' && (
          <span style={{ fontSize: 13, color: '#c2410c', fontWeight: 600 }}>
            ✗ {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
