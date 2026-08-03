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
expose a `child_ids` array per update — the union of every child tagged on
any of that update's media rows. An empty/absent array means "not tagged at
all," which keeps the existing fallback: visible to every child, same as an
update with no tags today.

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
  KEY idx_media_id (media_id),
  KEY idx_cid (cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

A media row with zero tag rows is untagged → whole-class visibility
(current behavior, unchanged). This file lives at
`omake/parent_update_tags_schema.sql`.

## Teacher-side tagging screen

**Posting stays exactly as it is today.** `parent_comms.php`'s form and
`ops/parent_update_save.php`'s upload/insert logic are unchanged.

New: after a successful save, `parent_update_save.php` redirects to
`admin/parent_update_tag.php?update_id={id}` instead of straight back to
`parent_comms.php?msg=saved`. This new page:

- Loads the update's media rows (`parent_update_media` where
  `update_id = X`), rendering each photo/video as a thumbnail.
- Loads the class roster for that update's `caid` — same join pattern
  `ParentController::authorizedScope()` already uses (`child_class` →
  `child`, `status='enabled'`, `pending='no'`), just returning child rows
  instead of `caid`s. For a school-wide update (`caid IS NULL`), there is no
  single roster to show — tagging is only available for class-scoped
  updates in this first version.
- For each thumbnail, a multi-select checklist of that roster lets the
  teacher check off which child(ren) appear in it.
- Submits to a new `ops/parent_update_tag_save.php`, which replaces the tag
  rows for each media_id (delete-then-insert, scoped to that update's own
  media so a teacher can't tag media outside their own class) with the
  checked `cid`s, stamping `tagged_by` as the acting `sid`.

Tagging is optional and can be skipped (leaving media untagged = whole-class
visible, matching today's behavior) and can be revisited later: the
"Recent Updates" list in `parent_comms.php` gets a "Tag children" link per
row linking back to `parent_update_tag.php?update_id=X`.

## Parent-facing API changes

`ParentController::updates()` and `updateDetail()` need to:

1. Join `parent_update_media_child` against the update's media rows.
2. Restrict `authorizedScope()`'s already-existing class/branch scoping —
   unchanged — plus now also compute `child_ids` = distinct `cid`s tagged
   across the update's media, returned as an array field per update.

No change to the authorization boundary itself (an update must still be in
the parent's branch/class scope to be returned at all) — `child_ids` is
purely an additional field for the frontend's own narrowing-by-active-child,
not a new access-control check.

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

## Out of scope

- Automated face detection (see above).
- Tagging on school-wide (`caid IS NULL`) admin posts — no single class
  roster to tag against in this version.
- Any change to the existing upload pipeline (R2/Cloudflare Stream), file
  types, or the existing posting form.
- Photo-level filtering in the parent app gallery (showing only the tagged
  photos within an update) — the amendment above keeps filtering at the
  whole-update level, per the "show if ANY photo matches" decision.
