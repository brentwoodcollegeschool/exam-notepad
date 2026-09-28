(() => {
  "use strict";

  const editor = document.getElementById("editor");
  const wordCountEl = document.getElementById("wordCount");
  const charCountEl = document.getElementById("charCount");
  const saveStatusEl = document.getElementById("saveStatus");
  const dictateStatusEl = document.getElementById("dictateStatus");
  const fileInput = document.getElementById("fileInput");
  const toastEl = document.getElementById("toast");

  const recoveryBanner = document.getElementById("recoveryBanner");
  const recoveryText = document.getElementById("recoveryText");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalHelp = document.getElementById("modalHelp");
  const modalChars = document.getElementById("modalChars");
  const modalSpeech = document.getElementById("modalSpeech");
  const charGrid = document.getElementById("charGrid");
  const voiceSelect = document.getElementById("voiceSelect");
  const rateSlider = document.getElementById("rateSlider");
  const rateValue = document.getElementById("rateValue");

  const DRAFT_KEY = "examNotepad.draft.v1";
  const THEME_KEY = "examNotepad.theme";
  const FONT_KEY = "examNotepad.fontSize";
  const LINE_KEY = "examNotepad.lineHeight";

  const FONT_MIN = 12, FONT_MAX = 40, FONT_STEP = 2, FONT_DEFAULT = 18;
  const LINE_MIN = 1.2, LINE_MAX = 2.6, LINE_STEP = 0.2, LINE_DEFAULT = 1.6;

  let fileHandle = null;
  let dirty = false;
  let autosaveTimer = null;

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg, ms = 3000) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), ms);
  }

  // ---------- Status / word count ----------
  function updateStatus() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCountEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
    charCountEl.textContent = `${text.length} character${text.length === 1 ? "" : "s"}`;
  }

  function markDirty() {
    dirty = true;
    saveStatusEl.textContent = fileHandle ? "Unsaved changes" : "Not saved yet";
  }

  function markSaved() {
    dirty = false;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    saveStatusEl.textContent = `Saved at ${time}`;
    // Once the work is safely on disk, drop the local recovery draft so it
    // can't be offered to the next person who uses this device.
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  // ---------- Autosave / recovery ----------
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: editor.value, ts: Date.now() }));
      } catch (e) { /* storage may be unavailable/full; ignore */ }
    }, 600);
  }

  function checkRecovery() {
    let raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    let draft;
    try { draft = JSON.parse(raw); } catch (e) { return; }
    if (!draft || !draft.text || !draft.text.trim()) return;
    const when = new Date(draft.ts).toLocaleString([], { hour: "2-digit", minute: "2-digit" });
    const snippet = draft.text.trim().slice(0, 60).replace(/\s+/g, " ");
    const preview = snippet.length < draft.text.trim().length ? snippet + "…" : snippet;
    recoveryText.textContent = `Unsaved work from ${when}: "${preview}" — is this yours?`;
    recoveryBanner.classList.remove("hidden");
    recoveryBanner.dataset.text = draft.text;
  }

  document.getElementById("btnRestore").addEventListener("click", () => {
    editor.value = recoveryBanner.dataset.text || "";
    recoveryBanner.classList.add("hidden");
    updateStatus();
    markDirty();
    editor.focus();
  });

  document.getElementById("btnDiscardRecovery").addEventListener("click", () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    recoveryBanner.classList.add("hidden");
  });

  editor.addEventListener("input", () => {
    updateStatus();
    markDirty();
    scheduleAutosave();
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty && editor.value.trim()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // ---------- New / Open / Save ----------
  function confirmDiscardIfNeeded() {
    if (!editor.value.trim()) return true;
    return confirm("This will replace your current text. Continue?");
  }

  document.getElementById("btnNew").addEventListener("click", () => {
    if (!confirmDiscardIfNeeded()) return;
    editor.value = "";
    fileHandle = null;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    updateStatus();
    saveStatusEl.textContent = "Not saved yet";
    dirty = false;
    editor.focus();
  });

  function suggestFileName() {
    const d = new Date();
    const stamp = d.toISOString().slice(0, 10);
    return `exam-${stamp}.txt`;
  }

  function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function saveFile(forceNew) {
    const text = editor.value;
    if ("showSaveFilePicker" in window) {
      try {
        if (!fileHandle || forceNew) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestFileName(),
            types: [{ description: "Text file", accept: { "text/plain": [".txt"] } }],
          });
        }
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        markSaved();
        showToast("Saved");
      } catch (err) {
        if (err && err.name !== "AbortError") showToast("Could not save file.");
      }
    } else {
      downloadTextFile(text, suggestFileName());
      markSaved();
      showToast("Downloaded");
    }
  }

  async function openFile() {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Text file", accept: { "text/plain": [".txt"] } }],
        });
        if (!confirmDiscardIfNeeded()) return;
        const file = await handle.getFile();
        const text = await file.text();
        fileHandle = handle;
        editor.value = text;
        updateStatus();
        markSaved();
        editor.focus();
      } catch (err) {
        if (err && err.name !== "AbortError") showToast("Could not open file.");
      }
    } else {
      fileInput.click();
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!confirmDiscardIfNeeded()) { fileInput.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = String(reader.result);
      updateStatus();
      markSaved();
    };
    reader.readAsText(file);
    fileInput.value = "";
  });

  document.getElementById("btnOpen").addEventListener("click", openFile);
  document.getElementById("btnSave").addEventListener("click", () => saveFile(false));
  document.getElementById("btnSaveAs").addEventListener("click", () => saveFile(true));
  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  // Chrome only prints the visible/scrolled portion of a <textarea>. Mirror
  // the full value into a plain element right before printing so the whole
  // document — not just what's currently on screen — ends up on the page.
  const printOutput = document.getElementById("printOutput");
  window.addEventListener("beforeprint", () => {
    printOutput.textContent = editor.value;
  });

  // ---------- Undo / redo ----------
  document.getElementById("btnUndo").addEventListener("click", () => {
    editor.focus();
    document.execCommand("undo");
  });
  document.getElementById("btnRedo").addEventListener("click", () => {
    editor.focus();
    document.execCommand("redo");
  });

  // ---------- Insert helpers ----------
  function insertAtCursor(text) {
    editor.focus();
    const ok = document.execCommand && document.execCommand("insertText", false, text);
    if (!ok) {
      const start = editor.selectionStart, end = editor.selectionEnd;
      editor.setRangeText(text, start, end, "end");
      editor.dispatchEvent(new Event("input"));
    }
  }

  function insertHeaderTemplate() {
    const template =
      "Name: _______________________________     Date: ________________\n" +
      "Class: ______________________________     Teacher: ______________\n" +
      "------------------------------------------------------------\n\n";
    editor.focus();
    editor.setSelectionRange(0, 0);
    insertAtCursor(template);
    editor.setSelectionRange(template.length, template.length);
  }

  function insertWordCount() {
    const text = editor.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    editor.focus();
    editor.setSelectionRange(text.length, text.length);
    insertAtCursor(`\n\nWord Count: ${words}`);
  }

  document.getElementById("btnHeader").addEventListener("click", insertHeaderTemplate);
  document.getElementById("btnWordCount").addEventListener("click", insertWordCount);

  // ---------- Font size / line height ----------
  let fontSize = parseInt(localStorage.getItem(FONT_KEY), 10) || FONT_DEFAULT;
  let lineHeight = parseFloat(localStorage.getItem(LINE_KEY)) || LINE_DEFAULT;

  function applyEditorStyle() {
    document.documentElement.style.setProperty("--font-size", fontSize + "px");
    document.documentElement.style.setProperty("--line-height", String(lineHeight));
  }

  function changeFontSize(delta) {
    fontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize + delta));
    localStorage.setItem(FONT_KEY, String(fontSize));
    applyEditorStyle();
  }

  function resetFontSize() {
    fontSize = FONT_DEFAULT;
    localStorage.setItem(FONT_KEY, String(fontSize));
    applyEditorStyle();
  }

  function changeLineHeight(delta) {
    lineHeight = Math.min(LINE_MAX, Math.max(LINE_MIN, +(lineHeight + delta).toFixed(2)));
    localStorage.setItem(LINE_KEY, String(lineHeight));
    applyEditorStyle();
  }

  document.getElementById("btnFontMinus").addEventListener("click", () => changeFontSize(-FONT_STEP));
  document.getElementById("btnFontPlus").addEventListener("click", () => changeFontSize(FONT_STEP));
  document.getElementById("btnLineMinus").addEventListener("click", () => changeLineHeight(-LINE_STEP));
  document.getElementById("btnLinePlus").addEventListener("click", () => changeLineHeight(LINE_STEP));

  applyEditorStyle();

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark");
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");

  document.getElementById("btnTheme").addEventListener("click", () => {
    const dark = document.body.classList.toggle("theme-dark");
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  });

  // ---------- Fullscreen ----------
  document.getElementById("btnFullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  // ---------- Wake Lock (keep screen on) ----------
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) { /* permission not available yet; retried on interaction */ }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestWakeLock();
  });
  requestWakeLock();
  document.addEventListener("pointerdown", () => { if (!wakeLock) requestWakeLock(); }, { once: true });

  // ---------- Modals ----------
  function openModal(modal) {
    modalOverlay.classList.remove("hidden");
    [modalHelp, modalChars, modalSpeech].forEach((m) => m.classList.add("hidden"));
    modal.classList.remove("hidden");
  }
  function closeModals() {
    modalOverlay.classList.add("hidden");
    editor.focus();
  }
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModals();
  });
  document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", closeModals));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closeModals();
  });

  document.getElementById("btnHelp").addEventListener("click", () => openModal(modalHelp));
  document.getElementById("btnSpecialChars").addEventListener("click", () => openModal(modalChars));

  // ---------- Special characters ----------
  const SPECIAL_CHARS = [
    "à", "á", "â", "ä", "ã", "å", "æ", "ç", "è", "é", "ê", "ë",
    "ì", "í", "î", "ï", "ñ", "ò", "ó", "ô", "ö", "õ", "ø", "œ",
    "ù", "ú", "û", "ü", "ý", "ÿ", "À", "É", "Ñ", "Ö", "Ü", "Ç",
    "¿", "¡", "€", "£", "¥", "§", "¶", "†", "‡", "•", "…", "–",
    "—", "“", "”", "‘", "’", "×", "÷", "±", "°", "½", "¼", "¾",
    "≤", "≥", "≠", "≈", "→", "←", "↔", "π", "√", "∞",
  ];

  function buildCharGrid() {
    const frag = document.createDocumentFragment();
    SPECIAL_CHARS.forEach((ch) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ch;
      btn.addEventListener("click", () => insertAtCursor(ch));
      frag.appendChild(btn);
    });
    charGrid.appendChild(frag);
  }
  buildCharGrid();

  // ---------- Text-to-speech (Read Aloud) ----------
  const synth = window.speechSynthesis;
  let voices = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
    voiceSelect.innerHTML = "";
    voices.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });
  }
  if (synth) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }

  rateSlider.addEventListener("input", () => {
    rateValue.textContent = `${parseFloat(rateSlider.value).toFixed(1)}×`;
  });

  const btnReadAloud = document.getElementById("btnReadAloud");

  function getSelectionOrAllText() {
    const start = editor.selectionStart, end = editor.selectionEnd;
    if (end > start) return editor.value.slice(start, end);
    return editor.value;
  }

  const readIconPlay = btnReadAloud.querySelector(".icon-play");
  const readIconPause = btnReadAloud.querySelector(".icon-pause");
  const readLabel = btnReadAloud.querySelector(".btn-label");

  function updateReadBtn(state) {
    const playing = state === "playing";
    btnReadAloud.classList.toggle("active", playing);
    readIconPlay.classList.toggle("hidden", playing);
    readIconPause.classList.toggle("hidden", !playing);
    readLabel.textContent = playing ? "Pause" : "Read Aloud";
  }

  function readAloud() {
    if (!synth) { showToast("Text-to-speech is not supported in this browser."); return; }
    if (synth.speaking && !synth.paused) {
      synth.pause();
      updateReadBtn("paused");
      return;
    }
    if (synth.paused) {
      synth.resume();
      updateReadBtn("playing");
      return;
    }
    const text = getSelectionOrAllText();
    if (!text.trim()) { showToast("Nothing to read."); return; }
    const utter = new SpeechSynthesisUtterance(text);
    const idx = voiceSelect.value;
    if (voices[idx]) utter.voice = voices[idx];
    utter.rate = parseFloat(rateSlider.value) || 1;
    utter.onend = () => updateReadBtn("idle");
    utter.onerror = () => updateReadBtn("idle");
    synth.cancel();
    synth.speak(utter);
    updateReadBtn("playing");
  }

  btnReadAloud.addEventListener("click", readAloud);
  btnReadAloud.addEventListener("dblclick", () => openModal(modalSpeech));
  document.getElementById("btnStopReading").addEventListener("click", () => {
    if (synth) synth.cancel();
    updateReadBtn("idle");
  });

  // ---------- Speech-to-text (Dictate) ----------
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btnDictate = document.getElementById("btnDictate");
  let recognition = null;
  let dictating = false;
  let shouldRestart = false;

  const dictateIconMic = btnDictate.querySelector(".icon-mic");
  const dictateIconStop = btnDictate.querySelector(".icon-stop");
  const dictateLabel = btnDictate.querySelector(".btn-label");

  function updateDictateBtn() {
    btnDictate.classList.toggle("recording", dictating);
    dictateIconMic.classList.toggle("hidden", dictating);
    dictateIconStop.classList.toggle("hidden", !dictating);
    dictateLabel.textContent = dictating ? "Stop Dictation" : "Dictate";
  }

  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          insertAtCursor(transcript.trim() + " ");
        } else {
          interim += transcript;
        }
      }
      dictateStatusEl.textContent = interim ? `Hearing: "${interim}"` : "Listening…";
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        shouldRestart = false;
        dictating = false;
        updateDictateBtn();
        dictateStatusEl.textContent = "";
        showToast("Microphone access is blocked for this page.");
      }
    };

    recognition.onend = () => {
      if (shouldRestart) {
        try { recognition.start(); } catch (e) { /* already started */ }
      } else {
        dictateStatusEl.textContent = "";
        updateDictateBtn();
      }
    };
  } else {
    btnDictate.disabled = true;
    btnDictate.title = "Dictation is not supported in this browser";
  }

  btnDictate.addEventListener("click", () => {
    if (!recognition) return;
    if (dictating) {
      shouldRestart = false;
      dictating = false;
      recognition.stop();
    } else {
      shouldRestart = true;
      dictating = true;
      try { recognition.start(); } catch (e) { /* ignore double-start */ }
    }
    updateDictateBtn();
  });

  // ---------- Keyboard shortcuts ----------
  document.addEventListener("keydown", (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    const k = e.key.toLowerCase();

    if (k === "s" && e.shiftKey) { e.preventDefault(); saveFile(true); }
    else if (k === "s") { e.preventDefault(); saveFile(false); }
    else if (k === "o" && e.shiftKey) { e.preventDefault(); openFile(); }
    else if (k === "t") { e.preventDefault(); insertHeaderTemplate(); }
    else if (k === "c" && e.shiftKey) { e.preventDefault(); insertWordCount(); }
    else if (k === "=" || k === "+") { e.preventDefault(); changeFontSize(FONT_STEP); }
    else if (k === "-") { e.preventDefault(); changeFontSize(-FONT_STEP); }
    else if (k === "0") { e.preventDefault(); resetFontSize(); }
  });

  // ---------- Service worker (offline app shell) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---------- Init ----------
  updateStatus();
  checkRecovery();
  editor.focus();
})();
