# community

A private board for a community of practice: members post ideas, support them and comment; facilitators move them through a roadmap and publish updates. Made from `veryrobert/starter`, with Supabase for sign-in and data.

## Try it first, without Supabase

```
npm install
npm run demo
```

That opens the real app on sample data held in the browser. Every code is 123456; sign in as you@example.ie for a facilitator, or any other email to see a new member's first sign-in. Nothing is saved.

## Set up

1. **Supabase.** Create a project in the EU (Ireland) region. In the SQL editor, run `supabase/schema.sql`. Change the email on the last line of `supabase/seed.sql` to yours and run it.
2. **Sign-in.** In Supabase, Authentication:
   - **URL Configuration:** Site URL is the app's address. Redirect URLs: exactly that address and `http://localhost:5173`, nothing wildcarded.
   - **Email template "Magic Link":** include `{{ .Token }}` so the email carries the 6-digit code the app asks for. Under Email provider settings, set the OTP expiry to 600 seconds.
   - **SMTP:** use Resend (Settings > Auth > SMTP). The built-in sender is rate-limited and not meant for real use.
   - **GitHub:** create a GitHub OAuth app (GitHub > Settings > Developer settings > OAuth Apps). Homepage URL is the app's address; callback URL is the one Supabase shows under Providers > GitHub. Paste the client ID and secret into that provider and enable it.
   - **Multi-Factor:** under Auth > Multi-Factor, keep App Authenticator (TOTP) enabled.
   - Leave sign-ups on. The invite check in the database refuses anyone not invited, by email code or GitHub.
   - **CAPTCHA (Cloudflare Turnstile, free):** in Cloudflare, add a Turnstile widget for the app's domain (mode Managed). Put the site key in the repo variable `VITE_TURNSTILE_SITE_KEY` and deploy. Only then, in Supabase Auth > Attack Protection, enable CAPTCHA with Turnstile and paste the secret key. In that order: switching it on in Supabase before the site sends tokens stops every email sign-in.
3. **Local.** Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings > API). Then `npm run dev` and open http://localhost:5173.
4. **GitHub.** New repo, push. In Settings > Secrets and variables > Actions > Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Pages > Source: GitHub Actions. For a subdomain, add `public/CNAME` and a DNS CNAME pointing at `veryrobert.github.io`.
5. **Email notifications** (optional). Create a Resend account and verify a sending domain. Then, with the Supabase CLI:
   ```
   supabase secrets set RESEND_API_KEY=... NOTIFY_FROM="community <hello@yourdomain>" SITE_URL=https://your.site WEBHOOK_SECRET=any-long-random-string
   supabase functions deploy notify --no-verify-jwt
   supabase functions deploy reset-2fa
   ```
   In Database > Webhooks, add one: table `outbox`, event Insert, type Supabase Edge Functions, function `notify`, with an HTTP header `x-webhook-secret` set to the same random string. Without this step everything works except the emails.
6. Sign in with your email, then check the About text and invite people in Admin. The `reset-2fa` function (deployed in step 5, needing no Resend) lets facilitators remove a member's authenticator if they lose their phone; deploy it even if you skip email.

## Security

- **Invite only.** A trigger on `auth.users` refuses any new account whose email isn't in `invites`, whichever way they sign in. GitHub sign-in uses the GitHub account's primary verified email, so it has to match the invite.
- **Two-factor, optional.** The emailed code (or GitHub) is enough to sign in. Anyone can add an authenticator app (TOTP) in Settings; from then on every session must also pass its code. The real rule is in the database: every table has a restrictive policy (`two_factor_ok` in `schema.sql`) that refuses a session which skipped the authenticator of someone who has one, whatever the app does.
- **Recovery.** Members can add a backup authenticator in Settings, or remove theirs. A facilitator can remove a member's authenticators (`reset-2fa`), after which they sign in with the email code alone.
- **No passwords.** Sign-in is a one-time email code (10-minute expiry) or GitHub, so there's no password to reuse, leak or phish.
- **CAPTCHA.** Cloudflare Turnstile on the email step, checked by Supabase, so bots can't use the sign-in form to send codes. Invisible unless Cloudflare wants a person to tick a box. GitHub sign-in has GitHub's own protection.
- **Time limits.** A sign-in lasts 30 days on a device; then it's sign in again. The database enforces this from the sign-in times in the session's token (`signed_in_recently` in `schema.sql`), so it holds without Supabase Pro and whatever the app does. The number is `SESSION_DAYS` at the top of `src/lib/auth.ts`, and in `schema.sql`.
- **Sessions.** Settings has Sign out of all devices. Supabase rotates refresh tokens and revokes a session when a used one is replayed.
- **The page.** The build adds a Content Security Policy (scripts only from the site, network only to this Supabase project) and refuses to run inside another site's frame. Markdown renders without HTML. The anon key in the page is public by design; the service key exists only inside the Edge Functions.
- **On Supabase Pro.** Its own time-box setting can be set to match, which ends sessions on Supabase's side too, not only by refusing data.

