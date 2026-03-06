# PRD — Offline Flashcards PWA
**Working title:** Offline Flashcards PWA  
**Document version:** v1  
**Date:** 2026-03-07  
**Status:** Draft for review  
**Prepared for:** Founder / product owner

---

## 1) Product overview and goals

### Product vision
Build a modern, pleasant, offline-first flashcards application for **desktop browser + iPhone PWA** that feels significantly more polished than classic Anki-style tools while keeping the core value: **quick daily reviews, manual card creation, decks, and spaced repetition**.

### Problem statement
Current tools do not fully satisfy the product owner because:
- iOS options are either paid, awkward, or not pleasant to use.
- The UI/UX of existing tools feels outdated.
- The desired workflow is **fast, local, and offline-capable**.
- In the long term, the owner wants a foundation that can expand beyond flashcards into a broader study ecosystem.

### MVP goal
Ship a **usable personal learning tool** that lets the user:
1. Create and manage decks.
2. Create, edit, and delete flashcards manually.
3. Review cards with a simple spaced repetition model.
4. Use the app offline on desktop and iPhone.
5. Enjoy a modern interface that feels lightweight and motivating.

### Success criteria for MVP
The MVP is successful if the founder can:
- install/open the app on desktop and iPhone,
- create decks and cards without friction,
- review cards every morning offline,
- trust that study progress is saved locally,
- feel that the interface is modern and pleasant enough to prefer it over current tools for daily use.

### Non-goals for MVP
The following are explicitly **out of scope** for MVP:
- sync between devices,
- user accounts / authentication,
- import from Anki,
- Yomitan or browser integration,
- analytics / statistics dashboard,
- tags and search,
- backup/export/import,
- audio playback or TTS,
- bulk card creation,
- multi-deck mixed review mode,
- desktop native wrapper,
- public multi-user product concerns.

---

## 2) Target audience

### Primary audience (MVP)
- **The founder themself**
- Personal study workflow
- Language learning first, but not limited to languages

### Secondary audience (post-MVP)
- language learners (for example English, Ukrainian, Japanese, etc.),
- students preparing for exams,
- users memorizing professional terms, concepts, and definitions,
- self-learners who need quick mobile review without internet.

### Core user jobs to be done
1. “When I wake up, I want to open one deck and quickly review the cards due today.”
2. “When I learn a new word or term, I want to add it manually in a clean interface.”
3. “When I’m offline, I still want full access to my local decks and study progress.”
4. “I want the app to feel modern and pleasant, not like legacy study software.”

### Example user scenarios
- **Language learner:** opens the English deck on iPhone in the morning and reviews due words on the bus without internet.
- **Knowledge worker / student:** keeps a terminology deck with definitions and revisits it daily.
- **Future public user:** wants an Anki-like tool without Anki-like UI complexity.

---

## 3) Product scope

### Supported platforms in MVP
- **Desktop:** browser / installable PWA
- **iPhone:** installable PWA (“Add to Home Screen” flow recommended)

### High-level scope decision
MVP is **offline-first and local-only**:
- each device stores its own data locally,
- there is **no sync** between desktop and phone in MVP,
- there are **no accounts** and no backend dependency for core use.

### Post-MVP priority order
Based on product owner priorities, the next major expansions should be planned in this order:
1. Sync between PC and iPhone
2. Import from Anki
3. Yomitan / browser integration for quick word capture
4. Statistics and analytics
5. Book reader / reading tools
6. Backup / export / restore

---

## 4) Core UX principles

### UX goals
The UI must feel:
- modern,
- calm,
- fast,
- touch-friendly,
- visually closer to modern tools like ChatGPT web / Codex app than to legacy study apps.

### Design principles
1. **Deck-first flow**  
   The user opens the app, sees decks, chooses one deck, and starts review.
2. **Minimal friction**  
   Important actions should be reachable within 1–2 taps/clicks.
3. **Clean hierarchy**  
   Strong spacing, clear typography, obvious primary actions.
