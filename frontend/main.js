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


  function handleUploadedFile(file) {
    if (!file) return;

    var isImage = file.type.startsWith('image/');
    var isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      if (titleText) titleText.textContent = 'Please select a JPG, PNG, or MP4 file';
      return;
    }

    var fileUrl = URL.createObjectURL(file);

    // Transition to Scanning Phase
    dropPrompt.hidden = true;
    dropResult.hidden = true;
    dropScanning.hidden = false;
    scanProgress.style.width = '15%';

    var scanningText = document.querySelector('.scanning-text');
    if (scanningText) scanningText.textContent = 'Running live YOLOv11 model...';

    var progress = 15;
    var interval = setInterval(function () {
      progress += Math.floor(Math.random() * 8) + 3;
      if (progress > 92) progress = 92;
      scanProgress.style.width = progress + '%';
    }, 150);

    var isLocalOrSelfHosted = window.location.origin && (window.location.origin.includes(':8000') || window.location.origin.includes('railway.app'));
    var API_BASE_URL = isLocalOrSelfHosted ? '' : 'https://kitchenguard-a1-production.up.railway.app';

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
      }, 150);
    })
    .catch(function (err) {
      clearInterval(interval);
      console.error("Model Inference Error:", err);
      scanProgress.style.width = '100%';

      var errorData = {
        success: false,
        error_message: 'Render backend took too long to wake up. Click below to try again!'
      };
      setTimeout(function () {
        displayDetectionResult(fileUrl, isImage, errorData);
      }, 200);
    });
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
        statSpeed.textContent = (isImage ? 'Inference: ' : 'Stream Scan: ') + data.inference_time_ms + ' ms (YOLOv11 Live)';
      }

      if (statCount) {
        var vCount = data.violations_count || 0;
        var ppeCount = data.detections_count || 0;
        if (vCount > 0) {
          statCount.innerHTML = '<span style="color:#ef4444;font-weight:700;">🚨 ' + vCount + ' Hygiene Violation' + (vCount > 1 ? 's' : '') + ' Detected!</span> &nbsp;|&nbsp; <span style="color:#10b981;">🛡️ ' + ppeCount + ' PPE Item' + (ppeCount > 1 ? 's' : '') + ' Verified</span>';
        } else if (ppeCount > 0) {
          statCount.innerHTML = '<span style="color:#10b981;font-weight:700;">✅ 100% Compliant — ' + ppeCount + ' PPE Items Verified, 0 Violations</span>';
        } else {
          statCount.innerHTML = '<span style="color:#10b981;">✅ Compliant - No Violations Detected</span>';
        }
      }

      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach(function (det) {
            var tag = document.createElement('span');
            var isViolation = det.is_violation || det.class_name.startsWith('no_') || det.class_name.includes('less');
            var bg = isViolation ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.12)';
            var border = isViolation ? '#ef4444' : 'rgba(16,185,129,0.3)';
            var color = isViolation ? '#ef4444' : '#10b981';
            var icon = isViolation ? '⚠️ ' : '🛡️ ';

            tag.style.cssText = 'background:' + bg + ';border:1px solid ' + border + ';color:' + color + ';padding:5px 12px;border-radius:6px;font-size:0.88rem;display:inline-flex;align-items:center;gap:6px;font-weight:600;';
            var confPercent = Math.round(det.confidence * 100);
            tag.innerHTML = icon + '<span>' + det.class_name.toUpperCase() + '</span> <span style="opacity:0.8;font-size:0.78rem;">(' + confPercent + '%)</span>';
            tagsContainer.appendChild(tag);
          });
        } else {
          var tag = document.createElement('span');
          tag.style.cssText = 'color:#94a3b8;font-size:0.85rem;';
          tag.textContent = 'Kitchen environment appears clear.';
          tagsContainer.appendChild(tag);
        }
      }
    } else if (summaryBox && data && !data.success) {
      summaryBox.hidden = false;
      if (statSpeed) statSpeed.textContent = 'Cloud AI Status';
      if (statCount) statCount.innerHTML = '<span style="color:#f59e0b;">⏳ ' + (data.error_message || 'Connecting to model...') + '</span>';
      if (tagsContainer) tagsContainer.innerHTML = '';
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


