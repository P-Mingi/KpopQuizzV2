// ADMIN-1 review: every path under /api/admin that no route serves gets the same 404 JSON as a refused request to a real route, for every
// method, so an unknown path cannot be told from a real one (Next would answer its HTML 404 here).
import { adminNotFound } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

export const GET = adminNotFound;
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
