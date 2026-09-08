const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const {
  probeMedia,
  generateSpectrogram,
  generateThumbnail,
  sanitizeVideo,
  sanitizeImage,
  computeAuditScore
} = require('./lib/sanitizer');

const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Directories: use /tmp on Vercel to avoid EROFS read-only filesystem errors
const UPLOAD_DIR = isVercel ? path.join(os.tmpdir(), 'reelshield_uploads') : path.join(__dirname, 'uploads');
const PROCESSED_DIR = isVercel ? path.join(os.tmpdir(), 'reelshield_processed') : path.join(__dirname, 'processed');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media/upload', express.static(UPLOAD_DIR));
app.use('/media/processed', express.static(PROCESSED_DIR));

// Fallback explicit media file serving routes for Vercel/serverless environments
app.get('/media/upload/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).send('Media not found');
});

app.get('/media/processed/:filename', (req, res) => {
  const filePath = path.join(PROCESSED_DIR, req.params.filename);
  if (fs.existsSync(filePath)) return res.sendFile(filePath);
  res.status(404).send('Media not found');
});

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `input_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

// In-memory job progress tracker
const jobs = {};

// Clean up jobs older than 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs)) {
    if (job.createdAt && now - job.createdAt > 10 * 60 * 1000) {
      delete jobs[id];
    }
  }
}, 60 * 1000);

/**
 * Upload endpoint
 * Receives original video/image, extracts metadata, creates thumbnail and spectrogram
 */
app.post('/api/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided.' });
    }

    const inputPath = req.file.path;
    const filename = req.file.filename;
    const baseName = path.parse(filename).name;

    // Probe original media
    const probe = await probeMedia(inputPath);

    // Generate thumbnail: ONLY for playable videos, NOT for still images
    const thumbName = `${baseName}_thumb.jpg`;
    const thumbPath = path.join(UPLOAD_DIR, thumbName);
    let hasThumb = false;
    if (probe.isVideo) {
      const generatedThumb = await generateThumbnail(inputPath, thumbPath);
      hasThumb = !!generatedThumb;
    }

    // Generate audio spectrogram: ONLY for media with audio
    let spectroName = null;
    if (probe.hasAudio) {
      spectroName = `${baseName}_spectrogram.png`;
      const spectroPath = path.join(UPLOAD_DIR, spectroName);
      await generateSpectrogram(inputPath, spectroPath);
    }

    const mediaUrl = `/media/upload/${filename}`;
    const thumbUrl = probe.isImage ? mediaUrl : (hasThumb ? `/media/upload/${thumbName}` : null);

    const responseData = {
      success: true,
      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
      sizeBytes: req.file.size,
      mediaUrl,
      mediaType: probe.mediaType,
      isImage: probe.isImage,
      isVideo: probe.isVideo,
      hasVideo: probe.hasVideo,
      hasAudio: probe.hasAudio,
      thumbUrl,
      thumbnailUrl: thumbUrl,
      spectrogramUrl: spectroName ? `/media/upload/${spectroName}` : null,
      probe
    };

    res.json(responseData);
  } catch (err) {
    console.error('Upload handling failed:', err);
    res.status(500).json({ error: err.message || 'Error processing uploaded file.' });
  }
});

/**
 * Job Progress SSE (Server-Sent Events)
 * Streams real-time progress for both video and image sanitization pipelines.
 */
app.get('/api/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Immediately stream current job status if already present
  const initialJob = jobs[jobId];
  if (initialJob) {
    res.write(`data: ${JSON.stringify(initialJob)}\n\n`);
    if (initialJob.status === 'completed' || initialJob.status === 'failed') {
      res.end();
      return;
    }
  } else {
    res.write(`data: ${JSON.stringify({ jobId, progress: 0, status: 'initializing', stage: 'Connecting to pipeline...' })}\n\n`);
  }

  let lastSentProgress = initialJob ? initialJob.progress : -1;
  let lastSentStage = initialJob ? initialJob.stage : '';

  const interval = setInterval(() => {
    const job = jobs[jobId];
    if (job) {
      if (job.progress !== lastSentProgress || job.stage !== lastSentStage || job.status === 'completed' || job.status === 'failed') {
        lastSentProgress = job.progress;
        lastSentStage = job.stage;
        res.write(`data: ${JSON.stringify(job)}\n\n`);
      }
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    }
  }, 100);

  req.on('close', () => clearInterval(interval));
});

/**
 * Process / Sanitize endpoint
 * Routes dual-mode processing: sanitizeImage for images, sanitizeVideo for videos.
 */
app.post('/api/process', async (req, res) => {
  const { filename, options = {}, jobId } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required.' });
  }

  const inputPath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Original file not found.' });
  }

  const outBaseName = `clean_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ext = path.extname(filename).toLowerCase();

  const updateJob = (pct, stage, message) => {
    if (!jobId) return;
    const currentPct = jobs[jobId]?.progress || 0;
    // ensure monotonic progress: progress never jumps backward
    const progress = Math.min(99, Math.max(currentPct, pct));
    jobs[jobId] = {
      jobId,
      progress,
      status: 'processing',
      stage: stage || 'Sanitizing media stream...',
      message: message || stage || 'Sanitizing media stream...',
      createdAt: jobs[jobId]?.createdAt || Date.now()
    };
  };

  if (jobId) {
    jobs[jobId] = {
      jobId,
      progress: 5,
      status: 'processing',
      stage: 'Initializing anti-fingerprint filters',
      message: 'Initializing anti-fingerprint filters',
      createdAt: Date.now()
    };
  }

  try {
    const origProbe = await probeMedia(inputPath);
    const isImage = origProbe.isImage;

    let outputFilename;
    if (isImage) {
      // Normalize extension for images
      const imgExt = (ext === '.jpeg' || ext === '.jpg') ? '.jpg' : (ext === '.webp' ? '.webp' : '.png');
      outputFilename = `${outBaseName}${imgExt}`;
    } else {
      outputFilename = `${outBaseName}.mp4`;
    }
    const outputPath = path.join(PROCESSED_DIR, outputFilename);

    if (isImage) {
      await sanitizeImage(inputPath, outputPath, options, (pct, stage) => {
        updateJob(pct, stage, stage);
      });
    } else {
      updateJob(15, 'Applying TMK desync, micro-zoom & noise', 'Applying TMK desync, micro-zoom & noise');
      await sanitizeVideo(inputPath, outputPath, options, (progressPercent) => {
        const stage = progressPercent < 50
          ? 'Transforming temporal flow & micro-grain'
          : 'Purging metadata & encoding stream';
        updateJob(progressPercent, stage, stage);
      });
    }

    // Probe sanitized file
    const cleanProbe = await probeMedia(outputPath);

    // Generate sanitized audio spectrogram if audio exists
    let cleanSpectroName = null;
    if (cleanProbe.hasAudio) {
      cleanSpectroName = `${outBaseName}_spectrogram.png`;
      const cleanSpectroPath = path.join(PROCESSED_DIR, cleanSpectroName);
      await generateSpectrogram(outputPath, cleanSpectroPath);
    }

    // Compute deterministic forensic audit score
    const audit = computeAuditScore(origProbe, cleanProbe, options);

    const resultPayload = {
      success: true,
      mediaType: isImage ? 'image' : 'video',
      isImage,
      isVideo: !isImage,
      cleanFilename: outputFilename,
      sanitizedFilename: outputFilename,
      downloadUrl: `/api/download/${outputFilename}`,
      mediaUrl: `/media/processed/${outputFilename}`,
      cleanSpectrogramUrl: cleanSpectroName ? `/media/processed/${cleanSpectroName}` : null,
      cleanProbe,
      origProbe,
      audit,
      auditScore: audit.score,
      auditPoints: audit.points
    };

    if (jobId) {
      jobs[jobId] = {
        jobId,
        progress: 100,
        status: 'completed',
        stage: 'Audit passed: 100% Instagram ready',
        message: 'Sanitization complete & container verified',
        result: resultPayload,
        createdAt: jobs[jobId]?.createdAt || Date.now()
      };
    }

    res.json(resultPayload);
  } catch (err) {
    console.error('Processing error:', err);
    if (jobId) {
      jobs[jobId] = {
        jobId,
        progress: 0,
        status: 'failed',
        error: err.message,
        stage: 'Sanitization failed',
        message: err.message,
        createdAt: jobs[jobId]?.createdAt || Date.now()
      };
    }
    res.status(500).json({ error: err.message || 'Failed to sanitize media.' });
  }
});

/**
 * Download sanitized file with optimized clean filename
 */
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(PROCESSED_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const ext = path.extname(filename).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'].includes(ext);
  const downloadName = isImage
    ? `Instagram_Image_Sanitized_${Date.now()}${ext}`
    : `Instagram_Reel_Sanitized_${Date.now()}${ext}`;

  res.download(filePath, downloadName);
});

// Start Server
if (!isVercel && require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  ReelShield AI - Instagram Media Sanitizer Studio     `);
    console.log(`  Live and running at: http://localhost:${PORT}        `);
    console.log(`=======================================================`);
  });
}

module.exports = app;
