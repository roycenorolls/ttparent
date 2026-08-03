# Teacher-side child tagging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let teachers tag which child(ren) appear in each photo/video of a posted update, and have the parent app narrow the feed/gallery to the active child using those tags.

**Architecture:** A new MySQL table (`parent_update_media_child`) links `parent_update_media` rows to `child.cid`. A new admin PHP page (`parent_update_tag.php` + `parent_update_tag_save.php`) lets the posting teacher check off children per photo, following the existing `parent_comms.php` / `parent_update_delete.php` ownership-check conventions. The Laravel `ParentController` gains a third query (tags, intersected server-side with the parent's own children) and exposes `child_ids` per update. The Next.js frontend gains the base per-child filter (`activeId` vs `child_ids`) on both the home feed and gallery grid — this plan folds in the still-unimplemented base per-child-filtering spec so the amendment's frontend diff has something to land on.

**Tech Stack:** Raw MySQL (mysqli, no ORM) on the PHP admin side; Laravel query builder on the API side; Next.js/React on the frontend.

**Known pre-existing state, confirmed during research:**
- The multi-class dropdown placeholder described in the spec's "Multi-class teachers" section is **already implemented** at `admin/parent_comms.php:86-92`. No change needed there — skip that task.
- The base per-child-filtering spec (`docs/superpowers/specs/2026-08-03-per-child-update-filtering-design.md`) has **not** been implemented yet — `GalleryGrid.jsx` has no child filter, `page.jsx`/`gallery/page.jsx` don't scope updates by child, and the API doesn't return any child-scoping field. This plan implements that base behavior (using `child_ids` instead of the older single `child_id` design, since the backend never shipped the old shape) as part of Chunk 4, then the tagging UI feeds real data into it.

---

## Chunk 1: Database schema

### Task 1: Create the tagging table migration

**Files:**
- Create: `omake/parent_update_tags_schema.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- TutorTime Parent App — Child tagging on update media
-- Run against each school DB (kemang, pi, bukit, pluit, etc.)
-- ============================================================

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

- [ ] **Step 2: Run it against a local/dev school DB and confirm**

```bash
mysql -u root -p kemang < omake/parent_update_tags_schema.sql
```
Expected: no error; `DESCRIBE parent_update_media_child;` shows the five columns and both keys.

- [ ] **Step 3: Commit**

```bash
git add omake/parent_update_tags_schema.sql
git commit -m "Add parent_update_media_child schema for teacher-side tagging"
```

---

## Chunk 2: Admin tagging screen (PHP)

### Task 2: Redirect to the tagging screen after a save with taggable media

**Files:**
- Modify: `ops/parent_update_save.php:100`

- [ ] **Step 1: Replace the unconditional redirect with a conditional one**

Current (line 100):
```php
header('Location: ../admin/parent_comms.php?msg=saved');
exit;
```

New — insert *before* this line, right after the upload loop closes (after line 98's `}`), a check for whether any media rows exist for this update, then branch the redirect:

```php
$has_media = mysqli_query($conn, "SELECT id FROM parent_update_media WHERE update_id=$update_id AND status='active' LIMIT 1");
if ($has_media && mysqli_num_rows($has_media) > 0) {
    header("Location: ../admin/parent_update_tag.php?update_id=$update_id");
    exit;
}

header('Location: ../admin/parent_comms.php?msg=saved');
exit;
```

- [ ] **Step 2: Manually verify** — post an announcement (no files) and confirm it still redirects to `parent_comms.php?msg=saved`; post a photo batch and confirm it redirects to `parent_update_tag.php?update_id=X` (page doesn't exist yet, so expect a 404/blank until Task 3 lands — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add ops/parent_update_save.php
git commit -m "Redirect to tagging screen after posting an update with media"
```

### Task 3: Build `admin/parent_update_tag.php`

**Files:**
- Create: `admin/parent_update_tag.php`

This follows the same structure as `admin/parent_comms.php`: `include_once config.php` → `requireSessionCookies()` → `FactoryStaff::processLogin()` → build content string → `makeHTML('admin.tpl')`.

- [ ] **Step 1: Write the page**

