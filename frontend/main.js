/* ============================================================
   KitchenGuard AI — main.js
   ============================================================ */
'use strict';

/* ---------- Authentication & Audit History State Manager ---------- */
var currentUser = null;
var authToken = localStorage.getItem('kg_token') || null;

function getApiBaseUrl() {
  var isLocalOrSelfHosted = window.location.origin && (window.location.origin.includes(':8000') || window.location.origin.includes('railway.app'));
  return isLocalOrSelfHosted ? '' : 'https://kitchenguard-a1-production.up.railway.app';
}

function updateNavAuthState() {
  var navAuth = document.getElementById('nav-auth-container');
  var navUser = document.getElementById('nav-user-container');
  var navUserName = document.getElementById('nav-user-name');

  if (authToken && currentUser) {
    if (navAuth) navAuth.style.display = 'none';
    if (navUser) navUser.style.display = 'flex';
    if (navUserName) navUserName.textContent = '👤 ' + currentUser.username;
  } else {
    if (navAuth) navAuth.style.display = 'flex';
    if (navUser) navUser.style.display = 'none';
  }
}

function checkUserSession() {
  if (!authToken) {
    updateNavAuthState();
    loadAuditHistory();
    return;
  }
  fetch(getApiBaseUrl() + '/auth/me', {
    headers: { 'Authorization': 'Bearer ' + authToken }
  })
  .then(function (res) {
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  })
  .then(function (data) {
    currentUser = data;
    updateNavAuthState();
    loadAuditHistory();
  })
  .catch(function () {
    localStorage.removeItem('kg_token');
    authToken = null;
    currentUser = null;
    updateNavAuthState();
    loadAuditHistory();
  });
}

