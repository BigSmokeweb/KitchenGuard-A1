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
      var sampleUrl = (currentMode === 'image') ? 'Kitchen_Img.png' : 'Kitchen_Video.mp4';
      fetch(sampleUrl)
        .then(function (res) { return res.blob(); })
        .then(function (blob) {
          var mimeType = blob.type || (currentMode === 'image' ? 'image/png' : 'video/mp4');
          var file = new File([blob], sampleUrl, { type: mimeType });
          handleUploadedFile(file);
        })
        .catch(function (err) {
          console.error("Sample fetch error:", err);
          alert('Could not load sample file: ' + err.message);
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
      alert('Please upload an image (JPG, PNG) or video (MP4, MOV) file.');
      return;
    }

    var fileUrl = URL.createObjectURL(file);

    // Transition to Scanning Phase
    dropPrompt.hidden = true;
    dropResult.hidden = true;
    dropScanning.hidden = false;
    scanProgress.style.width = '10%';

    var progress = 10;
    var interval = setInterval(function () {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress > 88) progress = 88;
      scanProgress.style.width = progress + '%';
    }, 150);

    var API_BASE_URL = (window.location.origin && window.location.origin.includes(':8000')) ? '' : 'http://localhost:8000';
    var formData = new FormData();
    formData.append('file', file);

    fetch(API_BASE_URL + '/predict', {
      method: 'POST',
      body: formData
    })
    .then(function(res) {
      if (!res.ok) throw new Error('API Server error (' + res.status + ')');
      return res.json();
    })
    .then(function(data) {
      clearInterval(interval);
      scanProgress.style.width = '100%';
      setTimeout(function() {
        displayDetectionResult(fileUrl, isImage, data);
      }, 200);
    })
    .catch(function(err) {
      clearInterval(interval);
      console.error("Inference Error:", err);
      alert('AI Inference Failed: ' + err.message + '\nShowing video preview fallback.');
      scanProgress.style.width = '100%';
      setTimeout(function() {
        displayDetectionResult(fileUrl, isImage, null);
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
      if (statSpeed) statSpeed.textContent = (isImage ? 'Inference: ' : 'Stream Scan: ') + data.inference_time_ms + ' ms';
      
      if (statCount) {
        if (data.detections_count > 0) {
          statCount.innerHTML = '<span style="color:#ef4444;">⚠️ ' + data.detections_count + ' Safety/Hygiene Objects Detected</span>';
        } else {
          statCount.innerHTML = '<span style="color:#10b981;">✅ Compliant - No Violations Detected</span>';
        }
      }

      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach(function(det) {
            var tag = document.createElement('span');
            tag.style.cssText = 'background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;padding:4px 10px;border-radius:6px;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;';
            var confPercent = Math.round(det.confidence * 100);
            tag.innerHTML = '<strong>' + det.class_name + '</strong> <span style="opacity:0.8;font-size:0.78rem;">(' + confPercent + '%)</span>';
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
      var summaryBox = document.getElementById('detection-summary');
      if (summaryBox) summaryBox.hidden = true;
    });
  }
}());