```php
<?php
//----------------------------------------------------------
// SECTION 1: Include Files
//----------------------------------------------------------
include_once "../config/config.php";
requireSessionCookies();

//----------------------------------------------------------
// SECTION 2: Auth + Session
//----------------------------------------------------------
$sid      = FactoryStaff::processLogin();
$staff    = FactoryStaff::select($sid);
$scid     = (int)$staff->get('scid');
$is_admin = ($staff->get('parent_app_admin') === 'yes');

//----------------------------------------------------------
// SECTION 3: Generate Content
//----------------------------------------------------------
$smarty->assign('pagename', 'Tag Children');
$smarty->assign('teacher_mode', true);

$update_id = (int)($_GET['update_id'] ?? 0);

$arrbody[] = makePageContent($sid, $scid, $is_admin, $update_id);

makeHTML('admin.tpl');

//----------------------------------------------------------
// SECTION 5: Functions Private to this Page
//----------------------------------------------------------

function makePageContent($sid, $scid, $is_admin, $update_id) {
    $conn = $GLOBALS['conn'];

    if (!$update_id) {
        return errorBlock('No update specified.');
    }

    // ── Ownership check: same branch, and either admin or the posting teacher ──
    $q = mysqli_query($conn, "SELECT * FROM parent_updates WHERE id=$update_id AND scid=$scid AND status='active' LIMIT 1");
    $update = $q ? mysqli_fetch_assoc($q) : null;

    if (!$update) {
        return errorBlock('Update not found.');
    }
    if (!$is_admin && (int)$update['teacher_sid'] !== (int)$sid) {
        return errorBlock('You do not have permission to tag this update.');
    }
    if (!$update['caid']) {
        return errorBlock('This is a school-wide update — tagging is only available for class-specific updates.');
    }

    $caid = (int)$update['caid'];

    // ── Load media rows ──────────────────────────────────────
    $mq = mysqli_query($conn, "SELECT id, file_path, file_type FROM parent_update_media WHERE update_id=$update_id AND status='active' ORDER BY sort_order");
    $media = [];
    if ($mq) { while ($r = mysqli_fetch_assoc($mq)) $media[] = $r; }

    if (!$media) {
        return errorBlock('This update has no taggable media.');
    }

    // ── Load class roster ────────────────────────────────────
    $rq = mysqli_query($conn, "
        SELECT c.cid, c.firstname, c.lastname
        FROM child c
        JOIN child_class cc ON cc.cid = c.cid AND cc.status='enabled' AND cc.pending='no'
        WHERE cc.caid = $caid AND c.status='enabled'
        ORDER BY c.firstname
    ");
    $roster = [];
    if ($rq) { while ($r = mysqli_fetch_assoc($rq)) $roster[] = $r; }

    // ── Load existing tags for these media ids ───────────────
    $media_ids = array_map(fn($m) => (int)$m['id'], $media);
    $existing = []; // media_id => [cid => true]
    if ($media_ids) {
        $ids_csv = implode(',', $media_ids);
        $tq = mysqli_query($conn, "SELECT media_id, cid FROM parent_update_media_child WHERE media_id IN ($ids_csv)");
        if ($tq) {
            while ($r = mysqli_fetch_assoc($tq)) {
                $existing[(int)$r['media_id']][(int)$r['cid']] = true;
            }
        }
    }

    // ── Render ────────────────────────────────────────────────
    $rows = '';
    foreach ($media as $m) {
        $mid  = (int)$m['id'];
        $thumb = thumbnailUrl($m['file_path']);
        $checks = '';
        foreach ($roster as $c) {
            $cid = (int)$c['cid'];
            $checked = isset($existing[$mid][$cid]) ? 'checked' : '';
            $name = htmlspecialchars($c['firstname'] . ' ' . $c['lastname']);
            $checks .= '<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;">
                <input type="checkbox" name="tags[' . $mid . '][]" value="' . $cid . '" ' . $checked . '>' . $name . '
            </label>';
        }
        $rows .= '
        <div style="display:flex;gap:16px;padding:16px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px;">
            <img src="' . htmlspecialchars($thumb) . '" style="width:120px;height:120px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#F3F4F6;">
            <div style="flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;">
                ' . $checks . '
            </div>
        </div>';
    }

    $title = htmlspecialchars($update['title']);

    return '<div style="max-width:760px;">
        <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:14px;">🏷️ Tag children — ' . $title . '</div>
        <form method="POST" action="../ops/parent_update_tag_save.php">
            <input type="hidden" name="sid" value="' . $sid . '">
            <input type="hidden" name="update_id" value="' . $update_id . '">
            ' . $rows . '
            <button type="submit"
                style="background:#D85A30;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
                Save tags
            </button>
            <a href="parent_comms.php" style="margin-left:12px;font-size:13px;color:#6B7280;text-decoration:none;">Skip / do later</a>
        </form>
    </div>';
}

// Mirrors ParentController::thumbnailUrl() — the admin page has no access
// to the Laravel API, so it needs its own copy of this logic.
function thumbnailUrl(string $path): string {
    if (str_contains($path, 'imagedelivery.net')) {
        return preg_replace('|/[^/]+$|', '/thumbnail', $path);
    }
    if (str_starts_with($path, 'stream:')) {
        $id = substr($path, 7);
        return "https://videodelivery.net/{$id}/thumbnails/thumbnail.jpg";
    }
    return $path;
}

function errorBlock($msg) {
    return '<div style="max-width:760px;"><div style="background:#FAECE7;border:1px solid #D85A30;color:#993C1D;padding:10px 16px;border-radius:8px;">'
        . htmlspecialchars($msg) . '</div>
        <p><a href="parent_comms.php">&larr; Back to Parent Updates</a></p></div>';
}
?>
```

