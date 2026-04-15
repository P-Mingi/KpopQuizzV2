import { PartyLanding } from '@/components/party/party-landing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Party Mode - Play with Friends | K-pop Blindtest',
};

export default function PartyPage() {
  return <PartyLanding />;
}
