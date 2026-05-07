'use client';

import { useState, useRef, useEffect } from 'react';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';
import type { BattleChatMessage, BattlePlayer } from '@/lib/db/types';

interface ChatPanelProps {
  messages: BattleChatMessage[];
  players: BattlePlayer[];
  onSend: (message: string) => Promise<void>;
}

function ChatIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h12v8H8l-3 3v-3H3V4z" />
    </svg>
  );
}

export function ChatPanel({ messages, players, onSend }: ChatPanelProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  const getPlayerName = (playerId: string): { name: string; color: string } => {
    const p = players.find(pl => pl.id === playerId);
    return { name: p?.display_name ?? 'Unknown', color: p?.avatar_color ?? C.pink };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    await onSend(text);
    setSending(false);
  };

  // Closed state: narrow sidebar
  if (!open) {
    return (
      <div style={{
        width: 44, flexShrink: 0,
        background: C.chatBg, borderLeft: `1px solid ${C.chatBorder}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '12px 0',
      }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff', border: `1px solid ${C.chatBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.pink, cursor: 'pointer', position: 'relative',
          }}
          aria-label="Open chat"
        >
          <ChatIcon />
          {messages.length > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: C.pink, color: '#fff',
              fontSize: 8, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Math.min(messages.length, 9)}
            </span>
          )}
        </button>
        <span style={{
          fontSize: 8, color: C.textMuted,
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          marginTop: 4, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Open chat
        </span>
      </div>
    );
  }

  // Open state: full chat panel
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 280, flexShrink: 0,
      background: C.chatBg, borderLeft: `1px solid ${C.chatBorder}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 44,
        background: '#fff', borderBottom: `1px solid ${C.chatBorder}`,
        padding: '0 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ color: C.pink }}><ChatIcon /></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>Chat</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: C.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
          aria-label="Close chat"
        >
          &#10005;
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 24 }}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map(msg => {
          const { name, color } = getPlayerName(msg.player_id);
          return (
            <div key={msg.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>{name}</span>
              </div>
              <div style={{ fontSize: 11, color: C.textDark }}>{msg.message}</div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{
        padding: 8, borderTop: `1px solid ${C.chatBorder}`,
        background: '#fff',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            maxLength={500}
            placeholder="Message..."
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 8,
              background: C.bg, border: `1px solid ${C.borderLight}`,
              fontSize: 11, outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              padding: '6px 10px', borderRadius: 8,
              background: C.pink, color: '#fff', border: 'none',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              opacity: input.trim() && !sending ? 1 : 0.5,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