- [ ] **Step 2: Manual test** — as a non-admin teacher, post a photo update, land on this page, confirm thumbnails render and the roster checklist shows the class's children. As a different teacher (or by editing the URL to another teacher's `update_id`), confirm you get the permission error block. Try a `caid IS NULL` update's id (admin school-wide post) and confirm the "school-wide" error block.

- [ ] **Step 3: Commit**

```bash
git add admin/parent_update_tag.php
git commit -m "Add teacher-side child tagging screen"
```

### Task 4: Build `ops/parent_update_tag_save.php`

**Files:**
- Create: `ops/parent_update_tag_save.php`

- [ ] **Step 1: Write the save handler**

```php
<?php
//----------------------------------------------------------
// POST handler: save child tags for an update's media
//----------------------------------------------------------
include_once "../config/config.php";
requireSessionCookies();

$sid   = FactoryStaff::processLogin();
$conn  = $GLOBALS['conn'];
$staff = FactoryStaff::select($sid);
$scid  = (int)$staff->get('scid');
$is_admin = ($staff->get('parent_app_admin') === 'yes');

$update_id = (int)($_POST['update_id'] ?? 0);
if (!$update_id) {
    header('Location: ../admin/parent_comms.php?msg=error');
    exit;
}

// ── Ownership check: same as parent_update_tag.php ──────────
$q = mysqli_query($conn, "SELECT * FROM parent_updates WHERE id=$update_id AND scid=$scid AND status='active' LIMIT 1");
$update = $q ? mysqli_fetch_assoc($q) : null;

if (!$update || (!$is_admin && (int)$update['teacher_sid'] !== (int)$sid) || !$update['caid']) {
    header('Location: ../admin/parent_comms.php?msg=error');
    exit;
}

$caid = (int)$update['caid'];

// ── Validate media ids belong to this update ─────────────────
$mq = mysqli_query($conn, "SELECT id FROM parent_update_media WHERE update_id=$update_id AND status='active'");
$valid_media_ids = [];
if ($mq) { while ($r = mysqli_fetch_assoc($mq)) $valid_media_ids[] = (int)$r['id']; }

// ── Validate cids belong to this update's class roster ───────
$rq = mysqli_query($conn, "
    SELECT c.cid FROM child c
    JOIN child_class cc ON cc.cid = c.cid AND cc.status='enabled' AND cc.pending='no'
    WHERE cc.caid = $caid AND c.status='enabled'
");
$valid_cids = [];
if ($rq) { while ($r = mysqli_fetch_assoc($rq)) $valid_cids[] = (int)$r['cid']; }

// ── Build the sanitized (media_id, cid) pair list from POST ──
$posted = $_POST['tags'] ?? []; // media_id => [cid, cid, ...]
$pairs  = [];
foreach ($posted as $media_id => $cids) {
    $media_id = (int)$media_id;
    if (!in_array($media_id, $valid_media_ids, true)) continue;
    foreach ((array)$cids as $cid) {
        $cid = (int)$cid;
        if ($cid > 0 && in_array($cid, $valid_cids, true)) {
            $pairs[] = [$media_id, $cid];
        }
    }
}

// ── Replace tags for this update's media in two statements ───
if ($valid_media_ids) {
    $ids_csv = implode(',', $valid_media_ids);
    mysqli_query($conn, "DELETE FROM parent_update_media_child WHERE media_id IN ($ids_csv)");
}

if ($pairs) {
    $tagged_by = (int)$sid;
    $values = array_map(fn($p) => "({$p[0]}, {$p[1]}, $tagged_by, NOW())", $pairs);
    $sql = "INSERT INTO parent_update_media_child (media_id, cid, tagged_by, tagged_at) VALUES " . implode(', ', $values);
    mysqli_query($conn, $sql);
}

header('Location: ../admin/parent_comms.php?msg=saved');
exit;
?>
```

