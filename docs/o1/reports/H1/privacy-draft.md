# Network privacy text, draft

Lane H1, lot (d), part g. Draft for the owner to validate; it is not wired as final. The text of every section is the text of the keys `privacy.*` of `apps/quiz/src/copy/hub/h1.ts` (a unit test checks they match word for word), shown here with the registry names filled in. Facts come from the code and `docs/o1/contracts/cookies.md`. Each line starting with "OWNER:" is a point the owner must decide or confirm; those lines are not part of the page text.

## Page: fanquiz.org/privacy

Page title: Privacy Policy

Page description: FanQuiz privacy policy, draft: who runs the network, what one account shares between the sites, what each site keeps, the cookies used, and how to delete your data.

Banner: Draft for the owner to validate. This is not the final privacy policy.

# Privacy

Draft of 21 October 2026.

What FanQuiz and its sites do with your data, in plain English.

OWNER: the date line and the page title. The page is noindex while it is a draft; say when it becomes indexable and goes in the sitemap.

### Who runs this

FanQuiz (fanquiz.org) is the home of one account shared by the fan quiz sites: an idol quiz site, an anime quiz site and this one. They are separate websites run by the same owner.

You make your account once and use it on any of the sites.

OWNER: who is the data controller (name or company, country, postal address if the law of your country asks for one). The code names no legal entity.

OWNER: the three sites are run by the same owner; confirm that sentence. The page names the other two sites only by kind (an idol quiz site, an anime quiz site) because the existing test anime-copy.site.test.ts forbids the K-pop site name on the hub privacy page and the copy test forbids the word K-pop in h1.ts. If you want the three names on the page, that test and the voice test of network-page.test.ts must change first. The named version is the passport notice below: KpopQuiz (kpopquiz.org), OtakuQuiz (otakuquiz.org) and FanQuiz (fanquiz.org).

### What your account holds

You sign in with Google or with a link sent to your email. We receive your email address and, from Google, your display name and a link to your avatar. We never receive your Google password.

On the idol quiz site you can also sign in with Discord.

Your email address is kept by the sign-in system and is never shown to other fans.

OWNER: confirm the sign-in methods at launch. The registry says Google and an email link on OtakuQuiz and FanQuiz, and Google, Discord and an email link on KpopQuiz (V2-11: no Discord on OtakuQuiz at launch).

### What one account shares between the sites

Other sites see only what the block below lists. Nothing else about you moves from one site to another.

[Block "What your passport shares", the same block as the network page:]

- Other sites can see: Your username; Your avatar; Your level, only if you make it public; The sites you joined
- Other sites never see: Your email address; How you sign in; Your private history

Your level and the sites you joined are shown to other fans only if you choose to show them. Your quiz history stays on the site where you played.

When you move from one site to another while signed in, your browser carries a ticket that lasts 10 minutes and names no one, then the second site swaps a one time code, valid for 60 seconds, for a session. We log each move (the two sites, the result, a hashed IP address and your browser family) and delete the log after 90 days.

OWNER: the block above (shared with the network page, not changed here) says "The sites you joined" without a condition. In the database a stamp is shown elsewhere only when `show_elsewhere` is true, and it defaults to false (schema.sql, world_memberships). The paragraph after the block says "only if you choose"; decide whether the block line should say it too. That is a change to the home block and to the owner copy keys, so it is not made here.

OWNER: the ticket (10 minutes), the code (60 seconds), the 90 day log and the hashed IP address are the values of cookies.md and defaults.md; confirm they may be published as they are. The jump itself is behind the flag PASSPORT_JUMP, off by default: publish this paragraph only when the jump is on.

### What each site keeps for itself

Each site keeps its own record of you, and it is not copied to the other sites:

- Your points, level, streaks and play counts on that site
- The quizzes you create there, with their plays and likes
- Your answers and history on that site
- The profile details you set on that site, such as bio, header image and favourite pick
- When you joined and when you were last seen there, which only you can see

OWNER: on KpopQuiz the bio, header and favourite groups stay on the shared profile (profiles table), not on the site membership; on OtakuQuiz they are per site. Confirm "keeps for itself" is fine for KpopQuiz, or say that KpopQuiz profile data is the account profile.

### Cookies and local storage

The sites use only what they need to run. We use no advertising cookies, no tracking cookies and no third party analytics cookies.

