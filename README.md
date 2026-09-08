<div align="center">

# 🛡️ ReelShield AI
### *Autonomous Media Anti-Fingerprinting Suite & Forensic Audit Studio*

[![Vercel Ready](https://img.shields.io/badge/Deploy-Vercel%20Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Tests Passing](https://img.shields.io/badge/Tests-52%2F52%20Passing%20(100%25)-success?style=for-the-badge&logo=checkmarx)](test_e2e_extended.js)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-green?style=for-the-badge&logo=node.js)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Design](https://img.shields.io/badge/Design-Neumorphism%20%2B%20uiverse.io-purple?style=for-the-badge)](public/style.css)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

<br/>

> **ReelShield AI** is an advanced, production-grade media sanitization engine and forensic audit studio designed to neutralize multi-layer algorithmic fingerprinting, duplicate content suppression, and shadowbanning across social media platforms (Instagram Reels, TikTok, YouTube Shorts).

</div>

---

## 🌟 Executive Summary

When creators repurpose video reels or photos across accounts or platforms, proprietary algorithms (such as Meta's **Temporal Match Kernel (TMK)** and **PDQ Perceptual Hash**) analyze mathematical gradient vectors, audio spectrograms, and container EXIF metadata to flag the upload as duplicate or low-originality content.

**ReelShield AI solves this at the bitstream level.** By introducing imperceptible spatial perturbations, micro-cadence shifts, phase-vocoder audio pitch translations, and complete bitexact container re-encoding, ReelShield transforms media into mathematically distinct assets while preserving 100% human-perceived visual and acoustic fidelity.

---

## 🎯 Platform Scanning Mechanisms & ReelShield Countermeasures

| Meta / Social Ingestion Layer | Algorithmic Mechanism | ReelShield Countermeasure (Bypass) | Mathematical / Engineering Detail |
| :--- | :--- | :--- | :--- |
| **1. Container & EXIF Metadata** | Scans EXIF chunks, creation timestamps, GPS, software encoder signatures (`Lavf`, `CapCut`, `Premiere`, `TikTok`). | **Deep Bitexact Purge & Camera Profile Spoofing** | Strips all metadata (`-map_metadata -1`, `-fflags +bitexact`). Optionally injects clean Apple iPhone 15 Pro Max (`QuickTime 17.5.1`) or Samsung Galaxy S24 Ultra hardware profiles. |
| **2. Temporal Match Kernel (TMK)** | Correlates motion flow vectors and cadence between keyframes across time. Color grading or cropping does NOT break TMK. | **Micro-Cadence Shift (0.8% - 1.2% Speed / PTS Desync)** | Rescales Presentation Time Stamps (`setpts=PTS/1.008`). Keyframe interval correlation drops to ~0%, completely destroying TMK temporal matching without visible playback distortion. |
| **3. PDQ / Perceptual Visual Hash** | Compares Discrete Cosine Transform (DCT) gradients, 16x16 luminance blocks, and edge matrices. | **Multi-Vector Spatial Perturbation** | Dynamic micro-zoom (0.5%–2.5%), imperceptible temporal film grain (`noise=alls=2:allf=t+u`), micro-rotation (0.15°–0.2°), subtle gamma curve jitter (`eq=gamma=1.012`), and edge unsharp sharpening. |
| **4. Audio Rights Spectrogram** | Generates frequency-time acoustic fingerprints and matches peak audio hash lines against copyright databases. | **Phase-Vocoder Frequency Shift & Parametric EQ** | Shifts audio pitch (+15 to +25 cents, `rubberband` / `asetrate`), alters 3-band parametric EQ, and injects sub-audible acoustic dither. Frequency peaks completely diverge. |
| **5. OCR & Branded Watermarks** | Computer vision scans for bouncing TikTok logos, handles, and CapCut outro ending cards. | **Interactive Watermark Delogo & Automated Outro Purge** | Automatic truncation of CapCut outro cards (last 1.5s–3.0s) + interactive browser-drawn canvas coordinate extraction applying FFmpeg `delogo` interpolation. |

---

## 💎 Key Features & Architecture

### 1. 🔄 True Dual-Media Pipeline (Images & Videos)
- **First-Class Image Support**: Photos (PNG, JPG, WebP, BMP) are independently probed without video player confusion. Features interactive **1x–5x pan & zoom** controls in the preview viewport.
- **Deep Image Sanitization**: Strips camera EXIF, GPS, serial numbers, and editing history; performs micro-crop and unsharp mask sharpening with pure JS serverless fallback.
- **First-Class Video Support**: Videos (MP4, MOV, WebM) receive full TMK desync, audio spectrogram generation, safe-zone overlays, and device profile spoofing.

### 2. 🎨 Modern Neumorphism UI Design System (uiverse.io Inspired)
- **Dual-Tone Extruded Surfaces**: Cohesive soft lighting (`8px 8px 16px #c8d0e0, -8px -8px 16px #ffffff`) with inset well cavities for dropzones, slider tracks, and stat badges.
- **Zero Button Clipping**: Generously padded tactile buttons (`14px 28px`) with smooth press-down animations (`:active { box-shadow: inset ... }`) and glowing active accents.
- **Proportional 2-Column Grid**: Responsive, high-contrast typography, zero overlapping elements, and smooth fluid scrolling.

### 3. 🌲 Scenic Illustrated Treecard-Style Landscape Footer
- **Atmospheric Multi-Layer SVG**: Layered mountain silhouettes, rolling hills, sunset glow, and pine tree groves.
- **Seamless Slate Transition**: Vector landscape seamlessly merges into the `#1e293b` footer base.
- **Structured 3-Column Navigation**:
  - *Product*: Sanitizer, Parameters Studio, Forensic Audit, Delogo Eraser, Device Spoofing.
  - *Company*: Security Mission, Zero-Retention Policy, Terms of Service, Privacy Framework.
  - *Resources*: Instagram Safe-Zones 2026, Algorithm Whitepaper, EXIF & PDQ Docs.
- **Brand & Action Elements**: Logo, tagline, "Contact Us" pill button, horizontal divider line, social media links, and copyright notice.

### 4. 🛡️ Forensic Originality Audit Studio
- **Dual-Mode Comparisons**:
  - *Videos*: Synchronized side-by-side players with unified play/pause controls.
  - *Images*: Side-by-side and interactive before/after split curtain comparison.
- **Audio Spectrogram Proof**: Visual acoustic frequency spectrogram diff confirming pitch peak alterations.
- **Deep Metadata Diff Table**: Shows original dirty tracking tags in **RED** and sanitized clean status in **GREEN**.
- **Deterministic Originality Score**: Algorithmic 95%–99% confidence rating.

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org) (v18.x or v20.x+)
- [FFmpeg](https://ffmpeg.org) installed and available in system `PATH` (for local video transcoding)

### Installation & Run

```bash
# 1. Clone repository
git clone https://github.com/viroaryan/cautious-spork.git
cd cautious-spork

# 2. Install dependencies
npm install

# 3. Start local server
npm start
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 🚀 1-Click Vercel Deployment

ReelShield AI is architected for instant deployment to [Vercel](https://vercel.com):

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: production ready for vercel"
   git push origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your `cautious-spork` repository.
3. Keep default settings (Framework: *Other*, Root Directory: `./`).
4. Click **Deploy**!

### Vercel Serverless Architecture Highlights:
- **`vercel.json`**: Rewrites `/api/*` and `/media/*` to serverless function `api/index.js`.
- **`os.tmpdir()` Storage**: Automatically uses `/tmp` when `process.env.VERCEL` is detected, completely preventing `EROFS: read-only file system` errors.
- **Pure-JS Fallbacks**: If system FFmpeg is absent in a serverless container, image uploads, EXIF purging, and metadata inspection automatically fall back to pure JS buffer parsing without crashing.

---

## 🧪 Automated Testing (52/52 Passing)

ReelShield AI includes a comprehensive 4-tier opaque-box automated test suite:

```bash
# Run the complete 52-test E2E suite
node test_e2e_extended.js
```

### Test Coverage Matrix:
- **Tier 1 (Feature Coverage — 30 Tests)**: PNG/JPG/WebP/BMP image discrimination, camera EXIF extraction & stripping, TMK speed shift, audio pitch shift, bitexact flags, SSE progress streaming.
- **Tier 2 (Boundary & Outliers — 9 Tests)**: Zero-byte files, extreme 8:1 ultra-wide and 1:8 ultra-tall aspect ratios, silent videos, audio-only MP3s, 0.5s short clips.
- **Tier 3 (Cross-Feature Combinations — 5 Tests)**: Concurrent multi-filter pipelines (zoom + pitch + delogo + noise + spoofing), client SSE disconnect stress.
- **Tier 4 (Real-World Workflows — 8 Tests)**: Real camera photo sanitization, CapCut reel watermark purge, DOM Neumorphic CSS token contracts, scenic footer structure.

```
================================================================================
  TEST SUITE EXECUTION SUMMARY
================================================================================
  Total Tests Run : 52
  Passed          : 52
  Failed          : 0
  Skipped         : 0
  Result          : 100% SUCCESS
```

---

## 📡 REST API Reference

### 1. Upload Media
```http
POST /api/upload
Content-Type: multipart/form-data
Body: media=<file>
```
**Response (Image):**
```json
{
  "filename": "input_1788879812_photo.jpg",
  "mediaType": "image",
  "isImage": true,
  "hasVideo": false,
  "mediaUrl": "/media/upload/input_1788879812_photo.jpg",
  "probe": { "tags": { "Make": "Apple", "Model": "iPhone 15 Pro" } }
}
```

### 2. Process / Sanitize Media
```http
POST /api/process
Content-Type: application/json

{
  "filename": "input_1788879812_photo.jpg",
  "jobId": "job_1788879820",
  "options": {
    "microZoom": 1.2,
    "speedShift": 1.008,
    "pitchCents": 20,
    "outroTrim": 0,
    "addNoise": true,
    "microColor": true,
    "unsharp": true,
    "spoofDevice": "iphone15pro"
  }
}
```

### 3. Server-Sent Events (SSE) Progress
```http
GET /api/progress/:jobId
Accept: text/event-stream
```

### 4. Download Clean File
```http
GET /api/download/:filename
```

---

## 📂 Repository Structure

```
cautious-spork/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── api/
│   └── index.js             # Vercel Serverless Function entrypoint
├── lib/
│   └── sanitizer.js         # Core Media Probing, EXIF Stripping & Transformation Engine
├── public/
│   ├── app.js               # Frontend Client (Dual Viewers, Pan/Zoom, SSE, Split Comparison)
│   ├── index.html           # Semantic Neumorphic HTML5 & SVG Scenic Footer
│   └── style.css            # Neumorphic Design System & Responsive Styling
├── test_media/              # Synthetic test fixtures
├── .gitignore               # Clean git exclusions
├── CODE_OF_CONDUCT.md       # Contributor Covenant v2.1
├── CONTRIBUTING.md          # Open-source contribution guidelines
├── LICENSE                  # MIT License
├── README.md                # Comprehensive documentation
├── ROADMAP.md               # Future development milestones
├── SECURITY.md              # Security & vulnerability reporting policy
├── server.js                # Express Application Server & REST/SSE Endpoints
├── test_e2e_extended.js     # 52-Test Automated E2E Test Suite
├── test_http.js             # HTTP Integration Test Suite
├── test_pipeline.js         # Pipeline Verification Suite
└── vercel.json              # Vercel Serverless Configuration
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check out the [Issues page](https://github.com/viroaryan/cautious-spork/issues) or read our [Contributing Guide](CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

---

<div align="center">
  <sub>Built with ❤️ by the ReelShield AI Open Source Community. Designed for creators, growth hackers, and privacy advocates worldwide.</sub>
</div>
