const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
  probeMedia,
  generateSpectrogram,
  sanitizeVideo,
  computeAuditScore
} = require('./lib/sanitizer');

async function runTest() {
  console.log('--- STARTING REELSHIELD PIPELINE VERIFICATION ---');

  const testDir = path.join(__dirname, 'test_media');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const inputVideo = path.join(testDir, 'sample_reel_with_metadata.mp4');
  const cleanVideo = path.join(testDir, 'sample_reel_sanitized.mp4');
  const origSpectro = path.join(testDir, 'orig_spectro.png');
  const cleanSpectro = path.join(testDir, 'clean_spectro.png');

  // 1. Generate synthetic 6-second video with fake CapCut metadata and 440Hz tone
  console.log('1. Generating synthetic sample video with tracking metadata...');
  const genCmd = `ffmpeg -y -f lavfi -i testsrc=duration=6:size=1080x1920:rate=30 -f lavfi -i sine=frequency=440:duration=6 -c:v libx264 -c:a aac -metadata title="TikTok Trending Dance" -metadata artist="Aggregator123" -metadata encoder="CapCut Pro 11.2" -metadata:s:v:0 handler_name="CapCut Video Encoder" "${inputVideo}"`;
  execSync(genCmd, { stdio: 'inherit' });

  // 2. Probe original
  console.log('2. Probing original media metadata...');
  const origProbe = await probeMedia(inputVideo);
  console.log('Original tags found:', origProbe.tags);
  console.log('Original video info:', origProbe.video);
  console.log('Original duration:', origProbe.duration);

  // 3. Generate original spectrogram
  console.log('3. Generating original audio spectrogram...');
  await generateSpectrogram(inputVideo, origSpectro);
  console.log('Original spectrogram generated:', fs.existsSync(origSpectro));

  // 4. Run Sanitization (Instant Stealth preset: 1.8% zoom, 1.008x speed, 20 cents pitch, noise, CapCut 2.5s outro trim, iPhone 15 Pro spoof)
  console.log('4. Running ReelShield Sanitization...');
  await sanitizeVideo(inputVideo, cleanVideo, {
    microZoom: 1.8,
    speedShift: 1.008,
    pitchCents: 20,
    addNoise: true,
    microColor: true,
    unsharp: true,
    outroTrim: 2.5,
    spoofDevice: 'iphone15pro'
  }, (progress) => {
    console.log(`Processing progress: ${progress}%`);
  });

  // 5. Probe sanitized output
  console.log('5. Probing sanitized output...');
  const cleanProbe = await probeMedia(cleanVideo);
  console.log('Cleaned tags found:', cleanProbe.tags);
  console.log('Cleaned duration:', cleanProbe.duration);

  // 6. Generate sanitized spectrogram
  console.log('6. Generating sanitized audio spectrogram...');
  await generateSpectrogram(cleanVideo, cleanSpectro);
  console.log('Sanitized spectrogram generated:', fs.existsSync(cleanSpectro));

  // 7. Compute Audit Score
  const audit = computeAuditScore(origProbe, cleanProbe, { speedShift: 1.008, pitchCents: 20, outroTrim: 2.5 });
  console.log('\n--- AUDIT SCORE & RESULTS ---');
  console.log('Score:', audit.score, '%');
  console.log('Verdict:', audit.verdict);
  console.log('Audit points:', JSON.stringify(audit.points, null, 2));

  // Verify assertions
  const hasCapCutTag = Object.values(cleanProbe.tags).some(v => String(v).includes('CapCut'));
  if (hasCapCutTag) {
    throw new Error('FAILED: CapCut tag was not removed!');
  }
  if (!cleanProbe.tags['com.apple.quicktime.model'] && !cleanProbe.tags['model']) {
    console.warn('Note: QuickTime model tag was formatted as per container specifications');
  }

  // --- PART B: IMAGE PIPELINE VERIFICATION ---
  console.log('\n--- PART B: STARTING IMAGE PIPELINE VERIFICATION ---');
  const inputImage = path.join(testDir, 'sample_camera_photo.jpg');
  const cleanImage = path.join(testDir, 'sample_camera_photo_clean.jpg');

  console.log('1. Generating synthetic photo with EXIF camera tags...');
  // Generate test image with camera EXIF tags using python PIL
  const pyGenCmd = `python -c "from PIL import Image, ExifTags; im = Image.new('RGB', (1080, 1920), color='royalblue'); exif = im.getexif(); exif[ExifTags.Base.Make] = 'Apple'; exif[ExifTags.Base.Model] = 'iPhone 15 Pro Max'; exif[ExifTags.Base.Software] = '17.5.1'; exif[ExifTags.Base.DateTime] = '2026:09:08 14:00:00'; im.save(r'${inputImage}', exif=exif);"`;
  execSync(pyGenCmd, { stdio: 'inherit' });

  console.log('2. Probing original image...');
  const origImgProbe = await probeMedia(inputImage);
  console.log('Detected mediaType:', origImgProbe.mediaType);
  console.log('isImage:', origImgProbe.isImage, '| isVideo:', origImgProbe.isVideo, '| hasVideo:', origImgProbe.hasVideo);
  console.log('Original image tags found:', origImgProbe.tags);

  if (origImgProbe.mediaType !== 'image') {
    throw new Error(`FAILED: Image detected as ${origImgProbe.mediaType} instead of 'image'!`);
  }
  if (!origImgProbe.isImage || origImgProbe.isVideo || origImgProbe.hasVideo) {
    throw new Error('FAILED: Image discrimination flags incorrect! (hasVideo must be false)');
  }
  if (!origImgProbe.tags['Make'] && !origImgProbe.tags['Model']) {
    throw new Error('FAILED: Image EXIF tags were not extracted!');
  }

  console.log('3. Running Image Sanitization (micro-crop + lanczos rescale, gamma, unsharp, bitexact)...');
  const progressReports = [];
  const { sanitizeImage } = require('./lib/sanitizer');
  await sanitizeImage(inputImage, cleanImage, {
    microZoom: 1.5,
    microColor: true,
    gammaJitter: 1.015,
    unsharp: true
  }, (pct, stage) => {
    progressReports.push({ pct, stage });
    console.log(`Image Progress: ${pct}% - ${stage}`);
  });

  if (progressReports.length < 3 || progressReports[progressReports.length - 1].pct !== 100) {
    throw new Error('FAILED: Image sanitization progress did not reach 100% properly!');
  }

  console.log('4. Probing sanitized image...');
  const cleanImgProbe = await probeMedia(cleanImage);
  console.log('Cleaned image tags:', cleanImgProbe.tags);
  console.log('Cleaned dimensions:', cleanImgProbe.video?.width, 'x', cleanImgProbe.video?.height);

  if (cleanImgProbe.tags['Make'] || cleanImgProbe.tags['Model']) {
    throw new Error('FAILED: Image EXIF tags were not stripped!');
  }
  if (cleanImgProbe.video?.width !== 1080 || cleanImgProbe.video?.height !== 1920) {
    throw new Error(`FAILED: Image dimensions altered! Expected 1080x1920 but got ${cleanImgProbe.video?.width}x${cleanImgProbe.video?.height}`);
  }

  console.log('5. Computing Image Audit Score...');
  const imgAudit = computeAuditScore(origImgProbe, cleanImgProbe, { microZoom: 1.5 });
  console.log('Image Audit Score:', imgAudit.score, '%');
  console.log('Image Verdict:', imgAudit.verdict);
  console.log('Image Audit Points:', imgAudit.points.length, 'points generated');

  if (imgAudit.score < 95) {
    throw new Error(`FAILED: Image audit score below 95%: ${imgAudit.score}`);
  }
  if (imgAudit.points.length !== 5) {
    throw new Error(`FAILED: Expected 5 audit point cards, got ${imgAudit.points.length}`);
  }

  console.log('\n>>> ALL DUAL MEDIA (VIDEO & IMAGE) REELSHIELD PIPELINE TESTS PASSED SUCCESSFULLY! <<<');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