4. **Modern visual language**  
   Rounded surfaces, subtle shadows, quiet color accents, restrained motion.
5. **Mobile-first touch targets**  
   Buttons must be thumb-friendly and accessible on iPhone.
6. **Low cognitive load**  
   No advanced study controls in MVP beyond what is necessary.
7. **Offline trust**  
   The user should feel confident that local changes are saved immediately.

### Visual style direction
- Clean, high-contrast layout
- Contemporary web-app aesthetic
- Spacious cards and panels
- Large review buttons
- Smooth but subtle transitions
- Prefer system fonts or a highly readable modern font stack
- Dark-friendly aesthetic is acceptable, but system theme support is preferred

---

## 5) Information architecture and screens

### Required MVP screens
1. **Home / Decks**
2. **Deck Details**
3. **Study Session**
4. **Add Card**
5. **Edit Card**
6. **Settings**
7. **Create Deck / Edit Deck** (may be modal or page)

### Screen responsibilities

#### 5.1 Home / Decks
Purpose:
- show all decks,
- show deck-level counters,
- allow fast navigation.

Must show:
- deck name,
- optional deck description,
- due count,
- new count available today,
- CTA to open deck,
- CTA to create deck.

Acceptance criteria:
- user can see all decks on first screen,
- user can create a new deck,
- user can delete a deck with confirmation,
- user can open a deck in one click/tap.

#### 5.2 Deck Details
Purpose:
- manage one deck,
- enter study flow,
- access cards inside that deck.

Must show:
- deck title,
- review counts,
- “Start review” button,
- “Add card” button,
- list of cards in the deck,
- deck settings access.

Acceptance criteria:
- user can start a study session from the deck page,
- user can inspect the cards belonging to that deck,
- user can edit or delete any card from the deck page,
- counts reflect current local state.

#### 5.3 Study Session
Purpose:
- present one card at a time,
- reveal answer,
- record rating,
- update schedule.

Must support:
- Front shown first
- manual “Flip” / reveal action
- Back shown after reveal
- 4 rating actions:
  - Hard → 2 minutes
  - Again → 10 minutes
  - Good → next long-term step
  - Easy → jump two long-term steps

Acceptance criteria:
- user always sees only one card at a time,
- card order follows due-first logic,
- after rating, next card loads quickly,
- review result updates due date and review log,
- if a card becomes due again during the same session, it can reappear in that session.

#### 5.4 Add Card / Edit Card
Purpose:
- manual single-card creation and editing.

Fields:
- Front text (required)
- Back text (required)
- Back image (optional, single image from gallery/file picker)

Acceptance criteria:
- user can create a card with text only,
- user can create a card with text + one image on back,
- user can edit card content later,
- user can delete the image from the card,
- validation prevents empty Front or empty Back.

#### 5.5 Settings
Purpose:
- configure study limits and app behavior.

Settings in MVP:
- Global new cards/day
- Global max reviews/day
- Per-deck override toggle: “Use global limits”
- Per-deck new cards/day override
- Per-deck max reviews/day override
- New card order (default: oldest first; future room for random option)
- Theme setting is optional and not required for MVP

Acceptance criteria:
- user can edit global study limits,
- user can override limits for a specific deck,
- deck override only affects that deck,
- decks using global limits automatically inherit future global changes.

---

## 6) Functional requirements

### FR-1 Deck management
The app must allow the user to create, rename, edit, and delete decks.

**Deck fields (MVP):**
- `name` (required, string)
- `description` (optional, string)
- `useGlobalLimits` (boolean, default `true`)
- `newCardsPerDayOverride` (nullable integer)
- `maxReviewsPerDayOverride` (nullable integer)
- `newCardOrder` (enum; default `oldest_first`)
- timestamps

**Acceptance criteria**
- user can create a deck with a name,
- duplicate deck names may be allowed unless product owner later requests uniqueness,
- deleting a deck deletes its cards after confirmation,
- deck counters update when cards are added or reviewed.

