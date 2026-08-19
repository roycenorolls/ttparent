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

This spec adds that suggestion layer. It changes nothing about the manual
tagging flow itself — every existing check, table, and endpoint from the
2026-08-03 spec stays exactly as it is. This is purely a pre-fill on top.

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

Consent is captured self-service in the parent app (a new toggle on the
child's profile, defaulting off) rather than recorded second-hand by staff
— the strongest consent story available, since it's a direct, logged,
in-app action by the account holder. `parent-app-api` exposes the endpoint
that flips the column and, on `'yes'`, triggers indexing (below); on
`'no'`, triggers de-indexing.

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

## Indexing pipeline

One Rekognition Face Collection **per school** (`collection_id` scoped to
`scid`, matching the existing per-school-DB partitioning), not one global
collection — a photo from one school can never suggest a child from
another, and per-school collections stay small, which helps match quality.

Indexing only happens in direct reaction to a consent change, no batch
backfill job:

- Consent flips to `'yes'` → Laravel calls `IndexFaces` against that
  school's collection using the existing registration photo, stores the
  returned face id in `child_face_index`.
- Consent flips to `'no'` → calls `DeleteFaces` for that child's stored
  face id, removes the row.

This means there is never a stale reference photo sitting in AWS for a
child whose consent state has changed.

## Suggestion generation

Runs lazily, on first visit to `admin/parent_update_tag.php` for a given
update — not synchronously during upload (`parent_update_save.php` stays
exactly as fast as it is today) and not as a background job (this codebase
has no queue infrastructure; adding one solely for this would be
disproportionate to the workload — a handful of photos per post, opened
once per post).

On that first visit, for each media row with no cached suggestion yet:

1. Call `SearchFacesByImage` against the school's collection.
2. Filter results to the update's class roster — a match for a child not
   enrolled in this class is discarded even if AWS returns it; cross-class
   matches are noise, not signal.
3. Keep only matches at **≥80% confidence**. Per the original spec's
   caution about accuracy on young children, under-suggesting is the safer
   failure mode than over-suggesting.
4. Cache accepted matches in a new table so a second visit, or a second
   teacher opening the same page, never re-calls AWS for media already
   processed:

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
2. **Suggested, not yet confirmed, and this is the update's first tag-page
   visit** (no rows at all yet in `parent_update_media_child` for this
   update) → pre-checked, flagged orange, with the confidence percentage
   shown (`✨ 91%`).
3. **Neither** → unchecked, plain — today's behavior.

The "first visit" gate in case 2 is load-bearing, not cosmetic: once an
update has been saved once, the page must render purely from confirmed
tags and never re-apply a cached suggestion. Without this, unchecking a
wrong suggestion and saving would only be a temporary correction — the
same wrong box would silently re-check itself the next time the teacher
(or another teacher/admin) revisits the page via the "Tag children" link,
resurrecting a guess the teacher already explicitly rejected.

The submit path is unchanged: `tags[media_id][]` checkbox names, the
ownership/`scid` checks, and `ops/parent_update_tag_save.php` all stay
exactly as the 2026-08-03 spec defined them. A teacher unchecking a wrong
suggestion produces the same data as a teacher who never saw a suggestion
at all — `parent_update_tag_save.php` needs zero changes and has no way to
tell AI was involved.

## Guardrails & edge cases

- **Revoked consent doesn't retroactively untag.** `face_match_consent`
  only gates future matching (is this child indexed for search going
  forward), not visibility of tags a teacher already confirmed on past
  posts. Those live in `parent_update_media_child` regardless of how they
  originated, and stay filtered by each parent's own `authorizedScope()`
  exactly as today.
- **`photo_restriction='yes'` is an absolute block** on ever setting
  `face_match_consent='yes'` for that child, enforced server-side.
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

## Related

[2026-08-03-teacher-side-child-tagging-design.md](2026-08-03-teacher-side-child-tagging-design.md),
[2026-08-03-per-child-update-filtering-design.md](2026-08-03-per-child-update-filtering-design.md)
