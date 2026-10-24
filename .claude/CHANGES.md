# Change Log

## 2026-10-24 — community
- Review pass in the live preview: Kirby-style board (vote pill, order and filters bar, search in the top bar), single top bar with a phone menu, ideas as full pages, comments with photos and likes, profile photos, Admin separate from Settings, About page with code of conduct and requests to join, light mode, three type sizes (13/16/20 phones, 12/14/18 desktop), 36px tags, full-height phone panel with grab bar, Post button, demo mode (`npm run demo`)
- Ideas open as full pages (IdeaPage.tsx) instead of the side panel, with scroll restored on back; 16px root everywhere and 13px minimum text; larger idea titles and text
- Segmented/OnOff default to field height (48px, filled like inputs); board search and sort match
- Turnstile CAPTCHA on the email step; 12-hour session limit enforced in the database from the token's amr times; 30-minute idle sign-out in the app; sign-in screen says why you were signed out
- Sign-in: GitHub or emailed code, then required two-factor (TOTP); aal2 enforced by restrictive policies on every table; backup authenticators; facilitator reset (reset-2fa Edge Function); sign out everywhere; CSP meta and frame guard on the built page
- Review against Fider and GitHub: ⋯ menus on ideas, comments and updates; edit in place; confirm and rename dialogs (Dialogs.tsx); hide comments with a reason; status notes show who and when; Duplicate (was Merged) needs the original and counts its support there
- Added: dnd-kit roadmap drag for facilitators, Fuse.js similar ideas, Supabase Realtime, react-markdown, email notifications (outbox + notify Edge Function + Resend) with per-kind settings; supporting or commenting follows an idea
- Categories become tags: one shared list (max 20) kept by facilitators, up to 3 per idea, shown as pills; tag filter row on the board
- Row actions by tapping the row (RowMenu.tsx) instead of a trash icon on each; idea Edit/Delete in a header menu; leave an idea by tapping your role again
- No Save buttons: fields save when you leave them or press Done (Auto.tsx); one-line adds and comments send from a button inside the field (SendField.tsx); New idea and New update post from a check in the panel header
- Filled fields with no outline, 48px tall, labels above in grey; more space between groups
- People on an idea: follower, contributor or lead (idea_people table); leads shown on rows and roadmap; “Ideas I’m on” filter
- Phones use a 16px root (desktop stays 14px), so text matches shadcn sizes and inputs don't trigger iOS zoom
- New app from the starter: ideas board, roadmap, updates, Supabase sign-in by invite
- Rail.tsx: places then panels in one column; Picker.tsx for long single choices; textarea from shadcn

## 2026-10-18 — Thumbnail export
- Export saves an index thumbnail: 1600 × 1000 (16:10), the work centred on black

## 2026-10-18 — Shared panels, icons, order and Format
- Top right is places, the bottom is actions; Export leaves the toolbar
- Canvas panel with the shared Format list (formats.ts: 1:1, 4:5, 9:16, 16:9, A4), starting on 4:5; Design gets the shapes icon
- CLAUDE.md: panel order, one meaning per icon, Format and File, toolbar order

## 2026-10-18 — Phone menus are just icons
- On phones the top-right row and the bottom bar drop their grey pill and border; desktop keeps them
