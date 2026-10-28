'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { safeReturnTo } from '@/lib/auth/return-to';
import { RESERVED_USERNAMES } from '@/lib/constants';

import type { OnboardingWords } from '@/lib/passport-ui/words';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

type ValidationState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'invalid'; message: string }
  | { status: 'taken' }
  | { status: 'available' };

export function OnboardingForm({ words }: { words?: OnboardingWords | undefined }): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  const [username, setUsername] = useState('');
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = username.trim();

    if (trimmed.length === 0) {
      setValidation({ status: 'idle' });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setValidation({ status: 'invalid', message: 'Only lowercase letters, numbers, and underscores' });
      return;
    }

    if (trimmed.length < 3) {
      setValidation({ status: 'invalid', message: 'At least 3 characters' });
      return;
    }

    if (RESERVED_USERNAMES.includes(trimmed as typeof RESERVED_USERNAMES[number])) {
      setValidation({ status: 'invalid', message: 'This username is reserved' });
      return;
    }

    setValidation({ status: 'checking' });

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setValidation({ status: 'invalid', message: 'Could not check availability' });
          return;
        }
        const data: { available: boolean } = await res.json();
        setValidation(data.available ? { status: 'available' } : { status: 'taken' });
      } catch {
        setValidation({ status: 'invalid', message: 'Could not check availability' });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const canSubmit = validation.status === 'available' && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/create-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), ...(words ? { via: (await import('@/lib/passport-ui/signin-client')).readTabVia() } : {}) }),
      });

      if (!res.ok) {
        const data: { error: string } = await res.json();
        setValidation({ status: 'invalid', message: data.error });
        setSubmitting(false);
        return;
      }

      router.push(returnTo);
    } catch {
      setValidation({ status: 'invalid', message: 'Something went wrong' });
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 px-4">
      <div className="bg-primary rounded-lg border border-default p-6">
        <h1 className="text-lg font-medium text-primary">{words ? words.title : 'Pick a username'}</h1>
        <p className="text-sm text-secondary mt-1">
          {words ? words.hint : <>This can&apos;t be changed later.</>}
        </p>

        <div className="mt-4">
          <label htmlFor="username" className="sr-only">Username</label>
          <input
            id="username"
            type="text"
            placeholder={words ? words.placeholder : 'e.g. army_mina'}
            maxLength={20}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full px-4 py-3 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />

          <div className="h-5 mt-1">
            {validation.status === 'idle' && username.length === 0 && (
              <p className="text-xs text-secondary">
                {words ? words.rules : '3-20 characters, lowercase letters, numbers, and underscores only'}
              </p>
            )}
            {validation.status === 'checking' && (
              <p className="text-xs text-secondary">Checking...</p>
            )}
            {validation.status === 'available' && (
              <p className="text-xs text-correct-text">&#10003; Available!</p>
            )}
            {validation.status === 'taken' && (
              <p className="text-xs text-wrong-text">&#10007; {words ? words.taken : 'Already taken'}</p>
            )}
            {validation.status === 'invalid' && (
              <p className="text-xs text-wrong-text">{validation.message}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-4 py-3 rounded-full bg-btn text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            words ? words.cta : 'Claim username'
          )}
        </button>
      </div>
    </div>
  );
}
