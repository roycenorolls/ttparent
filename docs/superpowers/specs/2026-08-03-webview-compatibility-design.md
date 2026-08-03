# WebView compatibility: iOS 14.5 / Android WebView 84 floor

## Problem

The parent app is served inside a Flutter WebView container (not yet built)
rather than a standalone mobile browser. Two consequences:

1. **Engine floor.** On iOS, WKWebView is welded to the OS version — an iOS
   14 device is permanently a Safari 14 engine with no path to update. On
   Android the WebView updates independently of the OS via Play Store, so
   the Android version is largely *not* the constraint; the risk there is
   devices without Play Services or stuck on Android 5–6 where WebView
   updates stopped. The compatibility floor is therefore mostly an iOS
   question.
2. **Container-only capabilities.** Several shipped features depend on
   behavior a bare WebView does not provide by default — external links,
   downloads, cookie persistence, video playback. These cannot be fixed
   from the web code alone and must be specified as requirements on the
   Flutter host.

Parts of the current code break on the target floor today, and there is no
mechanism preventing the next component from reintroducing the same
problems.

## Supported floor

- **iOS / iPadOS 14.5+** (Safari 14.5 engine)
- **Android WebView / Chrome 84+**

iOS 14.5 rather than 14.0 is a deliberate, honest choice: flexbox `gap`
lands in exactly 14.5 and is used pervasively throughout the app. Supporting
14.0–14.4 would mean replacing `gap` with margin-based spacing in nearly
every component — and leaving a permanent trap for future components. Rather
than claim 14.0 support with a known cosmetic hole (spacing collapses, but
content stays visible and usable), the floor is set where the code is
actually correct. Android WebView 84 is the Chromium equivalent of the same
`gap` boundary.

Exact browserslist query strings are validated with `npx browserslist`
during implementation; the intent above governs.

## What actually breaks at this floor

Verified against the current code. Only three features fall below the floor:

| Feature | Supported from | Where used | Failure mode |
|---|---|---|---|
| `dvh` units | Safari 15.4 | `globals.css` `.tt-auth`, `gallery/[updateId]/page.jsx` | Declaration invalid → height unset → layout collapses |
| `aspect-ratio` | Safari 15.0 | `GalleryGrid.jsx` tiles, viewer video iframe | Tiles compute to zero height → invisible gallery |
| `:has()` | Safari 15.4 | `globals.css` `body:has(.tt-auth) main` | Selector invalid → login screen gets stray 64px bottom padding |

Explicitly **not** problems at this floor, having been checked:
`inset` (Safari 14.1), flex `gap` (14.5), `env(safe-area-inset-*)` (11.x),
`backdrop-filter` with the `-webkit-` prefix already present (9),
`IntersectionObserver` (12.2), CSS custom properties (9.3).

`overscroll-behavior: none` (`globals.css`) is *not* supported until Safari
16 and will simply have no effect on iOS. It is left in place — suppressing
the iOS rubber-band scroll is the host's job (`bounces = false`), not the
stylesheet's.

## CSS fallbacks

- **`dvh` → duplicate declaration.** `min-height: 100vh;` followed by
  `min-height: 100dvh;`. Engines below 15.4 ignore the second. Note that
  `100vh`'s usual iOS problem — the collapsing URL bar — does not exist
  inside a WebView container, since there is no URL bar. The fallback is
  correct here, not merely tolerable.
- **`aspect-ratio` → padding-top ratio box.** A wrapper with
  `padding-top: 100%` (square gallery tiles) or `56.25%` (16/9 video
  iframe), with the content absolutely positioned to fill it.
- **`:has()` → explicit class.** Replace the `body:has(.tt-auth) main`
  selector with a class applied by the layout when `BottomNav` renders, so
  the padding rule no longer depends on parent-selector support.

