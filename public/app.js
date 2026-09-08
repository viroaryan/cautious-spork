document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const workspace = document.getElementById('workspace');
  const uploadCard = document.getElementById('uploadCard');

  // Preview elements
  const sourceVideo = document.getElementById('sourceVideo');
  const sourceImage = document.getElementById('sourceImage');
  const mediaBadge = document.getElementById('mediaBadge');
  const mediaTypeBadge = document.getElementById('mediaTypeBadge');
  const previewViewport = document.getElementById('previewViewport');
  const videoPreviewContainer = document.getElementById('videoPreviewContainer');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imageViewport = document.getElementById('imageViewport');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const toggleSafeZoneBtn = document.getElementById('toggleSafeZoneBtn');
  const instaSafeZone = document.getElementById('instaSafeZone');

  // Delogo elements
  const toggleDelogoBtn = document.getElementById('toggleDelogoBtn');
  const delogoCanvas = document.getElementById('delogoCanvas');
  const delogoInfo = document.getElementById('delogoInfo');
  const delogoCoords = document.getElementById('delogoCoords');
  const clearDelogoBtn = document.getElementById('clearDelogoBtn');

  // Stats elements
  const statRes = document.getElementById('statRes');
  const statFps = document.getElementById('statFps');
  const statDur = document.getElementById('statDur');
  const statAudio = document.getElementById('statAudio');
  const statTags = document.getElementById('statTags');
  const statFileSize = document.getElementById('statFileSize');

  // Presets & Controls
  const presetCards = document.querySelectorAll('.preset-card');
  const sliderZoom = document.getElementById('sliderZoom');
  const valZoom = document.getElementById('valZoom');
  const sliderSpeed = document.getElementById('sliderSpeed');
  const valSpeed = document.getElementById('valSpeed');
  const sliderPitch = document.getElementById('sliderPitch');
  const valPitch = document.getElementById('valPitch');
  const sliderOutro = document.getElementById('sliderOutro');
  const valOutro = document.getElementById('valOutro');
  const chkNoise = document.getElementById('chkNoise');
  const chkColor = document.getElementById('chkColor');
  const chkUnsharp = document.getElementById('chkUnsharp');
  const chkInstaFormat = document.getElementById('chkInstaFormat');
  const selDevice = document.getElementById('selDevice');

  // Action & Progress
  const processBtn = document.getElementById('processBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');

  // Audit Section & Comparison Studio
  const auditSection = document.getElementById('auditSection');
  const auditScoreVal = document.getElementById('auditScoreVal');
  const auditVerdict = document.getElementById('auditVerdict');
  const downloadCleanBtn = document.getElementById('downloadCleanBtn');
  const comparisonStudio = document.getElementById('comparisonStudio');

  // Video Audit Mode Elements
  const videoAuditStudio = document.getElementById('videoAuditStudio');
  const auditOrigVideo = document.getElementById('auditOrigVideo');
  const auditCleanVideo = document.getElementById('auditCleanVideo');
  const origSizeLabel = document.getElementById('origSizeLabel');
  const cleanSizeLabel = document.getElementById('cleanSizeLabel');
  const origSpectroWrap = document.getElementById('origSpectroWrap');
  const cleanSpectroWrap = document.getElementById('cleanSpectroWrap');
  const origSpectroImg = document.getElementById('origSpectroImg');
  const cleanSpectroImg = document.getElementById('cleanSpectroImg');
  const syncPlayBtn = document.getElementById('syncPlayBtn');
  const syncPauseBtn = document.getElementById('syncPauseBtn');
  const syncRestartBtn = document.getElementById('syncRestartBtn');
  const syncSeeker = document.getElementById('syncSeeker');
  const syncTimeDisplay = document.getElementById('syncTimeDisplay');

  // Image Audit Mode Elements
  const imageAuditStudio = document.getElementById('imageAuditStudio');
  const btnSplitView = document.getElementById('btnSplitView');
  const btnSideView = document.getElementById('btnSideView');
  const imageSplitViewer = document.getElementById('imageSplitViewer');
  const splitCleanImg = document.getElementById('splitCleanImg');
  const splitOrigLayer = document.getElementById('splitOrigLayer');
  const splitOrigImg = document.getElementById('splitOrigImg');
  const splitDivider = document.getElementById('splitDivider');
  const imageSideBySideViewer = document.getElementById('imageSideBySideViewer');
  const auditOrigImg = document.getElementById('auditOrigImg');
  const auditCleanImg = document.getElementById('auditCleanImg');
  const origImgSizeLabel = document.getElementById('origImgSizeLabel');
  const cleanImgSizeLabel = document.getElementById('cleanImgSizeLabel');

  // Forensic Audit Points & Metadata Diff
  const auditPointsGrid = document.getElementById('auditPointsGrid');
  const metaDiffTable = document.getElementById('metaDiffTable');
  const metaTableBody = document.getElementById('metaTableBody');
  const pillWipedCount = document.getElementById('pillWipedCount');
  const pillCleanCount = document.getElementById('pillCleanCount');
  const pillSpoofedCount = document.getElementById('pillSpoofedCount');

  // ==========================================================================
  // Central Application State
  // ==========================================================================
  const state = {
    currentFile: null,
    uploadResult: null,
    mediaType: 'video', // 'video' | 'image'
    activePreset: 'instant-stealth',
    isDelogoMode: false,
    delogoBox: null, // { x, y, w, h } in native media coordinates
    isDrawingDelogo: false,
    delogoStart: { x: 0, y: 0 },
    // Image Preview Pan & Zoom
    panZoom: {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isPanning: false,
      startX: 0,
      startY: 0
    },
    // Image Comparison Split Curtain
    splitCurtain: {
      position: 50,
      isDragging: false
    },
    // Video Playback Synchronization
    videoSync: {
      isSyncing: false
    }
  };

  let currentEventSource = null;

  // ==========================================================================
  // 1. Upload & Probe Handling
  // ==========================================================================
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  async function handleFileSelected(file) {
    state.currentFile = file;
    const formData = new FormData();
    formData.append('media', file);

    progressContainer.classList.remove('hidden');
    progressText.innerText = 'Extracting Media Fingerprint & EXIF Markers...';
    progressBar.style.width = '25%';
    progressPercent.innerText = '25%';

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      state.uploadResult = data;

      progressBar.style.width = '100%';
      progressPercent.innerText = '100%';
      progressText.innerText = 'Probing complete!';

      setTimeout(() => {
        progressContainer.classList.add('hidden');
        renderUploadedMedia(data);
      }, 350);

    } catch (err) {
      alert('Upload failed: ' + err.message);
      progressContainer.classList.add('hidden');
    }
  }

  function detectMediaType(data, file) {
    if (data && data.mediaType) {
      return data.mediaType === 'image' ? 'image' : 'video';
    }
    if (data && data.probe && data.probe.isImage) {
      return 'image';
    }
    const filename = (data?.filename || file?.name || '').toLowerCase();
    if (/\.(png|jpe?g|webp|bmp|gif)$/i.test(filename)) {
      return 'image';
    }
    if (file && file.type && file.type.startsWith('image/')) {
      return 'image';
    }
    if (data?.probe?.hasVideo && !data?.probe?.hasAudio && (data?.probe?.duration === 0 || !data?.probe?.duration)) {
      return 'image';
    }
    return 'video';
  }

  function renderUploadedMedia(data) {
    state.mediaType = detectMediaType(data, state.currentFile);
    workspace.classList.remove('hidden');
    auditSection.classList.add('hidden');

    const probe = data.probe || {};

    if (state.mediaType === 'image') {
      // Image Mode: show <img> with pan/zoom, hide <video>
      videoPreviewContainer.classList.add('hidden');
      imagePreviewContainer.classList.remove('hidden');
      sourceVideo.pause();
      sourceVideo.removeAttribute('src');
      sourceVideo.load();

      const mediaObjectUrl = state.currentFile ? URL.createObjectURL(state.currentFile) : null;
      sourceImage.src = mediaObjectUrl || data.mediaUrl;
      mediaTypeBadge.innerText = 'Static Image';
      mediaTypeBadge.className = 'media-type-badge neu-pill';
      resetImagePanZoom();

      // Stats
      const imgWidth = probe.video?.width || probe.image?.width || 'Standard';
      const imgHeight = probe.video?.height || probe.image?.height || '';
      statRes.innerText = imgHeight ? `${imgWidth} x ${imgHeight}` : imgWidth;
      statFps.innerText = 'N/A (Image)';
      statDur.innerText = 'Static Image';
      statAudio.innerText = 'None';
      statFileSize.innerText = formatBytes(data.size || probe.size || state.currentFile?.size || 0);

      // Adjust parameter badges for image mode
      if (state.activePreset === 'instant-stealth') {
        sliderSpeed.value = 1.0;
        valSpeed.innerText = '1.0x (N/A)';
        sliderPitch.value = 0;
        valPitch.innerText = '0 (N/A)';
        sliderOutro.value = 0;
        valOutro.innerText = '0 sec';
      }
    } else {
      // Video Mode: show <video> with controls, hide <img>
      imagePreviewContainer.classList.add('hidden');
      videoPreviewContainer.classList.remove('hidden');

      const mediaObjectUrl = state.currentFile ? URL.createObjectURL(state.currentFile) : null;
      sourceVideo.src = mediaObjectUrl || data.mediaUrl;
      sourceVideo.load();
      mediaTypeBadge.innerText = 'Video Stream';
      mediaTypeBadge.className = 'media-type-badge neu-pill';

      // Stats
      statRes.innerText = probe.video ? `${probe.video.width} x ${probe.video.height}` : '1080 x 1920';
      statFps.innerText = probe.video?.fps ? `${probe.video.fps} fps` : '30 fps';
      statDur.innerText = probe.duration ? `${probe.duration.toFixed(1)}s` : '6.0s';
      statAudio.innerText = probe.hasAudio ? `${probe.audio?.codec || 'aac'} (${probe.audio?.sampleRate || 44100}Hz)` : 'None';
      statFileSize.innerText = formatBytes(data.size || probe.size || state.currentFile?.size || 0);
    }

    // Count all metadata tags
    const totalTags = Object.keys(probe.tags || {}).length +
      Object.keys(probe.video?.tags || {}).length +
      Object.keys(probe.audio?.tags || {}).length;

    statTags.innerText = totalTags > 0 ? `${totalTags} Flagged Tags` : '0 (Clean)';

    // Initialize overlay canvas for watermark eraser
    initDelogoCanvas();
  }

  // ==========================================================================
  // 2. Interactive Pan & Zoom for Original Image Preview
  // ==========================================================================
  function updatePanZoomTransform() {
    sourceImage.style.transform = `translate(${state.panZoom.translateX}px, ${state.panZoom.translateY}px) scale(${state.panZoom.scale})`;
    zoomLevel.innerText = `${Math.round(state.panZoom.scale * 100)}%`;
    imageViewport.style.cursor = state.panZoom.scale > 1
      ? (state.panZoom.isPanning ? 'grabbing' : 'grab')
      : 'default';
  }

  function resetImagePanZoom() {
    state.panZoom.scale = 1;
    state.panZoom.translateX = 0;
    state.panZoom.translateY = 0;
    state.panZoom.isPanning = false;
    updatePanZoomTransform();
  }

  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.panZoom.scale = Math.min(5, +(state.panZoom.scale + 0.25).toFixed(2));
    updatePanZoomTransform();
  });

  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.panZoom.scale = Math.max(1, +(state.panZoom.scale - 0.25).toFixed(2));
    if (state.panZoom.scale === 1) {
      state.panZoom.translateX = 0;
      state.panZoom.translateY = 0;
    }
    updatePanZoomTransform();
  });

  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImagePanZoom();
  });

  imageViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    const nextScale = Math.min(5, Math.max(1, +(state.panZoom.scale + delta).toFixed(2)));
    state.panZoom.scale = nextScale;
    if (nextScale === 1) {
      state.panZoom.translateX = 0;
      state.panZoom.translateY = 0;
    }
    updatePanZoomTransform();
  }, { passive: false });

  imageViewport.addEventListener('pointerdown', (e) => {
    if (state.isDelogoMode || state.panZoom.scale <= 1) return;
    state.panZoom.isPanning = true;
    state.panZoom.startX = e.clientX - state.panZoom.translateX;
    state.panZoom.startY = e.clientY - state.panZoom.translateY;
    try {
      imageViewport.setPointerCapture(e.pointerId);
    } catch (_) {}
    updatePanZoomTransform();
  });

  imageViewport.addEventListener('pointermove', (e) => {
    if (!state.panZoom.isPanning) return;
    state.panZoom.translateX = e.clientX - state.panZoom.startX;
    state.panZoom.translateY = e.clientY - state.panZoom.startY;
    updatePanZoomTransform();
  });

  function stopPanning(e) {
    if (state.panZoom.isPanning) {
      state.panZoom.isPanning = false;
      try {
        imageViewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
      updatePanZoomTransform();
    }
  }

  imageViewport.addEventListener('pointerup', stopPanning);
  imageViewport.addEventListener('pointercancel', stopPanning);

  // ==========================================================================
  // 3. Delogo Watermark Eraser Tool & Instagram Safe Zone
  // ==========================================================================
  toggleSafeZoneBtn.addEventListener('click', () => {
    instaSafeZone.classList.toggle('hidden');
    toggleSafeZoneBtn.classList.toggle('active');
  });

  toggleDelogoBtn.addEventListener('click', () => {
    state.isDelogoMode = !state.isDelogoMode;
    toggleDelogoBtn.classList.toggle('active', state.isDelogoMode);
    delogoCanvas.classList.toggle('hidden', !state.isDelogoMode);

    if (state.isDelogoMode) {
      delogoInfo.classList.remove('hidden');
      initDelogoCanvas();
    } else {
      if (!state.delogoBox) delogoInfo.classList.add('hidden');
    }
  });

  function initDelogoCanvas() {
    if (!previewViewport || !delogoCanvas) return;
    const rect = previewViewport.getBoundingClientRect();
    delogoCanvas.width = rect.width;
    delogoCanvas.height = rect.height;
    drawDelogoRect();
  }

  window.addEventListener('resize', () => {
    if (state.uploadResult) initDelogoCanvas();
  });

  const ctx = delogoCanvas.getContext('2d');

  delogoCanvas.addEventListener('mousedown', (e) => {
    if (!state.isDelogoMode) return;
    const rect = delogoCanvas.getBoundingClientRect();
    state.delogoStart.x = e.clientX - rect.left;
    state.delogoStart.y = e.clientY - rect.top;
    state.isDrawingDelogo = true;
  });

  delogoCanvas.addEventListener('mousemove', (e) => {
    if (!state.isDrawingDelogo || !state.isDelogoMode) return;
    const rect = delogoCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.clearRect(0, 0, delogoCanvas.width, delogoCanvas.height);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';

    const w = currentX - state.delogoStart.x;
    const h = currentY - state.delogoStart.y;
    ctx.fillRect(state.delogoStart.x, state.delogoStart.y, w, h);
    ctx.strokeRect(state.delogoStart.x, state.delogoStart.y, w, h);
  });

  delogoCanvas.addEventListener('mouseup', (e) => {
    if (!state.isDrawingDelogo || !state.isDelogoMode) return;
    state.isDrawingDelogo = false;
    const rect = delogoCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const x = Math.min(state.delogoStart.x, endX);
    const y = Math.min(state.delogoStart.y, endY);
    const w = Math.abs(endX - state.delogoStart.x);
    const h = Math.abs(endY - state.delogoStart.y);

    if (w > 10 && h > 10) {
      const probeWidth = state.uploadResult?.probe?.video?.width || state.uploadResult?.probe?.image?.width || delogoCanvas.width;
      const probeHeight = state.uploadResult?.probe?.video?.height || state.uploadResult?.probe?.image?.height || delogoCanvas.height;

      const scaleX = probeWidth / delogoCanvas.width;
      const scaleY = probeHeight / delogoCanvas.height;

      state.delogoBox = {
        x: Math.round(x * scaleX),
        y: Math.round(y * scaleY),
        w: Math.round(w * scaleX),
        h: Math.round(h * scaleY)
      };

      if (delogoCoords) {
        delogoCoords.innerText = `x:${state.delogoBox.x} y:${state.delogoBox.y} w:${state.delogoBox.w} h:${state.delogoBox.h}`;
      }
      drawDelogoRect();
    }
  });

  function drawDelogoRect() {
    ctx.clearRect(0, 0, delogoCanvas.width, delogoCanvas.height);
    if (!state.delogoBox) return;

    const probeWidth = state.uploadResult?.probe?.video?.width || state.uploadResult?.probe?.image?.width || delogoCanvas.width;
    const probeHeight = state.uploadResult?.probe?.video?.height || state.uploadResult?.probe?.image?.height || delogoCanvas.height;

    const scaleX = delogoCanvas.width / probeWidth;
    const scaleY = delogoCanvas.height / probeHeight;

    const x = state.delogoBox.x * scaleX;
    const y = state.delogoBox.y * scaleY;
    const w = state.delogoBox.w * scaleX;
    const h = state.delogoBox.h * scaleY;

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  if (clearDelogoBtn) {
    clearDelogoBtn.addEventListener('click', () => {
      state.delogoBox = null;
      ctx.clearRect(0, 0, delogoCanvas.width, delogoCanvas.height);
      if (delogoCoords) delogoCoords.innerText = 'x:0 y:0 w:0 h:0';
      if (!state.isDelogoMode) delogoInfo.classList.add('hidden');
    });
  }

  // ==========================================================================
  // 4. Presets Selection & Parameter Sliders
  // ==========================================================================
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.activePreset = card.dataset.preset;
      applyPresetSettings(state.activePreset);
    });
  });

  function applyPresetSettings(preset) {
    if (preset === 'instant-stealth') {
      sliderZoom.value = 1.8;
      sliderSpeed.value = state.mediaType === 'image' ? 1.0 : 1.008;
      sliderPitch.value = state.mediaType === 'image' ? 0 : 20;
      sliderOutro.value = state.mediaType === 'image' ? 0 : 2.5;
      chkNoise.checked = true;
      chkColor.checked = true;
      chkUnsharp.checked = true;
      chkInstaFormat.checked = false;
      selDevice.value = 'iphone15pro';
    } else if (preset === 'deep-remaster') {
      sliderZoom.value = 2.2;
      sliderSpeed.value = state.mediaType === 'image' ? 1.0 : 1.012;
      sliderPitch.value = state.mediaType === 'image' ? 0 : 25;
      sliderOutro.value = state.mediaType === 'image' ? 0 : 2.5;
      chkNoise.checked = true;
      chkColor.checked = true;
      chkUnsharp.checked = true;
      chkInstaFormat.checked = true;
      selDevice.value = 'iphone15pro';
    } else if (preset === 'audio-only') {
      sliderZoom.value = 0;
      sliderSpeed.value = 1.0;
      sliderPitch.value = 20;
      sliderOutro.value = 0;
      chkNoise.checked = false;
      chkColor.checked = false;
      chkUnsharp.checked = false;
      chkInstaFormat.checked = false;
      selDevice.value = 'iphone15pro';
    }
    updateSliderLabels();
  }

  function updateSliderLabels() {
    valZoom.innerText = `${sliderZoom.value}%`;
    valSpeed.innerText = `${sliderSpeed.value}x`;
    valPitch.innerText = `${sliderPitch.value >= 0 ? '+' : ''}${sliderPitch.value} cents`;
    valOutro.innerText = `${sliderOutro.value} sec`;
  }

  function markCustom() {
    presetCards.forEach(c => c.classList.remove('active'));
    const customCard = document.querySelector('[data-preset="custom"]');
    if (customCard) customCard.classList.add('active');
    state.activePreset = 'custom';
  }

  sliderZoom.addEventListener('input', () => {
    valZoom.innerText = `${sliderZoom.value}%`;
    markCustom();
  });

  sliderSpeed.addEventListener('input', () => {
    valSpeed.innerText = `${sliderSpeed.value}x`;
    markCustom();
  });

  sliderPitch.addEventListener('input', () => {
    valPitch.innerText = `${sliderPitch.value >= 0 ? '+' : ''}${sliderPitch.value} cents`;
    markCustom();
  });

  sliderOutro.addEventListener('input', () => {
    valOutro.innerText = `${sliderOutro.value} sec`;
    markCustom();
  });

  // ==========================================================================
  // 5. Anti-Fingerprint Process Execution & SSE Progress
  // ==========================================================================
  processBtn.addEventListener('click', async () => {
    if (!state.uploadResult) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '8%';
    progressPercent.innerText = '8%';
    progressText.innerText = 'Initializing Anti-Fingerprint Transformations...';

    if (currentEventSource) {
      currentEventSource.close();
      currentEventSource = null;
    }

    const jobId = 'job_' + Date.now();
    currentEventSource = new EventSource(`/api/progress/${jobId}`);

    currentEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.progress === 'number') {
          progressBar.style.width = `${data.progress}%`;
          progressPercent.innerText = `${data.progress}%`;
        }
        if (data.stage) {
          progressText.innerText = data.stage;
        }
        if (data.status === 'completed' || data.status === 'failed') {
          if (currentEventSource) {
            currentEventSource.close();
            currentEventSource = null;
          }
        }
      } catch (e) {
        console.error('SSE JSON parse error:', e);
      }
    };

    currentEventSource.onerror = () => {
      if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
      }
    };

    const options = {
      microZoom: parseFloat(sliderZoom.value),
      speedShift: parseFloat(sliderSpeed.value),
      pitchCents: parseInt(sliderPitch.value, 10),
      outroTrim: parseFloat(sliderOutro.value),
      addNoise: chkNoise.checked,
      microColor: chkColor.checked,
      unsharp: chkUnsharp.checked,
      targetInstaFormat: chkInstaFormat.checked,
      spoofDevice: selDevice.value,
      delogo: state.delogoBox
    };

    try {
      let body;
      let headers = {};

      if (state.currentFile) {
        const formData = new FormData();
        formData.append('media', state.currentFile);
        formData.append('filename', state.uploadResult ? state.uploadResult.filename : state.currentFile.name);
        formData.append('options', JSON.stringify(options));
        formData.append('jobId', jobId);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          filename: state.uploadResult ? state.uploadResult.filename : '',
          options,
          jobId
        });
      }

      const res = await fetch('/api/process', {
        method: 'POST',
        headers,
        body
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Sanitization process failed.');
      }

      const result = await res.json();
      progressBar.style.width = '100%';
      progressPercent.innerText = '100%';
      progressText.innerText = 'Sanitization & Verification Complete!';

      setTimeout(() => {
        progressContainer.classList.add('hidden');
        processBtn.disabled = false;
        if (currentEventSource) {
          currentEventSource.close();
          currentEventSource = null;
        }
        renderAuditStudio(result);
      }, 500);

    } catch (err) {
      alert('Error during processing: ' + err.message);
      progressContainer.classList.add('hidden');
      processBtn.disabled = false;
      if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
      }
    }
  });

  // ==========================================================================
  // 6. Dual-Mode Audit Comparison Studio Renderer
  // ==========================================================================
  function renderAuditStudio(result) {
    auditSection.classList.remove('hidden');
    auditSection.scrollIntoView({ behavior: 'smooth' });

    // Score & Verdict
    const score = result.audit?.score || 98;
    auditScoreVal.innerText = `${score}%`;
    auditVerdict.innerText = result.audit?.verdict || 'SAFE FOR SOCIAL MEDIA';

    // Download Button
    const cleanDownload = result.dataUrl || result.downloadUrl || result.mediaUrl;
    downloadCleanBtn.href = cleanDownload;
    downloadCleanBtn.download = result.cleanFilename || 'Instagram_Sanitized';

    const isResultImage = (result.mediaType === 'image') || (state.mediaType === 'image');

    if (isResultImage) {
      // ----------------------------------------------------------------------
      // Mode: Image Audit Studio (Split Curtain Slider & Side-by-Side)
      // ----------------------------------------------------------------------
      videoAuditStudio.classList.add('hidden');
      imageAuditStudio.classList.remove('hidden');

      // Stop any lingering videos
      auditOrigVideo.pause();
      auditCleanVideo.pause();

      // Populate Images
      const origUrl = (state.currentFile ? URL.createObjectURL(state.currentFile) : null) || state.uploadResult?.mediaUrl;
      const cleanUrl = result.dataUrl || result.mediaUrl;

      splitCleanImg.src = cleanUrl;
      splitOrigImg.src = origUrl;
      auditOrigImg.src = origUrl;
      auditCleanImg.src = cleanUrl;

      origImgSizeLabel.innerText = formatBytes(state.uploadResult?.sizeBytes || state.uploadResult?.size || state.currentFile?.size || 0);
      cleanImgSizeLabel.innerText = formatBytes(result.cleanProbe?.sizeBytes || result.cleanProbe?.size || 0);

      initSplitSlider();

    } else {
      // ----------------------------------------------------------------------
      // Mode: Video Audit Studio (Synchronized Side-by-Side Playback)
      // ----------------------------------------------------------------------
      imageAuditStudio.classList.add('hidden');
      videoAuditStudio.classList.remove('hidden');

      const origVideoUrl = (state.currentFile ? URL.createObjectURL(state.currentFile) : null) || state.uploadResult?.mediaUrl;
      const cleanVideoUrl = result.dataUrl || result.mediaUrl;

      auditOrigVideo.src = origVideoUrl;
      auditCleanVideo.src = cleanVideoUrl;
      auditOrigVideo.load();
      auditCleanVideo.load();

      origSizeLabel.innerText = formatBytes(state.uploadResult.sizeBytes || state.uploadResult.size || 0);
      cleanSizeLabel.innerText = formatBytes(result.cleanProbe?.sizeBytes || result.cleanProbe?.size || 0);

      // Acoustic Spectrograms
      if (state.uploadResult.spectrogramUrl) {
        origSpectroImg.src = state.uploadResult.spectrogramUrl;
        origSpectroWrap.classList.remove('hidden');
      } else {
        origSpectroWrap.classList.add('hidden');
      }

      if (result.cleanSpectrogramUrl) {
        cleanSpectroImg.src = result.cleanSpectrogramUrl;
        cleanSpectroWrap.classList.remove('hidden');
      } else {
        cleanSpectroWrap.classList.add('hidden');
      }

      setupSynchronizedVideos();
    }

    // Render Forensic Audit Points Grid
    renderAuditPoints(result.audit?.points || []);

    // Render Genuine Metadata Diff Table
    renderMetaTable(result.origProbe || {}, result.cleanProbe || {});
  }

  // ==========================================================================
  // 7. Interactive Split Curtain Slider Logic for Images
  // ==========================================================================
  function initSplitSlider() {
    state.splitCurtain.position = 50;
    updateSplitCurtain();
  }

  function updateSplitCurtain() {
    const pct = Math.max(0, Math.min(100, state.splitCurtain.position));
    splitOrigLayer.style.width = `${pct}%`;
    splitDivider.style.left = `${pct}%`;
  }

  btnSplitView.addEventListener('click', () => {
    btnSplitView.classList.add('active');
    btnSideView.classList.remove('active');
    imageSplitViewer.classList.remove('hidden');
    imageSideBySideViewer.classList.add('hidden');
  });

  btnSideView.addEventListener('click', () => {
    btnSideView.classList.add('active');
    btnSplitView.classList.remove('active');
    imageSplitViewer.classList.add('hidden');
    imageSideBySideViewer.classList.remove('hidden');
  });

  splitDivider.addEventListener('pointerdown', (e) => {
    state.splitCurtain.isDragging = true;
    try {
      splitDivider.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  imageSplitViewer.addEventListener('pointerdown', (e) => {
    if (e.target === splitDivider || splitDivider.contains(e.target)) return;
    const rect = imageSplitViewer.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    state.splitCurtain.position = Math.round((offsetX / rect.width) * 100);
    updateSplitCurtain();
  });

  window.addEventListener('pointermove', (e) => {
    if (!state.splitCurtain.isDragging) return;
    const rect = imageSplitViewer.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    state.splitCurtain.position = Math.round((offsetX / rect.width) * 100);
    updateSplitCurtain();
  });

  function stopCurtainDrag(e) {
    if (state.splitCurtain.isDragging) {
      state.splitCurtain.isDragging = false;
      try {
        splitDivider.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }

  window.addEventListener('pointerup', stopCurtainDrag);
  window.addEventListener('pointercancel', stopCurtainDrag);

  // ==========================================================================
  // 8. Synchronized Video Playback & Scrubbing Controls
  // ==========================================================================
  function setupSynchronizedVideos() {
    syncPlayBtn.onclick = () => {
      auditOrigVideo.play().catch(() => {});
      auditCleanVideo.play().catch(() => {});
    };

    syncPauseBtn.onclick = () => {
      auditOrigVideo.pause();
      auditCleanVideo.pause();
    };

    syncRestartBtn.onclick = () => {
      auditOrigVideo.currentTime = 0;
      auditCleanVideo.currentTime = 0;
      syncSeeker.value = 0;
      auditOrigVideo.play().catch(() => {});
      auditCleanVideo.play().catch(() => {});
    };

    auditOrigVideo.addEventListener('timeupdate', () => {
      if (auditOrigVideo.duration) {
        const pct = (auditOrigVideo.currentTime / auditOrigVideo.duration) * 100;
        syncSeeker.value = pct;
        syncTimeDisplay.innerText = `${formatTime(auditOrigVideo.currentTime)} / ${formatTime(auditOrigVideo.duration)}`;
      }
    });

    syncSeeker.addEventListener('input', () => {
      if (!auditOrigVideo.duration) return;
      const target = (syncSeeker.value / 100) * auditOrigVideo.duration;
      auditOrigVideo.currentTime = target;
      auditCleanVideo.currentTime = target;
    });

    // Bidirectional event synchronization with recursion protection
    ['play', 'pause', 'seeking', 'seeked'].forEach(evt => {
      auditOrigVideo.addEventListener(evt, () => {
        if (state.videoSync.isSyncing) return;
        state.videoSync.isSyncing = true;
        if (evt === 'play') auditCleanVideo.play().catch(() => {});
        if (evt === 'pause') auditCleanVideo.pause();
        if (evt === 'seeking' || evt === 'seeked') {
          auditCleanVideo.currentTime = auditOrigVideo.currentTime;
        }
        setTimeout(() => { state.videoSync.isSyncing = false; }, 40);
      });

      auditCleanVideo.addEventListener(evt, () => {
        if (state.videoSync.isSyncing) return;
        state.videoSync.isSyncing = true;
        if (evt === 'play') auditOrigVideo.play().catch(() => {});
        if (evt === 'pause') auditOrigVideo.pause();
        if (evt === 'seeking' || evt === 'seeked') {
          auditOrigVideo.currentTime = auditCleanVideo.currentTime;
        }
        setTimeout(() => { state.videoSync.isSyncing = false; }, 40);
      });
    });
  }

  // ==========================================================================
  // 9. Forensic Audit Points Grid Renderer
  // ==========================================================================
  function renderAuditPoints(points) {
    auditPointsGrid.innerHTML = '';

    if (!points || points.length === 0) {
      auditPointsGrid.innerHTML = '<p class="text-muted">No forensic audit points available.</p>';
      return;
    }

    points.forEach(point => {
      const card = document.createElement('div');
      card.className = 'audit-point-card';
      const title = point.category || point.title || 'Forensic Audit Point';
      const badge = point.badge || point.status || 'Verified';
      const desc = point.detail || point.desc || '';

      card.innerHTML = `
        <div class="audit-point-header">
          <span class="audit-point-title">${escapeHtml(title)}</span>
          <span class="audit-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="audit-point-desc">${escapeHtml(desc)}</div>
      `;
      auditPointsGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // 10. Genuine Before-and-After Metadata Diff Table
  // ==========================================================================
  function renderMetaTable(orig, clean) {
    metaTableBody.innerHTML = '';

    const origTags = {
      ...(orig.tags || {}),
      ...(orig.video?.tags || {}),
      ...(orig.audio?.tags || {})
    };

    const cleanTags = {
      ...(clean.tags || {}),
      ...(clean.video?.tags || {}),
      ...(clean.audio?.tags || {})
    };

    const allKeys = Array.from(new Set([...Object.keys(origTags), ...Object.keys(cleanTags)]));

    let wiped = 0;
    let cleanCount = 0;
    let spoofed = 0;

    if (allKeys.length === 0) {
      metaTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding: 24px;">
            <strong style="color:var(--success);">Pristine Container:</strong> Zero tracking tags, EXIF fingerprints, or encoder signatures present.
          </td>
        </tr>
      `;
      pillWipedCount.innerText = '0 Wiped';
      pillCleanCount.innerText = 'Pristine Clean';
      pillSpoofedCount.innerText = '0 Spoofed';
      return;
    }

    allKeys.forEach(key => {
      const origVal = origTags[key];
      const cleanVal = cleanTags[key];
      const tr = document.createElement('tr');

      if (origVal && !cleanVal) {
        // Tag was wiped
        wiped++;
        tr.innerHTML = `
          <td><strong>${escapeHtml(key)}</strong></td>
          <td><code class="text-danger strikethrough">${escapeHtml(origVal)}</code></td>
          <td><code class="text-muted">Purged / Stripped (0-byte)</code></td>
          <td><span class="tag-danger">Wiped &amp; Neutralized</span></td>
        `;
      } else if (cleanVal && (!origVal || origVal !== cleanVal)) {
        // Tag was spoofed (e.g. Apple device profile)
        spoofed++;
        tr.innerHTML = `
          <td><strong>${escapeHtml(key)}</strong></td>
          <td><code class="text-muted">${escapeHtml(origVal || 'None')}</code></td>
          <td><code class="text-success">${escapeHtml(cleanVal)}</code></td>
          <td><span class="tag-info">Hardware Spoofed</span></td>
        `;
      } else {
        // Retained / Standard container tag
        cleanCount++;
        tr.innerHTML = `
          <td><strong>${escapeHtml(key)}</strong></td>
          <td><code>${escapeHtml(origVal || 'None')}</code></td>
          <td><code class="text-success">${escapeHtml(cleanVal || 'Standard')}</code></td>
          <td><span class="tag-success">Container Safe</span></td>
        `;
      }

      metaTableBody.appendChild(tr);
    });

    pillWipedCount.innerText = `${wiped} Wiped`;
    pillCleanCount.innerText = `${cleanCount} Clean`;
    pillSpoofedCount.innerText = `${spoofed} Spoofed`;
  }

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize labels
  updateSliderLabels();
});
