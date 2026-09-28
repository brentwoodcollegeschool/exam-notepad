# Exam Notepad

A distraction-free writing tool for Chromebooks, built for classroom and exam use where a
locked-down, full-screen text editor is needed instead of a general web browser.

It's a plain static web app (no server, no build step, no Chrome App/extension APIs), so it
keeps working as long as Chrome does — unlike the old "Shiny! Shiny!" Chrome App, which stopped
working once Google removed the Chrome Apps platform.

## Features

- Full-screen, distraction-free plain-text editor (no separate fullscreen toggle — it's meant to
  be run as a single-app ChromeOS kiosk, which is already fullscreen; see SETUP.md)
- Open and save `.txt` files straight to disk or a USB drive
- Clean printing (toolbar and UI are hidden on the printed page)
- Insert accented letters and special characters
- Live line, word, and character counts in the status bar
- Auto-saves your draft locally as you type, and offers to restore it if the page is closed or
  crashes before you save
- **Read Aloud** — text-to-speech for the whole document or just the selected text, with voice
  and speed controls
- **Dictate** — speech-to-text typing at the cursor (needs an internet connection)
- Works offline once it's been loaded at least once (except Dictate, which always needs a
  connection) — a service worker caches the app itself, not your writing, which always saves
  locally regardless of network
- Usable as a ChromeOS kiosk app (see SETUP.md)

## Deploying changes to this app

**Whenever you change `index.html`, `style.css`, `app.js`, or anything else listed in `sw.js`'s
`ASSETS`, bump `CACHE_NAME` in `sw.js` first** (e.g. `exam-notepad-v3` → `v4`). Each version's
files are cached together as one atomic snapshot; if you forget to bump it, a device that's ever
gone offline may keep serving the previous version's files indefinitely instead of picking up
your change.

## Local development

No build step is required — it's plain HTML/CSS/JS. To preview it locally:

```
cd exam-notepad
python3 -m http.server 8000
```

Then open `http://localhost:8000` in Chrome. (Opening `index.html` directly with `file://` also
mostly works, but the File System Access API behaves more reliably over `http://localhost` or
`https://`.)

## Testing

The school-managed Chromebooks this app runs on lock out DevTools, so there's no way to debug on
the actual deployment hardware. Instead, there's an automated end-to-end test suite
([Playwright](https://playwright.dev)) that drives a real Chromium browser from a dev machine and
checks the app the same way a person would — no device access required.

```
npm install
npx playwright install chromium   # first time only
npm test
```

`tests/app.spec.js` covers:

- **Regression guard for the exact bug class that's bitten this app before**: every element id
  `app.js` looks up with `getElementById` is checked against the live DOM, and the page is checked
  for zero console errors/uncaught exceptions on load. (This is what would have caught the
  service-worker/stale-cache mismatch that silently broke Theme, Special Characters, Read Aloud,
  and Dictate in an earlier version — a null-reference crash partway through the script had
  silently skipped every listener registered after it.)
- Every toolbar button is clickable without throwing
- Line/word/character counts update correctly while typing
- Special character insertion, undo
- Theme toggle applies and persists across a reload
- Font-size keyboard shortcuts (Ctrl +/−/0)
- The recovery banner: shows a preview of a leftover draft, restores it, and discarding it clears
  it for good (so it isn't handed to the next student who sits at the same Chromebook)
- Autosave writes to local storage after the debounce
- Printing: the full document (not just what's scrolled into view) gets mirrored into the print
  view, and the page title is blanked and restored correctly around the print
- Read Aloud and Dictate fail safely (no thrown errors) whether or not the browser supports them
- Zero Content-Security-Policy violations during normal use
- **The app still loads with the network fully disabled**, once it's been opened online at least
  once — the actual point of the service worker, verified rather than assumed

All 18 tests currently pass. Run this after any change before pushing, especially anything
touching `app.js`, `index.html`'s element ids, or `sw.js`.

## Deploying

This repo is deployed as a static site via **GitHub Pages** from the `main` branch. Once GitHub
Pages is enabled in the repo settings, any push to `main` updates the live site automatically.

## Locking it down on school Chromebooks

See [SETUP.md](SETUP.md) for step-by-step instructions on configuring a Google Admin console
Organizational Unit (OU) to launch this app in Kiosk mode (or as a locked, force-installed web
app) on managed Chromebooks.

## Browser support

Built for and tested against Chrome/ChromeOS, since that's the deployment target. Open/save uses
the File System Access API (falls back to file download/upload on browsers without it). Read
Aloud and Dictate use the Web Speech API, which is built into Chrome.

## Credits

Rebuilt from scratch as a plain web app. Originally inspired by
[Shiny! Shiny!](https://github.com/thiscouldbejd/Shiny-Shiny), a Chrome App exam-writing tool
that is no longer usable now that Chrome Apps have been discontinued.
