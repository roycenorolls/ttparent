# Face-match suggestions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-fill the existing teacher child-tagging screen with AI-suggested tags (AWS Rekognition, semi-automatic — teacher always reviews) for parents who've explicitly consented, without changing the manual tagging flow's authorization or write path.

**Architecture:** All AWS Rekognition calls live in Laravel (`parent-app-api`), the only app with real AWS credentials. The legacy PHP admin app calls two new internal, `X-Api-Key`-gated Laravel endpoints server-to-server (mirroring the existing `TourBookingController` pattern): one to generate suggestions (writes results straight into the shared per-school MySQL DB), one to clean up an AWS-side face vector on revocation. Consent is self-service in the parent app (new settings page, new `PATCH` endpoint) and gates everything — a child is only ever indexed or suggested with `face_match_consent='yes'`, and `photo_restriction='yes'` is an absolute, server-enforced block on that.

**Tech Stack:** Raw MySQL (mysqli) + PHP GD on the legacy admin side; Laravel query builder + `aws/aws-sdk-php`'s `RekognitionClient` + `Http` facade on the API side; Next.js/React on the frontend.

**Spec:** [2026-08-20-face-match-suggestions-design.md](../specs/2026-08-20-face-match-suggestions-design.md) — read this first for the *why* behind every decision below; this plan only covers the *how*.

**No test framework exists anywhere in this codebase** (no `phpunit.xml`/`tests/` in `parent-app-api`, zero business-logic tests in the legacy PHP app — confirmed by search). Every task below uses concrete manual verification steps (curl commands, SQL queries, browser checks with expected output) instead of automated tests, matching how the 2026-08-03 tagging feature that this one extends was itself built and verified.

**Three things this plan decides or corrects relative to the spec**, flagged here so they're not mistaken for what was actually approved:
- **Settings page discoverability**: the spec defines the route but not how a parent finds it. This plan adds a single "Privacy settings" link from the Card page — the closest existing "about me" screen.
- **Internal API key**: the spec says the deindex endpoint uses "the same pattern" as the suggestions endpoint. This plan uses one shared key (`config('services.internal.key')`) for both, rather than two near-identical secrets — same trust boundary (legacy admin app → Laravel), no reason to split it.
- **Registration photo access (corrects a spec error)**: the spec's "System boundary" section describes `ops/getphoto.php` as "already an unauthenticated, publicly-fetchable endpoint" Laravel can `Http::get()`. That's wrong — it resolves the school DB from `$_SESSION['scid']` and redirects to `admin/school_select.php` with no session, which a stateless server-to-server call never has. Task 8 reads the photo file directly off disk instead (see that task's note for why this is reliable in both local and production layouts). Without this fix, every consent grant would fail.

---

## Chunk 1: Database schema

### Task 1: Add the consent/index/suggestion schema

**Files:**
- Create: `omake/face_match_schema.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- TutorTime Parent App — Face-match suggestion schema
-- Run against each school DB (kemang, pi, bukit, pluit, etc.)
--
-- InnoDB/utf8mb4/plain INT here, not the main app's MyISAM/latin1/INT
-- UNSIGNED convention — this matches parent_updates_schema.sql's existing
-- tables (parent_updates, parent_update_media), the parent app's own
-- established pattern in this shared DB, and InnoDB is required here
-- specifically because the consent-flip endpoint wraps its writes in a
-- real transaction, which MyISAM doesn't support.
-- ============================================================

-- Per-child opt-in to biometric face matching. Separate from, and gated
-- by, the pre-existing child.photo_restriction column.
ALTER TABLE child ADD COLUMN IF NOT EXISTS face_match_consent ENUM('no','yes') NOT NULL DEFAULT 'no';

-- Maps a consenting child to their AWS Rekognition face vector. One row
-- per consenting child; deleted the moment consent is revoked.
CREATE TABLE IF NOT EXISTS child_face_index (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  cid                 INT NOT NULL,
  rekognition_face_id VARCHAR(64) NOT NULL,
  indexed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cid (cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracks whether a teacher has been through the tag-review screen for an
-- update at least once — the gate that stops a rejected AI suggestion
-- from silently re-appearing on a later visit.
ALTER TABLE parent_updates ADD COLUMN IF NOT EXISTS tags_reviewed_at TIMESTAMP NULL DEFAULT NULL;

-- Cached AI-generated suggestions, pre-filtered to class roster + 80%
-- confidence. A row here means "AWS thinks this child is in this photo,
-- above threshold" — never a confirmed tag on its own.
CREATE TABLE IF NOT EXISTS parent_update_media_suggestion (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  media_id   INT NOT NULL,
  cid        INT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_child (media_id, cid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Run it against a local school DB and confirm**

```bash
mysql -u root -p kemang < omake/face_match_schema.sql
```
Expected: no error. Then:
```bash
mysql -u root -p kemang -e "DESCRIBE child_face_index; DESCRIBE parent_update_media_suggestion; SHOW COLUMNS FROM child LIKE 'face_match_consent'; SHOW COLUMNS FROM parent_updates LIKE 'tags_reviewed_at';"
```
Expected: both new tables show their columns/keys; `face_match_consent` shows `enum('no','yes')` default `no`; `tags_reviewed_at` shows `timestamp` nullable.

- [ ] **Step 3: Repeat for every other local school DB you have** (`pi`, `bukit`, `pluit`, etc. — whichever exist locally), same command with the DB name swapped.

- [ ] **Step 4: Commit**

```bash
git add omake/face_match_schema.sql
git commit -m "Add schema for face-match consent, indexing, and suggestions"
```

---

## Chunk 2: Laravel — Rekognition service and internal endpoints

### Task 2: Add AWS/internal-API config

**Files:**
- Modify: `parent-app-api/config/services.php`
- Modify: `parent-app-api/.env` (not committed — instructions only)

- [ ] **Step 1: Add two new config blocks**

In `config/services.php`, add after the existing `'ses'` block (reuses the same `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars already configured — no new AWS secret needed, just a clearly-named config path for Rekognition instead of the misleadingly-named `'ses'` key):

```php
    'aws' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'internal' => [
        'key' => env('INTERNAL_API_KEY'),
    ],
```

