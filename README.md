# 🗂️ Bitfold

> **Runs entirely in your browser.**
> No backend, no server, no file ever gets uploaded anywhere. Everything — splitting, joining, and rebuilding — happens locally on your device using native browser APIs.

A client-side file splitting and rejoining tool built with **vanilla HTML, CSS, and JavaScript**. Cuts large files into numbered parts under a size limit and rebuilds them byte-for-byte afterward.

> Developed by **Mohammed Boulifa**

---

## ✨ Features

- 🔪 **Split** — cut any file into parts at a size you choose (1 MB – 4 GB), via a slider or a custom MB input
- 🔢 **Live part count** — the number of parts and their sizes update instantly as you move the chunk-size slider
- 🧩 **Join** — select all the parts, in any order, and rebuild the original file
- ✅ **Verified rebuilds** — part order and final byte size are checked before the rebuilt file is handed back to you
- ⬇️ **Auto-download** — download every part one at a time with a single click instead of clicking each one manually
- 🌗 **Light / dark mode** — toggle in the header, remembers your choice, defaults to your system preference
- 📱 **Responsive** — usable on both desktop and mobile
- 🧠 **Memory-safe by design** — uses `Blob.slice()` to read files lazily in chunks, so splitting never loads the whole file into memory — this is what makes multi-gigabyte files practical in a browser tab

---

## 🛠️ Setup Instructions

### 1. Get the files
Clone or download this repository — no build step, no package manager, no dependencies to install.

### 2. Run it
Any of the following works:
- Open `index.html` directly in a browser, or
- Serve the folder locally:
  ```bash
  npx serve .
  ```
- Host it as a static site (see [Deploying](#-deploying) below)

### 3. Split a file
1. Go to the **split** tab
2. Drop in your file
3. Adjust the chunk size with the slider or the MB box
4. Download each part individually, or click **Auto-download all parts**
5. Send the parts anywhere with an upload limit smaller than your file

### 4. Rejoin a file
1. Go to the **join** tab
2. Drop or select every part file at once
3. Click **Rebuild file** — the original downloads once everything checks out

---

## 📋 How it works

| Tab | What it does |
|-----|---------------|
| **split** | Slices the file with `Blob.slice(start, end)` — a lazy reference to a byte range, not a copy — and prefixes each part with a small JSON header (filename, MIME type, total size, part index) |
| **join** | Reads each part's header to recover its position and the original file's identity, sorts by part index, checks nothing is missing or duplicated, then concatenates and verifies the final size |

Because joining trusts the header inside each part rather than its filename, parts can be renamed or mixed with parts from other files in the same folder without breaking anything.

---

## ⚠️ Limitations

- Auto-download waits a delay scaled to file size between parts rather than a true "download finished" signal — browsers don't expose one for script-triggered downloads
- Everything lives in one browser tab; closing it mid-split or mid-join means starting over
- No compression — parts are raw byte ranges, so total part size equals the original file size

---

## 📁 Project Structure

```
bitfold/
├── index.html   # the split/join tool (main page)
├── about.html   # about page
├── style.css    # shared styles, including the light/dark theme
├── app.js       # split/join logic + background animation
├── theme.js     # shared light/dark toggle, used on both pages
└── README.md
```

Keep all files in the same folder — `index.html` and `about.html` reference `style.css`, `theme.js`, and `app.js` by relative path.

---


## 🌐 Browser Support

Needs a modern browser (recent Chrome, Edge, Firefox, or Safari) for the `Blob.slice()` and File APIs the split/join logic relies on. No polyfills included.

---

## 📄 License

This project is open source and available for personal and educational use.

---

## 👤 About

Built by **Mohammed Boulifa** — freelance graphic designer & software/app developer, Ouargla, Algeria.

- 🔗 [Behance](https://behance.net/MohammedBoulifa)
- 🔗 [X / Twitter](https://x.com/X07Mohammed)

Open to freelance work — branding, design, and app/web development.
