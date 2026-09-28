# Locking down Exam Notepad on school Chromebooks

This assumes you manage the Chromebooks through the **Google Admin console**
(admin.google.com) under Chrome Enterprise / Chrome Education, and that you want a dedicated
Organizational Unit (OU) — e.g. "Exam Chromebooks" — where devices can *only* run this app.

There are two ways to do it, depending on how strict you want it. Kiosk mode is the strictest
and closest to what you're picturing ("strictly so students can use it for writing").

---

## Option A — Single-app Kiosk mode (strictest, recommended)

The device boots straight into Exam Notepad, full-screen, with no visible browser chrome, no
tabs, no other apps, and no way to navigate elsewhere.

1. **Enable GitHub Pages** for this repo (Settings → Pages → Deploy from branch `main`, root).
   Note the resulting URL, e.g. `https://brentwoodcollegeschool.github.io/exam-notepad/`.

2. In the **Admin console**: `Devices → Chrome → Apps & extensions → Kiosks`.

3. Click **+ (Add Kiosk)** → **Add by URL**, and:
   - Enter the GitHub Pages URL above.
   - Give it a name, e.g. "Exam Notepad".
   - Chrome will auto-detect it as a **Web Kiosk** app (uses the site's manifest, which this
     repo provides).

4. Go to `Devices → Chrome → Settings → Device`, select the **OU** with your exam Chromebooks
   (create one under `Devices → Chrome → Organizational units` if you haven't, and move the
   relevant devices into it via `Devices → Chrome → Devices`).

5. In that OU's device settings, find **Kiosk Settings**:
   - Set **Kiosk apps** to allow "Exam Notepad".
   - Set **Auto-launch kiosk app** to Exam Notepad, so the device boots directly into it without
     showing a sign-in screen at all.
   - (Optional) **Public session kiosk permissions** — leave microphone/printing available (see
     below).

6. Still in that OU, under **Device → Sign-in settings**, you can also restrict sign-in to kiosk
   mode only, so no one can bypass it into a normal Chrome session.

### Microphone access for Dictate

Kiosk sessions sometimes block the microphone by default. In the OU's Chrome settings, go to
`Devices → Chrome → Settings → Users & browsers` (kiosk sessions inherit "public session"-style
policies) and check:
- **Microphone** content setting → add the GitHub Pages origin (e.g.
  `[*.]github.io`) to the **allowed** list, or set the default to "Allow" for that OU.

### Printing in Kiosk mode

Kiosk sessions also restrict printing by default. In the same OU:
- `Devices → Chrome → Settings → Device → Kiosk Settings` → make sure **"Enable print for kiosk
  sessions"** (may be labelled just "Printing") is turned **on**.
- Set up your printers for that OU under `Devices → Chrome → Printers` (or via Print Management)
  so students can select one from the print dialog.

### Updating the app

Because this is a *Web Kiosk* (not an installed Chrome App package), Chrome always loads the
current version of the page from GitHub Pages — there's nothing to re-push to devices. Any
`git push` to `main` that updates GitHub Pages is live the next time a device launches the
kiosk.

---

## Option B — Managed Guest Session with a locked browser (less strict)

If you'd rather students get a normal-looking (but locked-down) Chrome session instead of a
single full-screen app — e.g. so they can also access a school portal — you can instead:

1. Enable GitHub Pages as above.
2. `Devices → Chrome → Settings → Device` → create/select the OU → enable **Guest Mode** /
   **Managed guest session**, and set it to auto-launch a **pinned web app** pointing at the
   GitHub Pages URL (`Apps & extensions → Users & browsers`, force-install the site as a web
   app, pinned to the shelf).
3. Under `Devices → Chrome → Settings → Users & browsers` for that OU, set the **URL Blocklist**
   to `*` (block everything) and the **URL Allowlist** to just the app's origin (and anything
   else you explicitly want reachable, e.g. a printing portal).
4. Allow microphone access for the app's origin, same as in Option A.

This is more flexible but easier for a student to accidentally back out of, since it's still a
browser window rather than a locked kiosk.

---

## Recommended: Option A, per exam room/cart

Put only the Chromebooks used for exams/quiet writing time into the "Exam Chromebooks" OU, so
the lockdown doesn't affect devices students use for normal classwork.
