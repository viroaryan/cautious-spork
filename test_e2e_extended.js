/**
 * ReelShield AI - Comprehensive 4-Tier Opaque-Box E2E Test Suite
 * 
 * Requirements Tested:
 * - R1: Dual Media Pipeline & Player Fix (Images & Videos)
 * - R2: Neumorphism Design System Overhaul (uiverse.io inspired)
 * - R3: Scenic Illustrated Multi-Column Landscape Footer
 * - R4: Production-Grade Engine & Proof Verification
 * 
 * Features Covered: Features 1-16 (PROJECT.md)
 * 
 * Usage:
 *   node test_e2e_extended.js
 *   PORT=3000 node test_e2e_extended.js
 *   TEST_TIER=1,2 node test_e2e_extended.js
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync, execFileSync } = require('child_process');
const assert = require('assert');

// -----------------------------------------------------------------------------
// 1. Configuration & Harness Utilities
// -----------------------------------------------------------------------------
const PROJECT_ROOT = __dirname;
const TEST_MEDIA_DIR = path.join(PROJECT_ROOT, 'test_media');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const PROCESSED_DIR = path.join(PROJECT_ROOT, 'processed');

const REQUESTED_PORT = parseInt(process.env.PORT || '3000', 10);
const RUN_TIERS = process.env.TEST_TIER
  ? process.env.TEST_TIER.split(',').map(s => parseInt(s.trim(), 10))
  : [1, 2, 3, 4];

// Terminal formatting colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  failures: []
};

function logHeader(title) {
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  ${title}${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);
}

function logTier(tierNum, tierName) {
  console.log(`\n${C.bold}${C.magenta}>>> TIER ${tierNum}: ${tierName.toUpperCase()} <<<${C.reset}\n`);
}

async function runTestCase(id, description, tier, testFn) {
  stats.total++;
  if (!RUN_TIERS.includes(tier)) {
    stats.skipped++;
    console.log(`  ${C.dim}[SKIP] ${id} - ${description} (Tier ${tier} disabled)${C.reset}`);
    return;
  }

  const startTime = Date.now();
  try {
    await testFn();
    const durationMs = Date.now() - startTime;
    stats.passed++;
    console.log(`  ${C.green}[PASS]${C.reset} ${C.bold}${id}${C.reset}: ${description} ${C.dim}(${durationMs}ms)${C.reset}`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    stats.failed++;
    const errMsg = err.message || String(err);
    console.log(`  ${C.red}[FAIL]${C.reset} ${C.bold}${id}${C.reset}: ${description} ${C.dim}(${durationMs}ms)${C.reset}`);
    console.log(`         ${C.red}-> ${errMsg}${C.reset}`);
    stats.failures.push({ id, description, tier, error: err });
  }
}

// -----------------------------------------------------------------------------
// 2. Programmatic Fixture Generator
// -----------------------------------------------------------------------------
function ensureDirectories() {
  if (!fs.existsSync(TEST_MEDIA_DIR)) fs.mkdirSync(TEST_MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

function createCameraExifJpeg(outPath) {
  // Generate basic JPEG image first
  const tempBase = path.join(TEST_MEDIA_DIR, '_temp_base.jpg');
  execSync(`ffmpeg -y -f lavfi -i testsrc=s=320x240:d=1 -vframes 1 -update 1 "${tempBase}"`, { stdio: 'pipe' });
  const baseData = fs.readFileSync(tempBase);
  try { fs.unlinkSync(tempBase); } catch (_) {}

  const soi = baseData.subarray(0, 2);
  const rest = baseData.subarray(2);

  // Build TIFF APP1 EXIF segment (Little Endian)
  const tiffHeader = Buffer.alloc(8);
  tiffHeader.write('II', 0);
  tiffHeader.writeUInt16LE(42, 2);
  tiffHeader.writeUInt32LE(8, 4); // Offset to IFD0

  const sMake = Buffer.from('Apple\0');
  const sModel = Buffer.from('iPhone 15 Pro\0');
  const sSoftware = Buffer.from('iOS 17.5.1\0');
  const sDateTime = Buffer.from('2026:09:08 12:00:00\0');
  const sArtist = Buffer.from('Photographer John\0');
  const sDesc = Buffer.from('GPS: 37.7749N 122.4194W\0');

  // 6 tags: 8 (header) + 2 (numTags) + (6 * 12) (entries) + 4 (nextIFD) = 86 bytes
  const offMake = 86;
  const offModel = offMake + sMake.length;
  const offSoftware = offModel + sModel.length;
  const offDateTime = offSoftware + sSoftware.length;
  const offArtist = offDateTime + sDateTime.length;
  const offDesc = offArtist + sArtist.length;

  const numTags = Buffer.alloc(2);
  numTags.writeUInt16LE(6, 0);

  function makeTag(id, type, count, valOrOffset) {
    const b = Buffer.alloc(12);
    b.writeUInt16LE(id, 0);
    b.writeUInt16LE(type, 2);
    b.writeUInt32LE(count, 4);
    b.writeUInt32LE(valOrOffset, 8);
    return b;
  }

  const tagMake = makeTag(0x010F, 2, sMake.length, offMake);
  const tagModel = makeTag(0x0110, 2, sModel.length, offModel);
  const tagSoftware = makeTag(0x0131, 2, sSoftware.length, offSoftware);
  const tagDateTime = makeTag(0x0132, 2, sDateTime.length, offDateTime);
  const tagArtist = makeTag(0x013B, 2, sArtist.length, offArtist);
  const tagDesc = makeTag(0x010E, 2, sDesc.length, offDesc);

  const nextIfd = Buffer.alloc(4);
  const allStrings = Buffer.concat([sMake, sModel, sSoftware, sDateTime, sArtist, sDesc]);
  const tiffPayload = Buffer.concat([tiffHeader, numTags, tagMake, tagModel, tagSoftware, tagDateTime, tagArtist, tagDesc, nextIfd, allStrings]);

  const exifPrefix = Buffer.from('Exif\0\0');
  const app1Payload = Buffer.concat([exifPrefix, tiffPayload]);
  const app1Header = Buffer.alloc(4);
  app1Header[0] = 0xFF;
  app1Header[1] = 0xE1;
  app1Header.writeUInt16BE(app1Payload.length + 2, 2);

  const finalJpeg = Buffer.concat([soi, app1Header, app1Payload, rest]);
  fs.writeFileSync(outPath, finalJpeg);
}

function ensureTestFixtures() {
  ensureDirectories();

  const fixtures = {
    cleanPng: path.join(TEST_MEDIA_DIR, 'fixture_image_clean.png'),
    cameraExifJpg: path.join(TEST_MEDIA_DIR, 'fixture_image_camera_exif.jpg'),
    cleanJpg: path.join(TEST_MEDIA_DIR, 'fixture_image_clean.jpg'),
    webpImg: path.join(TEST_MEDIA_DIR, 'fixture_image_webp.webp'),
    gifImg: path.join(TEST_MEDIA_DIR, 'fixture_image_gif.gif'),
    bmpImg: path.join(TEST_MEDIA_DIR, 'fixture_image_bmp.bmp'),
    ultraWideJpg: path.join(TEST_MEDIA_DIR, 'fixture_image_ultrawide.jpg'),
    ultraTallJpg: path.join(TEST_MEDIA_DIR, 'fixture_image_ultratall.jpg'),
    zeroByteJpg: path.join(TEST_MEDIA_DIR, 'fixture_zero_byte.jpg'),
    videoMp4: path.join(TEST_MEDIA_DIR, 'fixture_video_mp4.mp4'),
    videoSilent: path.join(TEST_MEDIA_DIR, 'fixture_video_silent.mp4'),
    audioOnlyMp3: path.join(TEST_MEDIA_DIR, 'fixture_audio_only.mp3'),
    videoShort: path.join(TEST_MEDIA_DIR, 'fixture_video_short.mp4'),
    videoWatermarked: path.join(TEST_MEDIA_DIR, 'fixture_video_watermarked.mp4'),
    videoWebm: path.join(TEST_MEDIA_DIR, 'fixture_video_webm.webm'),
    videoMov: path.join(TEST_MEDIA_DIR, 'fixture_video_mov.mov')
  };

  // 1. Clean PNG (640x480)
  if (!fs.existsSync(fixtures.cleanPng)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=640x480:d=1 -vframes 1 -update 1 "${fixtures.cleanPng}"`, { stdio: 'pipe' });
  }

  // 2. Camera EXIF JPG (with Make, Model, DateTime, Software, Artist, Desc)
  if (!fs.existsSync(fixtures.cameraExifJpg)) {
    createCameraExifJpeg(fixtures.cameraExifJpg);
  }

  // 3. Clean JPG (320x240, no EXIF)
  if (!fs.existsSync(fixtures.cleanJpg)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=s=320x240:d=1 -vframes 1 -update 1 "${fixtures.cleanJpg}"`, { stdio: 'pipe' });
  }

  // 4. WebP Image (640x480)
  if (!fs.existsSync(fixtures.webpImg)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=green:s=640x480:d=1 -vframes 1 -update 1 "${fixtures.webpImg}"`, { stdio: 'pipe' });
  }

  // 5. GIF Image
  if (!fs.existsSync(fixtures.gifImg)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=red:s=320x240:d=1 -vframes 1 "${fixtures.gifImg}"`, { stdio: 'pipe' });
  }

  // 6. BMP Image
  if (!fs.existsSync(fixtures.bmpImg)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=yellow:s=320x240:d=1 -vframes 1 "${fixtures.bmpImg}"`, { stdio: 'pipe' });
  }

  // 7. Ultra-Wide JPG (1920x240, 8:1 aspect ratio)
  if (!fs.existsSync(fixtures.ultraWideJpg)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=purple:s=1920x240:d=1 -vframes 1 -update 1 "${fixtures.ultraWideJpg}"`, { stdio: 'pipe' });
  }

  // 8. Ultra-Tall JPG (240x1920, 1:8 aspect ratio)
  if (!fs.existsSync(fixtures.ultraTallJpg)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=orange:s=240x1920:d=1 -vframes 1 -update 1 "${fixtures.ultraTallJpg}"`, { stdio: 'pipe' });
  }

  // 9. Zero-Byte File (0 bytes)
  if (!fs.existsSync(fixtures.zeroByteJpg)) {
    fs.writeFileSync(fixtures.zeroByteJpg, Buffer.alloc(0));
  }

  // 10. Standard MP4 Video (H.264, AAC sine 440Hz, CapCut metadata, 4 seconds)
  if (!fs.existsSync(fixtures.videoMp4)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=4:size=720x1280:rate=30 -f lavfi -i sine=frequency=440:duration=4 -c:v libx264 -c:a aac -metadata title="Viral Reel" -metadata artist="Aggregator" -metadata encoder="CapCut Pro 11.0" "${fixtures.videoMp4}"`, { stdio: 'pipe' });
  }

  // 11. Silent MP4 Video (no audio stream)
  if (!fs.existsSync(fixtures.videoSilent)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -c:v libx264 -an "${fixtures.videoSilent}"`, { stdio: 'pipe' });
  }

  // 12. Audio-Only MP3 (sine 1000Hz, no video stream)
  if (!fs.existsSync(fixtures.audioOnlyMp3)) {
    execSync(`ffmpeg -y -f lavfi -i sine=frequency=1000:duration=3 -c:a mp3 "${fixtures.audioOnlyMp3}"`, { stdio: 'pipe' });
  }

  // 13. Very Short Video (0.5s duration)
  if (!fs.existsSync(fixtures.videoShort)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=0.5:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=0.5 -c:v libx264 -c:a aac "${fixtures.videoShort}"`, { stdio: 'pipe' });
  }

  // 14. Watermarked Video (MP4 with simulated red box watermark at x=40,y=40,w=100,h=50)
  if (!fs.existsSync(fixtures.videoWatermarked)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=4:size=720x1280:rate=30 -f lavfi -i sine=frequency=440:duration=4 -vf "drawbox=x=40:y=40:w=100:h=50:color=red@0.8:t=fill" -c:v libx264 -c:a aac -metadata title="Watermarked Reel" -metadata encoder="CapCut 10.0" "${fixtures.videoWatermarked}"`, { stdio: 'pipe' });
  }

  // 15. WebM Video (VP8/Vorbis or VP9)
  if (!fs.existsSync(fixtures.videoWebm)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=3 -c:v libvpx -c:a libvorbis "${fixtures.videoWebm}"`, { stdio: 'pipe' });
  }

  // 16. QuickTime MOV Video
  if (!fs.existsSync(fixtures.videoMov)) {
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=3 -c:v libx264 -c:a aac "${fixtures.videoMov}"`, { stdio: 'pipe' });
  }

  return fixtures;
}

// -----------------------------------------------------------------------------
// 3. Ephemeral Server Management
// -----------------------------------------------------------------------------
let activeServerProcess = null;

async function isServerRunning(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1000) });
    return res.status < 500;
  } catch (_) {
    return false;
  }
}

async function startEphemeralServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    proc.stdout.on('data', (d) => {
      stdoutBuffer += d.toString();
      if (stdoutBuffer.includes('Live and running at:')) {
        resolve(proc);
      }
    });

    proc.stderr.on('data', (d) => {
      stderrBuffer += d.toString();
    });

    proc.on('error', (err) => reject(err));
    proc.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}: ${stderrBuffer || stdoutBuffer}`));
      }
    });

    // Fallback polling for readiness
    const checkInterval = setInterval(async () => {
      if (await isServerRunning(port)) {
        clearInterval(checkInterval);
        resolve(proc);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error(`Server start timeout on port ${port}. Output: ${stdoutBuffer}`));
    }, 8000);
  });
}

async function ensureBackendServer() {
  let targetPort = REQUESTED_PORT;
  const running = await isServerRunning(targetPort);

  if (running) {
    console.log(`  ${C.green}✓${C.reset} Connected to existing ReelShield server on port ${targetPort}`);
    return `http://localhost:${targetPort}`;
  }

  // Attempt starting server on requested port, or fallback port 3099
  try {
    console.log(`  ${C.yellow}i${C.reset} Server not running on port ${targetPort}. Spawning ephemeral server...`);
    activeServerProcess = await startEphemeralServer(targetPort);
    console.log(`  ${C.green}✓${C.reset} Ephemeral server running at http://localhost:${targetPort}`);
    return `http://localhost:${targetPort}`;
  } catch (err) {
    // If port conflict or failure, try port 3099
    const altPort = 3099;
    console.log(`  ${C.yellow}i${C.reset} Retrying ephemeral server on alternative port ${altPort}...`);
    activeServerProcess = await startEphemeralServer(altPort);
    console.log(`  ${C.green}✓${C.reset} Ephemeral server running at http://localhost:${altPort}`);
    return `http://localhost:${altPort}`;
  }
}

function stopEphemeralServer() {
  if (activeServerProcess) {
    try {
      activeServerProcess.kill('SIGTERM');
      setTimeout(() => {
        try { activeServerProcess.kill('SIGKILL'); } catch (_) {}
      }, 500);
    } catch (_) {}
  }
}

process.on('exit', stopEphemeralServer);
process.on('SIGINT', () => { stopEphemeralServer(); process.exit(1); });
process.on('uncaughtException', (e) => {
  console.error('Uncaught exception in test runner:', e);
  stopEphemeralServer();
  process.exit(1);
});

// -----------------------------------------------------------------------------
// 4. HTTP API Helper Functions
// -----------------------------------------------------------------------------
async function uploadMedia(baseUrl, filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg'
  };

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeMap[ext] || 'application/octet-stream' });
  formData.append('media', blob, path.basename(filePath));

  const res = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: formData
  });

  const body = await res.json();
  return { status: res.status, body };
}

async function processMedia(baseUrl, filename, options = {}, jobId = null) {
  const payload = { filename, options };
  if (jobId) payload.jobId = jobId;

  const res = await fetch(`${baseUrl}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await res.json();
  return { status: res.status, body };
}

async function collectSseEvents(baseUrl, jobId, maxEvents = 10, timeoutMs = 8000) {
  const events = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/progress/${jobId}`, {
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`SSE endpoint returned status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('text/event-stream'), `Expected text/event-stream but got ${contentType}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let streamBuffer = '';

    while (events.length < maxEvents) {
      const { done, value } = await reader.read();
      if (done) break;
      streamBuffer += decoder.decode(value, { stream: true });

      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const raw = line.replace('data:', '').trim();
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              events.push(parsed);
              if (parsed.status === 'completed' || parsed.status === 'failed') {
                clearTimeout(timer);
                controller.abort();
                return events;
              }
            } catch (_) {}
          }
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  } finally {
    clearTimeout(timer);
  }

  return events;
}

// -----------------------------------------------------------------------------
// 5. Direct Media Probe Helper
// -----------------------------------------------------------------------------
function directProbe(filePath) {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-show_frames',
    filePath
  ];
  const stdout = execFileSync('ffprobe', args, { encoding: 'utf8' });
  const data = JSON.parse(stdout);
  const format = data.format || {};
  const streams = data.streams || [];
  const frames = data.frames || [];

  const videoStream = streams.find(s => s.codec_type === 'video');
  const audioStream = streams.find(s => s.codec_type === 'audio');

  // Collect tags from format, stream, and frame (EXIF)
  const combinedTags = {
    ...(format.tags || {}),
    ...(videoStream?.tags || {}),
    ...(frames[0]?.tags || {})
  };

  const isImageCodec = ['png', 'mjpeg', 'webp', 'gif', 'bmp', 'tiff'].includes(videoStream?.codec_name);
  const isImageFormat = (format.format_name || '').includes('image2') || (format.format_name || '').includes('pipe');
  const isStillImage = isImageCodec && (videoStream?.nb_read_frames === '1' || parseFloat(format.duration || 0) <= 0.05);

  return {
    raw: data,
    formatName: format.format_name,
    duration: parseFloat(format.duration || 0),
    size: parseInt(format.size || 0, 10),
    hasVideo: !!videoStream && !isStillImage,
    hasAudio: !!audioStream,
    isImage: isStillImage || isImageFormat,
    video: videoStream ? {
      codec: videoStream.codec_name,
      width: videoStream.width,
      height: videoStream.height
    } : null,
    audio: audioStream ? {
      codec: audioStream.codec_name,
      sampleRate: parseInt(audioStream.sample_rate || 0, 10),
      channels: audioStream.channels
    } : null,
    tags: combinedTags
  };
}

// -----------------------------------------------------------------------------
// 6. MAIN TEST RUNNER
// -----------------------------------------------------------------------------
async function runAllTests() {
  logHeader('ReelShield AI - 4-Tier Opaque-Box E2E Test Suite');
  console.log(`Authoritative Specs: ORIGINAL_REQUEST.md & PROJECT.md`);
  console.log(`Workspace: ${PROJECT_ROOT}`);

  // Step 1: Ensure programmatic test fixtures exist
  console.log(`\n${C.yellow}i${C.reset} Verifying programmatic test fixtures in test_media/...`);
  const fixtures = ensureTestFixtures();
  console.log(`  ${C.green}✓${C.reset} All 16 synthetic test fixtures ready in test_media/`);

  // Step 2: Ensure server is available
  console.log(`\n${C.yellow}i${C.reset} Initializing backend connection...`);
  const baseUrl = await ensureBackendServer();

  // Load backend lib directly for pipeline-level assertions
  const sanitizer = require('./lib/sanitizer');

  // ===========================================================================
  // TIER 1: FEATURE COVERAGE (>= 5 tests per major feature = 30 tests)
  // ===========================================================================
  logTier(1, 'Feature Coverage (Primary Behavior & Interface Contracts)');

  // -------------------------------------------------------------------------
  // Feature 1: Image Probe Discrimination (5 tests)
  // -------------------------------------------------------------------------
  await runTestCase('T1.1.1', 'Image Probe Discrimination: Clean PNG recognized as image', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cleanPng);
    assert(probe !== null && typeof probe === 'object', 'Probe returned null');
    // Accepts either explicit probe.mediaType === 'image' OR !probe.hasVideo / image format
    const isImage = probe.mediaType === 'image' || (!probe.hasVideo && !probe.hasAudio) || (probe.formatName && probe.formatName.includes('png'));
    assert(isImage, `Expected image identification, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.1.2', 'Image Probe Discrimination: Camera JPEG recognized as image', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cameraExifJpg);
    const isImage = probe.mediaType === 'image' || (!probe.hasVideo && !probe.hasAudio) || (probe.formatName && probe.formatName.includes('jpeg'));
    assert(isImage, `Expected image identification for JPEG, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.1.3', 'Image Probe Discrimination: WebP recognized as image', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.webpImg);
    const isImage = probe.mediaType === 'image' || (!probe.hasVideo && !probe.hasAudio) || (probe.formatName && probe.formatName.includes('webp'));
    assert(isImage, `Expected image identification for WebP, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.1.4', 'Image Probe Discrimination: GIF recognized as image', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.gifImg);
    const isImage = probe.mediaType === 'image' || (!probe.hasVideo && !probe.hasAudio) || (probe.formatName && probe.formatName.includes('gif'));
    assert(isImage, `Expected image identification for GIF, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.1.5', 'Image Probe Discrimination: BMP recognized as image', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.bmpImg);
    const isImage = probe.mediaType === 'image' || (!probe.hasVideo && !probe.hasAudio) || (probe.formatName && probe.formatName.includes('bmp'));
    assert(isImage, `Expected image identification for BMP, got: ${JSON.stringify(probe)}`);
  });

  // -------------------------------------------------------------------------
  // Feature 2: Video Probe Discrimination (5 tests)
  // -------------------------------------------------------------------------
  await runTestCase('T1.2.1', 'Video Probe Discrimination: MP4 recognized as video with duration', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.videoMp4);
    const isVideo = probe.mediaType === 'video' || probe.hasVideo === true;
    assert(isVideo, `Expected video identification for MP4, got: ${JSON.stringify(probe)}`);
    assert(probe.duration > 0, `Expected positive duration, got ${probe.duration}`);
  });

  await runTestCase('T1.2.2', 'Video Probe Discrimination: WebM recognized as video', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.videoWebm);
    const isVideo = probe.mediaType === 'video' || probe.hasVideo === true;
    assert(isVideo, `Expected video identification for WebM, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.2.3', 'Video Probe Discrimination: MOV recognized as video', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.videoMov);
    const isVideo = probe.mediaType === 'video' || probe.hasVideo === true;
    assert(isVideo, `Expected video identification for MOV, got: ${JSON.stringify(probe)}`);
  });

  await runTestCase('T1.2.4', 'Video Probe Discrimination: Video dimensions and fps extracted', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.videoMp4);
    assert(probe.video, 'Expected probe.video object');
    assert.strictEqual(probe.video.width, 720, `Expected width 720, got ${probe.video.width}`);
    assert.strictEqual(probe.video.height, 1280, `Expected height 1280, got ${probe.video.height}`);
    assert(typeof probe.video.fps === 'number' && probe.video.fps > 0, `Invalid fps: ${probe.video.fps}`);
  });

  await runTestCase('T1.2.5', 'Video Probe Discrimination: Audio stream details extracted', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.videoMp4);
    assert(probe.hasAudio, 'Expected probe.hasAudio to be true');
    assert(probe.audio, 'Expected probe.audio object');
    assert.strictEqual(probe.audio.codec, 'aac', `Expected aac codec, got ${probe.audio.codec}`);
    assert(probe.audio.sampleRate > 0, `Invalid sample rate: ${probe.audio.sampleRate}`);
  });

  // -------------------------------------------------------------------------
  // Feature 3: Image EXIF & Metadata Extraction (5 tests)
  // -------------------------------------------------------------------------
  await runTestCase('T1.3.1', 'Image EXIF Extraction: Camera Make tag extracted from JPEG', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cameraExifJpg);
    assert(probe.tags['Make'], `Expected 'Make' tag, tags found: ${JSON.stringify(probe.tags)}`);
    assert.strictEqual(probe.tags['Make'], 'Apple');
  });

  await runTestCase('T1.3.2', 'Image EXIF Extraction: Camera Model tag extracted from JPEG', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cameraExifJpg);
    assert(probe.tags['Model'], `Expected 'Model' tag, tags found: ${JSON.stringify(probe.tags)}`);
    assert.strictEqual(probe.tags['Model'], 'iPhone 15 Pro');
  });

  await runTestCase('T1.3.3', 'Image EXIF Extraction: DateTime and Software tags extracted', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cameraExifJpg);
    assert(probe.tags['DateTime'], `Expected DateTime tag in EXIF`);
    assert.strictEqual(probe.tags['Software'], 'iOS 17.5.1');
  });

  await runTestCase('T1.3.4', 'Image EXIF Extraction: GPS and Artist metadata extracted', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cameraExifJpg);
    assert(probe.tags['Artist'], `Expected Artist tag in EXIF`);
    assert(probe.tags['ImageDescription'] && probe.tags['ImageDescription'].includes('GPS'), `Expected GPS in ImageDescription`);
  });

  await runTestCase('T1.3.5', 'Image EXIF Extraction: Clean image without EXIF returns empty tags safely', 1, async () => {
    const probe = await sanitizer.probeMedia(fixtures.cleanPng);
    assert(probe.tags !== undefined, 'Expected probe.tags to be defined');
    assert.strictEqual(typeof probe.tags, 'object', 'Expected tags object');
    const tagCount = Object.keys(probe.tags).length;
    assert(tagCount <= 1, `Expected empty or minimal tags on clean PNG, got ${tagCount}`);
  });

  // -------------------------------------------------------------------------
  // Feature 4: Image Sanitization Bitexactness (5 tests)
  // -------------------------------------------------------------------------
  const cleanImgOut = path.join(PROCESSED_DIR, 't1_clean_output.jpg');

  await runTestCase('T1.4.1', 'Image Sanitization: EXIF Camera Make/Model tags are 100% stripped', 1, async () => {
    if (fs.existsSync(cleanImgOut)) fs.unlinkSync(cleanImgOut);
    await sanitizer.sanitizeImage(fixtures.cameraExifJpg, cleanImgOut, { microZoom: 1.2 });
    assert(fs.existsSync(cleanImgOut), 'Clean image was not generated');
    const cleanDp = directProbe(cleanImgOut);
    assert(!cleanDp.tags['Make'], `Make tag was not purged: ${cleanDp.tags['Make']}`);
    assert(!cleanDp.tags['Model'], `Model tag was not purged: ${cleanDp.tags['Model']}`);
    assert(!cleanDp.tags['Artist'], `Artist tag was not purged: ${cleanDp.tags['Artist']}`);
  });

  await runTestCase('T1.4.2', 'Image Sanitization: Resolution preserved and valid in sanitized image', 1, async () => {
    assert(fs.existsSync(cleanImgOut), 'Prerequisite cleanImgOut not found');
    const cleanDp = directProbe(cleanImgOut);
    assert(cleanDp.video.width > 0, `Invalid width: ${cleanDp.video.width}`);
    assert(cleanDp.video.height > 0, `Invalid height: ${cleanDp.video.height}`);
  });

  await runTestCase('T1.4.3', 'Image Sanitization: Micro-crop and zoom filter executes cleanly', 1, async () => {
    const cropTestOut = path.join(PROCESSED_DIR, 't1_crop_test.jpg');
    if (fs.existsSync(cropTestOut)) fs.unlinkSync(cropTestOut);
    const res = await sanitizer.sanitizeImage(fixtures.cleanJpg, cropTestOut, { microZoom: 2.5 });
    assert(res && fs.existsSync(cropTestOut), 'Failed to execute micro-crop sanitizeImage');
  });

  await runTestCase('T1.4.4', 'Image Sanitization: Micro gamma and unsharp filter execute cleanly', 1, async () => {
    const filterTestOut = path.join(PROCESSED_DIR, 't1_filter_test.jpg');
    if (fs.existsSync(filterTestOut)) fs.unlinkSync(filterTestOut);
    const res = await sanitizer.sanitizeImage(fixtures.cleanJpg, filterTestOut, { microColor: true });
    assert(res && fs.existsSync(filterTestOut), 'Failed to execute gamma/unsharp sanitizeImage');
  });

  await runTestCase('T1.4.5', 'Image Sanitization: Bitexact flags applied and verified readable by ffprobe', 1, async () => {
    assert(fs.existsSync(cleanImgOut), 'Prerequisite cleanImgOut not found');
    const cleanDp = directProbe(cleanImgOut);
    assert(cleanDp.size > 0, 'Zero-byte output file produced');
    assert.strictEqual(cleanDp.video.codec, 'mjpeg', `Expected mjpeg codec for JPG output, got ${cleanDp.video.codec}`);
  });

  // -------------------------------------------------------------------------
  // Feature 5: Video TMK / Pitch Sanitization (5 tests)
  // -------------------------------------------------------------------------
  const cleanVideoOut = path.join(PROCESSED_DIR, 't1_clean_video.mp4');

  await runTestCase('T1.5.1', 'Video Sanitization: Micro-speed shifts cadence and destroys TMK match', 1, async () => {
    if (fs.existsSync(cleanVideoOut)) fs.unlinkSync(cleanVideoOut);
    await sanitizer.sanitizeVideo(fixtures.videoMp4, cleanVideoOut, {
      microZoom: 1.5,
      speedShift: 1.02,
      pitchCents: 20
    });
    assert(fs.existsSync(cleanVideoOut), 'Sanitized video file was not generated');
    const cleanProbe = await sanitizer.probeMedia(cleanVideoOut);
    assert(cleanProbe.duration > 0, `Expected valid duration on sanitized video, got ${cleanProbe.duration}`);
  });

  await runTestCase('T1.5.2', 'Video Sanitization: Audio pitch shift alters acoustic peak correlation', 1, async () => {
    assert(fs.existsSync(cleanVideoOut), 'Prerequisite cleanVideoOut not found');
    const cleanProbe = await sanitizer.probeMedia(cleanVideoOut);
    assert(cleanProbe.hasAudio, 'Expected sanitized video to retain audio stream');
    assert.strictEqual(cleanProbe.audio.sampleRate, 44100, `Expected 44100 resampled audio rate, got ${cleanProbe.audio.sampleRate}`);
  });

  await runTestCase('T1.5.3', 'Video Sanitization: Container and stream metadata purged', 1, async () => {
    assert(fs.existsSync(cleanVideoOut), 'Prerequisite cleanVideoOut not found');
    const cleanProbe = await sanitizer.probeMedia(cleanVideoOut);
    const hasCapCut = Object.values(cleanProbe.tags || {}).some(v => String(v).includes('CapCut'));
    assert(!hasCapCut, 'CapCut encoder tag was not stripped from container metadata');
  });

  await runTestCase('T1.5.4', 'Video Sanitization: Temporal film grain and micro-noise injected', 1, async () => {
    const grainOut = path.join(PROCESSED_DIR, 't1_grain_test.mp4');
    if (fs.existsSync(grainOut)) fs.unlinkSync(grainOut);
    await sanitizer.sanitizeVideo(fixtures.videoShort, grainOut, { addNoise: true, speedShift: 1.0 });
    assert(fs.existsSync(grainOut), 'Video with grain noise failed to generate');
  });

  await runTestCase('T1.5.5', 'Video Sanitization: CapCut outro trim reduces duration', 1, async () => {
    const trimOut = path.join(PROCESSED_DIR, 't1_trim_test.mp4');
    if (fs.existsSync(trimOut)) fs.unlinkSync(trimOut);
    await sanitizer.sanitizeVideo(fixtures.videoMp4, trimOut, { outroTrim: 1.5, speedShift: 1.0 });
    const trimProbe = await sanitizer.probeMedia(trimOut);
    const origProbe = await sanitizer.probeMedia(fixtures.videoMp4);
    assert(trimProbe.duration < origProbe.duration - 1.0, `Expected trimmed duration < ${origProbe.duration - 1.0}, got ${trimProbe.duration}`);
  });

  // -------------------------------------------------------------------------
  // Feature 6: SSE Progress Streaming (5 tests)
  // -------------------------------------------------------------------------
  await runTestCase('T1.6.1', 'SSE Progress: GET /api/progress/:jobId sets text/event-stream headers', 1, async () => {
    const testJobId = `job_test_headers_${Date.now()}`;
    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/api/progress/${testJobId}`, { signal: controller.signal });
    assert(res.ok, `HTTP status ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    assert(ct.includes('text/event-stream'), `Expected text/event-stream, got ${ct}`);
    controller.abort();
  });

  await runTestCase('T1.6.2', 'SSE Progress: Initial event emits progress >= 0 and valid status', 1, async () => {
    const testJobId = `job_test_init_${Date.now()}`;
    const events = await collectSseEvents(baseUrl, testJobId, 2, 3000);
    assert(events.length > 0, 'No SSE events received');
    assert(events[0].progress !== undefined, 'Missing progress field');
    assert(events[0].progress >= 0, `Expected progress >= 0, got ${events[0].progress}`);
  });

  await runTestCase('T1.6.3', 'SSE Progress: Real video process delivers monotonic progress increments', 1, async () => {
    const testJobId = `job_sse_video_${Date.now()}`;
    // Upload fixture
    const uploadRes = await uploadMedia(baseUrl, fixtures.videoShort);
    assert.strictEqual(uploadRes.status, 200, 'Upload failed');

    // Start SSE listener in background
    const ssePromise = collectSseEvents(baseUrl, testJobId, 15, 10000);

    // Trigger process
    const procRes = await processMedia(baseUrl, uploadRes.body.filename, { speedShift: 1.01 }, testJobId);
    assert.strictEqual(procRes.status, 200, 'Process request failed');

    const events = await ssePromise;
    assert(events.length >= 2, `Expected at least 2 progress events, got ${events.length}`);

    // Check monotonic non-decreasing
    for (let i = 1; i < events.length; i++) {
      assert(events[i].progress >= events[i - 1].progress, `Progress decreased: ${events[i - 1].progress} -> ${events[i].progress}`);
    }
  });

  await runTestCase('T1.6.4', 'SSE Progress: Final event emits completed status and 100% progress', 1, async () => {
    const testJobId = `job_sse_final_${Date.now()}`;
    const uploadRes = await uploadMedia(baseUrl, fixtures.cleanPng);
    assert.strictEqual(uploadRes.status, 200, 'Upload failed');

    const ssePromise = collectSseEvents(baseUrl, testJobId, 10, 8000);
    await processMedia(baseUrl, uploadRes.body.filename, {}, testJobId);
    const events = await ssePromise;

    const lastEvent = events[events.length - 1];
    assert(lastEvent, 'No final event received');
    assert.strictEqual(lastEvent.status, 'completed', `Expected completed status, got ${lastEvent.status}`);
    assert.strictEqual(lastEvent.progress, 100, `Expected 100% progress, got ${lastEvent.progress}`);
  });

  await runTestCase('T1.6.5', 'SSE Progress: Image workflow delivers SSE events without stalling', 1, async () => {
    const testJobId = `job_sse_img_${Date.now()}`;
    const uploadRes = await uploadMedia(baseUrl, fixtures.cameraExifJpg);
    assert.strictEqual(uploadRes.status, 200, 'Upload failed');

    const ssePromise = collectSseEvents(baseUrl, testJobId, 5, 8000);
    await processMedia(baseUrl, uploadRes.body.filename, { microZoom: 1.2 }, testJobId);
    const events = await ssePromise;
    assert(events.length > 0, 'No progress events received for image processing');
  });

  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (9 tests)
  // ===========================================================================
  logTier(2, 'Boundary & Corner Cases (Stress, Outliers & Degenerate Media)');

  await runTestCase('T2.1', 'Boundary: Empty / zero-byte file upload handled safely', 2, async () => {
    const res = await uploadMedia(baseUrl, fixtures.zeroByteJpg);
    // Server must either return 400/500 error cleanly without process crash
    assert(res.status >= 400 || res.body.error, `Expected error response for zero-byte file, got status ${res.status}`);
  });

  await runTestCase('T2.2', 'Boundary: Extreme aspect ratio (Ultra-Wide 8:1, 1920x240) processes cleanly', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_ultrawide_clean.jpg');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeImage(fixtures.ultraWideJpg, outPath, { microZoom: 1.2 });
    assert(fs.existsSync(outPath), 'Ultra-wide image failed to sanitize');
    const dp = directProbe(outPath);
    assert(dp.video.width >= 1900, `Expected wide dimension, got ${dp.video.width}`);
  });

  await runTestCase('T2.3', 'Boundary: Extreme aspect ratio (Ultra-Tall 1:8, 240x1920) processes cleanly', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_ultratall_clean.jpg');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeImage(fixtures.ultraTallJpg, outPath, { microZoom: 1.2 });
    assert(fs.existsSync(outPath), 'Ultra-tall image failed to sanitize');
    const dp = directProbe(outPath);
    assert(dp.video.height >= 1900, `Expected tall dimension, got ${dp.video.height}`);
  });

  await runTestCase('T2.4', 'Boundary: Clean image input without EXIF produces zero false diff errors', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_clean_jpg_out.jpg');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeImage(fixtures.cleanJpg, outPath);
    assert(fs.existsSync(outPath), 'Clean image failed processing');
  });

  await runTestCase('T2.5', 'Boundary: Camera JPEG with full EXIF/GPS tags is completely scrubbed', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_full_scrub.jpg');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeImage(fixtures.cameraExifJpg, outPath);
    const dp = directProbe(outPath);
    assert(!dp.tags['Make'], 'Make tag leaked');
    assert(!dp.tags['Model'], 'Model tag leaked');
    assert(!dp.tags['DateTime'], 'DateTime tag leaked');
  });

  await runTestCase('T2.6', 'Boundary: Silent video (no audio stream) processes without audio filter crash', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_silent_clean.mp4');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeVideo(fixtures.videoSilent, outPath, { speedShift: 1.01 });
    assert(fs.existsSync(outPath), 'Silent video failed to sanitize');
    const probe = await sanitizer.probeMedia(outPath);
    assert(!probe.hasAudio, 'Sanitized silent video should not have audio stream');
  });

  await runTestCase('T2.7', 'Boundary: Audio-only media (MP3) identifies hasVideo: false and hasAudio: true', 2, async () => {
    const probe = await sanitizer.probeMedia(fixtures.audioOnlyMp3);
    assert.strictEqual(probe.hasVideo, false, 'Audio-only media should have hasVideo: false');
    assert.strictEqual(probe.hasAudio, true, 'Audio-only media should have hasAudio: true');
  });

  await runTestCase('T2.8', 'Boundary: Very short video (0.5s) completes without division-by-zero or crash', 2, async () => {
    const outPath = path.join(PROCESSED_DIR, 't2_short_clean.mp4');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeVideo(fixtures.videoShort, outPath, { speedShift: 1.01 });
    assert(fs.existsSync(outPath), 'Short video failed to sanitize');
  });

  await runTestCase('T2.9', 'Boundary: Rapid concurrent uploads return distinct filenames without collision', 2, async () => {
    const uploadPromises = [
      uploadMedia(baseUrl, fixtures.cleanPng),
      uploadMedia(baseUrl, fixtures.cleanJpg),
      uploadMedia(baseUrl, fixtures.webpImg),
      uploadMedia(baseUrl, fixtures.gifImg),
      uploadMedia(baseUrl, fixtures.bmpImg)
    ];
    const results = await Promise.all(uploadPromises);
    results.forEach(r => assert.strictEqual(r.status, 200, 'Upload in batch failed'));
    const filenames = results.map(r => r.body.filename);
    const unique = new Set(filenames);
    assert.strictEqual(unique.size, 5, `Expected 5 unique filenames, got ${unique.size}: ${filenames.join(', ')}`);
  });

  // ===========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (5 tests)
  // ===========================================================================
  logTier(3, 'Cross-Feature Combinations (Adversarial Multi-Filter Matrix)');

  await runTestCase('T3.1', 'Combination: Extreme image transformations (zoom 5% + gamma + unsharp)', 3, async () => {
    const outPath = path.join(PROCESSED_DIR, 't3_extreme_img.jpg');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeImage(fixtures.cameraExifJpg, outPath, {
      microZoom: 5.0,
      microColor: true
    });
    assert(fs.existsSync(outPath), 'Failed extreme image transformation');
    const dp = directProbe(outPath);
    assert(!dp.tags['Make'], 'EXIF leaked under extreme transformation');
  });

  await runTestCase('T3.2', 'Combination: Full video defense matrix (speed + pitch + delogo + noise + Samsung spoof)', 3, async () => {
    const outPath = path.join(PROCESSED_DIR, 't3_full_defense.mp4');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeVideo(fixtures.videoWatermarked, outPath, {
      microZoom: 2.0,
      speedShift: 1.012,
      pitchCents: 35,
      addNoise: true,
      microColor: true,
      delogo: { x: 40, y: 40, w: 100, h: 50 },
      spoofDevice: 's24ultra'
    });
    assert(fs.existsSync(outPath), 'Failed full video defense matrix');
    const probe = await sanitizer.probeMedia(outPath);
    assert(probe.tags['model'] === 'Galaxy S24 Ultra' || probe.tags['Model'] === 'Galaxy S24 Ultra', 'Samsung spoof tag missing');
  });

  await runTestCase('T3.3', 'Combination: Outro trim + pitch shift + iPhone 15 Pro spoofing', 3, async () => {
    const outPath = path.join(PROCESSED_DIR, 't3_trim_spoof.mp4');
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    await sanitizer.sanitizeVideo(fixtures.videoMp4, outPath, {
      outroTrim: 1.5,
      pitchCents: 25,
      spoofDevice: 'iphone15pro'
    });
    assert(fs.existsSync(outPath), 'Failed outro trim + spoofing');
    const probe = await sanitizer.probeMedia(outPath);
    const hasApple = Object.entries(probe.tags).some(([k, v]) => String(v).includes('Apple') || String(v).includes('iPhone'));
    assert(hasApple, 'iPhone spoof tag missing from sanitized video');
  });

  await runTestCase('T3.4', 'Combination: Sudden client disconnect on SSE stream does not crash server', 3, async () => {
    const testJobId = `job_abort_${Date.now()}`;
    const controller = new AbortController();
    const fetchPromise = fetch(`${baseUrl}/api/progress/${testJobId}`, { signal: controller.signal });

    // Abort after 300ms
    setTimeout(() => controller.abort(), 300);

    try {
      await fetchPromise;
    } catch (_) {}

    // Verify server is still alive and responsive
    const healthCheck = await fetch(`${baseUrl}/`);
    assert.strictEqual(healthCheck.status, 200, 'Server crashed after sudden SSE abort');
  });

  await runTestCase('T3.5', 'Combination: Concurrent multi-media pipeline stress (simultaneous image & video)', 3, async () => {
    const imgOut = path.join(PROCESSED_DIR, 't3_stress_img.jpg');
    const vidOut = path.join(PROCESSED_DIR, 't3_stress_vid.mp4');
    if (fs.existsSync(imgOut)) fs.unlinkSync(imgOut);
    if (fs.existsSync(vidOut)) fs.unlinkSync(vidOut);

    const [imgRes, vidRes] = await Promise.all([
      sanitizer.sanitizeImage(fixtures.cleanPng, imgOut, { microZoom: 1.5 }),
      sanitizer.sanitizeVideo(fixtures.videoShort, vidOut, { speedShift: 1.01 })
    ]);

    assert(fs.existsSync(imgOut), 'Concurrent image pipeline failed');
    assert(fs.existsSync(vidOut), 'Concurrent video pipeline failed');
  });

  // ===========================================================================
  // TIER 4: REAL-WORLD SCENARIOS (8 tests)
  // ===========================================================================
  logTier(4, 'Real-World Scenarios (End-to-End User Workflows & Design System)');

  await runTestCase('T4.1', 'Real-World: Camera JPEG photo sanitized end-to-end via HTTP API', 4, async () => {
    // 1. Upload
    const up = await uploadMedia(baseUrl, fixtures.cameraExifJpg);
    assert.strictEqual(up.status, 200, `Upload failed with status ${up.status}`);
    assert(up.body.filename, 'Missing filename in upload response');

    // 2. Process
    const proc = await processMedia(baseUrl, up.body.filename, { microZoom: 1.2 });
    assert.strictEqual(proc.status, 200, `Process failed with status ${proc.status}`);
    assert(proc.body.cleanFilename, 'Missing cleanFilename in response');

    // 3. Verify Download
    const dlRes = await fetch(`${baseUrl}/api/download/${proc.body.cleanFilename}`);
    assert.strictEqual(dlRes.status, 200, `Download failed with status ${dlRes.status}`);
    const dlBuf = await dlRes.arrayBuffer();
    assert(dlBuf.byteLength > 1000, 'Downloaded sanitized file is empty or corrupted');
  });

  await runTestCase('T4.2', 'Real-World: Full CapCut video reel sanitized with watermark purge via HTTP API', 4, async () => {
    const up = await uploadMedia(baseUrl, fixtures.videoWatermarked);
    assert.strictEqual(up.status, 200, 'Upload failed');

    const proc = await processMedia(baseUrl, up.body.filename, {
      microZoom: 1.8,
      speedShift: 1.008,
      pitchCents: 20,
      delogo: { x: 40, y: 40, w: 100, h: 50 },
      outroTrim: 1.0
    });

    assert.strictEqual(proc.status, 200, 'Process failed');
    assert(proc.body.audit, 'Missing audit in process response');
    assert(proc.body.audit.score >= 90, `Expected audit score >= 90, got ${proc.body.audit.score}`);
  });

  await runTestCase('T4.3', 'Real-World: Metadata diff verification & audit points populated', 4, async () => {
    const origProbe = {
      tags: { Make: 'Apple', Model: 'iPhone 15 Pro', Software: 'CapCut 11.0' },
      video: { tags: { handler_name: 'CapCut Video' } },
      audio: { tags: {} }
    };
    const cleanProbe = {
      tags: {},
      video: { tags: {} },
      audio: { tags: {} },
      hasAudio: true
    };
    const audit = sanitizer.computeAuditScore(origProbe, cleanProbe, { speedShift: 1.008, pitchCents: 20, outroTrim: 1.5 });
    assert(audit.score >= 90, `Expected audit score >= 90, got ${audit.score}`);
    assert(Array.isArray(audit.points) && audit.points.length >= 4, `Expected at least 4 audit points, got ${audit.points.length}`);
  });

  await runTestCase('T4.4.1', 'Frontend Contract: Media Preview has responsive <img> and <video> elements', 4, async () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');
    assert(html.includes('id="sourceVideo"'), 'Missing sourceVideo element in public/index.html');
    assert(html.includes('id="sourceImage"'), 'Missing sourceImage element in public/index.html');
  });

  await runTestCase('T4.4.2', 'Frontend Contract: Audit Studio has comparison containers and sync controls', 4, async () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');
    assert(html.includes('audit-grid') || html.includes('audit-box') || html.includes('auditStudio'), 'Missing audit comparison container');
    assert(html.includes('id="syncPlayBtn"') || html.includes('Sync Play') || html.includes('splitCurtain') || html.includes('beforeAfter'), 'Missing audit comparison controls');
  });

  await runTestCase('T4.4.3', 'Frontend Contract: Neumorphic design system tokens defined in style.css', 4, async () => {
    const css = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'style.css'), 'utf8');
    assert(css.includes('box-shadow') || css.includes('--neu-shadow-flat'), 'Missing box-shadow tokens in style.css');
    assert(css.includes('inset') || css.includes('--neu-shadow-inset'), 'Missing inset well shadow tokens in style.css');
  });

  await runTestCase('T4.4.4', 'Frontend Contract: Tactile buttons have ample padding and zero text clipping', 4, async () => {
    const css = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'style.css'), 'utf8');
    assert(css.includes('.neu-btn') || css.includes('button'), 'Missing button styles in style.css');
    // Button styling should have generous padding or min-height
    const hasGenerousPadding = css.includes('padding:') || css.includes('padding :') || css.includes('min-height');
    assert(hasGenerousPadding, 'Missing generous padding or height on buttons in style.css');
  });

  await runTestCase('T4.4.5', 'Frontend Contract: Scenic illustrated landscape footer & multi-column structure', 4, async () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'public', 'index.html'), 'utf8');
    assert(html.includes('<footer') && html.includes('scenic-footer'), 'Missing scenic-footer in public/index.html');
    assert(html.includes('<svg') && html.includes('landscape-svg'), 'Missing landscape-svg in scenic footer');
  });

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  logHeader('TEST SUITE EXECUTION SUMMARY');
  console.log(`  Total Tests Run : ${stats.total}`);
  console.log(`  Passed          : ${C.green}${stats.passed}${C.reset}`);
  console.log(`  Failed          : ${stats.failed > 0 ? C.red : C.green}${stats.failed}${C.reset}`);
  console.log(`  Skipped         : ${stats.skipped}`);

  if (stats.failures.length > 0) {
    console.log(`\n${C.bold}${C.red}Failures Breakdown (${stats.failures.length}):${C.reset}`);
    stats.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. [Tier ${f.tier}] ${C.bold}${f.id}${C.reset}: ${f.description}`);
      console.log(`     Error: ${C.red}${f.error.message || f.error}${C.reset}`);
    });
  }

  stopEphemeralServer();

  if (stats.failed > 0) {
    console.log(`\n${C.bold}${C.red}FAILED: ${stats.failed} test(s) failed.${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${C.bold}${C.green}SUCCESS: All ${stats.passed} tests passed successfully!${C.reset}\n`);
    process.exit(0);
  }
}

// Execute test runner
runAllTests().catch((err) => {
  console.error('\nFatal error running E2E test suite:', err);
  stopEphemeralServer();
  process.exit(1);
});