function loadAuditHistory() {
  var tableBody = document.getElementById('history-table-body');
  if (!tableBody) return;

  if (!authToken) {
    tableBody.innerHTML = '<tr><td colspan="8" style="padding:32px;text-align:center;color:#94a3b8;">Please sign in to view your secure audit logs.</td></tr>';
    return;
  }

  var headers = {
    'Authorization': 'Bearer ' + authToken
  };

  fetch(getApiBaseUrl() + '/api/scans?limit=25', { headers: headers })
  .then(function (res) { return res.json(); })
  .then(function (data) {
    if (!data.scans || data.scans.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="padding:32px;text-align:center;color:#94a3b8;">No audit scans recorded yet. Upload a photo or video above to create your first log entry!</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    data.scans.forEach(function (scan) {
      var row = document.createElement('tr');
      row.style.borderBottom = '1px solid #E2E8F0';

      var statusBadge = scan.is_compliant
        ? '<span style="background:rgba(16,185,129,0.12);color:#10B981;padding:4px 8px;border-radius:6px;font-weight:600;">✅ COMPLIANT</span>'
        : '<span style="background:rgba(239,68,68,0.12);color:#EF4444;padding:4px 8px;border-radius:6px;font-weight:600;">🚨 VIOLATION</span>';

      var violationsText = '-';
      if (scan.violations && scan.violations.length > 0) {
        violationsText = scan.violations.map(function (v) {
          return '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-size:0.75rem;font-weight:600;margin:2px;">⚠️ ' + v.type.toUpperCase() + ' (' + Math.round(v.confidence * 100) + '%)</span>';
        }).join(' ');
      }

      var telegramBadge = scan.notification_sent
        ? '<span style="color:#10B981;font-weight:600;display:inline-flex;align-items:center;gap:4px;">🟢 Delivered</span>'
        : '<span style="color:#94a3b8;display:inline-flex;align-items:center;gap:4px;">⚪ Disabled</span>';

      var snapshotBtn = scan.snapshot_url
        ? '<button type="button" class="btn-view-snapshot" data-url="' + scan.snapshot_url + '" data-caption="' + scan.created_at + ' — ' + (scan.is_compliant ? '100% Compliant' : 'Violations Detected') + '" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8rem;">🔍 View Image</button>'
        : '<span style="color:#cbd5e1;">None</span>';

      var pdfBtn = '<button type="button" class="btn-download-pdf" data-id="' + scan.id + '" style="background:' + (scan.is_compliant ? '#f0fdf4;color:#16a34a;border:1px solid #bbf7d0' : '#fef2f2;color:#dc2626;border:1px solid #fecaca') + ';padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;gap:4px;">📄 ' + (scan.is_compliant ? 'Audit Cert PDF' : 'Legal Citation PDF') + '</button>';

      row.innerHTML = 
        '<td style="padding:12px 16px;white-space:nowrap;font-size:0.82rem;color:#475569;">' + scan.created_at + '</td>' +
        '<td style="padding:12px 16px;font-weight:600;color:var(--navy);">' + scan.user + '</td>' +
        '<td style="padding:12px 16px;text-transform:capitalize;color:#475569;">' + scan.media_type + '</td>' +
        '<td style="padding:12px 16px;">' + statusBadge + '</td>' +
        '<td style="padding:12px 16px;">' + violationsText + '</td>' +
        '<td style="padding:12px 16px;">' + telegramBadge + '</td>' +
        '<td style="padding:12px 16px;text-align:center;">' + snapshotBtn + '</td>' +
        '<td style="padding:12px 16px;text-align:center;">' + pdfBtn + '</td>';

      tableBody.appendChild(row);
    });

    // Wire PDF download buttons with auth token
    document.querySelectorAll('.btn-download-pdf').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var scanId = btn.getAttribute('data-id');
        btn.textContent = '⏳ Building PDF...';
        
        var pdfUrl = getApiBaseUrl() + '/api/scans/' + scanId + '/pdf';
        fetch(pdfUrl, {
          headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
        })
        .then(function (res) {
          if (!res.ok) throw new Error('Could not generate PDF citation');
          return res.blob();
        })
        .then(function (blob) {
          var blobUrl = window.URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = blobUrl;
          a.download = 'KitchenGuard_Citation_Scan_' + scanId + '.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(blobUrl);
          btn.innerHTML = '📄 Downloaded';
          setTimeout(function() { btn.innerHTML = '📄 Citation PDF'; }, 2000);
        })
        .catch(function (err) {
          alert('Error downloading PDF: ' + err.message);
          btn.innerHTML = '📄 Legal Citation PDF';
        });
      });
    });

    // Wire snapshot preview buttons
    document.querySelectorAll('.btn-view-snapshot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var imgUrl = btn.getAttribute('data-url');
        var caption = btn.getAttribute('data-caption');
        var snapModal = document.getElementById('snapshot-modal');
        var snapImg = document.getElementById('snapshot-modal-img');
        var snapCaption = document.getElementById('snapshot-modal-caption');
        if (snapModal && snapImg) {
          snapImg.src = getApiBaseUrl() + imgUrl;
          if (snapCaption) snapCaption.textContent = caption;
          snapModal.style.display = 'flex';
        }
      });
    });
  })
  .catch(function (err) {
    console.warn("Could not fetch audit history:", err);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  checkUserSession();

  // Snapshot modal close
  var snapModal = document.getElementById('snapshot-modal');
  var snapClose = document.getElementById('snapshot-modal-close');
  if (snapModal && snapClose) {
    snapClose.addEventListener('click', function () { snapModal.style.display = 'none'; });
    snapModal.addEventListener('click', function (e) {
      if (e.target === snapModal) snapModal.style.display = 'none';
    });
  }

  // Refresh history button
  var btnRefresh = document.getElementById('btn-refresh-history');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', function () {
      btnRefresh.textContent = 'Refreshing...';
      loadAuditHistory();
      setTimeout(function () { btnRefresh.textContent = '🔄 Refresh Logs'; }, 500);
    });
  }

  // Auth modal triggers
  var authModal = document.getElementById('auth-modal');
  var authClose = document.getElementById('auth-modal-close');
  var btnSignin = document.getElementById('nav-signin');
  var btnRegister = document.getElementById('nav-get-started');
  var btnLogout = document.getElementById('nav-logout');
  var authForm = document.getElementById('auth-form');
  var authTitle = document.getElementById('auth-modal-title');
  var authSubtitle = document.getElementById('auth-modal-subtitle');
  var authSubmitBtn = document.getElementById('auth-submit-btn');
  var authSwitchLink = document.getElementById('auth-switch-link');
  var authSwitchText = document.getElementById('auth-switch-text');
  var emailGroup = document.getElementById('auth-email-group');
  var errorMsg = document.getElementById('auth-error-msg');
  var isRegisterMode = false;

  function setAuthMode(register) {
    isRegisterMode = register;
    if (errorMsg) errorMsg.style.display = 'none';
    if (isRegisterMode) {
      authTitle.textContent = 'Create KitchenGuard Account';
      authSubtitle.textContent = 'Register to store all kitchen inspection audits in your personal database.';
      authSubmitBtn.textContent = 'Register & Sign In';
      authSwitchText.textContent = 'Already have an account?';
      authSwitchLink.textContent = 'Sign in';
      if (emailGroup) emailGroup.style.display = 'flex';
    } else {
      authTitle.textContent = 'Sign In to KitchenGuard';
      authSubtitle.textContent = 'Access your kitchen\'s audit history and live telemetry.';
      authSubmitBtn.textContent = 'Sign In';
      authSwitchText.textContent = 'Don\'t have an account?';
      authSwitchLink.textContent = 'Register free';
      if (emailGroup) emailGroup.style.display = 'none';
    }
  }

  if (btnSignin && authModal) {
    btnSignin.addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode(false);
      authModal.style.display = 'flex';
    });
  }

  if (btnRegister && authModal) {
    btnRegister.addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode(true);
      authModal.style.display = 'flex';
    });
  }

  if (authClose && authModal) {
    authClose.addEventListener('click', function () { authModal.style.display = 'none'; });
    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) authModal.style.display = 'none';
    });
  }

  if (authSwitchLink) {
    authSwitchLink.addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode(!isRegisterMode);
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      localStorage.removeItem('kg_token');
      authToken = null;
      currentUser = null;
      updateNavAuthState();
      loadAuditHistory();
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = document.getElementById('auth-username-input').value.trim();
      var password = document.getElementById('auth-password-input').value;
      var email = document.getElementById('auth-email-input').value.trim();

      if (!username || !password) return;

      var endpoint = isRegisterMode ? '/auth/signup' : '/auth/login';
      var payload = { username: username, password: password };
      if (isRegisterMode && email) payload.email = email;

      authSubmitBtn.textContent = 'Authenticating...';
      if (errorMsg) errorMsg.style.display = 'none';

      fetch(getApiBaseUrl() + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(async function (res) {
        if (!res.ok) {
          var errData = {};
          try { errData = await res.json(); } catch(e) {}
          throw new Error(errData.detail || 'Authentication failed');
        }
        return res.json();
      })
      .then(function (data) {
        localStorage.setItem('kg_token', data.access_token);
        authToken = data.access_token;
        currentUser = data.user;
        updateNavAuthState();
        authModal.style.display = 'none';
        loadAuditHistory();
      })
      .catch(function (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message;
          errorMsg.style.display = 'block';
        }
      })
      .finally(function () {
        authSubmitBtn.textContent = isRegisterMode ? 'Register & Sign In' : 'Sign In';
      });
    });
  }
});

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
    formData.append('conf', '0.35');
    formData.append('return_image', 'true');

    var fetchHeaders = {};
    if (authToken) {
      fetchHeaders['Authorization'] = 'Bearer ' + authToken;
    }

    fetch(API_BASE_URL + '/predict', {
      method: 'POST',
      headers: fetchHeaders,
      body: formData
    })
    .then(async function (res) {
      if (!res.ok) {
        var errDetail = '';
        try {
          var errJson = await res.json();
          errDetail = errJson.detail || '';
        } catch(e) {}
        throw new Error('API server status ' + res.status + (errDetail ? ': ' + errDetail : ''));
      }
      return res.json();
    })
    .then(function (data) {
      clearInterval(interval);
      scanProgress.style.width = '100%';
      setTimeout(function () {
        displayDetectionResult(fileUrl, isImage, data);
        loadAuditHistory();
      }, 150);
    })
    .catch(function (err) {
      clearInterval(interval);
      console.error("Model Inference Error:", err);
      scanProgress.style.width = '100%';

      var errorData = {
        success: false,
        error_message: err.message || 'Inference request failed or took too long. Please try again!'
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


