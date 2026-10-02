# Loopnote

Monorepo for Loopnote: an app that turns photos of notes/whiteboards/journal
pages into searchable summaries and flashcards.

Implemented so far: every Phase 0 issue (backend + client in-app import
flow; the native share-sheet extension is stubbed — see
`client/SHARE_SHEET_TODO.md`), plus Phase 1's **"Add spaced-repetition
scheduling"**, **"Auto-categorization across notes"**, and **"Beta invite
flow + feedback collection"** issues. Both LLM calls are still mocked (no
real model calls yet).

## Layout

```
loopnote/
├── server/
│   └── src/
│       ├── app.ts             # wires everything together
│       ├── routes/imports.ts  # POST /imports, GET /imports/:id
│       ├── routes/review.ts   # GET /review/pending, keep/merge/discard
│       ├── routes/study.ts    # GET /study/due, POST /study/:id/review
│       ├── routes/notes.ts    # PATCH /notes/:id/topic (override grouping)
│       ├── routes/invites.ts  # POST /invites, POST /invites/redeem
│       ├── routes/waitlist.ts # POST/GET /waitlist
│       ├── routes/feedback.ts # POST/GET /feedback, PATCH /feedback/:id/resolve
│       ├── services/          # JobsRepository, ImageStore, JobQueue, UsageLog
│       ├── pipeline/          # resize → detect → gate-summarization
│       ├── db/                # topics/notes/flashcards schema + repositories
│       ├── scheduling/        # sm2.ts — pure SM-2 algorithm
│       ├── categorization/    # matchTopic.ts — pure tag-similarity matcher
│       └── types.ts
├── client/
│   ├── App.tsx                 # picker screen + upload queue UI
│   ├── src/uploadQueue.ts       # pure reducer (framework-agnostic, tested)
│   ├── src/uploadService.ts     # XHR upload with progress (tested)
│   └── SHARE_SHEET_TODO.md      # native share-extension work, not done here
├── review-ui/  # Static HTML/JS review UI, framework-agnostic on purpose
├── .github/workflows/ci.yml
└── .env.example
```

npm workspaces tie `server` and `client` together so `npm ci` at the root
installs both.

## Prerequisites

