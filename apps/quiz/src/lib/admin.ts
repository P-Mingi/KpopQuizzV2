export function isAdmin(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) ?? [];
  return adminIds.includes(userId);
}