**Technical considerations**
- soft delete is not required in MVP,
- local cascade delete must handle cards, images, and review logs.

---

### FR-2 Card management
The app must allow manual CRUD for cards inside a selected deck.

**Card structure (MVP)**
- Front text
- Back text
- One optional image on Back
- No audio
- No file attachments beyond one image
- No tags
- No search indexing requirement beyond storage

**Acceptance criteria**
- create, edit, delete card,
- store card in selected deck,
- image is optional,
- image can be replaced,
- card list reflects latest state immediately.

**Technical considerations**
- image should be compressed/resized client-side before storage to control local database size,
- only one image per card in MVP,
- image source in MVP: gallery/file picker only.

---

### FR-3 Study queue and review flow
The app must allow reviewing cards from **one selected deck at a time**.

**Rules**
- user starts review inside a deck,
- due cards are shown first,
- new cards are shown after due cards,
- new card order defaults to `oldest_first`,
- mixed multi-deck review is out of scope.

**Acceptance criteria**
- a study session always belongs to one deck,
- due cards are prioritized over new cards,
- the app respects new-card and max-review limits,
- if max reviews/day is unlimited, all due cards can be shown.

---

### FR-4 Spaced repetition model
MVP uses a **simple ladder-based spaced repetition model**, not Anki parity.

#### Ladder definition
Long-term ladder:
1. 1 day
2. 3 days
3. 7 days
4. 14 days
5. 30 days
6. 60 days

Short-term repetition actions:
- **Hard** → due in 2 minutes
- **Again** → due in 10 minutes
- **Good** → advance by 1 ladder step
- **Easy** → advance by 2 ladder steps

#### Scheduling behavior
- New card + Good → next due in 1 day
- New card + Easy → next due in 3 days
- Any card + Hard → keep step, due in 2 minutes
- Any card + Again → reset to start, due in 10 minutes
- Reviewed card + Good → move one step forward
- Reviewed card + Easy → move two steps forward
- Highest ladder step remains capped at 60 days until future extension

**Acceptance criteria**
- rating a card always updates `dueAt`,
- `Good` and `Easy` move the card further into the future,
- `Again` resets long-term memory progress,
- `Hard` creates a short retry without promoting the card,
- schedule logic is deterministic and testable.

**Technical considerations**
- use device-local time for schedule calculation,
- store due dates as timestamps,
- store review logs for future analytics even if analytics UI is absent in MVP.

**Scheduling pseudologic**
1. Load deck settings.
2. Build session queue:
   - collect due cards up to review limit,
   - collect eligible new cards up to new-card limit,
   - place due cards first, then new cards.
3. On rating:
   - if Hard: set `dueAt = now + 2 minutes`, keep current long-term step
   - if Again: set `dueAt = now + 10 minutes`, reset long-term step to start
   - if Good: increment long-term step by 1 and set `dueAt` to ladder interval
   - if Easy: increment long-term step by 2 and set `dueAt` to ladder interval
4. Save review log.
5. Fetch next eligible card.

---

### FR-5 Daily limits
The app must support configurable daily limits with inheritance.

#### Global settings
- `globalNewCardsPerDay` = default 10
- `globalMaxReviewsPerDay` = default unlimited

#### Per-deck behavior
- each deck has `useGlobalLimits = true` by default
- if disabled, the deck uses its own override values

**Acceptance criteria**
- global setting changes automatically affect decks using global limits,
- overridden decks keep their own values,
- default new cards/day is 10,
- default max reviews/day is unlimited but user-configurable.

**Technical considerations**
- daily counters should reset based on local date,
- “day boundary” should use device local timezone,
- count logic must distinguish between new cards introduced today and review actions done today.

---

### FR-6 Offline-first behavior
The application must remain functional without internet after initial install/load.

**Scope**
- app shell available offline,
- locally stored decks/cards/images available offline,
- review flow works offline,
- no dependency on backend APIs for MVP core usage.

