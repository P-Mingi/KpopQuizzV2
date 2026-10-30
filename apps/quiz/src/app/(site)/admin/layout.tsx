import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { requireAdmin } from '@/lib/admin/guard';
import { BT_TRACKING } from '@/lib/tracking/bt-shared';
import { isUxV12 } from '@/lib/ux-v12';

// ADMIN-1 (owner, 2026-10-30): the 404 of a refused visitor must say nothing about the admin. A notFound() thrown by a page renders
// inside this layout, so this layout answers first: its nav and its title exist only for a listed admin whose session the auth server
// verifies (the nav only at aal2); anyone else gets the site's 404 from above this layout. Each page keeps its own requireAdmin:
// a layout is not re-run on a client navigation.
export async function generateMetadata(): Promise<Metadata> {
  const admin = await requireAdmin('check');
  return admin ? { title: 'Admin', robots: { index: false, follow: false } } : { robots: { index: false, follow: false } };
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<React.ReactElement> {
  const admin = await requireAdmin('mfa');
  if (!admin) notFound();
  if (admin.level !== 'pass') return <div className="px-4">{children}</div>;
  return (
    <div
      className="relative px-4"
      style={{
        width: 'min(1024px, calc(100vw - 32px))',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <nav className="flex items-center gap-4 py-3 border-b border-default mb-4 text-sm overflow-x-auto">
        <Link href="/admin" className="font-medium text-primary hover:text-accent-hover whitespace-nowrap">Dashboard</Link>
        <Link href="/admin/quiz-bank" className="text-secondary hover:text-primary whitespace-nowrap">Quiz Bank</Link>
        <Link href="/admin/quiz/search" className="text-secondary hover:text-primary whitespace-nowrap">Edit Quizzes</Link>
        <Link href="/admin/ai-visibility" className="text-secondary hover:text-primary whitespace-nowrap">AI Visibility</Link>
        <Link href="/admin/pulse" className="text-secondary hover:text-primary whitespace-nowrap">Pulse</Link>
        <Link href="/admin/industry" className="text-secondary hover:text-primary whitespace-nowrap">Industry</Link>
        <Link href="/admin/verse" className="text-secondary hover:text-primary whitespace-nowrap">Verse</Link>
        <Link href="/admin/verse/entities" className="text-secondary hover:text-primary whitespace-nowrap">Entities</Link>
        <Link href="/admin/verse/quality" className="text-secondary hover:text-primary whitespace-nowrap">Quality</Link>
        <Link href="/admin/verse/suggestions" className="text-secondary hover:text-primary whitespace-nowrap">Suggestions</Link>
        {/* V12 (G1 R6): each link follows the switch of the page it opens; both off = v11 nav. */}
        {BT_TRACKING && <Link href="/admin/blind-tests/runs" className="text-secondary hover:text-primary whitespace-nowrap">Blindtest runs</Link>}
        {isUxV12() && <Link href="/admin/editorial" className="text-secondary hover:text-primary whitespace-nowrap">Editorial</Link>}
        {isUxV12() && <Link href="/admin/community-reports" className="text-secondary hover:text-primary whitespace-nowrap">Reports</Link>}
      </nav>
      {children}
    </div>
  );
}
