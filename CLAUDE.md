# Building in this project

This app was made from `veryrobert/starter`. Keep to its stack and style.

## Stack
- React + TypeScript + Vite. Static build to `dist/`, deployed to GitHub Pages on push to `main`.
- Tailwind v4. Theme lives in `src/index.css` (`:root` tokens). Don't hardcode colours; use the tokens (`bg-background`, `text-muted-foreground`, `border-border`, `bg-panel`, …).
- shadcn/ui (Radix, `radix-nova`) for anything interactive. Add with `npx shadcn@latest add <name>`. Don't hand-build what shadcn already has.
- Lucide icons only, `strokeWidth={1.5}`, `size-5` (20px) in toolbars, `size-4` inline. Same in loom.
- Set the subdomain in `public/CNAME`.

## Style
- Dark only. True black page (`#000`); panels, sheets and fields are barely-off blacks, separated by hairline borders rather than fill. One warm off-white (`foreground`), one muted grey (`muted-foreground`). No other colours unless the app's content needs them.
- Minimal, refined typography: Geist (shadcn's typeface, bundled via `@fontsource-variable/geist`), Helvetica Neue as fallback; Geist Mono for code and figures. Never the system font first. 14px base on desktop, 16px on phones, `text-xs`/`text-sm` for UI, `font-medium` at most. No bold headings, no uppercase labels, no letter-spaced eyebrows.
- Icons over text. Actions are icon buttons (`ToolButton`) with a required `label`, which becomes the tooltip and accessible name. Use text buttons only where an icon would be ambiguous.
- The content is the page. Layout: full-bleed stage, `PanelRail` top right (a column on desktop, a row on phones), settings in a `PanelSheet` (right on desktop, bottom half on phones), a few primary actions in a `Toolbar` inside an `ActionDock` along the bottom.
- Top right is places, the bottom is actions. Every `PanelRail` button opens a panel and changes nothing itself; every `Toolbar` button acts at once and never just opens a panel. Export is the last panel; downloading lives there, not in the toolbar. The stage keeps clear of whatever is open (see `layout.ts`). Floating UI uses the `panel` utility (frosted, hairline border, rounded-full for bars).
- Selected states invert (`bg-primary text-primary-foreground`), as in `Segmented`.
- App names are lowercase everywhere: `<title>`, README heading, the index (e.g. `cards`, `loom`).
- Short labels: one or two words. No helper paragraphs, no explainer copy, no emoji.
- No gradients, drop shadows, cards inside cards, coloured accent buttons or default shadcn demo looks.
- Respect `prefers-reduced-motion`; motion is short (150–250ms) and functional.

## Panels, icons and order (the same in every app)
- Panel order: what you make first (its own icon), then **Colour** (`Palette`), **Canvas** (`Frame`: Format and how the artboard shows), the app's own panels, **Library** (`Library`: saved work and past downloads), **Settings** (`SlidersHorizontal`), **Export** (`Download`) last.
- **Format** is the artboard's shape, always 1:1, 4:5, 9:16, 16:9, A4 in that order, from `shell/formats.ts`. Every app starts on **4:5** (apps that start from a photo or video start on Original). Apps that start from a photo or video put "Original" first. A file type is called **File** (MP4, GIF), never Format.
- One meaning per icon:
  - `SlidersHorizontal` Settings only. `Frame` Canvas. `Palette` Colour. `Library` Library. `Download` Export or save a file.
  - `Shuffle` randomise or new random (layout, order, image). `Undo2` undo. `RotateCcw` reset.
  - `Copy` copy to the clipboard. `CopyPlus` duplicate. `Trash2` delete or remove. `Plus` add. `Upload` your own file.
  - `Play`/`Pause` playback. `Bookmark` add to Library.
- Toolbar order: the main action first (shuffle, play), then the rest, then `Undo2`, then add-to-library or duplicate/delete for a selection.

## Shell components (`src/components/shell`)
- `PanelRail`, `PanelSheet`, `ActionDock`, `layout.ts` (`usePhone`, sizes, safe area): the responsive shell. On phones the panel buttons are a row top right and the actions a row along the bottom, both just icons.
- `ToolButton`: round icon button + tooltip.
- `Toolbar`, `ToolbarSeparator`: frosted pill bar.
- `Segmented`, `OnOff`: single-choice control; options can show an icon instead of text.
- `Swatches`: colour circles plus a custom picker.
- `FilePick`: load one file, show its name, clear it.
- `Field`, `FieldGroup`: labelled rows inside a sheet.
- `formats.ts`: the shared Format list (`FORMATS`, `formatTall`).
- `Splash`: the load screen. Each app has its own small mark, 3 to 8 stroke paths on a 32×32 grid (`pathLength={1}`), drawn in order with loom's timing, then faded.

## This app: community

A private, invite-only ideas board for a community of practice (Nolt-style), on Supabase. Not a making tool: no Canvas, Format, Colour, Library or Export panels.

### Layout
- One top bar (`components/shell/TopBar.tsx`), the same on desktop and phones: the community's name, as written (tap for home), on the left; search, Admin (a shield, facilitators only), one menu icon holding Ideas, Roadmap, Updates and About, and your photo, which opens your name and email, Settings and Sign out. This replaces the starter's rail for this app.
- The stage is a scrolling column: Board, Updates, About, Admin and an idea page `max-w-2xl`; Roadmap `max-w-6xl`.
- An idea opens as its own page (back top left, its ⋯ or check top right), not in a panel; back restores the list's scroll position.
- The panel (`PanelSheet`) is for Settings, writing a new idea or update, and changing an idea's status. Desktop: 400px from the right. Phones: nearly full height with a grab bar; drag the bar or header down to close.
- Bottom: one action in a frosted circle, `Plus`, only where it belongs: new idea on Ideas, new update on Updates (facilitators only), nothing on Roadmap, About, Admin or an idea.
- Settings is personal only (photo, name, appearance, email, security). Everything about the community lives in Admin (facilitators): a list of three sections, each its own page (#admin/community, #admin/tags, #admin/people) with a way back: Community (name, vision, About page text), Goals and tags, People (requests, invites, members).

### Type and controls
- Three sizes only, set as theme tokens in `index.css` so shadcn follows: 13/16/20px on phones, 12/14/18px on desktop (`xs`, `sm`=`base`, `lg`=`xl`). Root stays 16px. Hierarchy from colour and space, not more sizes.
- Fields are filled (`bg-secondary`), no border, 48px, label above in grey. Segmented and OnOff default to the same 48px (`size="field"`). Tags are 36px pills (`TagChip`), chosen with `TagPicker`, never typed.
- Light mode: tokens under `:root[data-theme="light"]`, chosen in Settings (Dark default, Light, Device), saved per device by `lib/theme.ts`, applied before first render.
- Status is text, not colour; Done gets a tick. Counts and dates are Geist Mono.

### Interaction
- No Save buttons for edits: fields save on blur or the keyboard's Done (`AutoInput`, `AutoTextarea`, Saving/Saved in the label row). Adding one thing or commenting: `SendField` (button inside the field, Enter sends). Creating an idea: a full-width Post button at the bottom. Set `enterKeyHint` on every field.
- One ⋯ menu per object where its title or meta line is (idea: top right of its page; comment and update: end of the meta line, fading in on hover with a mouse, always visible on touch). Order: Edit, Copy link, other actions, separator, destructive last in red.
- Plain lists with no links inside (tags, goals, invites, requests, members) open their actions by tapping the row (`RowMenu`). No icon repeated on every row.
- Edit in place: an idea's fields become editable on its page; a comment turns into its own field (leave to save, Escape to cancel; such fields carry `data-own-escape`).
- Destructive or hard-to-undo actions go through `useDialogs().confirm`: title naming the thing, a sentence on what happens, Cancel left, the action on the right named for what it does, red. Renames use `useDialogs().prompt`. Never `window.confirm`/`prompt`.
- Comments as on Kirby: photo left, text, then name · heart and likes. Hiding a comment takes a reason (GitHub's list). A status change can carry a note, shown with who and when (Fider's response).

### Data and security
- Data in `src/lib/data.ts`, sign-in in `src/lib/auth.ts`; schema, policies, triggers and the invite gate in `supabase/schema.sql`. Any rule about who may do what belongs in the database, not only the interface.
- Sign-in: GitHub or an emailed 6-digit code. An authenticator is optional (Settings); once someone adds one, their sign-in asks for its code too. Every table has a restrictive policy requiring `two_factor_ok()` and a sign-in within 30 days: a new table must be added to that list. Sessions last 30 days (`SESSION_DAYS` in `auth.ts`, and `schema.sql`); no idle sign-out. CAPTCHA is Turnstile via `lib/turnstile.ts`, off without a site key.
- Signed-out visitors can only call `about()` and `request_invite()`.
- Codes use `CodeField`: numeric keypad, autofill, submits on the sixth digit.

### Demo
- `npm run demo` runs the real app on sample data in memory, no Supabase: `vite.demo.config.ts` swaps `lib/data`, `lib/auth` and `lib/supabase` for `src/demo/*`. Every code is 123456; you@example.ie is a returning facilitator, any other email a new member. When the app's data functions change, change `src/demo/data.ts` to match.
