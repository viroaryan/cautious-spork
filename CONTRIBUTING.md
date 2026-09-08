# Contributing to ReelShield AI

Thank you for your interest in contributing to **ReelShield AI**! We welcome contributions from developers, designers, video engineers, and algorithmic researchers worldwide.

---

## 🧭 Code of Conduct
This project and everyone participating in it is governed by the [ReelShield AI Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🛠️ Development Setup

1. **Prerequisites**:
   - Node.js (v18.x, v20.x, or later)
   - npm (v9.x or later)
   - FFmpeg (v5.x or v6.x recommended) added to your system `PATH`
   - Git

2. **Clone & Install**:
   ```bash
   git clone https://github.com/viroaryan/cautious-spork.git
   cd cautious-spork
   npm install
   ```

3. **Running the Local Dev Server**:
   ```bash
   npm start
   # Server listens at http://localhost:3000
   ```

---

## 🧪 Testing Guidelines

Before opening a pull request, all automated test suites must pass:

```bash
# 1. Pipeline Verification (Core FFmpeg & Image/Video logic)
node test_pipeline.js

# 2. HTTP Server & SSE Progress Integration
node test_http.js

# 3. Comprehensive 4-Tier E2E Test Suite (52 Tests)
node test_e2e_extended.js
```

---

## 📐 Project Structure

```
├── api/
│   └── index.js             # Vercel Serverless Function entrypoint
├── lib/
│   └── sanitizer.js         # Core Media Probing, EXIF Stripping & Transformation Engine
├── public/
│   ├── app.js               # Frontend Client (Dual Viewers, SSE, Split Comparison)
│   ├── index.html           # Semantic Neumorphic HTML5 & SVG Scenic Footer
│   └── style.css            # Neumorphic Design System & Responsive Styling
├── test_media/              # Synthetic fixtures for automated testing
├── server.js                # Express Application Server & REST/SSE Endpoints
├── vercel.json              # Vercel Serverless Routing & Deployment Config
└── test_e2e_extended.js     # 52-Test 4-Tier E2E Test Suite
```

---

## 📬 Pull Request Workflow

1. Fork the repo and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Commit your changes with descriptive messages: `git commit -m "feat: add webm audio codec shift"`.
3. Verify all 52 tests pass: `node test_e2e_extended.js`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
