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

  // Initialize face detection
  async function initFaceDetection() {
    try {
      // Check if FaceDetector API is available
      if ('FaceDetector' in window) {
        faceDetector = new FaceDetector({ maxDetectedFaces: 1, fastMode: true });
        console.log('Face detection initialized');
      } else {
        console.log('Face detection not supported, using manual positioning');
        showManualMode();
      }
    } catch (error) {
      console.log('Face detection failed, using manual positioning:', error);
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

  async function detectFace() {
    if (!faceDetector || !video.videoWidth || manualMode) return;
    
    try {
      const faces = await faceDetector.detect(video);
      
      if (faces.length > 0) {
        const face = faces[0];
        const bbox = face.boundingBox;
        
        // Position overlay based on jewelry type and face landmarks
        positionOverlayOnFace(bbox);
        
        if (!faceDetected) {
          faceDetected = true;
          overlay.style.opacity = '0.8';
          overlay.style.background = 'rgba(255, 209, 102, 0.3)';
          overlay.style.border = '2px solid var(--accent)';
        }
      } else {
        if (faceDetected) {
          faceDetected = false;
          overlay.style.opacity = '0.4';
          overlay.style.background = 'rgba(255, 209, 102, 0.15)';
          overlay.style.border = '2px dashed var(--accent)';
        }
      }
    } catch (error) {
      console.log('Face detection error:', error);
    }
    
    animationId = requestAnimationFrame(detectFace);
  }

  function positionOverlayOnFace(bbox) {
    const videoRect = video.getBoundingClientRect();
    const scaleX = videoRect.width / video.videoWidth;
    const scaleY = videoRect.height / video.videoHeight;
    
    const jewelryType = type.value;
    let x, y, overlaySize;
    
    switch (jewelryType) {
      case 'nosepin':
        // Position at nose area (center-bottom of face)
        x = (bbox.x + bbox.width * 0.5) * scaleX - 15;
        y = (bbox.y + bbox.height * 0.65) * scaleY - 15;
        overlaySize = Math.max(20, bbox.width * scaleX * 0.08);
        break;
      case 'necklace':
        // Position below face
        x = (bbox.x + bbox.width * 0.5) * scaleX - 40;
        y = (bbox.y + bbox.height * 1.1) * scaleY - 10;
        overlaySize = Math.max(60, bbox.width * scaleX * 0.6);
        break;
      case 'ring':
        // Position at side of face (hand area approximation)
        x = (bbox.x + bbox.width * 1.2) * scaleX - 25;
        y = (bbox.y + bbox.height * 0.8) * scaleY - 25;
        overlaySize = Math.max(30, bbox.width * scaleX * 0.15);
        break;
      default:
        x = (bbox.x + bbox.width * 0.5) * scaleX - 30;
        y = (bbox.y + bbox.height * 0.5) * scaleY - 30;
        overlaySize = 60;
    }
    
    // Smooth transition
    overlay.style.transition = 'all 0.3s ease';
    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.width = overlaySize + 'px';
    overlay.style.height = overlaySize + 'px';
    overlay.style.transform = 'translate(0, 0)';
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' }, 
        audio: false 
      });
      video.srcObject = stream;
      
      video.addEventListener('loadedmetadata', () => {
        initFaceDetection();
        if (faceDetector) {
          detectFace();
        }
      });
    } catch (e) {
      overlay.textContent = 'Camera access denied or not available';
      overlay.style.background = '#ff4444';
      overlay.style.color = 'white';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontSize = '14px';
    }
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
  
  // Jewelry type changes
  type.addEventListener('change', () => {
    if (type.value === 'necklace') {
      overlay.style.borderRadius = '4px';
      overlay.style.width = '80px';
      overlay.style.height = '20px';
    } else if (type.value === 'ring') {
      overlay.style.borderRadius = '50%';
      overlay.style.width = '40px';
      overlay.style.height = '40px';
    } else { // nosepin
      overlay.style.borderRadius = '50%';
      overlay.style.width = '25px';
      overlay.style.height = '25px';
    }
    
    // Reset manual mode when type changes to allow face detection to reposition
    if (!dragging) {
      manualMode = false;
    }
  });

  // Auto-detect face position button
  const toolbar = document.querySelector('.toolbar');
  const autoButton = document.createElement('button');
  autoButton.textContent = 'Auto Position';
  autoButton.className = 'btn';
  autoButton.style.marginLeft = '10px';
  autoButton.addEventListener('click', () => {
    manualMode = false;
    overlay.style.transition = 'all 0.3s ease';
  });
  toolbar.appendChild(autoButton);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
  });

  start();
})();
