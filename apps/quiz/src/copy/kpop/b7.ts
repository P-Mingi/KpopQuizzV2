// Run O1, lot (e), lane B7 (owner decision of 2026-10-24): the words of Settings > "Delete account" on kpopquiz.org when
// NEXT_PUBLIC_NET_DELETION is on (copy-keys.md 3, namespace kpop.b7). With the flag off the settings screen keeps its own text
// (by hand, contact page, 30 days). Placeholders {username} and {date} are filled by lib/passport-ui/fmt.
export const COPY = {
  'delete.rowHint': 'Removes your passport after 7 days. Your published quizzes stay, credited to a deleted user, unless you ask us to delete them.',
  'delete.title': 'Delete your account?',
  'delete.body': 'Your passport, scores and badges are removed after 7 days. You will be signed out everywhere and we email you the date. Sign in before then and you can cancel.',
  'delete.confirm': 'Delete my account',
  'delete.keep': 'Keep my account',
  'delete.typeLabel': 'Type @{username} to confirm',
  'delete.removeQuizzes': 'Also remove my published quizzes',
  'delete.removeQuizzesHint': 'Off: your quizzes stay, credited to a deleted user.',
  'delete.working': 'Scheduling',
  'delete.scheduledToast': 'Deletion scheduled. Check your email for the date.',
  'delete.errConfirm': 'That is not your username. Type it with the @ in front.',
  'delete.errReauth': 'For your security, sign in again first. Then come back here to delete your account.',
  'delete.reauthButton': 'Sign in again',
  'delete.errServer': 'We could not schedule the deletion. Try again.',
  'delete.pendingHint': 'Deletion scheduled for {date}. Cancel before then and nothing is deleted.',
  'delete.cancel': 'Cancel deletion',
  'delete.cancelledToast': 'Deletion cancelled. Your account stays.',
  'delete.cancelError': 'We could not cancel the deletion. Try again.',
} as const satisfies Readonly<Record<string, string>>;
