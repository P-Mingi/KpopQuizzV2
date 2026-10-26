import { notFoundHandler } from '@/lib/entity-images/route-kit';
import { deleteHandler } from './delete-handler';

// Run O1 (ADM back): DELETE /api/admin/images, json { kind, slug }. See delete-handler.ts.
export const dynamic = 'force-dynamic';
export const DELETE = deleteHandler;

// Every other method answers 404, not Next's 405.
export const GET = notFoundHandler;
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