**Acceptance criteria**
- if the user opens the installed PWA with no internet, the app still loads,
- locally saved decks and cards remain visible,
- review actions continue to work and persist,
- app does not show server-related errors in normal MVP use.

**Technical considerations**
- cache app shell with service worker,
- store local data in IndexedDB,
- store images in IndexedDB or associated local blob storage strategy,
- add installation guidance for iPhone PWA,
- communicate that data is device-local in MVP.

---

## 7) Detailed acceptance criteria by feature area

### A. Create and manage decks
- User can create a deck from Home.
- User can rename a deck.
- User can delete a deck after confirmation.
- Deleted deck no longer appears on Home.
- Deck counts update after card changes.

### B. Create and manage cards
- User can add one card at a time.
- Front and Back are required.
- User can attach one image to Back.
- User can edit existing cards.
- User can delete existing cards.

### C. Review session
- User starts review from one deck only.
- Front is shown before Back.
- Back is hidden until reveal action.
- Four rating buttons are available after reveal.
- Rating updates the next due date instantly.

### D. Scheduling
- Due cards come before new cards.
- New cards follow oldest-first order.
- Review logic follows ladder-based scheduling.
- Hard and Again create short reappear times.
- Good and Easy move cards forward.

### E. Settings
- Global limits are editable.
- Per-deck override is supported.
- Max reviews/day can be unlimited or numeric.
- New cards/day defaults to 10.

### F. Offline persistence
- App works offline after first load/install.
- Cards remain available without internet.
- Review progress persists after app close/reopen.

---

## 8) Conceptual data model

### Entity list

#### 8.1 Deck
| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string (UUID) | yes | primary key |
| `name` | string | yes | deck title |
| `description` | string \| null | no | optional deck description |
| `useGlobalLimits` | boolean | yes | default `true` |
| `newCardsPerDayOverride` | integer \| null | no | deck-specific override |
| `maxReviewsPerDayOverride` | integer \| null | no | `null` means unlimited |
| `newCardOrder` | enum | yes | default `oldest_first` |
| `createdAt` | datetime | yes | local timestamp |
| `updatedAt` | datetime | yes | local timestamp |

#### 8.2 Card
| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string (UUID) | yes | primary key |
| `deckId` | string (UUID) | yes | FK to Deck |
| `frontText` | string | yes | prompt side |
| `backText` | string | yes | answer side |
| `backImageAssetId` | string \| null | no | FK to MediaAsset |
| `state` | enum | yes | `new`, `learning`, `review` |
| `ladderStepIndex` | integer \| null | no | long-term step index |
| `dueAt` | datetime \| null | no | next due moment |
| `lastReviewedAt` | datetime \| null | no | latest review timestamp |
| `createdAt` | datetime | yes | local timestamp |
| `updatedAt` | datetime | yes | local timestamp |

#### 8.3 MediaAsset
| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string (UUID) | yes | primary key |
| `cardId` | string (UUID) | yes | FK to Card |
| `kind` | enum | yes | only `image` in MVP |
| `mimeType` | string | yes | e.g. `image/jpeg` |
| `fileName` | string | no | original file name |
| `sizeBytes` | integer | yes | storage tracking |
| `blobRef` | string | yes | IndexedDB/blob storage reference |
| `width` | integer \| null | no | optional metadata |
| `height` | integer \| null | no | optional metadata |
| `createdAt` | datetime | yes | local timestamp |

#### 8.4 ReviewLog
| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string (UUID) | yes | primary key |
| `cardId` | string (UUID) | yes | FK to Card |
| `deckId` | string (UUID) | yes | denormalized for queries |
| `rating` | enum | yes | `hard`, `again`, `good`, `easy` |
| `previousState` | enum | yes | state before review |
| `newState` | enum | yes | state after review |
| `previousLadderStepIndex` | integer \| null | no | before review |
| `newLadderStepIndex` | integer \| null | no | after review |
| `reviewedAt` | datetime | yes | event timestamp |
| `previousDueAt` | datetime \| null | no | before review |
| `newDueAt` | datetime \| null | no | after review |

