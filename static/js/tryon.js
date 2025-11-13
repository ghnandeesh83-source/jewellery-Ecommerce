// Virtual try-on with face detection
(function(){
  const video = document.getElementById('camera');
  const overlay = document.getElementById('overlay');
  const size = document.getElementById('overlay-size');
  const type = document.getElementById('overlay-type');
  if (!video) return;

  let faceDetector = null;
  let animationId = null;
  let faceDetected = false;
  let manualMode = false;
  let mpCamera = null; // MediaPipe camera
  let mpReady = false;
  let lastBox = null; // smoothing
  let lastDetectTs = 0; // throttle native detection
  let posFrames = 0, negFrames = 0; // debounce

  function lerp(a,b,t){ return a + (b-a)*t; }
  function smoothBox(b){
    if (!lastBox) { lastBox = { ...b }; return lastBox; }
    lastBox = {
      x: lerp(lastBox.x, b.x, 0.2),
      y: lerp(lastBox.y, b.y, 0.2),
      width: lerp(lastBox.width, b.width, 0.2),
      height: lerp(lastBox.height, b.height, 0.2)
    };
    return lastBox;
  }

  // Initialize face detection (choose pipeline)
  async function initFaceDetection() {
    try {
      if ('FaceDetector' in window) {
        // Native pipeline: we control getUserMedia
        await startNativePipeline();
      } else {
        // Fallback pipeline: MediaPipe manages camera stream
        startMediaPipePipeline();
      }
    } catch (error) {
      console.log('Face detection init failed, using manual mode:', error);
      showManualMode();
    }
  }

  function showManualMode() {
    manualMode = true;
    const toolbar = document.querySelector('.toolbar');
    const notice = document.createElement('div');
    notice.style.cssText = 'background: #1e2640; padding: 8px 12px; border-radius: 8px; margin: 8px 0; font-size: 14px; color: var(--muted);';
    notice.textContent = 'Face detection not available - drag the overlay manually';
    toolbar.prepend(notice);
  }

  async function startNativePipeline(){
    // Single camera stream owned by us (avoid conflict with MediaPipe Camera)
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' }, 
      audio: false 
    });
    video.srcObject = stream;
    await new Promise(res => video.addEventListener('loadedmetadata', res, { once: true }));

    faceDetector = new FaceDetector({ maxDetectedFaces: 1, fastMode: true });
    detectFaceNative();
  }

  async function detectFaceNative() {
    if (!faceDetector || !video.videoWidth) return;
    const now = performance.now();
    if (now - lastDetectTs < 66) { // ~15 FPS detection to reduce flicker/CPU
      animationId = requestAnimationFrame(detectFaceNative);
      return;
    }
    lastDetectTs = now;
    try {
      const faces = await faceDetector.detect(video);
      if (faces.length > 0) {
        const bbox = smoothBox(faces[0].boundingBox);
        positionOverlayOnBox(bbox);
        posFrames++; negFrames = 0;
        if (posFrames >= 2) setDetectedState(true);
      } else {
        negFrames++; posFrames = 0;
        if (negFrames >= 3) setDetectedState(false);
      }
    } catch (error) {
      console.log('FaceDetector error:', error);
    }
    animationId = requestAnimationFrame(detectFaceNative);
  }

  function setDetectedState(state){
    if (state && !faceDetected){
      faceDetected = true;
      overlay.style.opacity = '0.9';
      overlay.style.border = '2px solid var(--accent)';
    } else if (!state && faceDetected){
      faceDetected = false;
      overlay.style.opacity = '0.6';
      overlay.style.border = '2px dashed var(--accent)';
    }
  }

  function positionOverlayOnBox(bbox) {
    const videoRect = video.getBoundingClientRect();
    const scaleX = videoRect.width / video.videoWidth;
    const scaleY = videoRect.height / video.videoHeight;

    const jewelryType = type.value;
    let x, y, overlaySize;

    switch (jewelryType) {
      case 'nosepin':
        x = (bbox.x + bbox.width * 0.5) * scaleX - 12;
        y = (bbox.y + bbox.height * 0.62) * scaleY - 12;
        overlaySize = Math.max(18, bbox.width * scaleX * 0.08);
        break;
      case 'necklace':
        x = (bbox.x + bbox.width * 0.5) * scaleX - 80;
        y = (bbox.y + bbox.height * 1.05) * scaleY - 15;
        overlaySize = Math.max(120, bbox.width * scaleX * 0.7);
        break;
      case 'ring':
        x = (bbox.x + bbox.width * 1.2) * scaleX - 20;
        y = (bbox.y + bbox.height * 0.8) * scaleY - 20;
        overlaySize = Math.max(28, bbox.width * scaleX * 0.14);
        break;
      default:
        x = (bbox.x + bbox.width * 0.5) * scaleX - 30;
        y = (bbox.y + bbox.height * 0.5) * scaleY - 30;
        overlaySize = 60;
    }

    overlay.style.transition = 'all 0.2s ease';
    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.width = overlaySize + 'px';
    overlay.style.height = overlaySize + 'px';
    overlay.style.transform = 'translate(0, 0)';
  }

  // MediaPipe FaceMesh fallback (manages its own camera stream)
  function startMediaPipePipeline(){
    if (!(window.FaceMesh && window.Camera)){
      console.log('MediaPipe scripts not found, falling back to manual + plain camera');
      // Show plain camera so user still sees themselves
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(stream => video.srcObject = stream)
        .catch(() => {});
      showManualMode();
      return;
    }

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (manualMode) return;
      const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
      if (!landmarks) { negFrames++; posFrames = 0; if (negFrames >= 3) setDetectedState(false); return; }
      let minX=1, minY=1, maxX=0, maxY=0;
      for (const p of landmarks){
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
      }
      const raw = {
        x: minX * video.videoWidth,
        y: minY * video.videoHeight,
        width: (maxX-minX) * video.videoWidth,
        height: (maxY-minY) * video.videoHeight
      };
      const bbox = smoothBox(raw);
      positionOverlayOnBox(bbox);
      posFrames++; negFrames = 0; if (posFrames >= 2) setDetectedState(true);
    });

    mpCamera = new Camera(video, {
      onFrame: async () => { if (!manualMode) await faceMesh.send({ image: video }); },
      width: 640,
      height: 480
    });
    mpCamera.start();
    mpReady = true;
  }

  async function start() {
    // Default overlay art
    applyOverlayArt(type.value);
    await initFaceDetection();
  }

  // Manual positioning (fallback)
  let dragging = false; let offX = 0, offY = 0;
  
  overlay.addEventListener('mousedown', (e) => { 
    dragging = true; 
    manualMode = true;
    overlay.style.cursor = 'grabbing'; 
    overlay.style.transition = 'none';
    offX = e.offsetX; 
    offY = e.offsetY; 
  });
  
  window.addEventListener('mouseup', () => { 
    dragging = false; 
    overlay.style.cursor = 'grab'; 
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left - offX;
    const y = e.clientY - rect.top - offY;
    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.transform = 'translate(0,0)';
  });

  // Manual size control
  size.addEventListener('input', () => {
    overlay.style.width = size.value + 'px';
    overlay.style.height = size.value + 'px';
  });

  function applyOverlayArt(kind){
    if (kind === 'necklace'){
      overlay.style.borderRadius = '0px';
      overlay.style.backgroundImage = 'url(/static/images/overlays/necklace.svg)';
      overlay.style.width = '140px';
      overlay.style.height = '40px';
    } else if (kind === 'ring'){
      overlay.style.borderRadius = '50%';
      overlay.style.backgroundImage = 'url(/static/images/overlays/ring.svg)';
      overlay.style.width = '40px';
      overlay.style.height = '40px';
    } else { // nosepin
      overlay.style.borderRadius = '50%';
      overlay.style.backgroundImage = 'url(/static/images/overlays/nosepin.svg)';
      overlay.style.width = '26px';
      overlay.style.height = '26px';
    }
  }
  
  // Jewelry type changes
  type.addEventListener('change', () => {
    applyOverlayArt(type.value);
    if (!dragging) manualMode = false;
  });

  // Auto-detect face position button
  const toolbar = document.querySelector('.toolbar');
  const autoButton = document.createElement('button');
  autoButton.textContent = 'Auto Position';
  autoButton.className = 'btn';
  autoButton.style.marginLeft = '10px';
  autoButton.addEventListener('click', () => {
    manualMode = false;
    overlay.style.transition = 'all 0.2s ease';
  });
  toolbar.appendChild(autoButton);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (mpCamera && mpReady) { try { mpCamera.stop(); } catch(_){} }
    if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  });

  start();
})();
