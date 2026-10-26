import { deleteHandler } from '../delete-handler';

// Run O1 (ADM back): DELETE /api/admin/images/delete, the same handler as DELETE /api/admin/images.
export const dynamic = 'force-dynamic';
export const DELETE = deleteHandler;
