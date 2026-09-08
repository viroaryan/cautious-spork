const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch (e) {
      // wait and retry
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function listenSSE(url, onMessage, signal) {
  try {
    const res = await fetch(url, { signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onMessage(data);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      // Ignored
    }
  }
}

async function test() {
  console.log('--- STARTING REELSHIELD HTTP INTEGRATION TEST SUITE ---');

  const BASE_URL = 'http://localhost:3000';
  let serverProcess = null;

  // Check if server is running; if not, spawn it
  let serverReady = await waitForServer(BASE_URL, 1000);
  if (!serverReady) {
    console.log('Starting background test server on port 3000...');
    serverProcess = spawn('node', ['server.js'], { stdio: 'inherit' });
    serverReady = await waitForServer(BASE_URL, 8000);
    if (!serverReady) {
      throw new Error('Server failed to start on http://localhost:3000');
    }
  }
  console.log('Server is alive and responding at http://localhost:3000');

  try {
    // 1. Test GET /
    console.log('\n1. Testing GET / (Static site)...');
    const r = await fetch(BASE_URL);
    console.log('GET / -> HTTP Status:', r.status);
    const text = await r.text();
    console.log('Homepage contains ReelShield:', text.includes('ReelShield'));
    if (!text.includes('ReelShield')) {
      throw new Error('Homepage missing ReelShield branding!');
    }

    // 2. Test Video Upload
    console.log('\n2. Testing Video Upload (/api/upload)...');
    const videoBuffer = fs.readFileSync('test_media/sample_reel_with_metadata.mp4');
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const videoFd = new FormData();
    videoFd.append('media', videoBlob, 'sample_reel_with_metadata.mp4');

    const videoUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: videoFd
    });
    console.log('POST /api/upload (video) -> HTTP Status:', videoUploadRes.status);
    const videoUploadData = await videoUploadRes.json();
    console.log('Uploaded Video:', videoUploadData.filename);
    console.log('Video mediaType:', videoUploadData.mediaType, '| isVideo:', videoUploadData.isVideo, '| hasVideo:', videoUploadData.hasVideo);
    console.log('Video Thumbnail URL:', videoUploadData.thumbUrl);
    console.log('Video Spectrogram URL:', videoUploadData.spectrogramUrl);

    if (videoUploadData.mediaType !== 'video' || !videoUploadData.hasVideo) {
      throw new Error('FAILED: Video upload classification error!');
    }
    if (!videoUploadData.thumbUrl) {
      throw new Error('FAILED: Video missing thumbnail URL!');
    }

    // 3. Test Video Process with SSE progress
    console.log('\n3. Testing Video Process with SSE stream (/api/process & /api/progress)...');
    const videoJobId = 'job_test_video_' + Date.now();
    const videoProgressList = [];
    const videoAbort = new AbortController();

    const videoSSEPromise = listenSSE(
      `${BASE_URL}/api/progress/${videoJobId}`,
      (data) => {
        videoProgressList.push(data);
        console.log(`SSE Video Event: progress=${data.progress}% status=${data.status} stage="${data.stage || ''}"`);
      },
      videoAbort.signal
    );

    const videoProcessRes = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: videoUploadData.filename,
        jobId: videoJobId,
        options: {
          microZoom: 1.8,
          speedShift: 1.008,
          pitchCents: 20,
          outroTrim: 2.5,
          spoofDevice: 'iphone15pro'
        }
      })
    });
    console.log('POST /api/process (video) -> HTTP Status:', videoProcessRes.status);
    const videoProcessData = await videoProcessRes.json();
    videoAbort.abort();
    await videoSSEPromise;

    console.log('Video Clean Filename:', videoProcessData.cleanFilename);
    console.log('Video Originality Score:', videoProcessData.audit.score + '%');
    console.log('Video Verdict:', videoProcessData.audit.verdict);
    console.log('Video Sanitized Spectrogram:', videoProcessData.cleanSpectrogramUrl);

    if (videoProcessData.audit.score < 95) {
      throw new Error(`FAILED: Video audit score below 95%: ${videoProcessData.audit.score}`);
    }
    if (!videoProcessData.cleanSpectrogramUrl) {
      throw new Error('FAILED: Video missing clean spectrogram URL!');
    }

    // 4. Test Image Upload
    console.log('\n4. Testing Image Upload (/api/upload)...');
    const imgPath = path.join(__dirname, 'test_media', 'sample_camera_photo.jpg');
    const imgBuffer = fs.readFileSync(imgPath);
    const imgBlob = new Blob([imgBuffer], { type: 'image/jpeg' });
    const imgFd = new FormData();
    imgFd.append('media', imgBlob, 'sample_camera_photo.jpg');

    const imgUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: imgFd
    });
    console.log('POST /api/upload (image) -> HTTP Status:', imgUploadRes.status);
    const imgUploadData = await imgUploadRes.json();
    console.log('Uploaded Image:', imgUploadData.filename);
    console.log('Image mediaType:', imgUploadData.mediaType, '| isImage:', imgUploadData.isImage, '| hasVideo:', imgUploadData.hasVideo);
    console.log('Image thumbUrl:', imgUploadData.thumbUrl);
    console.log('Image spectrogramUrl:', imgUploadData.spectrogramUrl);

    if (imgUploadData.mediaType !== 'image' || !imgUploadData.isImage || imgUploadData.hasVideo) {
      throw new Error('FAILED: Image upload classification error! hasVideo must be false for images.');
    }
    if (imgUploadData.spectrogramUrl !== null) {
      throw new Error('FAILED: Image must NOT have audio spectrogram!');
    }

    // 5. Test Image Process with SSE progress
    console.log('\n5. Testing Image Process with SSE stream (/api/process & /api/progress)...');
    const imgJobId = 'job_test_img_' + Date.now();
    const imgProgressList = [];
    const imgAbort = new AbortController();

    const imgSSEPromise = listenSSE(
      `${BASE_URL}/api/progress/${imgJobId}`,
      (data) => {
        imgProgressList.push(data);
        console.log(`SSE Image Event: progress=${data.progress}% status=${data.status} stage="${data.stage || ''}"`);
      },
      imgAbort.signal
    );

    const imgProcessRes = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: imgUploadData.filename,
        jobId: imgJobId,
        options: {
          microZoom: 1.5,
          microColor: true,
          gammaJitter: 1.015,
          unsharp: true
        }
      })
    });
    console.log('POST /api/process (image) -> HTTP Status:', imgProcessRes.status);
    const imgProcessData = await imgProcessRes.json();
    imgAbort.abort();
    await imgSSEPromise;

    console.log('Image Clean Filename:', imgProcessData.cleanFilename);
    console.log('Image Originality Score:', imgProcessData.audit.score + '%');
    console.log('Image Verdict:', imgProcessData.audit.verdict);
    console.log('Image mediaType:', imgProcessData.mediaType);

    if (imgProcessData.mediaType !== 'image') {
      throw new Error(`FAILED: Image process returned mediaType ${imgProcessData.mediaType}`);
    }
    if (imgProcessData.audit.score < 95) {
      throw new Error(`FAILED: Image audit score below 95%: ${imgProcessData.audit.score}`);
    }
    if (imgProcessData.cleanProbe.tags['Make'] || imgProcessData.cleanProbe.tags['Model']) {
      throw new Error('FAILED: Image EXIF metadata was not wiped in cleanProbe!');
    }

    // 6. Test Download Endpoints
    console.log('\n6. Testing Download Endpoints (/api/download/:filename)...');
    const dlVideoRes = await fetch(`${BASE_URL}/api/download/${videoProcessData.cleanFilename}`);
    console.log('Download video status:', dlVideoRes.status);
    if (!dlVideoRes.ok) throw new Error('Failed to download sanitized video');

    const dlImgRes = await fetch(`${BASE_URL}/api/download/${imgProcessData.cleanFilename}`);
    console.log('Download image status:', dlImgRes.status);
    if (!dlImgRes.ok) throw new Error('Failed to download sanitized image');

    console.log('\n>>> ALL HTTP INTEGRATION TESTS (VIDEO & IMAGE PIPELINES) PASSED! <<<');
  } finally {
    if (serverProcess) {
      console.log('Shutting down test server...');
      serverProcess.kill();
    }
  }
}

test().catch(err => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