- sb-<project ref>-auth-token (and its numbered parts): keeps you signed in. Each site sets its own, on its own domain.
- __Host-pp_tx: set for at most 5 minutes while you move from one site to another, then cleared. Over plain http on a local test host it is called pp_tx.
- nq_anon: a random guest id, so that a quiz you played before signing in can be added to your account.
- kq_sl: only on the idol quiz site, remembers the share link you came from.
- preferred_locale: only on the idol quiz site, your language choice.
- verse_nav: only on the idol quiz site, your choice of navigation in the Verse.
- world: only on the idol quiz site, your choice between Play and Verse. It has nothing to do with the other sites.
- theme (local storage): light, dark or system. Each site keeps its own.
- fq.net.caps.v1 (local storage): how often a link to another site was shown, and which ones you dismissed. It stays in your browser.
- fq.net.via (session storage): for this tab only, the site link you came from. It is removed after you sign in.
- anime.spoiler.v1 (local storage): only on the anime quiz site, your spoiler setting for each series.

OWNER: confirm there is no analytics or advertising of any kind on the three sites (the line is carried over from the kpopquiz.org policy, which says the same). Add the provider here if there is one.

OWNER: the purposes of `kq_sl`, `verse_nav` and `world` are written from the code comments and the names in cookies.md section 6; check the wording. `nq_anon` is set when a guest plays (an httpOnly cookie); the hub itself has no guest play, so say if you want the list split per site.

OWNER: cookies.md says no cookie is added on kpopquiz.org outside /auth/ responses; if a cookie is added later, this list changes.

### Services we use

We use these services to run the sites:

- Supabase: the database and the sign-in, where your account and quiz data are stored
- Vercel: hosting
- Google: sign-in, if you choose it
- Resend: sending the sign-in emails

We do not sell your data.

OWNER: Resend is named because the code carries the secret names RESEND_API_KEY and SEND_EMAIL_HOOK_SECRET (flags-env.md); confirm it is the provider at launch. Name the Supabase region if you want to.

### Leaving a site and deleting your passport

You can leave any site other than the idol quiz site. Its record of you is removed, and your account and your other sites stay. You cannot leave your last site.

You can delete your whole passport. You type your @username to confirm, and you must have signed in within the last 10 minutes. You are signed out everywhere and we send you a short email. Your data is deleted after 7 days, and you can cancel before then.

The quizzes you published are kept under "deleted user" unless you choose to remove them too.

OWNER: the 7 day grace period and "published quizzes kept under deleted user by default" are V2-08 (confirmed at G0); the fresh sign-in of 10 minutes is PASSPORT_SECONDS.freshSignIn; G16 may still change them. The text says quizzes are removed on request: confirm that is what the option "remove" does.

OWNER: leaving KpopQuiz is not offered (apis.md 3.6 allows a world site other than kpop only). Decide whether the text should say how to delete a KpopQuiz-only account (the whole passport) and where that screen is, once the settings page of the hub exists.

### Your rights

You can ask to see, correct or delete your data at any time. Write to contact@fanquiz.org; we answer within 30 days.

OWNER: the 30 days are carried over from the kpopquiz.org policy. Which rights to list (access, correction, deletion, objection, portability) depends on where you are established.

### Children

The sites are not for children under 13. If you are under 13, please do not create an account. If we learn that we hold data from a child under 13, we delete it.

OWNER: the age of 13 is carried over from the kpopquiz.org policy; it depends on your country.

### Contact

Questions about privacy, or a request about your data: contact@fanquiz.org.

OWNER: the mailbox. The kpopquiz.org policy prints contact@ its own domain; the registry has no email for the hub (placeholder "seo.organization.email (owner)"). Create contact@fanquiz.org or give another address.

## Short passport notice for the 3 sites

Five lines, for the sign-in sheet or the first visit of a site. Keys `privacy.notice.l1` to `l5`.

- Your account is one passport for KpopQuiz (kpopquiz.org), OtakuQuiz (otakuquiz.org) and FanQuiz (fanquiz.org).
- Other sites see your username and your avatar. They see your level and the sites you joined only if you choose to show them.
- They never see your email address, how you sign in or your private history.
- Each site keeps its own points, quizzes and history.
- The full text is at fanquiz.org/privacy.

OWNER: where the notice is shown (sign-in sheet, first visit, settings) and whether it needs an "OK" the first time. It is not wired anywhere in this lot.

## Not decided by the code

OWNER: retention of play records and of the 90 day handoff log beyond what is written here; data export (a "download my data" key exists in the copy contract, `hub.h1 data.download`, but no route does it in this run); the effective date; the governing law; a changes clause.
