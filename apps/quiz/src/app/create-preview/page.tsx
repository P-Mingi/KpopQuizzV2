import { CreateFunnelPreview } from '@/components/create-preview/create-funnel-preview';

import type { Metadata } from 'next';

// Step H prototype - not indexed, internal sign-off only.
export const metadata: Metadata = {
  title: 'Creation funnel prototype',
  robots: { index: false, follow: false },
};

export default function CreatePreviewPage(): React.ReactElement {
  return <CreateFunnelPreview />;
}
