# Send Email Hook: deploy, enable, disable (lot e, lane B7)

The Edge Function `supabase/functions/send-email` renders every Supabase Auth email. The run never deploys it, never enables the
hook and never touches a Supabase project setting: this note is for the owner. Nothing here is needed while the hook stays off
(Supabase then sends its own mail, as today, to every site).

## What it does

- The site comes from the email's redirect URL, longest site URL first (`https://bunnyverse.org/anime` is OtakuQuiz, `https://bunnyverse.org` is Bunnyverse, anything else is `kpopquiz.org`; Bunnyverse, 2026-10-28).
- bunnyverse.org/anime and bunnyverse.org: branded mail (copy keys `anime.b7.email.*` and `hub.b7.email.*`), the link goes to the site's own
  `/auth/confirm?token_hash=...&type=...&next=...` (under `/anime` for OtakuQuiz). Since 2026-10-28 bunnyverse.org offers no email sign-in
  (Google and Discord only) and `/auth/confirm` is off in production, so in practice only kpopquiz.org mail goes through the hook. Types sent: magic link, signup, email change, reauthentication code. Recovery and
  invite are not sent by these two sites (400).
- kpopquiz.org: the text Supabase Auth sends today (its default templates), with the usual Supabase verify link, byte for byte.
- The hub's "your passport will be deleted" notice is not sent by the hook: the hub's `/api/passport/delete` posts it to Resend itself.

## Before you enable it (all on the branch project first: o1-dev, then production)

1. In the dashboard, Authentication > Email Templates, compare each template with `TODAY` in
   `apps/quiz/src/lib/passport/email/render.test.ts` (subjects and bodies). The function assumes the Supabase defaults. If you ever
   customised one, paste the customised text into `renderKpop` in `render.ts` (and the byte copy in the function folder, then the test)
   BEFORE enabling: the hook replaces the mailer for all three sites, kpopquiz.org included.
2. Authentication > SMTP / sender: note the address kpopquiz.org mail comes from today and verify kpopquiz.org and bunnyverse.org in Resend.
3. Secrets of the function (Edge Functions > Secrets): `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET` (the `v1,whsec_...` value the
   dashboard shows when you create the hook), `SEND_EMAIL_FROM_KPOP` (required: the function refuses kpop mail without it, so a
   missing sender never sends from a wrong address), optional `SEND_EMAIL_FROM_ANIME`, `SEND_EMAIL_FROM_HUB` (default
   `OtakuQuiz <no-reply@bunnyverse.org>` and `Bunnyverse <no-reply@bunnyverse.org>`). On a staging project only: `SEND_EMAIL_ORIGINS`
   (`anime=<origin>,hub=<origin>`, bare origins, same syntax as `NEXT_PUBLIC_NET_ORIGINS`; the anime `/anime` folder comes from the code).
4. Add `RESEND_API_KEY` (and optionally `SEND_EMAIL_FROM_HUB`) to the hub's Vercel project for the deletion notice; without them the
   notice is skipped and the deletion still goes ahead.
5. Authentication > URL configuration: the two exact bunnyverse.org callbacks must be allowed (docs/launch/o1/AUTH-BUNNYVERSE.md), or Supabase rejects the redirect.

## Enable

1. Deploy: `supabase functions deploy send-email --no-verify-jwt` (the hook is authenticated by its Standard Webhooks signature, not a JWT).
2. Authentication > Hooks > Send Email: type HTTPS or Supabase Function, pick `send-email`, generate the secret, paste it as
   `SEND_EMAIL_HOOK_SECRET`, save.
3. Test on o1-dev, one site at a time: a magic link from kpopquiz (bunnyverse.org offers no email sign-in); a signup; an email change (check which
   address gets which link: the function sends a change with two tokens to both addresses, with one token to the new address);
   a reauthentication code. Compare the kpopquiz mail with the one from before.

## Disable (back to today, at once)

1. Authentication > Hooks > Send Email: switch the hook off (or delete it). Supabase sends its own templates again, for all sites.
2. Nothing else needs undoing: the function can stay deployed, unused.

## Files

`index.ts` (Deno.serve and the Resend call), `render.ts` (a byte copy of `apps/quiz/src/lib/passport/email/render.ts`; the unit test fails
when they differ), `brands.ts` (mirror of the registry; tested), `copy/anime.ts` and `copy/hub.ts` (the same keys as
`apps/quiz/src/copy/<site>/b7.ts`; tested).