- Node.js 20.12+ (the server uses `process.loadEnvFile`)
- npm 10+
- For the client: [Expo Go](https://expo.dev/go) on your phone (easiest),
  or Xcode/Android Studio for a simulator

## Setup

```bash
git clone <this-repo>
cd loopnote
cp .env.example .env   # fill in real values as later issues need them
npm ci
```

The server loads the repo-root `.env` on startup. **Without it the
database is in-memory** and every note, flashcard and invite is gone on
restart; with the values from `.env.example` it's a SQLite file under
`server/data/` (gitignored), next to the uploaded images.

The client does not read that file — Expo only loads `.env` from its own
project directory. To change the app's default server address, copy
`client/.env.example` to `client/.env`.

## Running the server

```bash
npm run dev:server
```

Starts the API on `http://localhost:4000` (or `$PORT`). Check it's alive:

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

## Running the client

```bash
npm run dev:client
```

Opens Expo's dev tools — press `i` for the iOS simulator, `a` for
Android, or `w` for web, or scan the QR code with Expo Go on a physical
device.

On a real device, `localhost` in the API URL means the phone, not your
dev machine. Tap **Test** next to the "Server address" field — it hits
`GET /health` directly and tells you plainly whether it's reachable,
instead of only finding out on the next upload attempt.

### Troubleshooting "can't reach the server" / "Network error during upload"

1. **Are you using `localhost`?** That's almost always the cause on a
   real device. Find your computer's LAN IP:
   - Windows: `ipconfig` → look for "IPv4 Address"
   - Mac: `ipconfig getifaddr en0` (or `en1` on Wi-Fi-only Macs)

   Then use `http://<that IP>:4000` in the app's "Server address" field —
   this is a runtime field, not a rebuild.
2. **Same WiFi network?** Phone on cellular data, or phone/computer on
   different networks (e.g. a guest network), can't reach each other.
3. **Firewall.** Windows Defender Firewall blocking inbound connections
   on port 4000 is a common, silent blocker — check for a prompt when the
   server first started, or add an inbound rule for port 4000 manually.
4. **Is the server actually running?** `npm run dev:server` should print
   `loopnote server listening on :4000`. If it crashed, uploads will fail
   with a network error indistinguishable from a firewall/IP problem.
5. Still stuck: open `http://<LAN IP>:4000/health` in **the phone's own
   browser** (not the computer's). If that doesn't load, it's a pure
   network/firewall issue, unrelated to the app.

The in-app picker (multi-select from the photo library, queued uploads
with visible progress, retry on failure) is fully built. The OS-level
share-sheet extension ("share to Loopnote" from the Photos app) is not —
see `client/SHARE_SHEET_TODO.md` for why and what's needed; it requires a
real Xcode/Android Studio project this environment has no way to build
or test.

### Client dependency versions

Every client dependency is pinned to what Expo SDK 57 expects — there is
no post-install step. To check them (or after bumping the SDK):

```bash
cd client
npx expo install --check   # reports anything out of line with the SDK
npx expo-doctor            # config + dependency health checks
```

**`overrides` in the root `package.json` are load-bearing.** They force
the whole workspace onto a single `react` / `react-dom` / `react-native`
version. Without them npm hoists a newer copy to the root for Expo's own
packages while the app keeps the pinned one, and the bundle ends up with
two Reacts and two React Natives — which fails at runtime ("Invalid hook
call"), not at install time. If you change the `react` or `react-native`
version in `client/package.json`, change the override to match.

The app also runs in a browser (`w` in Expo's dev tools): `react-dom`,
`react-native-web` and `@expo/metro-runtime` are installed for that, and
uploads send the picked `File` directly, since a browser can't upload
from a `{ uri }` object the way React Native can.

**Fixed along the way, since real testing surfaced them:**
- `main` in `package.json` pointed at `node_modules/expo/AppEntry.js` — a
  private internal path that SDK 57 apparently moved or restricted. Now
  points at `client/index.js`, a file we own that calls Expo's public
  `registerRootComponent` API instead — stable across SDK versions by
  design, rather than reaching into the package's internals.
- `SafeAreaView` and `expo-image-picker`'s `MediaTypeOptions` were both
  hitting deprecation warnings. Now imports `SafeAreaView` from
  `react-native-safe-area-context` (added as a real dependency) and uses
  the array form `mediaTypes: ["images"]`.
- Upload error messages now say what was actually tried (`Couldn't reach
  http://...`) instead of a bare "Network error", specifically so a wrong
  LAN IP is diagnosable from the error text alone.
- Uploads and the "Test" button time out (60s / 5s) instead of hanging:
  a wrong LAN IP usually doesn't fail, it just never answers.
- The server-address field forgives what a phone keyboard does to it — a
  trailing space, a trailing slash, a missing `http://`.
- The app is light-only (`userInterfaceStyle: "light"`, dark status-bar
  text). It previously claimed to follow the system theme, which put
  light status-bar text on the light background in dark mode.
- Visual pass: a generated app icon/logo (rounded loop-arrow over a
  notebook, `client/assets/icon.png`), a "Test" button next to the
  server-address field, and `Animated`-based transitions — deliberately
  React Native's built-in `Animated` API rather than an animation library.

### Design language (shared with the review UI)

The app and `review-ui/index.html` use one visual system: warm paper
(`#fbf8f1`), espresso ink, sage and clay accents; Instrument Serif for
display type and Plus Jakarta Sans for everything else.

- **Fonts are real dependencies** (`expo-font` plus two
  `@expo-google-fonts/*` packages), imported per weight so only the five
  cuts in use are bundled. Each weight is addressed by its own family
  name — never `fontWeight` on top of a custom font, which makes Android
  synthesise a fake bold. The app waits on a blank paper screen while
  they load, and carries on with system fonts if loading fails.
- **No icon library.** The plus, tick and ring motifs are drawn from
  plain `View`s, so there's nothing to keep in sync with the Expo SDK.
- **Cards are "double bezel"** — an outer tray and an inner plate on
  concentric radii (the `Bezel` component) — and borders are the ink
  colour at low alpha rather than grey lines.
- **Motion is transform/opacity only**, on one easing curve
  (`cubic-bezier(0.32, 0.72, 0, 1)`). The upload progress bar is scaled
  from its left edge rather than animating `width`, so it runs on the
  native driver.
- The whole screen is one `FlatList` (header, server card and queue
  scroll together), so nothing is cut off on a short phone.

## Lint & test

```bash
npm run lint    # both workspaces — ESLint, then a full typecheck
npm run test    # both workspaces
npm run build   # compiles the server to server/dist (tests excluded)
```

CI (`.github/workflows/ci.yml`) runs lint and test on every push and pull
request.

## Environment variables

See `.env.example` — every variable used by current code, plus the ones
reserved for the next few issues, is documented there with comments on
which is which.

### Ingestion API

- `POST /imports` — multipart form, one or more files under the `images`
  field. Returns `202` immediately with a job per image:
  `{ jobs: [{ id, status, duplicate }] }`. Images already seen before
  (by content hash) come back with `duplicate: true` and the existing job's
  id, rather than creating a new job. The one exception: if that existing
  job `failed`, re-uploading the image re-queues it (still
  `duplicate: true`, status back to `queued`) — otherwise a failed image
  could never be retried. Limits: 20 images per request, 25 MB each
  (`400` / `413` with a JSON error beyond that).
- `GET /imports/:id` — current job status: `queued` → `processing` →
  `done` | `failed`. Once processed, includes:
  - `detection`: `{ is_note, confidence, extracted_text, has_diagram, flaggedForReview }`
  - `summarization` (only when the note was confidently accepted):
    `{ topic, summary, tags, flashcards }` — `null` otherwise

### Import pipeline (`server/src/pipeline/`)

`processImportJob.ts` orchestrates all of this per job:

1. **`imagePreprocessing.ts`** — real resize/compress via `sharp` (longest
   edge capped at 1568px, JPEG q82) to control token cost. Falls back to
   the original bytes rather than failing the job when input isn't a
   decodable image.
2. **`detection.ts`** — the mocked vision-LLM call (detection + OCR). Same
   return shape a real Anthropic call will use, so swapping it later
   shouldn't touch anything downstream.
3. Gate: `is_note: false` at or above the confidence threshold → filtered
   out, job ends `done` with `summarization: null`. Confidence below
   `CONFIDENCE_THRESHOLD` (0.6) → `flaggedForReview: true` regardless of
   `is_note`, also ending with `summarization: null`, rather than
   auto-accepting or auto-discarding an uncertain result.
4. **`summarization.ts`** — the mocked summarization + flashcard call, run
   only for confidently-accepted notes. Produces an empty `flashcards`
   array (never invented questions) for content judged not genuinely
   testable, e.g. a reference list rather than material to study.

Real implementations of both LLM calls should go through the Anthropic
**Batch API** rather than real-time, per the issue's acceptance criteria —
noted in `processImportJob.ts` at the point each call happens, though the
mocks here have no actual cost concern to batch against yet.

Token usage for both calls is logged per job via `UsageLog`
(`server/src/services/usageLog.ts`) for cost tracking.

Everything is in-memory / local-disk for now (`JobsRepository`,
`ImageStore`, `UsageLog`). The "Design data model & persistence" issue
swaps these for real DB-backed implementations behind the same
interfaces.

One consequence worth knowing: jobs (and so the dedup index and the
pending-review stack) don't survive a server restart, even though kept
notes do. Anything imported but not yet reviewed has to be re-imported
after a restart, and re-importing an image that was already kept creates
a second note for it.

### Persistence (`server/src/db/`)

The durable, user-facing side of the data — as distinct from
`JobsRepository`'s ephemeral pipeline tracking above:

- **`schema.ts`** — SQLite schema (via `better-sqlite3`) for `topics`,
  `notes`, and `flashcards`. Flashcards are one row each, not a JSON blob
  on the note, specifically so the "Add spaced-repetition scheduling"
  issue can add `next_review_date` / `interval_days` / `ease_factor` /
  `repetitions` as plain nullable columns later without restructuring
  anything.
- **`topicsRepository.ts`** / **`notesRepository.ts`** — `NotesRepository`
  creates a note with its flashcards atomically (one transaction), can
  reassign a note between topics (or unassign it), transitions
  `review_status` (`pending` → `kept` | `merged` | `discarded`), and
  **hard-deletes** discarded notes rather than just hiding them.
- **SQLite, not Postgres** — `DATABASE_URL` in `.env.example` was updated
  to reflect this; it's a deliberate call for a solo/small-team MVP (no
  separate DB server to run), not a placeholder. `:memory:` is used in
  tests, and is also the fallback whenever `DATABASE_URL` is unset.

This layer is now wired in via the review UI below, rather than directly
from the ingestion pipeline — `JobsRepository` (pipeline status) and this
module (reviewed, durable content) stay deliberately separate concerns,
bridged only at the point of a user's keep/merge/discard decision.

### Review UI (`review-ui/index.html`, `server/src/routes/review.ts`, `server/src/routes/topics.ts`)

- `GET /review/pending` — the stack of processed-but-not-yet-reviewed
  imports: jobs that finished processing and weren't confidently
  auto-filtered as non-notes (i.e. they have a summarization, or they were
  flagged as uncertain either way). Each item: `{ jobId, extractedText,
  summary, suggestedTopic, tags, flashcards, flaggedForReview, hasDiagram }`.
- `POST /review/:id/keep` — `{ newTopicName?: string }`. Persists a note
  via `NotesRepository`, optionally under a topic with that name, and
  marks the job reviewed. The topic is created only if no existing topic
  already has that name (case-insensitive) — otherwise the existing one
  is reused, so keeping two notes as "Biology" gives one topic, not two.
- `POST /review/:id/merge` — `{ topicId: string }`. Same, but assigns the
  note to an existing topic; `400`s if `topicId` doesn't exist.
- `POST /review/:id/discard` — actually deletes the job and its stored
  image file, not just hides it, per the acceptance criteria.
- `GET /topics` — plain listing, used by the review UI's merge picker.

`review-ui/index.html` is a single self-contained static page (no build
step, no framework) that drives all of the above: one card at a time, an
editable topic field for "keep" (Enter works), a dropdown of existing
topics for "merge", and a clear "all caught up" empty state with a manual
refresh rather than a dead end. Discard takes two presses — the first
arms the button for a few seconds — since it deletes the image for good.
The card also lists the generated flashcards, not just their count, and
errors show as a toast rather than a browser alert. Its only external
request is the Google Fonts stylesheet; offline it falls back to system
serif/sans and still works. Below 768px it collapses to one column. It's
deliberately framework-agnostic — the "Build manual import flow (client)"
issue is what decides whether the real client becomes Expo/React Native,
and this doesn't presume that answer.

To run it: start the server (`npm run dev:server`), then either open
`review-ui/index.html` directly in a browser, or serve it statically
(e.g. `npx serve review-ui`) if your browser blocks `file://` → `http://`
fetches. It defaults to `http://localhost:4000` for the API — editable
in the field in the top bar, persisted in `localStorage`. The server enables
permissive CORS for this (dev-only — see the comment in `app.ts`).

### Spaced repetition (`server/src/scheduling/sm2.ts`, `server/src/db/flashcardsRepository.ts`)

Classic SM-2, as originally specified — a 0–5 recall-quality rating per
review:

- **`sm2.ts`** — pure, framework-agnostic `scheduleNext(state, quality,
  now)`. Tested against the textbook reference sequence (repeated
  quality-4 reviews producing intervals `[1, 6, 15, 38]` with ease factor
  exactly unchanged — the standard "quality 4 leaves ease alone" property)
  rather than just testing that *some* number comes out.
- **`flashcardsRepository.ts`** — `listDue()` (earliest-due first) and
  `recordReview(id, quality)`, which persists the SM-2 result.
- New flashcards are scheduled **due immediately** on creation (via
  `NotesRepository.createWithFlashcards`), so a freshly-kept note's cards
  show up in the very first study session rather than needing a first
  review to even appear.
- `GET /study/due`, `POST /study/:id/review` — thin routes over the above.
- The `next_review_date` / `interval_days` / `ease_factor` /
  `repetitions` columns were added to `flashcards` exactly as promised
  back in the "Design data model & persistence" section: plain nullable
  columns, additive. `migrate.ts` now checks for them via `PRAGMA
  table_info` and adds them if missing, so a database that predates this
  feature upgrades in place — `db/migration-upgrade.test.ts` builds an
  old-shape table by hand and asserts exactly that, rather than just
  asserting the new install works.

### Auto-categorization (`server/src/categorization/`)

- **`matchTopic.ts`** — pure `suggestTopic(noteTags, topics, threshold?)`.
  Tag-overlap similarity (Jaccard: intersection / union) between a note's
  tags and each existing topic's aggregated tags. Tested against exact,
  hand-computed similarity scores, not just "picks something reasonable."
  Returns `null` — no suggestion — rather than a low-confidence guess
  whenever nothing clears the threshold (default `0.2`) or either side has
  no tags to compare.
- **`topicSignatures.ts`** — the DB-facing glue: aggregates each topic's
  tags from every note currently assigned to it.
- Wired into `GET /review/pending`: each card now carries a
  `suggestedExistingTopic: { topicId, topicName, confidence } | null`,
  and the review UI pre-selects it in the merge dropdown with a "why"
  hint showing the match percentage.
- **This only ever suggests.** Nothing auto-merges — the suggestion is
  just a pre-filled dropdown value; the user still has to tap Merge. This
  is what satisfies "mis-grouping doesn't silently merge unrelated
  content without a confirmation step": the confirmation step (the tap)
  was already required by the review flow before this issue existed, and
  auto-categorization doesn't remove it.
- **"User can override an automatic grouping"** — covered two ways: at
  merge time, the pre-selected suggestion is just a dropdown default, so
  picking any other existing topic (or a brand-new one, or none at all
  via keep) is one click away; after the fact, `PATCH /notes/:id/topic`
  (`server/src/routes/notes.ts`) reassigns or unassigns a persisted note's
  topic at any time — not just in the moment of the original suggestion.

### Beta invite flow + feedback collection (`db/usersRepository.ts`, `invitesRepository.ts`, `waitlistRepository.ts`, `feedbackRepository.ts`)

A real decision made along the way: **this app had no concept of "user"
at all before this issue** — fully single-tenant. An invite-code flow
needs *something* to redeem into, so a minimal `User` (id + email, no
passwords/auth) got added here rather than faked around. This does not
add authentication anywhere else — every other endpoint is still
unauthenticated, same as before.

- **`POST /invites`** — generates N invite codes (8 characters from the
  system CSPRNG, excluding visually-ambiguous characters like `0`/`O`).
  **Unauthenticated** — there's
  no admin auth yet, so this assumes whoever runs the server is also who
  hands out codes. Gate this before it's exposed beyond a trusted person.
- **`POST /invites/redeem`** — `{ code, email }` → creates or reuses a
  `User` by email and marks the code redeemed; `409` if already redeemed,
  `404` if the code doesn't exist.
- **`POST /waitlist`**, **`GET /waitlist`** — the "or waitlist" half of the
  acceptance criterion; idempotent by email.
- **`POST /feedback`** — flags a bad `detection` / `summary` / `flashcard`
  against a `job`, `note`, or `flashcard` id. **`GET /feedback`** lists
  them unresolved-first by default (a real backlog, not an archive) and
  **`PATCH /feedback/:id/resolve`** lets the team clear one — this is what
  satisfies "reviewable by the team, not just logged and forgotten": it's
  a persisted, queryable, resolvable table, not a console log like
  `UsageLog`.
- **Actually in-app, not just an API**: `review-ui/index.html` has a
  "Flag · Detection / Summary / Flashcard" row on every review card, which
  opens a dialog for an optional reason and posts to `/feedback` — flagging doesn't
  remove the card from the queue, since it's orthogonal to keep/merge/
  discard.

## What's next

The one remaining Phase 1 issue is basic usage analytics — now more
meaningful than it would have been before this issue, since there's
finally a `User` to key "per user" numbers on. Also still open from
Phase 0: the native share-sheet extension (`client/SHARE_SHEET_TODO.md`).
