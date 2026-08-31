import { permanentRedirect } from 'next/navigation';

export default async function BlindTestModeRedirect({
  params,
}: {
  params: Promise<{ mode: string }>;
}): Promise<never> {
  const { mode } = await params;
  permanentRedirect(`/blindtest/${mode}`);
}