#### 8.5 AppSettings
| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string | yes | singleton row, e.g. `app_settings` |
| `globalNewCardsPerDay` | integer | yes | default `10` |
| `globalMaxReviewsPerDay` | integer \| null | no | `null` means unlimited |
| `createdAt` | datetime | yes | local timestamp |
| `updatedAt` | datetime | yes | local timestamp |

### Relationships
- One **Deck** has many **Cards**
- One **Card** has zero or one **MediaAsset** in MVP
- One **Card** has many **ReviewLogs**
- One **AppSettings** singleton configures global defaults

### Suggested indexing strategy
- index Cards by `deckId`
- index Cards by `dueAt`
- compound index by `deckId + dueAt`
- index ReviewLog by `cardId` and `reviewedAt`

---

## 9) UI design principles

### Interaction principles
- Card reveal should feel crisp and immediate.
- Review controls must remain visible and thumb-friendly.
- Primary CTA should always be obvious.
- Destructive actions require confirmation.
- Empty states should be helpful, not sterile.

### Layout principles
- Clear page width limits on desktop
- Comfortable spacing on mobile
- Persistent navigation kept minimal
- Use cards/panels instead of dense tables where possible

### Component guidance
Recommended component groups:
- top app bar
- deck cards
- primary CTA buttons
- card editor form
- modal/dialog for delete confirmation
- segmented settings controls
- review action bar

### Accessibility baseline
- sufficient contrast,
- button labels not icon-only where ambiguity is possible,
- keyboard support on desktop,
- touch target size appropriate for iPhone,
- semantic HTML and accessible dialogs.

### Suggested MVP wireframes (conceptual)

#### Home / Decks
```text
+----------------------------------+
| Offline Flashcards               |
| [ + New Deck ]                   |
|----------------------------------|
| English                          |
| Due: 12   New: 10   [ Open ]     |
|----------------------------------|
| Ukrainian                        |
| Due: 4    New: 10   [ Open ]     |
|----------------------------------|
| Terms                            |
| Due: 0    New: 3    [ Open ]     |
+----------------------------------+
```

#### Deck Details
```text
+----------------------------------+
| < Back   English                 |
| Due today: 12   New today: 10    |
| [ Start Review ] [ Add Card ]    |
|----------------------------------|
| Cards                            |
| hello -> привет                  |
| obscure -> unclear, hidden       |
| ...                              |
+----------------------------------+
```

#### Study Session
```text
+----------------------------------+
| English                          |
| Card 3 / 22                      |
|----------------------------------|
| FRONT                            |
| "obscure"                        |
|                                  |
| [ Show Answer ]                  |
|----------------------------------|
| BACK (after reveal)              |
| "unclear, hidden from view"      |
| [optional image]                 |
|----------------------------------|
| [Hard] [Again] [Good] [Easy]     |
+----------------------------------+
```

---

## 10) Recommended technical stack

### Recommended MVP stack
**Frontend**
- React
- TypeScript
- Vite

**Styling / UI**
- Tailwind CSS
- shadcn/ui
- icon library such as Lucide

**Offline / PWA**
- `vite-plugin-pwa`
- Workbox under the hood
- service worker for app-shell caching

**Local data**
- IndexedDB
- Dexie as IndexedDB wrapper

**Forms / validation**
- React Hook Form
- Zod (optional but recommended)

**State / data flow**
- lightweight local state, e.g. Zustand or React state + Dexie queries
- avoid overengineering for MVP

**Hosting**
- static hosting only for MVP, e.g. Vercel / Cloudflare Pages / Netlify
- no backend required for core MVP

### Why this stack is recommended
1. **Fits offline-first well**  
   No server needed for core flows.
2. **Fast iteration**  
   Good fit for “Codex builds it from prompts” workflow.
3. **Modern UI quality**  
   Tailwind + shadcn/ui can deliver the visual polish the founder wants.
