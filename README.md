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
- Optional line-number gutter (never appears when printed)
- Live line, word, and character counts in the status bar
- Auto-saves your draft locally as you type, and offers to restore it if the page is closed or
  crashes before you save
- **Read Aloud** — text-to-speech for the whole document or just the selected text, with voice
  and speed controls
- **Dictate** — speech-to-text typing at the cursor
- Works offline once loaded (except Dictate, which needs an internet connection)
- Installable as a Progressive Web App and usable as a ChromeOS kiosk app

## Local development

No build step is required — it's plain HTML/CSS/JS. To preview it locally:

```
cd exam-notepad
python3 -m http.server 8000
```

Then open `http://localhost:8000` in Chrome. (Opening `index.html` directly with `file://` also
mostly works, but the service worker and File System Access API behave more reliably over
`http://localhost` or `https://`.)

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
