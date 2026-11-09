// Team (editorial) accounts never like, reply, vote or comment as fans (owner rule, audit 04 section 5; SYSTEM.md 5.6). One answer for
// every fan-action route: 403 editorial_account. With the editorial flag off, or before the editorial SQL, nobody is a Team account
// (isEditorialUser answers false), so every route answers exactly as before.
import { NextResponse } from 'next/server';

import { isEditorialUser } from './accounts';

export async function teamRefusal(userId: string | null | undefined): Promise<NextResponse | null> {
  if (!userId) return null;
  return (await isEditorialUser(userId)) ? NextResponse.json({ error: 'editorial_account' }, { status: 403 }) : null;
}