- [ ] **Step 2: Manual test** — submit the tag form for a real update; confirm `SELECT * FROM parent_update_media_child WHERE media_id IN (...)` shows the checked pairs and only those. Re-submit with different checkboxes and confirm the old rows are replaced, not accumulated. Craft a POST with a `cid` outside the class roster (e.g. via browser devtools) and confirm it's silently dropped, not inserted.

- [ ] **Step 3: Commit**

```bash
git add ops/parent_update_tag_save.php
git commit -m "Add tag-save endpoint with roster/ownership validation"
```

### Task 5: Add "Tag children" link to the Recent Updates list

**Files:**
- Modify: `admin/parent_comms.php:196-213`

- [ ] **Step 1: Add the link next to Delete, only when `media_count > 0`**

In the loop body (around line 204's delete form), add before the closing `</div>` of the row (line 213):

```php
            $list .= '
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#F9FAFB;border:1px solid #F3F4F6;border-radius:8px;">
                <span style="font-size:22px;flex-shrink:0;">' . $icon . '</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' . htmlspecialchars($r['title']) . '</div>
                    <div style="font-size:11px;color:#6B7280;margin-top:2px;">' . $cls . ' · ' . $date . ($media ? ' · ' . $media . ' file' . ($media > 1 ? 's' : '') : '') . '</div>
                    ' . ($is_admin ? '<div style="font-size:11px;color:#9CA3AF;">' . htmlspecialchars($r['teacher_name'] ?? '') . '</div>' : '') . '
                </div>
                ' . ($media > 0 ? '<a href="parent_update_tag.php?update_id=' . (int)$r['id'] . '" style="font-size:11px;color:#1A6B7C;text-decoration:none;white-space:nowrap;">Tag children</a>' : '') . '
                <form method="POST" action="../ops/parent_update_delete.php" style="margin:0;"
                      onsubmit="return confirm(\'Delete this update?\')">
                    <input type="hidden" name="update_id" value="' . (int)$r['id'] . '">
                    <input type="hidden" name="sid" value="' . $sid . '">
                    <button type="submit"
                        style="background:#fff;border:1px solid #E5E7EB;color:#6B7280;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;">
                        Delete
                    </button>
                </form>
            </div>';
```

(Only the new line with `$media > 0 ? '<a href=...' : ''` is added; the rest is unchanged context shown for placement.)

- [ ] **Step 2: Manual test** — confirm the link appears only on rows with media, and clicking it lands on the tag screen with existing tags pre-checked.

- [ ] **Step 3: Commit**

```bash
git add admin/parent_comms.php
git commit -m "Add Tag children link to Recent Updates list"
```

---

## Chunk 3: Laravel API — `child_ids` on updates

### Task 6: Add the tags query to `ParentController::updates()`

**Files:**
- Modify: `parent-app-api/app/Http/Controllers/ParentController.php:228-250`

- [ ] **Step 1: Add own-children lookup and a third query, then attach `child_ids`**

Replace lines 228-250 (from `// Attach first media item as thumbnail` through the `$result` map) with:

```php
        // Attach first media item as thumbnail
        $ids = $updates->pluck('id')->toArray();
        $media = $ids ? DB::connection($conn)
            ->table('parent_update_media')
            ->whereIn('update_id', $ids)
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('update_id') : collect();

        // Tags: a third query, kept separate from the updates/media queries so
        // update x media x tags never multiplies rows against limit(20).
        $mediaIds = $media->flatten(1)->pluck('id')->toArray();
        $ownCids  = DB::connection($conn)->table('child')->where('pid', $pid)->pluck('cid')->toArray();
        $tags = $mediaIds ? DB::connection($conn)
            ->table('parent_update_media_child')
            ->whereIn('media_id', $mediaIds)
            ->whereIn('cid', $ownCids)
            ->get()
            ->groupBy('media_id') : collect();

        $result = $updates->map(function ($u) use ($media, $tags) {
            $updateMedia = $media->get($u->id) ?? collect();
            $first = $updateMedia->first();
            $childIds = $updateMedia
                ->flatMap(fn($m) => $tags->get($m->id) ?? collect())
                ->pluck('cid')
                ->unique()
                ->values();
            return [
                'id'           => $u->id,
                'type'         => $u->type,
                'title'        => $u->title,
                'body'         => $u->body,
                'class_name'   => $u->class_name,
                'teacher_name' => $u->teacher_name,
                'created_at'   => $u->created_at,
                'thumbnail'    => $first ? $this->thumbnailUrl($first) : null,
                'child_ids'    => $childIds,
            ];
        });
```

- [ ] **Step 2: Do the same for `updateDetail()`** — modify lines 278-301:

```php
        $media = DB::connection($conn)
            ->table('parent_update_media')
            ->where('update_id', $id)
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->get();

        $ownCids = DB::connection($conn)->table('child')->where('pid', $pid)->pluck('cid')->toArray();
        $mediaIds = $media->pluck('id')->toArray();
        $tags = $mediaIds ? DB::connection($conn)
            ->table('parent_update_media_child')
            ->whereIn('media_id', $mediaIds)
            ->whereIn('cid', $ownCids)
            ->get()
            ->groupBy('media_id') : collect();

        $childIds = $media
            ->flatMap(fn($m) => $tags->get($m->id) ?? collect())
            ->pluck('cid')
            ->unique()
            ->values();

        return response()->json([
            'update' => [
                'id'         => $update->id,
                'type'       => $update->type,
                'title'      => $update->title,
                'body'       => $update->body,
                'created_at' => $update->created_at,
                'teacher'    => [
                    'name'  => $update->teacher_name,
                    'phone' => $update->teacher_phone,
                    'title' => 'Ms.',
                ],
                'media' => $media->map(fn($m) => [
                    'file_path' => $m->file_path,
                    'file_type' => $m->file_type,
                ])->values(),
                'child_ids' => $childIds,
            ],
        ]);
```

- [ ] **Step 3: Manual/API test** — hit `/parent/updates` and `/parent/updates/{id}` for a parent whose child is tagged on some media, and confirm `child_ids` contains only that parent's own `cid`s, never another family's, even if the class photo batch has other children tagged.

- [ ] **Step 4: Commit**

```bash
git add parent-app-api/app/Http/Controllers/ParentController.php
git commit -m "Expose child_ids on parent updates, intersected with own children"
```

---

## Chunk 4: Frontend — child filtering (base spec + amendment)

### Task 7: Filter the home feed by active child

**Files:**
- Modify: `src/app/page.jsx:75`

- [ ] **Step 1: Filter `updates` by `activeId` before passing to `<UpdatesFeed>`**

Change line 75 from:
```jsx
<UpdatesFeed updates={updates} />
```
to:
```jsx
<UpdatesFeed updates={updates.filter(u => !u.child_ids?.length || u.child_ids.includes(activeId))} />
```

- [ ] **Step 2: Manual test** — in the browser, with a parent that has 2+ children where updates carry different `child_ids`, switch the `ChildSwitcher` and confirm "Latest updates" narrows accordingly; confirm untagged/announcement updates (`child_ids` empty) always show regardless of active child.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.jsx
git commit -m "Filter home feed updates by active child"
```

### Task 8: Add child filtering to the gallery page

**Files:**
- Modify: `src/app/gallery/page.jsx`

- [ ] **Step 1: Fetch membership, track `activeId`, render `ChildSwitcher`, pass `activeId` to `GalleryGrid`**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import GalleryGrid from '@/components/GalleryGrid';
import ChildSwitcher from '@/components/ChildSwitcher';

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'photo',  label: 'Photos' },
  { key: 'video',  label: 'Videos' },
  { key: 'reports',label: 'Reports' },
];

export default function GalleryPage() {
  const [updates,  setUpdates]  = useState([]);
  const [children, setChildren] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.updates()
      .then(d => setUpdates(d.updates || []))
      .finally(() => setLoading(false));

    api.membership()
      .then(data => {
        setChildren(data.children || []);
        if (data.children?.length) setActiveId(data.children[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tt-text)' }}>Gallery</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <ChildSwitcher children={children} activeId={activeId} onChange={setActiveId} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === f.key ? 'var(--tt-blue)' : 'var(--tt-blue-tint)',
              color:      filter === f.key ? 'var(--tt-bg)' : 'var(--tt-blue)',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading
        ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--tt-muted)' }}>Loading…</div>
        : <GalleryGrid updates={updates} filter={filter} activeId={activeId} />
      }
    </div>
  );
}
```

- [ ] **Step 2: Manual test** — load `/gallery` as a multi-child parent, confirm `ChildSwitcher` renders above the filter pills and switching children updates the grid. Single-child parent: confirm `ChildSwitcher` renders nothing (existing behavior, per `ChildSwitcher.jsx:4`).

- [ ] **Step 3: Commit**

```bash
git add src/app/gallery/page.jsx
git commit -m "Add child switcher to gallery page"
```

### Task 9: Add the `activeId` filter step to `GalleryGrid`

**Files:**
- Modify: `src/components/GalleryGrid.jsx:5-8`

- [ ] **Step 1: Add `activeId` prop and a separate `.filter()` step (AND'd with the type filter, not collapsed into it)**

Change:
```jsx
export default function GalleryGrid({ updates, filter }) {
  const filtered = filter === 'all'
    ? updates
    : updates.filter(u => u.type === filter || (filter === 'reports' && u.type === 'pdf'));
```
to:
```jsx
export default function GalleryGrid({ updates, filter, activeId }) {
  const byType = filter === 'all'
    ? updates
    : updates.filter(u => u.type === filter || (filter === 'reports' && u.type === 'pdf'));

  const filtered = byType.filter(u => !u.child_ids?.length || u.child_ids.includes(activeId));
```

- [ ] **Step 2: Manual test** — combine a type filter ("Photos") with a child selection and confirm both conditions apply (AND semantics, matching the spec's "Photos + Aisha shows only Aisha's photos" example). Confirm switching type to "All" doesn't bypass the child filter.

- [ ] **Step 3: Commit**

```bash
git add src/components/GalleryGrid.jsx
git commit -m "Filter GalleryGrid by active child, AND'd with type filter"
```

---

## Verification checklist (end to end)

- [ ] Post a photo batch as a single-class teacher → redirected to tagging screen → tag a subset of children → parent app for a tagged child's parent shows the update in feed/gallery; parent app for a non-tagged, non-overlapping child's parent still sees it if untagged photos remain in the batch (whole-update visibility, not per-photo).
- [ ] Post an announcement (no media) → redirected straight to `parent_comms.php?msg=saved`, no tagging screen, no "Tag children" link in the list.
- [ ] Attempt to load `parent_update_tag.php?update_id=<another teacher's id>` → rejected.
- [ ] Attempt to load `parent_update_tag.php?update_id=<other branch's id>` (if multi-branch test data available) → rejected via the `scid` check.
- [ ] POST a crafted `cid` not in the class roster to `parent_update_tag_save.php` → silently dropped, not inserted.
- [ ] `/parent/updates` response for a parent never contains another family's `cid` in any `child_ids` array.
