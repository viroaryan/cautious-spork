# Original User Request

## 2026-09-08T14:01:04Z

ReelShield AI is an anti-fingerprinting media sanitizer and audit studio. This project overhauls the application into a production-grade suite with true dual image/video handling, transforms the entire UI into a cohesive Neumorphic aesthetic inspired by uiverse.io with refined spacing and zero button clipping, adds an illustrated scenic landscape footer with structured navigation, and provides authentic proof-of-work media verification.

Working directory: c:/Users/aryan/Documents/antigravity/happy-chandrasekhar
Integrity mode: development

## Requirements

### R1. Dual Media Pipeline & Player Fix (Images & Videos)
Resolve the core media discrimination bug where uploaded images (PNG, JPG, WebP) are treated as videos due to generic stream probing. Both images and videos must be treated as first-class media throughout the entire lifecycle:
- In the **Original Media Preview**: Automatically detect media type. For videos, render <video> with play/pause controls; for images, render a clean responsive <img> element with pan/zoom capability, avoiding blank video screens or playback errors.
- In the **Audit Comparison Studio**: Provide dual-mode side-by-side comparisons. For videos, provide synchronized side-by-side video playback with play/pause synchronization; for images, provide a side-by-side or interactive split before/after viewer.
- In the **Sanitization Engine**: Video pipeline must apply TMK cadence desync, audio pitch shifting, film grain, and metadata purging; image pipeline must apply EXIF stripping, micro-crop/zoom, micro gamma jitter, and unsharp sharpening with clean bitexact containers.

### R2. Neumorphism Design System Overhaul (uiverse.io Inspired)
Elevate the entire user interface into a modern Neumorphism aesthetic:
- **Depth & Surfaces**: Implement soft dual-tone extruded shadows (ox-shadow: 8px 8px 16px #c8d0e0, -8px -8px 16px #ffffff) for cards and convex surfaces, and crisp inset shadows for input wells, dropzones, and slider tracks.
- **Controls & Typography**: Replace harsh or clipped buttons with tactile Neumorphic buttons inspired by top uiverse.io designs (smooth click press-down transitions, glowing active accents, generous padding preventing label clipping).
- **Layout & Spacing**: Establish a fixed, well-proportioned layout grid with balanced margins and padding. Eliminate overlapping labels, misaligned stat pills, and awkwardly sized containers.

### R3. Scenic Illustrated Multi-Column Footer
Replace basic footer elements with a landscape footer inspired by the reference design:
- **Layered Landscape Vector**: An atmospheric SVG landscape banner showcasing layered mountain ridges, pine tree silhouettes, and a glowing sun gradient seamlessly transitioning into the footer base.
- **Structured Multi-Column Navigation**: Clean semantic columns for links (e.g., *Product*: Home, Features, Security Audit; *Company*: Our Mission, Terms, Privacy Policy; *Resources*: Instagram Safe-Zones, Media Guidelines).
- **Action & Brand Strip**: Brand logo with tagline, an accent Contact Us pill button, horizontal divider line, copyright notice, and social media icons (Twitter/X, Instagram, Facebook, LinkedIn).

### R4. Production-Grade Engine & Proof Verification
Ensure all media processing and analytics are authentic and production-grade:
- Remove any fake skeletons or mock data; verify that all metadata counts, dimensions, audio codecs, and file sizes are extracted live from fprobe.
- Deliver genuine before-and-after metadata diffs highlighting wiped tracking tags in red and clean tags in green.
- Provide real server-side progress reporting (SSE) for both image and video workflows with instant sanitized file downloads.

## Acceptance Criteria

### Media Handling & Duality
- [ ] Uploading images (PNG, JPG, WebP) displays the original image in the preview box without creating video element errors or black screens.
- [ ] Uploading videos (MP4, MOV, WebM) displays the original video player with duration, resolution, and audio spectrogram.
- [ ] Processing an image produces a sanitized, EXIF-scrubbed image file that can be downloaded and viewed in the side-by-side audit studio.
- [ ] Processing a video produces a sanitized video file with altered audio spectrogram and TMK desync that can be downloaded and previewed.

### UI & Neumorphic Design
- [ ] All buttons, cards, dropzones, and parameter sliders adhere to cohesive Neumorphic lighting, shadows, and hover/active states.
- [ ] The Browse Media / Select Media dropzone button and all action buttons have ample padding and zero text clipping across viewports.
- [ ] The entire page scrolls smoothly with clear separation of sections (Header, Upload, Parameters/Preview, Audit Studio, Scenic Footer).

### Scenic Landscape Footer
- [ ] The footer features the multi-layer mountain and tree silhouette illustration with smooth gradient integration.
- [ ] The footer includes 3 organized navigation columns, brand logo, tagline, Contact Us button, divider line, copyright, and social icons.

### Verification & Robustness
- [ ] Running the test suite (
ode test_http.js and pipeline tests) succeeds with zero unhandled rejections or crashes.
- [ ] Metadata comparison table reflects actual probe data from both original and sanitized files.
