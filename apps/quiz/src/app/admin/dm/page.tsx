import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { DmComposer } from './dm-composer';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin DM | KpopQuiz',
  robots: { index: false, follow: false },
};

export default async function AdminDmPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 6 }}>
        Admin
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
        Send a direct notification
      </h1>
      <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.55, margin: '8px 0 28px' }}>
        Posts a notification to a single user. They&rsquo;ll see it in their profile
        notifications strip; click-through opens the link you set.
      </p>
      <DmComposer />
    </div>
  );
}
