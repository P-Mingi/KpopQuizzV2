'use client';

import { useState } from 'react';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="pt-5 pb-8">
      <p className="text-xl font-semibold mb-5">Settings</p>

      {/* Sign out */}
      <div className="pt-5 border-t border-default">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-wrong font-medium disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
