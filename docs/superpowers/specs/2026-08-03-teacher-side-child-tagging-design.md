# Teacher-side child tagging for shared updates

## Problem

Teachers post updates (photo batches, videos, PDFs, announcements) to
parents from the legacy PHP admin app (`admin/parent_comms.php` →
`ops/parent_update_save.php`), backed by raw MySQL tables `parent_updates`
and `parent_update_media` (schema: `omake/parent_updates_schema.sql`).

Updates are scoped only to a whole class (`caid`) or, for admins, the whole
school (`caid = NULL`) — there is no concept of which individual child(ren)
appear in a given post. A 20-photo "Fun Friday" batch can't be narrowed down
to just the shots a particular child is in.

This spec adds manual, per-photo child tagging on the teacher side.
Automated face detection is explicitly **out of scope** here (see below).

## Amendment to the per-child-filtering spec

The earlier spec
([2026-08-03-per-child-update-filtering-design.md](2026-08-03-per-child-update-filtering-design.md))
assumed each update carries a single `child_id` scalar. That assumption
predates this investigation and doesn't fit the real data model: tagging
happens per photo/video, and a single update can be relevant to several
different children depending on which photos they're in.

**Revised contract**: `ParentController::updates()` and `updateDetail()`
expose a `child_ids` array per update — the children tagged on that update's
media, **intersected with the requesting parent's own children**. An
empty/absent array means "not tagged for any of this parent's children,"
which keeps the existing fallback: visible to every child of theirs, same as
an update with no tags today.

The intersection is a data-minimization requirement, not an optimization:
the raw tag set for a class photo batch contains the `cid`s of other
families' children, and the frontend never needs them — it only asks "is my
active child in this?" Returning the union unfiltered would hand every
parent stable internal identifiers for their child's classmates.

Frontend filtering (in the parent-app repo) changes from:
```js
update.child_id == null || update.child_id === activeId
```
to:
```js
!update.child_ids?.length || update.child_ids.includes(activeId)
```
This is a small change confined to the same filter step already designed in
the earlier spec (Home feed pre-filter, `GalleryGrid`'s child-filter step) —
no change to *where* filtering happens, only to the shape of the field it
reads.

## Data model

New table, added the same way `parent_updates_schema.sql` added its tables
(raw SQL, run per school DB, `CREATE TABLE IF NOT EXISTS`):

```sql
CREATE TABLE IF NOT EXISTS parent_update_media_child (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  media_id   INT NOT NULL,   -- FK to parent_update_media.id
  cid        INT NOT NULL,   -- FK to child.cid
  tagged_by  INT NOT NULL,   -- staff.sid who applied the tag
  tagged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_child (media_id, cid),
  KEY idx_cid (cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

No separate `media_id` index: `uq_media_child (media_id, cid)` already
serves `WHERE media_id IN (…)` as a leftmost prefix, so a standalone
`idx_media_id` would only add write cost. `idx_cid` supports the reverse
lookup (everything tagged for one child).

A media row with zero tag rows is untagged → whole-class visibility
(current behavior, unchanged). This file lives at
`omake/parent_update_tags_schema.sql`.

Tag rows are not cascaded on delete. `parent_update_delete.php` soft-deletes
the update (`status='deleted'`) and leaves media rows in place, so tags stay
consistent with that model — they simply stop being reachable, because the
parent-facing queries already filter on `pu.status='active'`.

## Teacher-side tagging screen

**Posting stays exactly as it is today.** `parent_comms.php`'s form and
`ops/parent_update_save.php`'s upload/insert logic are unchanged.

New: after a successful save, `parent_update_save.php` redirects to
`admin/parent_update_tag.php?update_id={id}` instead of straight back to
`parent_comms.php?msg=saved` — but only when the update has taggable media
(see "No taggable media" below). This new page:

- **Ownership check first**, following `ops/parent_update_delete.php`'s
  pattern: load the `parent_updates` row for `update_id`, and reject
  (redirect back with an error) unless the acting `sid` is admin or matches
  `pu.teacher_sid`. Without this, any logged-in teacher could load or submit
  tags for another teacher's update by guessing/incrementing `update_id` in
  the URL.

  **The check must also require `pu.scid` to match the acting staff's
  `scid`** — including on the admin branch. This is a deliberate departure
  from `parent_update_delete.php:22-25`, which checks `teacher_sid` only and
  checks nothing at all for admins. A school DB holds several branches
  (`parent_comms.php` scopes its listing with `pu.scid = $scid`), so
  omitting `scid` leaves a cross-branch hole. Don't replicate that gap in
  new code.
- **Cast every incoming id to int.** `update_id` and the posted
  `media_id[]` / `cid[]` arrays all interpolate into raw mysqli strings —
  there are no prepared statements in this codebase. Each array element is
  individually cast (`array_map('intval', …)`) and non-positive values
  dropped before any of it reaches a query.
- Loads the update's media rows (`parent_update_media` where
  `update_id = X`), rendering each photo/video as a thumbnail.
- Loads the class roster for that update's `caid`: a new query — `child_class`
  joined to `child`, filtered by that specific `caid` with
  `status='enabled'` and `pending='no'` (the same predicates
  `authorizedScope()` uses, but a different query — that method finds a
  *parent's own* class `caid`s, it doesn't list a class's children). For a
  school-wide update (`caid IS NULL`), there is no single roster to show —
  tagging is only available for class-scoped updates in this first version.
  Thumbnails must use a downscaled variant, not the stored original. The
  Laravel side already has this logic in
  `ParentController::thumbnailUrl()` (append `/thumbnail` for
  `imagedelivery.net` URLs, `https://videodelivery.net/{id}/thumbnails/thumbnail.jpg`
  for `stream:` paths); the admin page needs its own equivalent helper.
  Without it a 20-photo batch pulls 20 full-resolution originals into one
  page.
