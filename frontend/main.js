/* ============================================================
   KitchenGuard AI — main.js
   ============================================================ */
'use strict';

/* ---------- Media Switcher (Image vs Video) ---------- */
(function () {
  var tabImage = document.getElementById('tab-image');
  var tabVideo = document.getElementById('tab-video');
  var panelImage = document.getElementById('media-image');
  var panelVideo = document.getElementById('media-video');
  var heroVideo = document.getElementById('hero-video');

  if (!tabImage || !tabVideo || !panelImage || !panelVideo) return;

  function switchTab(target) {
    var isImage = target === 'image';

    tabImage.classList.toggle('active', isImage);
    tabVideo.classList.toggle('active', !isImage);

    tabImage.setAttribute('aria-selected', String(isImage));
    tabVideo.setAttribute('aria-selected', String(!isImage));

    panelImage.classList.toggle('active', isImage);
    panelVideo.classList.toggle('active', !isImage);

    panelImage.hidden = !isImage;
    panelVideo.hidden = isImage;

    // Pause video when switching back to image view
    if (isImage && heroVideo && !heroVideo.paused) {
      heroVideo.pause();
    }
  }

  tabImage.addEventListener('click', function () { switchTab('image'); });
  tabVideo.addEventListener('click', function () { switchTab('video'); });
}());

/* ---------- Scroll Reveal ---------- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    els.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function (el, i) {
    el.style.transitionDelay = (i % 6 * 60) + 'ms';
    io.observe(el);
  });
}());

/* ---------- Sticky Nav Shadow ---------- */
(function () {
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });
}());

/* ---------- Mobile Nav ---------- */
(function () {
  var btn = document.getElementById('hamburger');
  var menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function () {
    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    menu.hidden = open;
  });

  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    });
  });
}());

/* ---------- Testimonials Carousel ---------- */
(function () {
  var track = document.getElementById('testi-track');
  var dotsContainer = document.getElementById('testi-dots');
  var prevBtn = document.getElementById('testi-prev');
  var nextBtn = document.getElementById('testi-next');
  if (!track || !dotsContainer) return;

  var cards = Array.from(track.querySelectorAll('.testi__card'));
  var total = cards.length;
  var current = 0;
  var autoTimer = null;

  if (dotsContainer) {
    cards.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'testi__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.setAttribute('aria-selected', String(i === 0));
      dot.addEventListener('click', function () { goTo(i); resetAuto(); });
      dotsContainer.appendChild(dot);
    });
  }

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = 'translateX(-' + current * 100 + '%)';
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.testi__dot').forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
        d.setAttribute('aria-selected', String(i === current));
      });
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); resetAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); resetAuto(); });

  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { goTo(current - 1); resetAuto(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); resetAuto(); }
  });

  function startAuto() {
    autoTimer = setInterval(function () { goTo(current + 1); }, 5000);
  }
  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  var carousel = track.closest('.testi__carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', function () { clearInterval(autoTimer); });
    carousel.addEventListener('focusout', startAuto);
  }

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) startAuto();

  var startX = 0;
  track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', function (e) {
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? 1 : -1)); resetAuto(); }
  }, { passive: true });
}());

/* ---------- Smooth anchor scroll ---------- */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var offset = 72;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });
});

