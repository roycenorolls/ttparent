# Per-child filtering of shared updates (feed + gallery)

## Problem

Teachers share updates (photos, videos, PDFs, announcements) about individual
children. Parents with more than one child currently see every child's
updates mixed together in both:

- the "Latest updates" feed on the home page ([UpdatesFeed.jsx](../../../src/components/UpdatesFeed.jsx)), and
- the full gallery ([GalleryGrid.jsx](../../../src/components/GalleryGrid.jsx)),

with no way to narrow either view down to one child, even though
[ChildSwitcher.jsx](../../../src/components/ChildSwitcher.jsx) already exists and is used elsewhere on the
home page (profile card, today's schedule) to scope data to the active
child.

This is a **frontend-only** change. The backend (`/parent/updates`) is out
of scope for this repo; the design assumes the response shape described
below and degrades gracefully if the backend hasn't shipped it yet.

## Data assumption

Each update object returned by `api.updates()` is assumed to carry a
`child_id` field identifying which child it was shared about:

```json
{ "id": 1, "title": "...", "type": "photo", "child_id": 42, "created_at": "...", ... }
```

- If `child_id` is present, an update is only shown when the active child
  matches.
- If `child_id` is missing or `null`, the update is treated as visible for
  **every** child (e.g. class-wide announcements, or updates predating the
  backend change). This avoids hiding content if the backend field rolls
  out gradually or some updates are intentionally not child-specific.

## Home page feed

`src/app/page.jsx` already fetches `updates` once on mount and tracks
`activeId` (the selected child) for other cards. No new API call is added.

Change: filter `updates` by `activeId` (using the rule above) before
passing them to `<UpdatesFeed>`. This mirrors how `child`/`status`/`slots`
already key off `activeId`.

`UpdatesFeed.jsx` itself is unchanged — it stays a presentational component
that renders whatever list it's given.

## Gallery page

`src/app/gallery/page.jsx` currently fetches only `api.updates()` and has
no concept of "which child." Changes:

- Also fetch `api.membership()` (the same call `page.jsx` already makes) to
  get the parent's `children` list.
- Add local state `activeId`, defaulting to the first child once children
  load.
- Render `<ChildSwitcher>` above the existing type-filter pill row
  (All / Photos / Videos / Reports).
- Pass `activeId` down to `GalleryGrid`.

`ChildSwitcher` is reused as-is — it already renders nothing when a parent
has one child or fewer, so single-child parents see no UI change.

## GalleryGrid filtering

`GalleryGrid.jsx` gains an `activeId` prop. The existing type filter and the
new child filter combine with AND semantics (e.g. "Photos" + "Aisha" shows
only Aisha's photos). The child-filter step uses the same
present-vs-missing `child_id` rule described above.

## Out of scope

- Any backend/API changes (adding `child_id` to `/parent/updates`,
  supporting a `?child_id=` query param, etc.).
- Pagination or server-side filtering — updates continue to be fetched in
  one shot and filtered client-side, matching current behavior.
- Changes to the fullscreen update viewer (`gallery/[updateId]/page.jsx`).