(No `main_app` URL config — Task 8 reads the registration photo straight off disk instead of over HTTP, since `ops/getphoto.php` turns out to require a PHP session `parent-app-api` can't carry. See Task 8 for why.)

- [ ] **Step 2: Add `INTERNAL_API_KEY` locally**

Generate a random key and add to `parent-app-api/.env` (create if it doesn't already have one — check first, this file is gitignored):
```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```
Add the output to `.env`:
```
INTERNAL_API_KEY=<paste generated value>
```

- [ ] **Step 3: Verify config loads**

```bash
cd parent-app-api && php artisan tinker --execute="echo config('services.aws.key') ? 'AWS key set' : 'MISSING'; echo PHP_EOL; echo config('services.internal.key') ? 'Internal key set' : 'MISSING';"
```
Expected: both print "set".

- [ ] **Step 4: Commit** (config file only — `.env` is gitignored, not staged)

```bash
git add config/services.php
git commit -m "Add AWS Rekognition and internal-API config for face-match suggestions"
```

### Task 3: Build `RekognitionService`

**Files:**
- Create: `parent-app-api/app/Services/RekognitionService.php`

- [ ] **Step 1: Write the service**

```php
<?php

namespace App\Services;

use Aws\Exception\AwsException;
use Aws\Rekognition\RekognitionClient;

/**
 * Thin wrapper around AWS Rekognition. Collections are one per school,
 * named exactly after the school's Laravel connection key (e.g. 'kemang')
 * — see the "System boundary" section of the face-match suggestions spec.
 */
class RekognitionService
{
    private RekognitionClient $client;

    public function __construct()
    {
        $this->client = new RekognitionClient([
            'version'     => 'latest',
            'region'      => config('services.aws.region'),
            'credentials' => [
                'key'    => config('services.aws.key'),
                'secret' => config('services.aws.secret'),
            ],
        ]);
    }

    /**
     * Creates the school's collection if it doesn't exist yet. Safe to call
     * before every real operation — self-healing, no separate provisioning
     * step needed.
     */
    public function ensureCollection(string $collectionId): void
    {
        try {
            $this->client->createCollection(['CollectionId' => $collectionId]);
        } catch (AwsException $e) {
            if ($e->getAwsErrorCode() !== 'ResourceInUseException') {
                throw $e;
            }
        }
    }

    /**
     * Indexes one face from $imageBytes into the collection. Returns the
     * new face id, or null if Rekognition detected zero faces (it returns
     * HTTP 200 with an empty FaceRecords array in that case — it does not
     * throw).
     */
    public function indexFace(string $collectionId, string $imageBytes, string $externalImageId): ?string
    {
        $this->ensureCollection($collectionId);

        $result = $this->client->indexFaces([
            'CollectionId'    => $collectionId,
            'Image'           => ['Bytes' => $imageBytes],
            'ExternalImageId' => $externalImageId,
            'MaxFaces'        => 1,
            'QualityFilter'   => 'AUTO',
        ]);

        $records = $result->get('FaceRecords');
        if (empty($records)) {
            return null;
        }

        return $records[0]['Face']['FaceId'];
    }

    public function deleteFace(string $collectionId, string $faceId): void
    {
        $this->client->deleteFaces([
            'CollectionId' => $collectionId,
            'FaceIds'      => [$faceId],
        ]);
    }

    /**
     * @return array<int, array{Left:float,Top:float,Width:float,Height:float}>
     *   Bounding boxes as fractions (0..1) of image width/height, one per
     *   detected face. Empty array means no faces detected.
     */
    public function detectFaces(string $imageBytes): array
    {
        $result = $this->client->detectFaces(['Image' => ['Bytes' => $imageBytes]]);

        $boxes = [];
        foreach ($result->get('FaceDetails') ?? [] as $face) {
            $boxes[] = $face['BoundingBox'];
        }

        return $boxes;
    }

    /**
     * Searches for a single-face crop against the collection. Returns the
     * best match at or above $thresholdPercent, or null.
     *
     * @return array{face_id:string, confidence:float}|null
     */
    public function searchFace(string $collectionId, string $croppedImageBytes, float $thresholdPercent): ?array
    {
        $this->ensureCollection($collectionId);

        $result = $this->client->searchFacesByImage([
            'CollectionId'       => $collectionId,
            'Image'              => ['Bytes' => $croppedImageBytes],
            'FaceMatchThreshold' => $thresholdPercent,
            'MaxFaces'           => 1,
        ]);

        $matches = $result->get('FaceMatches');
        if (empty($matches)) {
            return null;
        }

        return [
            'face_id'    => $matches[0]['Face']['FaceId'],
            'confidence' => (float) $matches[0]['Similarity'],
        ];
    }
}
```

- [ ] **Step 2: Verify it instantiates without error**

```bash
cd parent-app-api && php artisan tinker --execute="new App\Services\RekognitionService(); echo 'OK';"
```
Expected: prints "OK" (this only proves the AWS SDK client constructs — it does not make a network call yet).

- [ ] **Step 3: Commit**

```bash
git add app/Services/RekognitionService.php
git commit -m "Add RekognitionService wrapping AWS Rekognition calls"
```

### Task 4: Build `ImageCropper`

**Files:**
- Create: `parent-app-api/app/Services/ImageCropper.php`

- [ ] **Step 1: Write the cropper**

```php
<?php

namespace App\Services;

/**
 * Crops a single face out of a photo using a Rekognition bounding box
 * (fractions of image width/height). SearchFacesByImage only searches the
 * single largest face in whatever image it's given, so a group photo must
 * be split into one cropped image per detected face before searching —
 * see "Group photos need a face-by-face pass" in the face-match
 * suggestions spec.
 */
class ImageCropper
{
    /**
     * @param array{Left:float,Top:float,Width:float,Height:float} $box
     */
    public static function crop(string $imageBytes, array $box, float $padding = 0.15): string
    {
        $img = imagecreatefromstring($imageBytes);
        if ($img === false) {
            throw new \RuntimeException('Could not decode image for cropping.');
        }

        $imgW = imagesx($img);
        $imgH = imagesy($img);

        $w = $box['Width']  * $imgW;
        $h = $box['Height'] * $imgH;
        $x = $box['Left']   * $imgW - $w * $padding;
        $y = $box['Top']    * $imgH - $h * $padding;
        $w += 2 * $w * $padding;
        $h += 2 * $h * $padding;

        $x = (int) max(0, $x);
        $y = (int) max(0, $y);
        $w = (int) min($w, $imgW - $x);
        $h = (int) min($h, $imgH - $y);

        $cropped = imagecrop($img, ['x' => $x, 'y' => $y, 'width' => $w, 'height' => $h]);
        imagedestroy($img);

        if ($cropped === false) {
            throw new \RuntimeException('imagecrop() failed.');
        }

        ob_start();
        imagejpeg($cropped);
        $bytes = ob_get_clean();
        imagedestroy($cropped);

        return $bytes;
    }
}
```

- [ ] **Step 2: Verify against a real image file**

```bash
cd parent-app-api && php artisan tinker --execute="
\$bytes = file_get_contents(base_path('../public/favicon.ico')) ?: str_repeat(chr(0), 100);
try {
    App\Services\ImageCropper::crop(\$bytes, ['Left'=>0.1,'Top'=>0.1,'Width'=>0.3,'Height'=>0.3]);
    echo 'ran without throwing (real image needed for a true pass/fail)';
} catch (\Throwable \$e) { echo 'threw: ' . \$e->getMessage(); }
"
```
This is a smoke check only — a `.ico` isn't a real photo, so don't worry if it throws "Could not decode image." Confirm it actually works by running the same snippet against any real `.jpg` on disk (e.g. a test photo you have handy) and confirming no exception and non-empty output.

- [ ] **Step 3: Commit**

```bash
git add app/Services/ImageCropper.php
git commit -m "Add ImageCropper for per-face crops before SearchFacesByImage"
```

### Task 5: Build `SuggestionController`

**Files:**
- Create: `parent-app-api/app/Http/Controllers/SuggestionController.php`

- [ ] **Step 1: Write the controller**

```php
<?php

namespace App\Http\Controllers;

use App\Services\ImageCropper;
use App\Services\RekognitionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SuggestionController extends Controller
{
    /**
     * Internal, server-to-server endpoint called by admin/parent_update_tag.php
     * (legacy PHP, no AWS credentials) to generate and persist AI-suggested
     * tags for one update's not-yet-cached media. Writes directly into
     * parent_update_media_suggestion in the school's own MySQL DB — the
     * caller re-reads that table itself via mysqli, so this returns only a
     * bare ok/error status, not the suggestions themselves.
     */
    public function generate(Request $request, int $updateId, RekognitionService $rekognition)
    {
        $key = (string) config('services.internal.key');
        if ($key === '' || !hash_equals($key, (string) $request->header('X-Api-Key'))) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $request->validate(['school' => 'required|string']);
        $school = $request->string('school')->toString();
        if (!array_key_exists($school, config('schools'))) {
            return response()->json(['message' => 'Unknown school.'], 422);
        }

        $conn = DB::connection($school);

        $update = $conn->table('parent_updates')
            ->where('id', $updateId)
            ->where('status', 'active')
            ->first();

        if (!$update || !$update->caid) {
            // Not found, or a school-wide post — tagging (and therefore
            // suggestions) only applies to class-scoped updates.
            return response()->json(['message' => 'Update not found or not class-scoped.'], 422);
        }

        $roster = $conn->table('child_class as cc')
            ->join('child as c', 'c.cid', '=', 'cc.cid')
            ->where('cc.caid', $update->caid)
            ->where('cc.status', 'enabled')
            ->where('cc.pending', 'no')
            ->where('c.status', 'enabled')
            ->pluck('c.cid')
            ->toArray();

        $media = $conn->table('parent_update_media')
            ->where('update_id', $updateId)
            ->where('status', 'active')
            // A prefix match, not a fixed whitelist — uploads can carry any
            // image/* MIME the browser reports (image/heic from iPhones,
            // image/webp, etc.), and this only needs to exclude video/pdf,
            // which have no face-searchable frame.
            ->where('file_type', 'like', 'image/%')
            ->get();

        $alreadyCached = $conn->table('parent_update_media_suggestion')
            ->whereIn('media_id', $media->pluck('id'))
            ->pluck('media_id')
            ->unique()
            ->all();

        $collectionId = $school;

        foreach ($media as $item) {
            if (in_array($item->id, $alreadyCached, true)) {
                continue;
            }

            try {
                $bytes = Http::timeout(15)->get($item->file_path)->body();
            } catch (\Throwable $e) {
                Log::warning('Suggestion generation: could not fetch photo', [
                    'media_id' => $item->id, 'error' => $e->getMessage(),
                ]);
                continue;
            }

            try {
                $boxes = $rekognition->detectFaces($bytes);
            } catch (\Throwable $e) {
                Log::warning('Suggestion generation: DetectFaces failed', [
                    'media_id' => $item->id, 'error' => $e->getMessage(),
                ]);
                continue;
            }

            foreach ($boxes as $box) {
                try {
                    $cropped = ImageCropper::crop($bytes, $box);
                    $match   = $rekognition->searchFace($collectionId, $cropped, 80.0);
                } catch (\Throwable $e) {
                    Log::warning('Suggestion generation: SearchFacesByImage failed', [
                        'media_id' => $item->id, 'error' => $e->getMessage(),
                    ]);
                    continue;
                }

                if (!$match) {
                    continue;
                }

                $cid = $conn->table('child_face_index')
                    ->where('rekognition_face_id', $match['face_id'])
                    ->value('cid');

                // No row = consent was revoked since indexing, or a stray
                // face id — never surface it as a suggestion.
                if (!$cid) {
                    continue;
                }
                if (!in_array($cid, $roster, true)) {
                    continue;
                }

                $conn->table('parent_update_media_suggestion')->upsert(
                    [['media_id' => $item->id, 'cid' => $cid, 'confidence' => $match['confidence']]],
                    ['media_id', 'cid'],
                    ['confidence']
                );
            }
        }

        return response()->json(['ok' => true]);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/SuggestionController.php
git commit -m "Add SuggestionController: generates and caches face-match suggestions"
```

### Task 6: Build `FaceDeindexController`

**Files:**
- Create: `parent-app-api/app/Http/Controllers/FaceDeindexController.php`

- [ ] **Step 1: Write the controller**

```php
<?php

namespace App\Http\Controllers;

use App\Services\RekognitionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FaceDeindexController extends Controller
{
    /**
     * Internal endpoint called by legacy PHP (disenrollment, photo_restriction
     * flip) after it has already deleted its own child_face_index /
     * parent_update_media_suggestion rows via mysqli. This only cleans up
     * the AWS-side vector — best-effort, logged on failure, never retried.
     * The caller doesn't block on or care about the response.
     */
    public function deindex(Request $request, RekognitionService $rekognition)
    {
        $key = (string) config('services.internal.key');
        if ($key === '' || !hash_equals($key, (string) $request->header('X-Api-Key'))) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $request->validate([
            'school'               => 'required|string',
            'rekognition_face_id'  => 'required|string',
        ]);
        $school = $request->string('school')->toString();
        if (!array_key_exists($school, config('schools'))) {
            return response()->json(['message' => 'Unknown school.'], 422);
        }

        try {
            $rekognition->deleteFace($school, $request->string('rekognition_face_id')->toString());
        } catch (\Throwable $e) {
            Log::warning('Deindex: DeleteFaces failed', ['school' => $school, 'error' => $e->getMessage()]);
            return response()->json(['ok' => false], 500);
        }

        return response()->json(['ok' => true]);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/FaceDeindexController.php
git commit -m "Add FaceDeindexController for AWS-side cleanup from legacy PHP"
```

### Task 7: Wire the internal routes

**Files:**
- Modify: `parent-app-api/routes/api.php`

- [ ] **Step 1: Add imports and routes**

Add to the `use` block at the top:
```php
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\FaceDeindexController;
```

Add alongside the existing `/tour/book` line (outside the `auth:sanctum` group — these are server-to-server, `X-Api-Key`-gated, not parent-session-gated):

```php
Route::middleware('throttle:20,1')->post('/internal/updates/{update_id}/suggestions', [SuggestionController::class, 'generate']);
Route::middleware('throttle:20,1')->post('/internal/faces/deindex', [FaceDeindexController::class, 'deindex']);
```

Laravel's default throttle key is `sha1(domain.'|'.ip)`, not per-route — these two routes share one 20/min bucket, and every school's admin app calls through the same server-to-server IP, so in practice all seven schools share it too. Degradation is graceful either way (`admin/parent_update_tag.php` renders with zero suggestions on any failure, per Chunk 6), so this isn't fixed here, just worth watching under real multi-school load — bump the rate if teachers across schools start seeing suggestions silently not appear during busy periods.

- [ ] **Step 2: Verify routes are registered**

```bash
cd parent-app-api && php artisan route:list --path=internal
```
Expected: both `POST api/internal/updates/{update_id}/suggestions` and `POST api/internal/faces/deindex` listed.

- [ ] **Step 3: Manually verify auth rejection**

Start the API locally (`php artisan serve`), then:
```bash
curl -i -X POST http://localhost:8000/api/internal/updates/1/suggestions -H "Content-Type: application/json" -d '{"school":"kemang"}'
```
Expected: `401 Unauthorized` (no `X-Api-Key` header sent).

```bash
curl -i -X POST http://localhost:8000/api/internal/updates/1/suggestions -H "Content-Type: application/json" -H "X-Api-Key: $(grep INTERNAL_API_KEY .env | cut -d= -f2)" -d '{"school":"kemang"}'
```
Expected: `422` with "Update not found" (assuming update id 1 doesn't exist / isn't class-scoped in your local `kemang` DB) — confirms the key check passes and it reaches the real logic.

- [ ] **Step 4: Commit**

```bash
git add routes/api.php
git commit -m "Wire internal suggestion-generation and deindex routes"
```

---

## Chunk 3: Laravel — consent endpoint

### Task 8: Add `ParentController::setFaceMatchConsent`

**Files:**
- Modify: `parent-app-api/app/Http/Controllers/ParentController.php`

- [ ] **Step 1: Add imports**

At the top of the file, alongside the existing `use` statements:
```php
use App\Services\RekognitionService;
use Illuminate\Support\Facades\Log;
```

**Why the registration photo is read from disk, not fetched over HTTP:** the spec assumed `ops/getphoto.php?cid={id}` was a plain unauthenticated URL Laravel could `Http::get()`. It isn't — `config/config.php:58-72` resolves the school database from `$_SESSION['scid']`, and with no session (`$GLOBALS['dbname']` empty) it redirects to `admin/school_select.php` instead of serving the photo. A stateless server-to-server call from Laravel never carries that session, so every fetch would silently return the redirect page's HTML instead of a photo, and `IndexFaces` would fail every time. Fixed by reading the file directly: `parent-app-api/config/database.php`'s own comment already establishes that `dirname(base_path(), 2)` reaches `secrets.php` one level above the main app's document root in both local and production layouts — meaning `parent-app-api` is nested *inside* the main app's web root, so `dirname(base_path(), 1)` is exactly `$GLOBALS['dir']` in the legacy app, and the registration photo (stored by `ops/editregistration.php`'s `editChildForm` upload handler at `uploads/{school_key}/childphotos/{cid}`, no extension) is a plain file Laravel can read with no network call and no session at all.

- [ ] **Step 2: Add the method**

Add this method to `ParentController`, after `childProfile()`:

```php
    /**
     * Parent self-service toggle for face-match consent. See "Consent &
     * data model" and "Indexing pipeline" in the face-match suggestions
     * spec for why the 'yes' path runs inside one DB transaction.
     */
    public function setFaceMatchConsent(Request $request, int $id, RekognitionService $rekognition)
    {
        $conn = $this->schoolConn($request);
        $pid  = $this->parentPid($request);

        $request->validate(['consent' => 'required|in:yes,no']);
        $consent = $request->string('consent')->toString();

        $child = DB::connection($conn)->table('child')->where('cid', $id)->where('pid', $pid)->first();
        if (!$child) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($consent === 'no') {
            // Read before the transaction, not inside it — the AWS cleanup
            // call below must run strictly *after* the local deletes commit,
            // not nested inside the same transaction. The spec frames these
            // as two separate steps (local deletes are "immediate and
            // unconditional," the AWS call is "best-effort after all of
            // that") precisely so a hang/crash during the network call can
            // never roll back state that's supposed to already be final.
            $existing = DB::connection($conn)->table('child_face_index')->where('cid', $id)->first();

            DB::connection($conn)->transaction(function () use ($conn, $id) {
                DB::connection($conn)->table('child_face_index')->where('cid', $id)->delete();
                DB::connection($conn)->table('parent_update_media_suggestion')->where('cid', $id)->delete();
                DB::connection($conn)->table('child')->where('cid', $id)->update(['face_match_consent' => 'no']);
            });

            if ($existing) {
                try {
                    $rekognition->deleteFace($conn, $existing->rekognition_face_id);
                } catch (\Throwable $e) {
                    Log::warning('Consent revoke: DeleteFaces failed', ['cid' => $id, 'error' => $e->getMessage()]);
                }
            }

            return response()->json(['ok' => true, 'face_match_consent' => 'no']);
        }

        // consent === 'yes'
        if ($child->photo_restriction === 'yes') {
            return response()->json([
                'message' => "This child has a photo restriction on file and can't be enabled for face matching.",
            ], 422);
        }

        try {
            DB::connection($conn)->transaction(function () use ($conn, $id, $rekognition) {
                $existing = DB::connection($conn)->table('child_face_index')->where('cid', $id)->first();

                if (!$existing) {
                    // The registration photo lives on disk, not behind a
                    // URL Laravel can actually fetch — see Task 8 Step 1's
                    // note on why this reads the file directly instead.
                    $photoPath = dirname(base_path(), 1) . "/uploads/{$conn}/childphotos/{$id}";
                    if (!is_file($photoPath)) {
                        throw new \RuntimeException('no_registration_photo');
                    }
                    $bytes  = file_get_contents($photoPath);
                    $faceId = $rekognition->indexFace($conn, $bytes, (string) $id);

                    if (!$faceId) {
                        throw new \RuntimeException('no_face_detected');
                    }

                    DB::connection($conn)->table('child_face_index')->insert([
                        'cid' => $id, 'rekognition_face_id' => $faceId, 'indexed_at' => now(),
                    ]);
                }

                DB::connection($conn)->table('child')->where('cid', $id)->update(['face_match_consent' => 'yes']);
            });
        } catch (\Throwable $e) {
            Log::warning('Consent grant failed', ['cid' => $id, 'error' => $e->getMessage()]);
            return response()->json(['message' => "Couldn't process photo, try again."], 422);
        }

        return response()->json(['ok' => true, 'face_match_consent' => 'yes']);
    }
```

**Known limitation, not fixed here:** `$GLOBALS['allowed_photo_ext']` in `config/config.php` accepts GIF for registration photos, but Rekognition only supports JPEG/PNG — a child with a GIF registration photo would get "couldn't process photo, try again" from `IndexFaces` throwing, and retrying would never help (the message implies a transient failure, but this one isn't). Rare in practice and not addressed in this plan; if it comes up, the fix belongs in `RekognitionService::indexFace()` (convert non-JPEG/PNG input before indexing), not in this endpoint.

- [ ] **Step 3: Add the route**

In `routes/api.php`, inside the existing `auth:sanctum` group, alongside `/parent/child/{id}`:
```php
Route::patch('/parent/child/{id}/face-match-consent', [ParentController::class, 'setFaceMatchConsent']);
```

- [ ] **Step 4: Manually verify**

```bash
cd parent-app-api && php artisan route:list --path=face-match-consent
```
Expected: `PATCH api/parent/child/{id}/face-match-consent` listed.

Full round-trip test needs a real Sanctum token — reuse the login flow documented in project memory (test account `nataliagunarso@gmail.com`, or your own local test account) to get one, then:
```bash
curl -i -X PATCH http://localhost:8000/api/parent/child/<a-real-cid>/face-match-consent \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"consent":"yes"}'
```
Expected first time: either `200 {"ok":true,"face_match_consent":"yes"}` (if that child has a usable registration photo) or `422` with the "couldn't process photo" message (if not — check the child has a real photo uploaded via `admin/editregistration.php` first). Then:
```bash
mysql -u root -p kemang -e "SELECT cid, face_match_consent FROM child WHERE cid=<that cid>; SELECT * FROM child_face_index WHERE cid=<that cid>;"
```
Expected on success: `face_match_consent='yes'` and exactly one `child_face_index` row.

Then revoke and confirm cleanup:
```bash
curl -i -X PATCH http://localhost:8000/api/parent/child/<cid>/face-match-consent \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"consent":"no"}'
mysql -u root -p kemang -e "SELECT face_match_consent FROM child WHERE cid=<cid>; SELECT * FROM child_face_index WHERE cid=<cid>;"
```
Expected: `face_match_consent='no'`, zero `child_face_index` rows.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ParentController.php routes/api.php
git commit -m "Add parent self-service face-match consent endpoint"
```

---

## Chunk 4: Parent-app frontend — consent settings page

### Task 9: Expose consent/restriction fields from the membership endpoint

**Files:**
- Modify: `parent-app-api/app/Http/Controllers/MembershipController.php:23-27`

- [ ] **Step 1: Add the two new columns to the children query**

Current:
```php
        $children = DB::connection($school)
            ->table('child')
            ->where('pid', $pid)
            ->where('status', 'enabled')
            ->get(['cid as id', 'firstname', 'lastname']);
```

New:
```php
        $children = DB::connection($school)
            ->table('child')
            ->where('pid', $pid)
            ->where('status', 'enabled')
            ->get(['cid as id', 'firstname', 'lastname', 'face_match_consent', 'photo_restriction']);
```

- [ ] **Step 2: Manually verify**

```bash
curl -s http://localhost:8000/api/parent/membership -H "Authorization: Bearer <token>" | python3 -m json.tool | grep -A2 face_match_consent
```
Expected: each child in the response now has `face_match_consent` (`"no"` or `"yes"`) and `photo_restriction`.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/MembershipController.php
git commit -m "Expose face_match_consent and photo_restriction on membership children"
```

### Task 10: Add PATCH support to the API proxy

**Files:**
- Modify: `parent-app/src/app/api/tt/[...path]/route.js`

- [ ] **Step 1: Add a PATCH export**

The file already exports `GET` and `POST`, both calling the shared `forward()` helper. Add, right after the `POST` export:

```javascript
export async function PATCH(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
```

- [ ] **Step 2: Manually verify**

With the Next.js dev server running (`npm run dev` in `parent-app/`) and logged in via the browser (so the `auth_token` cookie is set):
```bash
curl -i -X PATCH http://localhost:3000/api/tt/parent/child/<cid>/face-match-consent \
  -H "Content-Type: application/json" -H "Cookie: auth_token=<value from browser devtools>" \
  -d '{"consent":"yes"}'
```
Expected: same response the direct Laravel call in Task 8 produced — proves the proxy forwards PATCH correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tt/\[...path\]/route.js
git commit -m "Forward PATCH requests through the Laravel API proxy"
```

### Task 11: Add the API client method

**Files:**
- Modify: `parent-app/src/lib/api.js`

- [ ] **Step 1: Add the method**

```javascript
export const api = {
  childProfile:  (id) => apiFetch(`/parent/child/${id}`),
  scheduleToday: (id) => apiFetch(`/parent/child/${id}/schedule/today`),
  updates:       ()   => apiFetch('/parent/updates'),
  updateDetail:  (id) => apiFetch(`/parent/updates/${id}`),
  membership:    ()   => apiFetch('/parent/membership'),
  setFaceMatchConsent: (id, consent) => apiFetch(`/parent/child/${id}/face-match-consent`, {
    method: 'PATCH',
    body: JSON.stringify({ consent }),
  }),
  logout:        ()   => apiFetch('/auth/logout', { method: 'POST' }),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "Add setFaceMatchConsent to the API client"
```

### Task 12: Build the settings page

**Files:**
- Create: `parent-app/src/app/settings/page.jsx`

- [ ] **Step 1: Write the page**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [children, setChildren] = useState(null);
  const [pending,  setPending]  = useState(null); // id currently being toggled
  const [error,    setError]    = useState(null);

  useEffect(() => {
    api.membership().then(d => setChildren(d.children || []));
  }, []);

  async function toggle(child) {
    const next = child.face_match_consent === 'yes' ? 'no' : 'yes';
    setPending(child.id);
    setError(null);
    try {
      await api.setFaceMatchConsent(child.id, next);
      setChildren(cs => cs.map(c => c.id === child.id ? { ...c, face_match_consent: next } : c));
    } catch {
      setError(`Couldn't update ${child.firstname}'s setting — please try again.`);
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ paddingTop: 16, paddingBottom: 24 }}>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tt-text)' }}>Privacy settings</div>
      </div>

      <div style={{ padding: '0 16px 16px', fontSize: 12, color: 'var(--tt-muted)', lineHeight: 1.5 }}>
        When enabled, your child's existing registration photo is used to suggest
        which photos they appear in on new class posts — teachers always review
        and confirm every suggestion before it's shown to anyone. You can turn
        this off at any time.
      </div>

      {error && (
        <div style={{ margin: '0 16px 12px', padding: '10px 12px', background: 'var(--tt-red-tint)', color: 'var(--tt-red-text)', borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children === null && <div style={{ fontSize: 13, color: 'var(--tt-muted)' }}>Loading…</div>}

        {children?.map(child => {
          const restricted = child.photo_restriction === 'yes';
          const on = child.face_match_consent === 'yes';
          return (
            <div key={child.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
              borderRadius: 'var(--tt-radius)', padding: '12px 14px',
            }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--tt-text)', fontWeight: 500 }}>
                  {child.firstname} {child.lastname}
                </div>
                {restricted && (
                  <div style={{ fontSize: 11, color: 'var(--tt-muted)', marginTop: 2 }}>
                    Photo use is restricted for this child — face matching isn't available.
                  </div>
                )}
              </div>
              <button
                onClick={() => !restricted && toggle(child)}
                disabled={restricted || pending === child.id}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none', flexShrink: 0,
                  background: restricted ? 'var(--tt-border)' : (on ? 'var(--tt-blue)' : 'var(--tt-border)'),
                  position: 'relative', cursor: restricted ? 'default' : 'pointer',
                  opacity: pending === child.id ? 0.6 : 1,
                }}
                aria-label={`Face-match consent for ${child.firstname}`}
              >
                <span style={{
                  position: 'absolute', top: 3, left: on ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: 'var(--tt-bg)',
                  transition: 'left 0.15s ease',
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify in the browser**

Navigate to `http://localhost:3000/settings` while logged in. Expected: one row per child, toggle reflects current `face_match_consent`, clicking it calls the API and flips state (or shows the error banner on failure), a `photo_restriction='yes'` child shows a disabled toggle with the explanatory line instead.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.jsx
git commit -m "Add parent-facing face-match consent settings page"
```

### Task 13: Link to the settings page from the Card screen

**Files:**
- Modify: `parent-app/src/app/card/page.jsx`

- [ ] **Step 1: Add a link**

Add `import Link from 'next/link';` to the top, then add this block at the end of the returned JSX, just before the closing `</div>` of the component (after the existing "Show your QR" tip block):

```jsx
      <div style={{ padding: '16px 16px 0' }}>
        <Link href="/settings" style={{ fontSize: 12, color: 'var(--tt-blue)', textDecoration: 'none' }}>
          Privacy settings →
        </Link>
      </div>
```

- [ ] **Step 2: Manually verify**

Navigate to `http://localhost:3000/card`, confirm the "Privacy settings →" link appears at the bottom and navigates to `/settings`.

- [ ] **Step 3: Commit**

```bash
git add src/app/card/page.jsx
git commit -m "Link to privacy settings from the Card screen"
```

---

## Chunk 5: Legacy PHP — shared helpers and de-indexing triggers

### Task 14: Add shared `deindexChildFace()` and `callInternalApi()` helpers

**Files:**
- Modify: `inc/functions.php`

- [ ] **Step 1: Add both functions**

Add near the end of the file, before the closing `?>` if one exists:

```php
/**
 * Calls a new internal parent-app-api endpoint server-to-server. Fire-
 * and-forget by design — callers that need this to succeed synchronously
 * (suggestion generation) pass a longer timeout and don't otherwise treat
 * failure specially; callers doing best-effort cleanup (deindex) pass a
 * short timeout and always ignore the result. See "System boundary" in
 * the face-match suggestions spec.
 */
function callInternalApi($path, array $body, $timeoutSeconds = 5) {
    $url = defined('PARENT_API_URL') ? PARENT_API_URL : '';
    $key = defined('PARENT_API_INTERNAL_KEY') ? PARENT_API_INTERNAL_KEY : '';
    if (!$url || !$key) return false;

    $ch = curl_init(rtrim($url, '/') . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'X-Api-Key: ' . $key],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeoutSeconds,
    ]);
    curl_exec($ch);
    $ok = curl_errno($ch) === 0;
    curl_close($ch);
    return $ok;
}

/**
 * De-indexes one child from face matching: deletes their child_face_index
 * row, purges any cached-but-not-yet-reviewed suggestions for them, sets
 * face_match_consent back to 'no', then best-effort-cleans-up the AWS-side
 * vector via the internal deindex endpoint. Called from every place a
 * child's face-match eligibility can end outside the parent app's own
 * toggle: disenrollment (ops/inactive.php, inc/functions.php's daily
 * cron) and a photo_restriction flip (ops/editregistration.php). A no-op
 * if the child was never indexed. See "De-indexing triggered from legacy
 * PHP" in the face-match suggestions spec.
 */
function deindexChildFace($conn, $cid) {
    $cid = (int)$cid;
    $q = mysqli_query($conn, "SELECT rekognition_face_id FROM child_face_index WHERE cid=$cid LIMIT 1");
    $row = $q ? mysqli_fetch_assoc($q) : null;
    if (!$row) return; // never consented — nothing to do

    mysqli_query($conn, "DELETE FROM child_face_index WHERE cid=$cid");
    mysqli_query($conn, "DELETE FROM parent_update_media_suggestion WHERE cid=$cid");
    mysqli_query($conn, "UPDATE child SET face_match_consent='no' WHERE cid=$cid");

    $school_key = $GLOBALS['school_key'] ?? '';
    if ($school_key) {
        callInternalApi('/internal/faces/deindex', [
            'school'               => $school_key,
            'rekognition_face_id'  => $row['rekognition_face_id'],
        ], 3);
    }
}
```

- [ ] **Step 2: Add the two new constants to local `secrets.php`** (manual step — this file is outside git, at `C:/wamp64/secrets.php` locally)

```php
define('PARENT_API_URL', 'http://localhost:8000/api');
define('PARENT_API_INTERNAL_KEY', '<same value as parent-app-api/.env INTERNAL_API_KEY>');
```

- [ ] **Step 3: Manually verify `deindexChildFace()` is a no-op for a non-indexed child**

```bash
php -r "
include '../tutortime/config/config.php';
deindexChildFace(\$GLOBALS['conn'], 999999);
echo 'ran without error';
"
```
Expected: prints "ran without error" (no row existed, function returned early).

- [ ] **Step 4: Commit**

```bash
git add inc/functions.php
git commit -m "Add shared de-index helper for face-match consent"
```

### Task 15: Hook disenrollment (immediate path)

**Files:**
- Modify: `ops/inactive.php:34-36`

- [ ] **Step 1: Call the helper right after the status flip**

Current:
```php
			if(strtotime($inactive->get('instart_date'))<=strtotime(date("Y-m-d"))){ //change status now if effective date is today or before, if in the future will be updated by the daily subroutine
				$child->set('status-1','disabled');
				FactoryChild::update($child);
			}
```

New:
```php
			if(strtotime($inactive->get('instart_date'))<=strtotime(date("Y-m-d"))){ //change status now if effective date is today or before, if in the future will be updated by the daily subroutine
				$child->set('status-1','disabled');
				FactoryChild::update($child);
				deindexChildFace($conn, $cid);
			}
```

- [ ] **Step 2: Manually verify**

Set up a test child with `face_match_consent='yes'` and a `child_face_index` row (via Task 8's curl flow against a disposable test child), then process an immediate disenrollment for that child through the UI (`admin/disenrolllist.php` → the inactive form, effective date today). Confirm:
```bash
mysql -u root -p kemang -e "SELECT face_match_consent FROM child WHERE cid=<cid>; SELECT * FROM child_face_index WHERE cid=<cid>;"
```
Expected: `face_match_consent='no'`, zero `child_face_index` rows.

- [ ] **Step 3: Commit**

```bash
git add ops/inactive.php
git commit -m "De-index a child's face on immediate disenrollment"
```

### Task 16: Hook disenrollment (future-dated path, `updateSubRoutine()`)

**Files:**
- Modify: `inc/functions.php:659-668`

`updateSubRoutine()` — despite the "daily subroutine" wording in its own
code comments (and in the spec this plan implements) — isn't actually on a
schedule: it's called from `admin/magic_login.php`, `ops/login.php`, and
`ops/magic_login_otp.php`, i.e. on the next staff login at that school, not
via cron. This doesn't change what needs hooking here, only how promptly a
future-dated disenrollment's de-index actually fires in practice (on the
next login after the effective date, not overnight).

- [ ] **Step 1: Loop the de-index call over this subroutine's disabled cids**

Current:
```php
		$query="SELECT c.cid, c.pid FROM inactive i, child c WHERE i.cid=c.cid AND c.status='enabled' AND i.instart_date<=CURDATE() AND (i.inend_date='0000-00-00' OR i.inend_date>CURDATE())";
		$result=mysqli_query($conn, $query);
		$numrow = mysqli_num_rows($result);
		if($numrow){
			$cid_arr=array(); $pid_arr=array();
			while ($rs = mysqli_fetch_assoc($result)) { $cid_arr[]=$rs['cid']; $pid_arr[]=$rs['pid']; }
			$cids = implode(',',$cid_arr);
			$pids = implode(',',$pid_arr);
			$query="UPDATE child SET status='disabled' WHERE cid IN ($cids)";
			$result=mysqli_query($conn, $query);
```

New (only the addition, right after the `UPDATE child SET status='disabled'` call):
```php
		$query="SELECT c.cid, c.pid FROM inactive i, child c WHERE i.cid=c.cid AND c.status='enabled' AND i.instart_date<=CURDATE() AND (i.inend_date='0000-00-00' OR i.inend_date>CURDATE())";
		$result=mysqli_query($conn, $query);
		$numrow = mysqli_num_rows($result);
		if($numrow){
			$cid_arr=array(); $pid_arr=array();
			while ($rs = mysqli_fetch_assoc($result)) { $cid_arr[]=$rs['cid']; $pid_arr[]=$rs['pid']; }
			$cids = implode(',',$cid_arr);
			$pids = implode(',',$pid_arr);
			$query="UPDATE child SET status='disabled' WHERE cid IN ($cids)";
			$result=mysqli_query($conn, $query);
			foreach ($cid_arr as $disabled_cid) { deindexChildFace($conn, $disabled_cid); }
```

- [ ] **Step 2: Manually verify**

Set up a test child with a future-dated `inactive` row whose `instart_date` is today or earlier and `face_match_consent='yes'` + a `child_face_index` row, then trigger `updateSubRoutine()` the way it actually runs — log in as any staff member at that school (via `ops/login.php` or the magic-link flow), which calls it as a side effect of login — and confirm the same before/after check as Task 15.

- [ ] **Step 3: Commit**

```bash
git add inc/functions.php
git commit -m "De-index a child's face on future-dated disenrollment (updateSubRoutine)"
```

### Task 17: Hook `photo_restriction` flip

**Files:**
- Modify: `ops/editregistration.php:68-87`

- [ ] **Step 1: Capture the old value, compare after update**

Current:
```php
elseif (isset($_POST['editChildForm'])) { //step 2
	$child = FactoryChild::select($cid,"",1);
	$childprogram = FactoryChildprogram::select("",$cid,"",1);
	//Enter POST values to instances
	processPOST($_POST,$child);
	processPOST($_POST,$childprogram);
	if(substr($child->get('enroll-1_date'),0,4)=='0000')
		$child->set('enroll-1_date','0000-00-00');
	/*echo "<pre>";
	print_r($child);
	echo "</pre>";
	die();*/
	if(FactoryChild::update($child)){
		if(!FactoryChildprogram::update($childprogram))
			session_addJS('alert','Child Program Update Failed');
		$url_next='../admin/editregistration.php?cid='.$cid.'&step=3';
		session_addJS('alert','Child Information Updated Successfully!');
	}else
		session_addJS('alert','Submission Failed');
}
```

New:
```php
elseif (isset($_POST['editChildForm'])) { //step 2
	$child = FactoryChild::select($cid,"",1);
	$old_photo_restriction = $child->get('photo_restriction-1');
	$childprogram = FactoryChildprogram::select("",$cid,"",1);
	//Enter POST values to instances
	processPOST($_POST,$child);
	processPOST($_POST,$childprogram);
	if(substr($child->get('enroll-1_date'),0,4)=='0000')
		$child->set('enroll-1_date','0000-00-00');
	/*echo "<pre>";
	print_r($child);
	echo "</pre>";
	die();*/
	if(FactoryChild::update($child)){
		if(!FactoryChildprogram::update($childprogram))
			session_addJS('alert','Child Program Update Failed');
		if($old_photo_restriction !== 'yes' && $child->get('photo_restriction-1') === 'yes')
			deindexChildFace($conn, $cid);
		$url_next='../admin/editregistration.php?cid='.$cid.'&step=3';
		session_addJS('alert','Child Information Updated Successfully!');
	}else
		session_addJS('alert','Submission Failed');
}
```

- [ ] **Step 2: Manually verify**

Set up a test child with `face_match_consent='yes'` and a `child_face_index` row, then edit that child in `admin/editregistration.php` and flip "Photo Restriction" to "Yes", save. Confirm the same before/after check as Task 15. Also verify the no-op case: edit the same child again without touching photo restriction — confirm `deindexChildFace()` doesn't fire again (nothing to check server-side beyond "no error," since it's already a no-op once the row is gone).

- [ ] **Step 3: Commit**

```bash
git add ops/editregistration.php
git commit -m "De-index a child's face when photo_restriction flips to yes"
```

---

## Chunk 6: Legacy PHP — suggestion generation trigger and tag-screen UI

### Task 18: Set `tags_reviewed_at` on every tag save

**Files:**
- Modify: `ops/parent_update_tag_save.php:65-70`

- [ ] **Step 1: Add the update, unconditionally, after the insert block**

Current:
```php
if ($pairs) {
    $tagged_by = (int)$sid;
    $values = array_map(fn($p) => "({$p[0]}, {$p[1]}, $tagged_by, NOW())", $pairs);
    $sql = "INSERT INTO parent_update_media_child (media_id, cid, tagged_by, tagged_at) VALUES " . implode(', ', $values);
    mysqli_query($conn, $sql);
}

header('Location: ../admin/parent_comms.php?msg=saved');
```

New:
```php
if ($pairs) {
    $tagged_by = (int)$sid;
    $values = array_map(fn($p) => "({$p[0]}, {$p[1]}, $tagged_by, NOW())", $pairs);
    $sql = "INSERT INTO parent_update_media_child (media_id, cid, tagged_by, tagged_at) VALUES " . implode(', ', $values);
    mysqli_query($conn, $sql);
}

mysqli_query($conn, "UPDATE parent_updates SET tags_reviewed_at=NOW() WHERE id=$update_id");

header('Location: ../admin/parent_comms.php?msg=saved');
```

- [ ] **Step 2: Manually verify**

Save tags for any update (even with zero boxes checked), then:
```bash
mysql -u root -p kemang -e "SELECT id, tags_reviewed_at FROM parent_updates WHERE id=<that update id>;"
```
Expected: `tags_reviewed_at` is a real timestamp, not NULL — including for a zero-tag save.

- [ ] **Step 3: Commit**

```bash
git add ops/parent_update_tag_save.php
git commit -m "Mark updates reviewed on every tag save, including zero-tag saves"
```

### Task 19: Trigger suggestion generation and render suggested tags

**Files:**
- Modify: `admin/parent_update_tag.php`

- [ ] **Step 1: Call the suggestions endpoint when the update hasn't been reviewed yet**

In `makePageContent()`, right after the existing ownership-check block (after the `if (!$update['caid']) { ... }` check, before `$caid = (int)$update['caid'];`), add:

```php
    if (!$update['tags_reviewed_at']) {
        // Matches SuggestionController::generate's own file_type filter
        // exactly — an update made only of video/PDF media (which never
        // gets a cached row, since Laravel skips non-image types) would
        // otherwise stay permanently "needs suggestions" and re-call the
        // endpoint on every single visit.
        $needs_suggestions = mysqli_query($conn, "
            SELECT 1 FROM parent_update_media m
            LEFT JOIN parent_update_media_suggestion s ON s.media_id = m.id
            WHERE m.update_id=$update_id AND m.status='active' AND m.file_type LIKE 'image/%' AND s.id IS NULL
            LIMIT 1
        ");
        if ($needs_suggestions && mysqli_num_rows($needs_suggestions) > 0) {
            $school_key = $GLOBALS['school_key'] ?? '';
            if ($school_key) {
                callInternalApi("/internal/updates/$update_id/suggestions", ['school' => $school_key], 20);
            }
        }
    }
```

- [ ] **Step 2: Load cached suggestions alongside existing tags**

Right after the existing "Load existing tags for these media ids" block (`$existing` array), add:

```php
    // ── Load AI suggestions for these media ids, only relevant pre-review ──
    $suggested = []; // media_id => [cid => confidence]
    if (!$update['tags_reviewed_at'] && $media_ids) {
        $sq = mysqli_query($conn, "SELECT media_id, cid, confidence FROM parent_update_media_suggestion WHERE media_id IN ($ids_csv)");
        if ($sq) {
            while ($r = mysqli_fetch_assoc($sq)) {
                $suggested[(int)$r['media_id']][(int)$r['cid']] = (float)$r['confidence'];
            }
        }
    }
```

- [ ] **Step 3: Update checkbox rendering to show the suggested state**

Current render loop:
```php
        foreach ($roster as $c) {
            $cid = (int)$c['cid'];
            $checked = isset($existing[$mid][$cid]) ? 'checked' : '';
            $name = htmlspecialchars($c['firstname'] . ' ' . $c['lastname']);
            $checks .= '<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;">
                <input type="checkbox" name="tags[' . $mid . '][]" value="' . $cid . '" ' . $checked . '>' . $name . '
            </label>';
        }
```

New:
```php
        foreach ($roster as $c) {
            $cid = (int)$c['cid'];
            $name = htmlspecialchars($c['firstname'] . ' ' . $c['lastname']);
            $is_confirmed = isset($existing[$mid][$cid]);
            $is_suggested = !$is_confirmed && isset($suggested[$mid][$cid]);
            $checked = ($is_confirmed || $is_suggested) ? 'checked' : '';
            $label_style = $is_suggested
                ? 'display:flex;align-items:center;gap:6px;font-size:12px;padding:5px 8px;background:#FFF7ED;border:1px solid #FDBA74;border-radius:6px;'
                : 'display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;';
            $badge = $is_suggested
                ? '<span style="margin-left:auto;font-size:10px;color:#C2410C;font-weight:600;">✨ ' . round($suggested[$mid][$cid]) . '%</span>'
                : '';
            $checks .= '<label style="' . $label_style . '">
                <input type="checkbox" name="tags[' . $mid . '][]" value="' . $cid . '" ' . $checked . '>' . $name . $badge . '
            </label>';
        }
```

- [ ] **Step 4: Manually verify end-to-end**

Set up at least one child in a class roster with `face_match_consent='yes'` and a real `child_face_index` row (via the settings-page flow in Chunk 4, using a real parent login for that child). Post a photo update for that class containing a photo of that child, following the redirect to `parent_update_tag.php`. Expected: the page (after the synchronous suggestion-generation call, so it may take a few seconds) shows that child's checkbox pre-checked with an orange background and a `✨ NN%` badge. Uncheck it and save, then reload the page (still same update) — expected: the box is now plain/unchecked, **not** re-suggested (the `tags_reviewed_at` gate).

Also verify the fallback path: temporarily break `PARENT_API_INTERNAL_KEY` (wrong value) in `secrets.php`, post another update with media, confirm the tag page still renders normally with a plain, all-unchecked roster (no suggestions, no error, no broken page) — then restore the correct key.

- [ ] **Step 5: Commit**

```bash
git add admin/parent_update_tag.php
git commit -m "Trigger and render AI-suggested tags on the tag-review screen"
```

---

## Post-implementation checklist

- [ ] Repeat Chunk 1's schema migration against every other local school DB you use for testing.
- [ ] Confirm `.env` (`parent-app-api`) and `secrets.php` (legacy app) both have matching `INTERNAL_API_KEY` / `PARENT_API_INTERNAL_KEY` values — a mismatch here fails silently as 401s that `admin/parent_update_tag.php` swallows into "no suggestions," which can look like the feature just isn't working rather than a config error. Check Laravel's log (`storage/logs/laravel.log`) if suggestions never appear.
- [ ] This plan does not cover production deployment (running the schema against every production school DB, setting production env vars/secrets, confirming `MAIN_APP_URL` resolves correctly from production Laravel to the production legacy app) — treat that as a separate, deliberate rollout step once local verification is complete, not an automatic follow-on.
