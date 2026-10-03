import Link from 'next/link';

import { PersonalityQuiz } from '@/components/personality/quiz';
import { UxPage } from '@/components/ux-v1/page';
import { BRIDGE_PATH } from '@/lib/personality/bridge';
import { getBridgePage, SITE } from '@/lib/personality/server';
import { isUxV12 } from '@/lib/ux-v12';
import { jsonLdScript } from '@/lib/verse/jsonld';

import SlugPage, { generateMetadata as slugMetadata } from '../[slug]/page';

import type { Metadata } from 'next';

// V12 G5 (SYSTEM.md section 4, prototype view `kpdh`): the KPop Demon Hunters
// bridge quiz, "Loved HUNTR/X? Find your real K-pop girl group", on the
// personality engine. Text only: no poster, still, character art or logo.
//
// This path ends with "-quiz", so before this file existed the generated group
// hub route (app/(site)/[slug]/page.tsx) answered it, with a 404 because no group
// has the slug "kpop-demon-hunters". A static folder wins over [slug], so with the
// flag off this file hands the request to that same route, with the same params:
// same metadata, same 404, and the same page if such a group ever exists.
const SLUG_PARAMS = { params: Promise.resolve({ slug: BRIDGE_PATH.slice(1) }) };

// Same cache window as the [slug] route it stands in front of.
export const revalidate = 3600;

const TITLE = 'Loved HUNTR/X? Find your real K-pop girl group';
const DESCRIPTION = 'Six picture-free questions about KPop Demon Hunters and your taste. Your result is a real K-pop girl group, why it fits you, and three songs to start with.';

export async function generateMetadata(): Promise<Metadata> {
  if (!isUxV12()) return slugMetadata(SLUG_PARAMS);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: BRIDGE_PATH },
    openGraph: { title: `${TITLE} | KpopQuiz`, description: DESCRIPTION, url: BRIDGE_PATH, type: 'website' },
  };
}

export default async function BridgeQuizPage(): Promise<React.ReactElement> {
  if (!isUxV12()) return SlugPage(SLUG_PARAMS);
  const { view, playlistHref } = await getBridgePage();

  return (
    <UxPage width="wide" className="ux-pers">
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Blindtest', item: `${SITE}/blindtest` },
          ...(playlistHref ? [{ '@type': 'ListItem', position: 2, name: 'KPop Demon Hunters songs', item: `${SITE}${playlistHref}` }] : []),
          { '@type': 'ListItem', position: playlistHref ? 3 : 2, name: 'Find your girl group' },
        ],
      })}
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/blindtest">Blindtest</Link>
        <span className="ux-pers-sep" aria-hidden="true">/</span>
        {playlistHref ? (
          <>
            <Link href={playlistHref}>KPop Demon Hunters songs</Link>
            <span className="ux-pers-sep" aria-hidden="true">/</span>
          </>
        ) : null}
        <span aria-current="page">Find your girl group</span>
      </nav>
      <div className="ux-pers-body">
        <PersonalityQuiz view={view} />
      </div>
    </UxPage>
  );
}