Additionally, the login screen's decorative orbs animate a `filter:
blur(60px)` on a large element, which is expensive on low-end Android
hardware. They should render static (no animation) below a reasonable
device threshold, or unconditionally — the animation is decorative.

## JS robustness

`GalleryGrid.jsx` sets its `visible` state *only* from an
IntersectionObserver callback. If `IntersectionObserver` is absent nothing
ever sets it and the gallery renders permanently empty.

IntersectionObserver is supported from iOS 12.2, comfortably below this
floor, so this is not a target-floor bug. It is worth one defensive line
anyway (`if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }`)
because the failure mode is total content loss rather than degradation.

## Enforcement

A one-time fix sweep decays — the next component will reach for `dvh` or
`aspect-ratio` again. Enforcement is build-time, and needs three distinct
pieces because no single tool covers this codebase:

1. **`browserslist` pinned in `package.json`** — drives SWC's JS
   downleveling and autoprefixer's prefixing.

   Critically, this alone does **not** solve the problem: autoprefixer adds
   *prefixes*, it does not polyfill *features*. It will never turn
   `aspect-ratio` or `dvh` into something Safari 14.5 understands. The CSS
   fallbacks above must be written by hand; browserslist only makes the
   tooling agree on the target.

2. **`eslint-plugin-compat`** — fails the build on unsupported JS Web APIs
   against the browserslist.

3. **`stylelint` with `plugin/no-unsupported-browser-features`** — covers
   `globals.css`.

4. **A small custom ESLint rule** — necessary because nearly all styling in
   this app is inline `style={{}}` objects in JSX, which stylelint cannot
   see. `GalleryGrid`'s `aspectRatio` and the viewer's `100dvh` are both
   inline, so without this rule the two linters above miss the majority of
   the actual risk surface. The rule scans JSX `style` object literals for a
   denylist of property names (`aspectRatio`) and value patterns (`dvh`,
   `dvw`), and is roughly 40 lines.

## Flutter host contract

The container does not exist yet, so these are requirements for when it is
built rather than fixes to an existing app.

**Safe areas — must be owned by exactly one side.** If Flutter wraps the
WebView in `SafeArea` *and* the CSS uses `env(safe-area-inset-*)` (it does,
in `globals.css` and the fullscreen viewer), the insets double. The
contract: **the WebView renders edge-to-edge and the CSS owns the insets.**
The Flutter side must not apply its own safe-area padding.

**Session persistence (highest complaint risk).** Auth is an httpOnly
`auth_token` cookie. Android WebView does not flush cookies to disk on its
own — without `CookieManager.flush()` on background/pause, killing the app
logs the parent out. iOS must use the persistent
`WKWebsiteDataStore.default()`, not a non-persistent store.

**External links.** The WhatsApp CTA (`gallery/[updateId]/page.jsx`)
currently uses `target="_blank"`, which does nothing in Android WebView
without `setSupportMultipleWindows` + `onCreateWindow`. Rather than require
that, **the web code should drop `target="_blank"`** and let a navigation
delegate intercept the `wa.me` URL and hand it to the platform. Fewer things
the host must get right. The delegate must keep same-origin navigation in
the WebView and hand off `wa.me`, `tel:`, and `mailto:` externally —
otherwise `wa.me` loads WhatsApp's *website* inside the app.

**Downloads.** The viewer's "↓ Save" uses the `download` attribute, which
WebViews ignore. Android needs `setDownloadListener`; iOS needs
`WKDownloadDelegate`. Saving a photo to the camera roll — the actual parent
intent — needs native permission handling regardless, so this is best served
by a JS bridge the web code calls when present, with the plain link as
fallback when it is absent.

**Video.** Cloudflare Stream plays in an iframe. iOS requires
`allowsInlineMediaPlayback = true` and
`mediaTypesRequiringUserActionForPlayback = []`; Android requires
`mediaPlaybackRequiresUserGesture = false`. The fullscreen control needs
`onShowCustomView` / `onHideCustomView` on Android or it yields a black
screen.

**Also required:** fixed `textZoom` (Android applies system font scaling,
which breaks fixed-pixel layouts), hardware back button mapped to WebView
history rather than app exit, `domStorageEnabled`, `bounces = false` on iOS
(see `overscroll-behavior` above), and a User-Agent marker so the web app
can detect it is containerized.

## Sequencing against the other specs

The teacher tagging screen
([2026-08-03-teacher-side-child-tagging-design.md](2026-08-03-teacher-side-child-tagging-design.md))
is admin-side and desktop-only — it is not in the WebView and is unaffected
by any of this.

The per-child filtering spec
([2026-08-03-per-child-update-filtering-design.md](2026-08-03-per-child-update-filtering-design.md))
does edit `GalleryGrid.jsx`, which is exactly where the `aspect-ratio` fix
lands. These two should be sequenced together, or compat first, to avoid
rewriting the same component twice.

## Out of scope

- Supporting iOS below 14.5 (see "Supported floor").
- Building the Flutter container itself — this spec defines its contract.
- Migrating inline styles to CSS classes. It would let stylelint cover the
  whole codebase and remove the need for the custom ESLint rule, but it is a
  large refactor unrelated to the current goal.
