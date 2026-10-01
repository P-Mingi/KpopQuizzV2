'use client';

import dynamic from 'next/dynamic';

import type { UxClientShellProps } from './ux-client-shell';

// The only piece of the v11 shell in the (site) layout's eager bundle: a few
// bytes. The shell itself is a separate chunk, server-rendered and preloaded
// only where it renders (flag on); flag-off pages never download it.
const UxClientShell = dynamic(() => import('./ux-client-shell').then((m) => m.UxClientShell));

export function UxShellLoader(props: UxClientShellProps): React.ReactElement {
  return <UxClientShell {...props} />;
}
