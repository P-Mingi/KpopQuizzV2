import { PartyLanding } from '@/components/party/party-landing';
import { SEO } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: SEO.party.title,
  description: SEO.party.description,
};

export default function PartyPage() {
  return <PartyLanding />;
}