## How it works

- **Invites.** People ask to join from How to join (linked from sign-in), or a facilitator adds their email in Admin › People. Either way they're emailed an invitation with the site's address and how to sign in (needs the `notify` function from step 5). They sign in with GitHub or an emailed code, set up an authenticator, and give their name.
- **Roles.** Members post, support, comment and like, and edit or delete their own ideas and comments. Facilitators also change statuses with a note, mark duplicates, hide comments, publish updates, run Admin, invite people and change roles. Row level security and triggers in `schema.sql` enforce this; the interface only hides what you can't do.
- **The board.** Ordered Top (most support) by default, or Newest, Updated or Most comments; filtered by status, tags and Following (ideas you posted, supported or commented on). Search opens from the top bar.
- **Tags.** One shared list kept by facilitators in Admin, at most 20. Members tag their ideas from it, up to 3 each, and can't create tags. Names are tidied and unique regardless of case; the database enforces all three limits.
- **Statuses.** Suggested, Under review, Planned, In progress, Done, plus On hold, Not proceeding and Duplicate. The roadmap shows the middle four; facilitators drag cards between them (press and hold on phones; Space with a keyboard).
- **Duplicates.** Marking a duplicate needs the original. Its support then counts toward the original, each person once; counted rather than moved, so undoing a mistake loses nothing. A duplicate takes no new support, and the people on it are emailed a link to the original.
- **Following.** Posting, supporting or commenting on an idea follows it. The database also has contributor and lead roles; the toggle for choosing them is off in this version.
- **Notifications.** As in Fider: people following an idea are emailed about its comments and status changes; anyone can opt into every new idea; each kind can be turned off in Settings; nobody is emailed about their own action. Triggers queue rows in `outbox`; `supabase/functions/notify` sends them through Resend.
- **Profiles.** A photo (uploaded in Settings, cropped and shrunk on the device, or the GitHub picture) and a name. Photos are in a public storage bucket under random names; only each member can change their own.
- **People.** A directory of members, grouped by organisation, with search and an organisation filter. Members add their organisation, job title, area of design, LinkedIn and a short bio in Settings. Everyone is listed unless they turn it off; email shows only if they turn it on. Only members can see it. Each person has a profile page (`/people/<id>`) with what they've shared and the ideas they've posted.
- **About.** What the community is, how it works and a code of conduct, edited in Admin › Community, readable before signing in.
- **Appearance.** Dark (default), Light or Device, per device.
- **Live.** Supabase Realtime reloads the board when anyone changes anything; the open idea's comments update as they're posted.
- **Similar ideas.** While a title is typed, Fuse.js lists up to three close matches to support instead.
- **Markdown.** Ideas, comments, notes, updates and the About page take light markdown: emphasis, links, lists, quotes, code. No images or HTML.
- **Links.** Clean addresses: `/` for ideas, `/roadmap`, `/updates`, `/people`, `/about`, `/admin` (and `/admin/people` etc.), with `/id` for an idea, e.g. `/ideas/12`. GitHub Pages serves the app for any path through `404.html`, which the build writes as a copy of `index.html`. Older `#ideas/12` links redirect. The demo, a single file, uses the same paths after a `#`.
- **Keeping awake.** Free Supabase projects pause after a week of no activity. `keepalive.yml` calls the database every three days.

## Not in this version

Attachments, mentions, threaded replies, an in-app notification list, edit history, member profile pages, and choosing contributor or lead on an idea.
