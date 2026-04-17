import { ModeSelect } from '@/components/modes/mode-select';
import { SEO } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: SEO.modes.title,
  description: SEO.modes.description,
};

export default function ModesPage() {
  return <ModeSelect />;
}