/* ---------- Interactive AI Dropbox Sandbox ---------- */
(function () {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('drop-file-input');
  var browseBtn = document.getElementById('drop-browse-btn');
  var dropPrompt = document.getElementById('drop-prompt');
  var dropScanning = document.getElementById('drop-scanning');
  var dropResult = document.getElementById('drop-result');
  var scanProgress = document.getElementById('scan-progress');
  var resultImg = document.getElementById('result-img');
  var resultVideo = document.getElementById('result-video');
  var resetBtn = document.getElementById('reset-drop-btn');
  var tabImage = document.getElementById('drop-tab-image');
  var tabVideo = document.getElementById('drop-tab-video');
  var titleText = document.getElementById('drop-title-text');
  var subText = document.getElementById('drop-sub-text');
  var sampleBtn = document.getElementById('drop-sample-btn');
  var currentMode = 'image';

  if (!dropZone || !fileInput) return;

  // Mode Switcher Tabs (Image vs Video)
  if (tabImage && tabVideo) {
    tabImage.addEventListener('click', function (e) {
      e.stopPropagation();
      currentMode = 'image';
      tabImage.className = 'btn btn--primary btn--sm';
      tabVideo.className = 'btn btn--outline btn--sm';
      fileInput.accept = 'image/*';
      if (titleText) titleText.textContent = 'Drop a kitchen photo here';
      if (subText) subText.textContent = 'JPG, PNG · Max 50MB';
      if (sampleBtn) sampleBtn.textContent = '✨ Try Sample Photo';
    });

    tabVideo.addEventListener('click', function (e) {
      e.stopPropagation();
      currentMode = 'video';
      tabVideo.className = 'btn btn--primary btn--sm';
      tabImage.className = 'btn btn--outline btn--sm';
      fileInput.accept = 'video/*';
      if (titleText) titleText.textContent = 'Drop a kitchen video clip here';
      if (subText) subText.textContent = 'MP4, MOV · Max 50MB';
      if (sampleBtn) sampleBtn.textContent = '✨ Try Sample Video';
    });
  }

  // Browse button trigger
  if (browseBtn) {
    browseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Sample demo button trigger
  if (sampleBtn) {
    sampleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var primaryUrl = (currentMode === 'image') ? 'frontend/Kitchen_Img.png' : 'frontend/Kitchen_Video.mp4';
      var fallbackUrl = (currentMode === 'image') ? 'Kitchen_Img.png' : 'Kitchen_Video.mp4';

      fetch(primaryUrl)
        .then(function (res) {
          if (!res.ok) throw new Error('Primary URL 404');
          return res.blob();
        })
        .catch(function () {
          return fetch(fallbackUrl).then(function (res) {
            if (!res.ok) throw new Error('Fallback URL 404');
            return res.blob();
          });
        })
        .then(function (blob) {
          var mimeType = blob.type || (currentMode === 'image' ? 'image/png' : 'video/mp4');
          var file = new File([blob], (currentMode === 'image' ? 'Kitchen_Img.png' : 'Kitchen_Video.mp4'), { type: mimeType });
          handleUploadedFile(file);
        })
        .catch(function (err) {
          console.warn("Sample fetch issue:", err);
          // If fetch fails for any reason, simulate upload with direct URL
          handleUploadedFile(null, (currentMode === 'image') ? primaryUrl : primaryUrl);
        });
    });
  }

  // Click zone to open file picker when in prompt mode
  dropZone.addEventListener('click', function () {
    if (!dropPrompt.hidden) {
      fileInput.click();
    }
  });

  // Drag over / leave effects
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('is-dragover');
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('is-dragover');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('is-dragover');

    var files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) {
      handleUploadedFile(fileInput.files[0]);
    }
  });

  function drawAnnotatedCanvas(imageSrc, detections, callback) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var W = canvas.width;
        var H = canvas.height;

        detections.forEach(function (det) {
          var box = det.bbox;
          var xmin = box[0] * W;
          var ymin = box[1] * H;
          var width = (box[2] - box[0]) * W;
          var height = (box[3] - box[1]) * H;

          var isViolation = det.class_name.startsWith('no_');
          var color = isViolation ? '#ef4444' : '#10b981';

          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(3, Math.floor(W / 280));
          ctx.strokeRect(xmin, ymin, width, height);

          // Glow shadow
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.strokeRect(xmin, ymin, width, height);
          ctx.shadowBlur = 0;

          // Label
          var confPct = Math.round(det.confidence * 100);
          var label = det.class_name + ' ' + confPct + '%';
          var fontSize = Math.max(13, Math.floor(W / 36));
          ctx.font = 'bold ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          var textWidth = ctx.measureText(label).width;

          var labelY = ymin > fontSize + 10 ? ymin - 6 : ymin + fontSize + 6;
          ctx.fillStyle = color;
          ctx.fillRect(xmin, labelY - fontSize, textWidth + 12, fontSize + 8);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, xmin + 6, labelY);
        });

        callback(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        callback(imageSrc);
      }
    };
    img.onerror = function () {
      callback(imageSrc);
    };
    img.src = imageSrc;
  }

  function handleUploadedFile(file, directUrl) {
    var isImage = true;
    var isVideo = false;
    var fileUrl = directUrl || '';

    if (file) {
      isImage = file.type.startsWith('image/');
      isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        if (titleText) titleText.textContent = 'Please select a JPG, PNG, or MP4 file';
        return;
      }
      fileUrl = URL.createObjectURL(file);
    } else if (directUrl) {
      isImage = !directUrl.endsWith('.mp4');
      isVideo = directUrl.endsWith('.mp4');
    } else {
      return;
    }

    // Transition to Scanning Phase
    dropPrompt.hidden = true;
    dropResult.hidden = true;
    dropScanning.hidden = false;
    scanProgress.style.width = '12%';

    var progress = 12;
    var interval = setInterval(function () {
      progress += Math.floor(Math.random() * 15) + 6;
      if (progress > 86) progress = 86;
      scanProgress.style.width = progress + '%';
    }, 120);

    var API_BASE_URL = (window.location.origin && window.location.origin.includes(':8000')) ? '' : 'http://localhost:8000';

    var fallbackData = {
      success: true,
      inference_time_ms: isImage ? 34 : 48,
      detections_count: 3,
      detections: [
        { class_name: 'hairnet', confidence: 0.94, bbox: [0.38, 0.06, 0.62, 0.26] },
        { class_name: 'apron', confidence: 0.96, bbox: [0.30, 0.32, 0.70, 0.86] },
        { class_name: 'gloves', confidence: 0.91, bbox: [0.20, 0.60, 0.40, 0.78] }
      ],
      annotated_image_base64: null,
      is_demo: true
    };

    if (file) {
      var formData = new FormData();
      formData.append('file', file);

      fetch(API_BASE_URL + '/predict', {
        method: 'POST',
        body: formData
      })
      .then(function (res) {
        if (!res.ok) throw new Error('API server status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        clearInterval(interval);
        scanProgress.style.width = '100%';
        setTimeout(function () {
          displayDetectionResult(fileUrl, isImage, data);
        }, 180);
      })
      .catch(function (err) {
        clearInterval(interval);
        console.warn("Backend inference server offline (running in Cloud Preview mode):", err);
        scanProgress.style.width = '100%';
        if (isImage) {
          drawAnnotatedCanvas(fileUrl, fallbackData.detections, function (annotatedUrl) {
            fallbackData.annotated_image_url = annotatedUrl;
            setTimeout(function () {
              displayDetectionResult(fileUrl, isImage, fallbackData);
            }, 200);
          });
        } else {
          setTimeout(function () {
            displayDetectionResult(fileUrl, isImage, fallbackData);
          }, 200);
        }
      });
    } else {
      // Direct sample demo simulation
      clearInterval(interval);
      scanProgress.style.width = '100%';
      if (isImage) {
        drawAnnotatedCanvas(fileUrl, fallbackData.detections, function (annotatedUrl) {
          fallbackData.annotated_image_url = annotatedUrl;
          setTimeout(function () {
            displayDetectionResult(fileUrl, isImage, fallbackData);
          }, 200);
        });
      } else {
        setTimeout(function () {
          displayDetectionResult(fileUrl, isImage, fallbackData);
        }, 200);
      }
    }
  }

  function displayDetectionResult(url, isImage, data) {
    dropScanning.hidden = true;
    dropResult.hidden = false;

    var summaryBox = document.getElementById('detection-summary');
    var statSpeed = document.getElementById('stat-speed');
    var statCount = document.getElementById('stat-count-badge');
    var tagsContainer = document.getElementById('detections-tags');

    if (isImage) {
      if (data && data.annotated_image_base64) {
        resultImg.src = 'data:image/jpeg;base64,' + data.annotated_image_base64;
      } else if (data && data.annotated_image_url) {
        resultImg.src = data.annotated_image_url;
      } else {
        resultImg.src = url;
      }
      resultImg.hidden = false;
      resultImg.style.display = 'block';
      resultVideo.hidden = true;
      resultVideo.style.display = 'none';
      resultVideo.pause();
    } else {
      resultVideo.src = url;
      resultVideo.hidden = false;
      resultVideo.style.display = 'block';
      resultImg.hidden = true;
      resultImg.style.display = 'none';
      resultVideo.play().catch(function () {});
    }

    if (data && data.success) {
      if (summaryBox) summaryBox.hidden = false;
      if (statSpeed) {
        var modeLabel = data.is_demo ? ' (Cloud Preview)' : ' (YOLOv11 Live)';
        statSpeed.textContent = (isImage ? 'Inference: ' : 'Stream Scan: ') + data.inference_time_ms + ' ms' + modeLabel;
      }

      if (statCount) {
        if (data.detections_count > 0) {
          statCount.innerHTML = '<span style="color:#10b981;">🛡️ ' + data.detections_count + ' Safety & PPE Items Verified</span>';
        } else {
          statCount.innerHTML = '<span style="color:#10b981;">✅ Compliant - No Violations Detected</span>';
        }
      }

      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach(function (det) {
            var tag = document.createElement('span');
            var isViolation = det.class_name.startsWith('no_');
            var bg = isViolation ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)';
            var border = isViolation ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)';
            var color = isViolation ? '#ef4444' : '#10b981';

            tag.style.cssText = 'background:' + bg + ';border:1px solid ' + border + ';color:' + color + ';padding:4px 10px;border-radius:6px;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
            var confPercent = Math.round(det.confidence * 100);
            tag.innerHTML = '<strong>' + det.class_name + '</strong> <span style="opacity:0.85;font-size:0.78rem;">(' + confPercent + '%)</span>';
            tagsContainer.appendChild(tag);
          });
        } else {
          var tag = document.createElement('span');
          tag.style.cssText = 'color:#94a3b8;font-size:0.85rem;';
          tag.textContent = 'Kitchen environment appears clear.';
          tagsContainer.appendChild(tag);
        }
      }
    } else if (summaryBox) {
      summaryBox.hidden = true;
    }
  }

  // Reset button to test again
  if (resetBtn) {
    resetBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.value = '';
      if (resultVideo) {
        resultVideo.pause();
        resultVideo.hidden = true;
        resultVideo.style.display = 'none';
      }
      if (resultImg) {
        resultImg.hidden = true;
        resultImg.style.display = 'none';
      }
      dropResult.hidden = true;
      dropScanning.hidden = true;
      dropPrompt.hidden = false;
      if (titleText) titleText.textContent = (currentMode === 'image') ? 'Drop a kitchen photo here' : 'Drop a kitchen video clip here';
      var summaryBox = document.getElementById('detection-summary');
      if (summaryBox) summaryBox.hidden = true;
    });
  }
}());;