4. **Scales reasonably**  
   Easy to extend later with backend sync.
5. **Simple deployment**  
   Static deployment reduces cost and operational burden.

### Alternatives considered

#### Alternative A — Next.js from day one
**Pros**
- future-ready full-stack path,
- built-in routing and server options.

**Cons**
- unnecessary complexity for a local-only offline-first MVP,
- SSR/server features are not valuable yet.

**Recommendation**
- not recommended for MVP,
- reconsider only when sync, auth, or multi-user product needs become real.

#### Alternative B — React Native / Expo
**Pros**
- closer-to-native mobile experience,
- easier access to device APIs later.

**Cons**
- adds mobile-app complexity too early,
- weakens the “one PWA for desktop + iPhone” MVP strategy.

**Recommendation**
- not recommended for MVP,
- could become relevant later if App Store distribution becomes a goal.

### Future backend recommendation (post-MVP)
When sync becomes the next priority:
- **Recommended path:** Supabase
- Why:
  - auth available if needed later,
  - Postgres for data model,
  - storage for media,
  - good DX for fast product iteration.

Other possible options:
- Firebase / Firestore,
- Convex,
- custom backend with Postgres.

---

## 11) Security considerations

### MVP security posture
Since the MVP is local-only and single-user:
- no authentication is required,
- no server-side attack surface is required for core flows,
- data privacy is mostly a local-device concern.

### Practical security decisions
- No account system in MVP
- No cloud sync in MVP
- No PIN / Face ID in MVP
- All data stored locally on device

### Risks to acknowledge
1. **Local data loss risk**
   - no backup/restore in MVP
   - browser/device storage can be cleared by user or OS
2. **PWA storage limitations**
   - mobile browsers may impose storage constraints
3. **Image storage growth**
   - large images can bloat local database

### Mitigations
- communicate clearly that data is stored locally on the current device,
- compress images client-side,
- later prioritize backup/sync after MVP validation,
- recommend installed PWA usage for best offline behavior on iPhone.

---

## 12) Scalability considerations

### MVP scale assumptions
The first version should comfortably handle:
- dozens of decks,
- thousands of cards,
- one image per card for a smaller subset of cards,
- fast daily study on one user’s devices.

### Likely scaling bottlenecks
1. Local storage growth due to images
2. Query performance if card list grows too large without indexes
3. Sync complexity once multiple devices are introduced
4. Merge/conflict handling after offline edits on multiple devices

### Recommendations
- keep data model sync-friendly from the start:
  - stable UUIDs,
  - timestamps,
  - append-only review logs.
- avoid irreversible schema shortcuts that block future sync.
- maintain explicit separation between:
  - app settings,
  - content entities,
  - review events.

---

## 13) Technical challenges and mitigation plan

### Challenge 1 — Reliable offline support on iPhone PWA
**Risk:** PWA behavior on iOS can be more constrained than desktop.

**Mitigation**
- keep MVP app-shell simple,
- test installation flow on actual iPhone,
- cache only essential shell assets,
- verify reopen behavior offline,
- keep expectations clear: device-local, no sync.

### Challenge 2 — Local image storage
**Risk:** large images can degrade storage and performance.

**Mitigation**
- compress on import,
- cap image dimensions,
- store metadata,
- allow image removal from card editor.

### Challenge 3 — Scheduling correctness
**Risk:** spaced repetition logic can feel wrong if edge cases are inconsistent.

**Mitigation**
- make algorithm deterministic,
- write test cases for all 4 ratings,
- log every review event,
- keep ladder model simple in MVP.

### Challenge 4 — Future sync migration
**Risk:** MVP data model becomes hard to migrate once sync is added.

**Mitigation**
- use UUIDs from day one,
- keep `createdAt` and `updatedAt`,
- store review history separately,
- avoid depending on ephemeral client-only IDs.

---

## 14) Milestones / development phases