- For each thumbnail, a multi-select checklist of that roster lets the
  teacher check off which child(ren) appear in it.
- Submits to a new `ops/parent_update_tag_save.php`, which repeats the same
  ownership + `scid` check, then replaces the tag rows with the checked
  `cid`s, stamping `tagged_by` as the acting `sid`.

`parent_update_tag_save.php` must additionally:

- **Validate every submitted `cid` against the update's class roster** —
  the same roster query the page renders from. The checklist is only a UI
  constraint; a crafted POST could otherwise write a row asserting an
  unrelated child (another class, another branch) appears in a photo. Any
  `cid` not in the roster is dropped. Likewise, every submitted `media_id`
  must be verified to belong to this `update_id`.
- **Write in two statements, not a loop.** One `DELETE` scoped to the
  update's own media ids, then one multi-row `INSERT` of all
  (media_id, cid) pairs. A 20-photo batch against a 15-child roster is up to
  300 pairs; issuing them as individual queries (the style
  `parent_update_save.php` uses for its per-file inserts) would mean 300
  round trips per submit.

**No taggable media**: announcements and most PDFs have zero photo/video
rows. If the saved update has no media rows at all, `parent_update_save.php`
skips the tagging redirect entirely and goes straight to
`parent_comms.php?msg=saved`, same as today. The "Tag children" link added
to the Recent Updates list (below) is likewise only shown for rows with
`media_count > 0`.

Tagging is optional and can be skipped (leaving media untagged = whole-class
visible, matching today's behavior) and can be revisited later: the
"Recent Updates" list in `parent_comms.php` gets a "Tag children" link per
row linking back to `parent_update_tag.php?update_id=X`.

## Parent-facing API changes

`ParentController::updates()` and `updateDetail()` gain a `child_ids` array
per update.

**Query shape matters here.** `updates()` today runs two queries — updates
(`limit(20)`), then all media for those ids via `whereIn`, grouped by
`update_id` in PHP. Tags must follow that same pattern as a **third**
query: `whereIn('media_id', $mediaIds)`, grouped in PHP. Do *not* join
`parent_update_media_child` into the main updates query — update × media ×
tags multiplies rows and would break the `limit(20)`, silently returning
fewer than 20 distinct updates.

The tag query is additionally filtered to `whereIn('cid', $ownCids)`, where
`$ownCids` is the requesting parent's own children (`child` where
`pid = $pid`) — this is the intersection required above, and doing it in
SQL rather than PHP means other families' `cid`s never leave the database.
`child_ids` per update is then the distinct `cid`s remaining across that
update's media.

No change to the authorization boundary itself (an update must still be in
the parent's branch/class scope to be returned at all) — `child_ids` is
purely an additional field for the frontend's own narrowing-by-active-child,
not a new access-control check. That distinction is load-bearing: because
the child filter runs client-side, it must never be the only thing standing
between a parent and content, and this design keeps it that way.

## Face detection — out of scope, noted for later

Automated face detection is not part of this spec. If pursued later, it
should be a *suggestion* layer on top of manual tagging (teacher
confirms/corrects auto-suggested tags), not silent auto-tagging, and would
need, at minimum:

- Explicit parent consent per child before any reference photo is used for
  recognition (biometric data on minors has real legal weight — COPPA,
  Illinois BIPA-style biometric statutes, GDPR-K where applicable).
- A vendor decision (e.g. AWS Rekognition or similar) and a reference photo
  per consenting child.
- A confidence threshold low enough that teachers are reviewing suggestions,
  not trusting them outright — face recognition accuracy on young children
  is materially worse than on adults.

## Known pre-existing gap: CSRF

None of the existing state-changing endpoints (`parent_update_save.php`,
`parent_update_delete.php`) carry a CSRF token, and the new
`parent_update_tag_save.php` inherits that exposure — a cross-site POST
could mistag a teacher's own update. Tagging is low-value as a CSRF target
(it neither publishes nor deletes content), and fixing it properly means
adding tokens app-wide rather than to one new endpoint, so it is recorded
here rather than solved in this spec.

## Out of scope

- Automated face detection (see above).
- App-wide CSRF tokens (see above).
- Tagging on school-wide (`caid IS NULL`) admin posts — no single class
  roster to tag against in this version.
- Any change to the existing upload pipeline (R2/Cloudflare Stream), file
  types, or the existing posting form.
- Photo-level filtering in the parent app gallery (showing only the tagged
  photos within an update) — the amendment above keeps filtering at the
  whole-update level, per the "show if ANY photo matches" decision.
