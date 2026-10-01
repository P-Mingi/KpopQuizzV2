// UX v1 feature flag (data-safety contract rule 7). The whole redesign ships
// dark: the shell and every new page render only when this is on, so the flag -
// not a revert - is the rollback. NEXT_PUBLIC_* is inlined at build time, so this
// reads the same value on the server and the client. Default OFF (unset / '0').
//
// Enable per environment in Vercel (or `.env.local` for dev):
//   NEXT_PUBLIC_UX_V1=1
export const UX_V1: boolean =
  process.env.NEXT_PUBLIC_UX_V1 === '1' || process.env.NEXT_PUBLIC_UX_V1 === 'true';