### Milestone 0 — Product setup and design direction
Deliverables:
- design direction approved,
- information architecture agreed,
- technical stack locked,
- initial routing and component system scaffolded.

### Milestone 1 — Foundation
Scope:
- app shell,
- PWA setup,
- local database setup,
- deck CRUD,
- card CRUD,
- image upload for Back.

Definition of done:
- user can install/open the app,
- user can create decks and cards,
- data persists locally after reload.

### Milestone 2 — Study engine
Scope:
- session queue,
- reveal flow,
- 4 review actions,
- ladder-based scheduling,
- due-first behavior,
- new-card daily limits.

Definition of done:
- user can run full study sessions,
- due dates update correctly,
- cards reappear according to the selected rating.

### Milestone 3 — Settings and polish
Scope:
- global limits,
- per-deck override,
- deck counters,
- validation,
- delete confirmations,
- loading/empty states,
- responsive polish.

Definition of done:
- study settings work consistently,
- UX is stable on iPhone and desktop,
- app looks like a coherent product.

### Milestone 4 — Hardening for personal daily use
Scope:
- bug fixes,
- edge-case handling,
- image storage optimization,
- install UX,
- QA on iPhone.

Definition of done:
- founder can use the app daily with confidence.

---

## 15) Suggested sprint mapping

### Sprint 1
- Project setup
- Design system setup
- Routing
- Local DB schema
- Home / Decks
- Create/Edit/Delete deck

### Sprint 2
- Card CRUD
- Deck detail page
- Single image upload
- Local persistence QA

### Sprint 3
- Study session UI
- Flip flow
- Queue builder
- Ladder scheduling logic
- Review logging

### Sprint 4
- Global settings
- Per-deck overrides
- Counts and limits
- UX polish
- Offline testing / install guidance

---

## 16) Future expansion opportunities

### Phase 2 priorities
1. **Device sync**
   - desktop ↔ iPhone
   - eventual conflict resolution strategy
2. **Anki import**
   - migrate existing library
3. **Yomitan / browser integration**
   - quick capture from browser content
4. **Statistics**
   - review streaks, retention, deck activity
5. **Reading tools / Book Reader**
   - broader study ecosystem
6. **Backup/export/restore**
   - local safety and transfer between devices

### Future feature ideas
- audio attachments,
- TTS,
- multiple images per card,
- tags,
- search,
- bulk add,
- mixed review mode across decks,
- study filters,
- spaced repetition formula improvements,
- native wrapper or App Store distribution.

---

## 17) Open product decisions intentionally deferred
These decisions are postponed until after MVP validation:
- exact sync architecture,
- import formats and migration rules,
- public multi-user positioning,
- premium/business model,
- analytics model,
- advanced scheduling formula,
- native iOS app path.

---

## 18) Recommended documentation links for engineers

Use official docs as primary implementation references:

- React documentation: https://react.dev/
- Vite documentation: https://vite.dev/
- vite-plugin-pwa documentation: https://vite-pwa-org.netlify.app/
- Workbox documentation: https://developer.chrome.com/docs/workbox/
- IndexedDB (MDN): https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Dexie documentation: https://dexie.org/docs/
- Service Worker / offline basics (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/

---

## 19) Final recommendation

### Best implementation recommendation for MVP
Build this as a **frontend-only offline-first PWA** using:
- **React + TypeScript + Vite**
- **Tailwind + shadcn/ui**
- **IndexedDB + Dexie**
- **PWA plugin + service worker**
- **static hosting**
- **no backend in MVP**

### Why this is the best fit
It matches the product goals:
- fast to ship,
- visually modern,
- low operational cost,
- works on desktop and iPhone,
- does not overcomplicate sync before sync is actually needed,
- leaves room for a future serious product.

---

## 20) Executive summary
This MVP should not try to beat Anki on feature depth.  
It should beat the founder’s current experience on:
- **focus**
- **speed**
- **offline availability**
- **interface quality**
- **daily usability**

That is the right product strategy for version 1.
