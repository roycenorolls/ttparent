# Face-match suggestions for teacher-side child tagging

## Problem

Teachers already tag children per photo on the parent updates they post,
via the manual checklist screen built in
[2026-08-03-teacher-side-child-tagging-design.md](2026-08-03-teacher-side-child-tagging-design.md)
(`admin/parent_update_tag.php` → `ops/parent_update_tag_save.php`, backed by
`parent_update_media_child`). That spec explicitly deferred automated face
detection, leaving three conditions for revisiting it: explicit per-child
parental consent before any reference photo is used for recognition, a
vendor decision, and a confidence bar low enough that teachers are
reviewing suggestions rather than trusting them outright — face-recognition
accuracy on young children is materially worse than on adults.

This spec adds that suggestion layer. It leaves the manual tagging flow's
authorization checks, tables, and write pattern from the 2026-08-03 spec
untouched, and only pre-fills which boxes start checked — the one addition
to that flow is a single tracking column (`parent_updates.tags_reviewed_at`,
below) needed to make "don't re-suggest after review" work correctly.

## Consent & data model

Every enrolled child already has a registration ID photo
(`ops/getphoto.php?cid=X`, uploaded via `admin/editregistration.php`) and an
existing `photo_restriction` flag (`admin/print_photo_restriction.php`)
opting some children out of photo use entirely. The registration photo was
never collected for biometric matching, so reusing it for that purpose
needs its own, new consent — separate from, and layered on top of,
`photo_restriction`.

New column, mirroring the existing `photo_restriction` pattern:

```sql
ALTER TABLE child ADD COLUMN face_match_consent ENUM('no','yes') NOT NULL DEFAULT 'no';
```

Two rules enforced at the API layer (not just hidden in UI):

- A child with `photo_restriction='yes'` can never have
  `face_match_consent='yes'` — checked at the point consent is set, so a
  crafted request can't set consent directly and bypass the UI.
- Only children with `face_match_consent='yes'` are ever indexed into AWS
  Rekognition or ever appear as a suggestion. No consent means invisible to
  this feature entirely — same as if the feature didn't exist for that
  child.

Consent is captured self-service in the parent app rather than recorded
second-hand by staff — the strongest consent story available, since it's a
direct, logged, in-app action by the account holder. There is no
child-profile/settings screen in the frontend today (`parent-app/src/app/`
has `card`, `gallery`, `schedule`, `login` — no settings route), so this is
net-new UI, not an extension of an existing one:

- **Frontend**: a new `parent-app/src/app/settings/page.jsx` route (matching
  the existing convention — every current route is `.jsx`, not `.tsx`,
  e.g. `gallery/page.jsx`, `card/page.jsx`), listing
  the parent's own children (same child list `ChildSwitcher.jsx` already
  sources) with a per-child consent toggle and explanatory copy covering
  what the photo is used for and that it can be withdrawn at any time.
- **Backend**: a new endpoint following the existing `/parent/child/{id}`
  naming convention in `routes/api.php` —
  `PATCH /parent/child/{id}/face-match-consent`, routed to a new
  `ParentController::setFaceMatchConsent` method, inside the same
  `auth:sanctum` group as the other parent routes. It re-derives `$pid`
  from the authenticated session the same way `childProfile()` does, and
  rejects the request if `$id` isn't one of that parent's own children —
  a parent must never be able to flip consent for a child that isn't
  theirs.

On `'yes'`, the endpoint triggers indexing (below) before persisting the
column — see error handling. On `'no'`, it persists the column and deletes
the `child_face_index` row immediately and unconditionally, then makes a
best-effort (non-blocking, logged-not-retried) call to clean up the
AWS-side vector — see error handling for why that split is safe.

New table mapping a consenting child to their AWS-side face vector:

```sql
CREATE TABLE IF NOT EXISTS child_face_index (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  cid                 INT NOT NULL,
  collection_id       VARCHAR(64) NOT NULL,
  rekognition_face_id VARCHAR(64) NOT NULL,
  indexed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cid (cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

One row per consenting child. AWS Rekognition Face Collections store a
mathematical vector derived from the photo, not the photo itself, once
indexed — worth including in the parent-facing consent copy.

## System boundary: all AWS calls live in Laravel

Every Rekognition call — `IndexFaces`, `DeleteFaces`, `SearchFacesByImage`
— is made from `parent-app-api` (Laravel), the only place in this codebase
with real AWS credentials configured (`AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY` in `services.php`). The legacy admin app
(`C:\wamp64\www\tutortime\admin`, `ops`) does have its own AWS SDK vendored
(`inc/R2Uploader.php` uses it against Cloudflare R2), but only with R2's
S3-compatible credentials — a different key pair, incompatible with
Rekognition, which is AWS-only. Adding real AWS credentials to the legacy
app's `config/secrets.php` just to duplicate this logic there would mean
maintaining the same secret in two places; keeping it in Laravel avoids
that.

Since suggestion generation is triggered from `admin/parent_update_tag.php`
(legacy PHP, no AWS access), that page calls a new **internal** Laravel
endpoint server-to-server to do the actual matching work — the same
pattern already used for `TourBookingController` (`POST /api/tour/book`,
gated by an `X-Api-Key` header rather than Sanctum, since there's no parent
session to authenticate against for an admin-to-API call):

- `POST /api/internal/updates/{update_id}/suggestions`, gated by
  `X-Api-Key` checked via `hash_equals` against a new
  `config('services.suggestions.key')` — the exact `TourBookingController`
  pattern, not just a similar one. Accepts a required string `school` field
  in the body (the same key `config('schools')` and `DB::connection()` use,
  e.g. `'kemang'`, `'pi'` — **not** the numeric `scid`, which is a
  different identifier that only exists on the school-DB side and has no
  meaning to Laravel's connection resolution). The legacy app already
  computes this exact string as `$GLOBALS['school_key']`
  (`config/config.php:165`, in the main app, outside this repo) — the DB
  prefix stripped from the school's dbname — so passing it through is
  direct, not a new lookup. Laravel validates it with
  `array_key_exists($school, config('schools'))` before calling
  `DB::connection($school)`, identically to how `TourBookingController`
  validates its own `school` field, including the same `$request->validate([...])`
  shape (`school` required string, `update_id` from the route). Routed to
  a new `SuggestionController::generate`, under the same
  `throttle:20,1` middleware group `TourBookingController` uses — this
  endpoint is called at most once per tag-page visit, so that ceiling is
  generous, not a real constraint.
- This endpoint performs the full suggestion-generation algorithm below
  (search, resolve, filter, threshold) and **writes its results directly
  into `parent_update_media_suggestion`** in that school's MySQL DB — the
  same DB `admin/parent_update_tag.php` already queries directly via
  `mysqli`, exactly as `ParentController` already reads `parent_updates`/
  `parent_update_media`/`parent_update_media_child` directly from the same
  per-school databases the legacy app writes to. Laravel computes and
  persists; it does not need to return the suggestions in the response for
  the legacy page to use them.
- `admin/parent_update_tag.php` calls this endpoint once (synchronously,
  blocking its own render — same latency shape as if it had called AWS
  directly) only when `tags_reviewed_at IS NULL` and at least one media row
  has no corresponding `parent_update_media_suggestion` row yet, then reads
  suggestions for rendering the same way it reads everything else: a direct
  `mysqli` query against `parent_update_media_suggestion`, no further calls
  to Laravel needed.

**Image bytes**: for `IndexFaces`, Laravel fetches the registration photo
over plain HTTP from `ops/getphoto.php?cid={id}` — already an
unauthenticated, publicly-fetchable endpoint (no session check;
`<img src>` tags reference it directly today), so this is consistent with
how the photo is already exposed, not a new exposure this spec introduces.
For `SearchFacesByImage`, Laravel fetches each photo's bytes from its
Cloudflare Images URL (`imagedelivery.net`, the same CDN URL
`ParentController::thumbnailUrl()` already builds) — Rekognition's image
parameter requires raw bytes or an S3 object, not an arbitrary external
URL, so this is a real HTTP fetch per photo, not a URL passthrough.

## Indexing pipeline

One Rekognition Face Collection **per school** (`collection_id` scoped to
`scid`, matching the existing per-school-DB partitioning), not one global
collection — a photo from one school can never suggest a child from
another, and per-school collections stay small, which helps match quality.

Indexing only happens in direct reaction to a consent change, no batch
backfill job:

- Consent flips to `'yes'` → the endpoint first re-checks
  `photo_restriction != 'yes'` for that child (the absolute block from
  above; the frontend toggle should already prevent this state, but the
  server-side check is what actually enforces it) and rejects the request
  if it fails. If a `child_face_index` row already exists for this `cid`
  (e.g. a retried/duplicate `PATCH` after a slow first response) the call
  is a no-op that returns success immediately rather than attempting a
  second `IndexFaces` — `uq_cid` makes a second insert impossible anyway,
  so this is just avoiding a wasted AWS call. Otherwise, Laravel calls
  `IndexFaces` against that school's collection using the existing
  registration photo, stores the returned face id in `child_face_index`,
  **then** persists `face_match_consent='yes'`. If `IndexFaces` throws (AWS
  timeout, throttling, or a missing/unusable registration photo —
  `getphoto.php` never 404s, it returns HTTP 200 with a `notavailable.jpg`
  placeholder for a child with no photo on file, which Rekognition itself
  rejects as faceless), the endpoint returns an error to the
  parent-app toggle (it visibly fails to turn on, with a "couldn't process
  photo, try again" message) and `face_match_consent` stays `'no'`. This
  ordering is deliberate: it's the only way to guarantee `child_face_index`
  and `face_match_consent='yes'` can never disagree — a parent is never
  shown "consent on" for a child who isn't actually indexed and therefore
  will never be matched.
- Consent flips to `'no'` → the column is set to `'no'` and the
  `child_face_index` row deleted **immediately**, unconditionally. Calling
  `DeleteFaces` to clean up the AWS-side vector is best-effort after that —
  logged on failure, not retried, not blocking the response. This is safe
  because suggestion generation (below) only ever trusts a match if it can
  resolve the returned face id back to a `child_face_index` row; once that
  row is gone, a lingering AWS-side vector can still be *found* by
  `SearchFacesByImage` but can no longer produce a suggestion. Revocation
  is therefore instantaneous from the product's perspective regardless of
  AWS availability, at the cost of an occasional orphaned vector in AWS
  that a future cleanup pass could sweep (not built here — see Out of
  scope).

**Disenrollment** isn't a consent action but has the same effect and is
easy to miss: wherever a child's enrollment is withdrawn (`child.status`
flipping to `'disabled'`) should also de-index, the same as an explicit
consent-off. This has **two** call sites, not one — `ops/inactive.php`
handles an immediate-effective-date disenrollment, but a future-dated one
is instead applied later by the daily cron subroutine in
`inc/functions.php` (around line 667). Both paths must trigger the same
de-index effect; hooking only the immediate path would leave every
future-dated disenrollment's child searchable until someone notices.
Otherwise a disenrolled child's face stays searchable indefinitely with no
parent-facing toggle left to turn it off.

## Suggestion generation

This is the algorithm `SuggestionController::generate` (Laravel, see
System boundary above) runs when `admin/parent_update_tag.php` calls it.
That call happens on any visit to the tag page while `tags_reviewed_at IS
NULL` for that update, when at least one media row still has no cached
suggestion — not synchronously during upload (`parent_update_save.php`
stays exactly as fast as it is today) and not as a background job (this
codebase has no queue infrastructure; adding one solely for this would be
disproportionate to the workload — a handful of photos per post, opened at
most a few times before it's reviewed). Because of the caching in step 5
below, only the first such visit actually triggers AWS calls for a given
photo — later pre-review visits find every media row already cached and
skip calling the endpoint entirely — so "first visit" is the common case
in practice even though the gate itself is `tags_reviewed_at`, not visit
count.

For each media row with no cached suggestion yet:

1. Fetch the photo's bytes from its Cloudflare Images URL and call
   `SearchFacesByImage` against the school's collection.
2. **Resolve each returned `rekognition_face_id` back to a `cid` via
   `child_face_index`.** A result AWS returns for a face id with no
   matching row — because the child's consent was revoked (and the row
   deleted) after indexing but before this search — is discarded here,
   before it can become a suggestion. This is the mechanism the Indexing
   pipeline section's revocation guarantee depends on; without this step
   as an explicit part of generation, a revoked child could still surface
   as a suggestion off a lingering AWS-side vector.
3. Filter the resolved `cid`s to the update's class roster — a match for a
   child not enrolled in this class is discarded even if AWS returns it;
   cross-class matches are noise, not signal.
4. Keep only matches at **≥80% confidence**. Per the original spec's
   caution about accuracy on young children, under-suggesting is the safer
   failure mode than over-suggesting.
5. Cache accepted matches in a new table so a later pre-review visit, or a
   second teacher opening the same page, never re-calls AWS for media
   already processed.

If `SearchFacesByImage` throws for a given photo (AWS timeout, throttling,
transient error), `SuggestionController::generate` catches it per-photo and
continues with the rest of the batch — that photo simply gets zero
suggestions for this call. If the endpoint itself is unreachable (Laravel
down, network error, `X-Api-Key` misconfigured), `admin/parent_update_tag.php`
catches that at the call site and renders the page with **zero**
suggestions rather than failing to load — a teacher must always be able to
reach the manual checklist even if the suggestion layer is entirely down,
since manual tagging is the feature that already works today and this is
strictly additive to it. Either way, the failure is logged but never blocks
the teacher from tagging manually. Because the cache table only ever stores
*accepted matches* (never "we checked and found nothing" or "we tried and
it failed"), a failed or genuinely-empty lookup isn't distinguished from
each other and both retry automatically on the next pre-review visit — the
cost of that is bounded by the same `tags_reviewed_at` gate, since
suggestions (and therefore the AWS calls generating them) stop being
requested at all
once an update has been through a save.

```sql
CREATE TABLE IF NOT EXISTS parent_update_media_suggestion (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  media_id   INT NOT NULL,
  cid        INT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_child (media_id, cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## UI integration

`admin/parent_update_tag.php`'s existing checkbox grid gains one visual
state. For each roster checkbox, in priority order:

1. **Already confirmed** (a row exists in `parent_update_media_child`) →
   checked, plain style — exactly today's behavior.
2. **Suggested, not yet confirmed, and this update has never been through a
   save** (see gate below) → pre-checked, flagged orange, with the
   confidence percentage shown (`✨ 91%`).
3. **Neither** → unchecked, plain — today's behavior.

The gate in case 2 must be a real "has this update been reviewed" signal,
not inferred from whether `parent_update_media_child` has any rows —
presence-of-rows breaks the moment a teacher's first save legitimately
confirms zero children (every suggestion rejected, or the photos genuinely
have no taggable child), since that state is indistinguishable from
"never reviewed" and suggestions would silently reappear on the next
visit, resurrecting a guess the teacher already explicitly rejected. New
column instead:

```sql
ALTER TABLE parent_updates ADD COLUMN tags_reviewed_at TIMESTAMP NULL DEFAULT NULL;
```

`ops/parent_update_tag_save.php` sets `tags_reviewed_at = NOW()` on every
save, unconditionally — including a save that confirms zero children. The
tag page's suggestion step (case 2 above) only runs at all when
`tags_reviewed_at IS NULL`; once it's set, the page renders purely from
`parent_update_media_child`, forever, for that update.

The submit path is otherwise unchanged: `tags[media_id][]` checkbox names,
the ownership/`scid` checks, and the delete-then-insert write pattern all
stay exactly as the 2026-08-03 spec defined them — the only addition is
the one `UPDATE ... SET tags_reviewed_at = NOW()` above. A teacher
unchecking a wrong suggestion produces the same `parent_update_media_child`
rows as a teacher who never saw a suggestion at all; nothing downstream of
the save can tell AI was involved.

## Guardrails & edge cases

- **Revoked consent doesn't retroactively untag.** `face_match_consent`
  only gates future matching (is this child indexed for search going
  forward), not visibility of tags a teacher already confirmed on past
  posts. Those live in `parent_update_media_child` regardless of how they
  originated, and stay filtered by each parent's own `authorizedScope()`
  exactly as today.
- **`photo_restriction='yes'` is an absolute block** on ever setting
  `face_match_consent='yes'` for that child, enforced server-side — but
  `photo_restriction` is independently editable later, in
  `admin/editregistration.php`, by staff who have no visibility into
  whether this feature's consent was already granted. Setting
  `photo_restriction='yes'` on a child who already has
  `face_match_consent='yes'` must also flip consent to `'no'` and de-index
  them (same effect as a parent revoking consent, or a disenrollment,
  above) — otherwise a photo-restricted child stays face-matchable, which
  is the exact case this flag exists to prevent.
- **Stale reference photo** is an accepted, unmitigated limitation: if a
  child's registration photo is old, match quality degrades. The 80%
  threshold is the only defense; not solved further here.
- **Cost is negligible** at this scale — Rekognition bills per image
  processed (roughly $0.001–0.01/image); a school posting dozens of photos
  a day is a rounding error.

## Out of scope

- Recognizing staff/adults — children only.
- Retroactively re-scanning already-posted photos when a child's consent
  turns on later — only new uploads get matched going forward.
- Auto-tagging without teacher review — ruled out from the start; every
  suggestion is a pre-fill, never a silent write to
  `parent_update_media_child`.
- Tagging on school-wide/admin posts — inherits the existing tag screen's
  own scope limit (class-level only, per the 2026-08-03 spec).
- Cross-school matching — each school's Rekognition collection is isolated.
- Admin/staff-recorded consent as an alternative intake path — self-service
  in the parent app is the only path in this version.
- A cleanup sweep for AWS-side vectors orphaned by a failed `DeleteFaces`
  call — the occasional leftover is inert (unreachable via
  `child_face_index`, so it can never produce a suggestion) and left for a
  future pass rather than built here.
- Data-retention/destruction-schedule obligations some biometric-data
  statutes (BIPA-style) impose beyond "get consent first" — the 2026-08-03
  spec flagged the general legal surface; this spec addresses consent and
  revocation but not a mandated deletion timeline. Worth a deliberate legal
  read before shipping, not solved here.

## Related

[2026-08-03-teacher-side-child-tagging-design.md](2026-08-03-teacher-side-child-tagging-design.md),
[2026-08-03-per-child-update-filtering-design.md](2026-08-03-per-child-update-filtering-design.md)
