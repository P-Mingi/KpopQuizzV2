import { deleteHandler } from './delete-handler';

// Run O1 (ADM back): DELETE /api/admin/images, json { kind, slug }. See delete-handler.ts.
export const dynamic = 'force-dynamic';
export const DELETE = deleteHandler;
