

document.addEventListener('DOMContentLoaded', async () => {
  // Global State
  const state = {
    currentTab: 'analyzer',
    language: localStorage.getItem('cybershield_lang') || 'vi',
    preferredModel: 'AUTO',
    apiKey: ApiClient.getStoredApiKey(),
    i18nDict: {},
    attachedFiles: [],
    analysisResult: null,
    savedReports: JSON.parse(localStorage.getItem('cybershield_history') || '[]'),
    activeCase: null,
    knowledgeArticles: [],
    spotGame: {
      currentIndex: 0,
      score: 0,
      questions: []
    },
    academy: {
      scenarios: [],
      selectedId: null,
      currentStepIndex: 0,
      selectedOptionId: null
    }
  };

  // Toast System
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex:1; padding-right:0.5rem; word-break:break-word;">${message}</div>
      <button type="button" class="toast-close-btn" onclick="this.parentElement.remove()" title="Đóng thông báo">✕</button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 250);
      }
    }, 4500);
  };

  // Load i18n Dictionary
  async function loadTranslations() {
    const res = await ApiClient.getI18n(state.language);
    if (res && res.data) {
      state.i18nDict = res.data;
      applyTranslations();
    }
  }

  function applyTranslations() {
    const dict = state.i18nDict;
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.innerText = dict[key];
      }
    });
  }

  // Language Icon Switcher Handler
  const langBtn = document.getElementById('btn-lang-toggle');
  function updateLangBtnUI() {
    const label = document.getElementById('lang-flag-label');
    if (label) {
      label.innerText = state.language === 'vi' ? 'VI' : 'EN';
    }
  }
  if (langBtn) {
    updateLangBtnUI();
    langBtn.addEventListener('click', async () => {
      state.language = state.language === 'vi' ? 'en' : 'vi';
      localStorage.setItem('cybershield_lang', state.language);
      updateLangBtnUI();
      await loadTranslations();
      showToast(state.language === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English', 'info');
      switchTab(state.currentTab);
    });
  }

  // Mobile Menu Drawer Handlers
  const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  function toggleMobileSidebar() {
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
  }

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', toggleMobileSidebar);
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // Tab Router
  function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    if (tabId === 'knowledge') loadKnowledgeView();
    if (tabId === 'academy') loadAcademyView();
    if (tabId === 'spotgame') loadSpotGameView();
    if (tabId === 'history') loadHistoryView();

    closeMobileSidebar();
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  // Modal Handlers
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  };

  // Risk Score Gauge Drawing
  function drawRiskGauge(score) {
    const canvas = document.getElementById('risk-gauge-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height - 15;
    const radius = 80;

    // Track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Color Arc
    let strokeColor = '#10b981';
    if (score > 30) strokeColor = '#f59e0b';
    if (score > 60) strokeColor = '#f97316';
    if (score > 75) strokeColor = '#f43f5e';

    const endAngle = Math.PI + (score / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    const textEl = document.getElementById('risk-score-value');
    if (textEl) {
      textEl.innerText = score;
      textEl.style.color = strokeColor;
    }
  }

  // File Upload Dropzone
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.attachedFiles.push({
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64Data: e.target.result
        });
        renderAttachedFiles();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderAttachedFiles() {
    const list = document.getElementById('attached-files-list');
    if (!list) return;
    list.innerHTML = state.attachedFiles.map((f, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.8rem; background:var(--bg-input); border-radius:8px; margin-top:0.4rem; font-size:0.8rem;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${f.name}</span>
        <button type="button" onclick="removeFile(${i})" style="background:none; border:none; color:var(--accent-rose); cursor:pointer;">✕</button>
      </div>
    `).join('');
  }

  window.removeFile = function(index) {
    state.attachedFiles.splice(index, 1);
    renderAttachedFiles();
  };

  // 6 Scam Feature Cards Selector & Dynamic Form Inputs
  let activeFeatureMode = 'SMS';

  const featureCards = document.querySelectorAll('.scam-feature-card');
  const groupText = document.getElementById('input-group-text');
  const groupUrl = document.getElementById('input-group-url');
  const groupDropzone = document.getElementById('input-group-dropzone');
  const textLabel = document.getElementById('label-text-input');
  const textInput = document.getElementById('analyzer-text-input');
  const urlInput = document.getElementById('analyzer-url-input');
  const fileInputEl = document.getElementById('file-input');
  const dropzoneTitle = document.getElementById('dropzone-title');
  const dropzoneSubtitle = document.getElementById('dropzone-subtitle');
  const btnAnalyze = document.getElementById('btn-run-analysis');

  function updateAnalyzerFormUI(mode) {
    activeFeatureMode = mode;

    featureCards.forEach(card => {
      card.classList.toggle('active', card.dataset.mode === mode);
    });

    // Reset display
    if (groupText) groupText.style.display = 'none';
    if (groupUrl) groupUrl.style.display = 'none';
    if (groupDropzone) groupDropzone.style.display = 'none';

    switch (mode) {
      case 'SMS':
      case 'EMAIL':
      case 'CHAT':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = 'NỘI DUNG VĂN BẢN / TIN NHẮN:';
        if (textInput) {
          textInput.rows = 4;
          textInput.placeholder = 'Dán nội dung tin nhắn SMS, email, link Zalo hoặc đoạn chat nghi vấn tại đây...';
        }
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Kiểm Tra Tin Nhắn Ngay';
        break;

      case 'URL':
        if (groupUrl) groupUrl.style.display = 'block';
        if (urlInput) urlInput.placeholder = 'Nhập hoặc dán link website nghi vấn (ví dụ: https://bank-login-khuyenmai.com)...';
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Quét URL Ngay';
        break;

      case 'IMAGE':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = 'GHI CHÚ THÊM VỀ ẢNH (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = 'Ghi chú thêm về ảnh chụp màn hình (ví dụ: "Số lạ gửi qua Zalo xưng cán bộ ngân hàng")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'image/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Kéo thả ảnh chụp màn hình (Bill chuyển tiền, App giả...) vào đây';
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = 'Hỗ trợ tệp ảnh PNG, JPG, WEBP (Tối đa 50MB)';
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Soi Ảnh Bóc Mẽ';
        break;

      case 'AUDIO':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = 'GHI CHÚ THÊM VỀ CUỘC GỌI (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = 'Ghi chú thêm về cuộc gọi (ví dụ: "Số +84... gọi xưng công an đòi phạt nguội")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'audio/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Kéo thả tệp ghi âm cuộc gọi lạ vào đây';
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = 'Hỗ trợ tệp ghi âm MP3, WAV, M4A, AAC (Tối đa 50MB)';
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Phân Tích Giọng Nói AI';
        break;

      case 'VIDEO':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = 'GHI CHÚ THÊM VỀ VIDEO (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = 'Ghi chú thêm về video (ví dụ: "Cuộc gọi video Deepfake có dấu hiệu giật lag mặt")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'video/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Kéo thả video quay màn hình cuộc gọi Deepfake vào đây';
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = 'Hỗ trợ tệp MP4, MOV, AVI, WEBM (Tối đa 50MB)';
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> Phân Tích Deepfake Video';
        break;

      case 'MULTI':
      default:
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = 'MÔ TẢ CHI TIẾT TỔNG HỢP VỤ VIỆC:';
        if (textInput) {
          textInput.rows = 3;
          textInput.placeholder = 'Nhập toàn bộ bối cảnh, câu chuyện, số điện thoại, tài khoản ngân hàng liên quan...';
        }
        if (groupUrl) groupUrl.style.display = 'block';
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.removeAttribute('accept');
        if (dropzoneTitle) dropzoneTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Kéo thả tệp bằng chứng vào đây hoặc bấm để chọn tệp';
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = 'Hỗ trợ đính kèm nhiều ảnh, tệp ghi âm, video cùng lúc';
        if (btnAnalyze) btnAnalyze.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Bắt Đầu Phân Tích Đa Nguồn';
        break;
    }
  }

  featureCards.forEach(card => {
    card.addEventListener('click', () => {
      updateAnalyzerFormUI(card.dataset.mode);
    });
  });

  // Run AI Analysis
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', async () => {
      let textContent = '';
      let apiMode = 'DEEP_INVESTIGATION';

      if (activeFeatureMode === 'URL') {
        textContent = document.getElementById('analyzer-url-input')?.value || '';
        apiMode = 'URL_PHISHING';
        if (!textContent.trim()) {
          showToast('Vui lòng nhập đường link (URL) trang web cần quét.', 'error');
          return;
        }
      } else {
        textContent = document.getElementById('analyzer-text-input')?.value || '';
        if (activeFeatureMode === 'SMS') {
          apiMode = 'QUICK_SCAN';
        } else {
          apiMode = 'DEEP_INVESTIGATION';
        }

        if (!textContent.trim() && state.attachedFiles.length === 0) {
          showToast('Vui lòng nhập nội dung hoặc đính kèm tệp bằng chứng để phân tích.', 'error');
          return;
        }
      }

      openModal('modal-progress');
      btnAnalyze.disabled = true;

      try {
        const payload = {
          mode: apiMode,
          textContent,
          evidenceItems: state.attachedFiles,
          language: state.language,
          preferredModel: state.preferredModel
        };

        const res = await ApiClient.analyzeScam(payload);
        closeModal('modal-progress');
        btnAnalyze.disabled = false;

        if (res && res.analysis) {
          state.analysisResult = res.analysis;
          renderAnalysisResult(res.analysis);
          
          const newReport = {
            id: 'rep_' + Date.now(),
            createdAt: Date.now(),
            inputText: textContent.slice(0, 120),
            result: res.analysis
          };
          state.savedReports.unshift(newReport);
          localStorage.setItem('cybershield_history', JSON.stringify(state.savedReports));

          if (res.modelSwitched) {
            showToast(`${res.switchReason || `Tự động chuyển từ model ${res.primaryModel || 'gemini-3.1-pro-preview'} sang ${res.modelUsed} do bị giới hạn (limit).`}`, 'info');
          } else {
            showToast('Phân tích hoàn tất thành công!', 'success');
          }
        }
      } catch (err) {
        closeModal('modal-progress');
        btnAnalyze.disabled = false;
        showToast('Lỗi phân tích: ' + err.message, 'error');
      }
    });
  }

  function renderAnalysisResult(res) {
    const resultSection = document.getElementById('analysis-result-section');
    if (!resultSection) return;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });

    // Emergency Banner check
    const emergencyBanner = document.getElementById('emergency-threat-banner');
    if (emergencyBanner) {
      if (res.emergency_active_threat || (res.risk_score && res.risk_score >= 75)) {
        emergencyBanner.style.display = 'block';
      } else {
        emergencyBanner.style.display = 'none';
      }
    }

    // Verdict Badge
    const badge = document.getElementById('res-verdict-badge');
    if (badge) {
      const v = (res.verdict || 'SAFE').toLowerCase();
      let badgeClass = 'badge-safe';
      if (v.includes('critical')) badgeClass = 'badge-critical';
      else if (v.includes('high')) badgeClass = 'badge-high';
      else if (v.includes('medium')) badgeClass = 'badge-medium';

      badge.className = `badge-threat ${badgeClass}`;
      badge.innerText = res.threat_level_label || res.verdict;
    }

    drawRiskGauge(res.risk_score || 0);

    const summary = document.getElementById('res-summary');
    if (summary) summary.innerText = res.summary || '';

    const whyList = document.getElementById('res-why-list');
    if (whyList) {
      whyList.innerHTML = (res.why_is_this_suspicious || []).map(item => `
        <div style="padding:0.8rem 1.1rem; background:rgba(255,255,255,0.03); border-left:3px solid var(--accent-rose); border-radius:8px; margin-bottom:0.6rem;">
          <strong style="color:var(--accent-rose); font-size:0.9rem; display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${item.title}</strong>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">${item.explanation}</p>
        </div>
      `).join('');
    }

    const actionsList = document.getElementById('res-actions-list');
    if (actionsList) {
      actionsList.innerHTML = (res.recommended_actions || []).map(act => `
        <div style="display:flex; gap:0.85rem; align-items:flex-start; margin-bottom:0.75rem;">
          <span style="width:26px; height:26px; border-radius:50%; background:var(--accent-indigo); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:bold; flex-shrink:0;">${act.step_number}</span>
          <div>
            <strong style="font-size:0.9rem; color:#fff;">${act.title}</strong>
            <p style="font-size:0.85rem; color:var(--text-muted);">${act.action}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // 100% Knowledge View with 30 Encyclopedia Articles Detail Modal
  async function loadKnowledgeView() {
    const res = await ApiClient.getEncyclopedia();
    const container = document.getElementById('knowledge-articles-grid');
    if (!container || !res.data) return;
    state.knowledgeArticles = res.data;

    renderKnowledgeGrid(res.data);

    const searchInput = document.getElementById('knowledge-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = state.knowledgeArticles.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.shortDescription.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        );
        renderKnowledgeGrid(filtered);
      });
    }
  }

  function renderKnowledgeGrid(articles) {
    const container = document.getElementById('knowledge-articles-grid');
    if (!container) return;
    container.innerHTML = articles.map((art, idx) => `
      <div class="glass-card card-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge-threat badge-high">${art.category}</span>
          <span style="font-size:0.75rem; color:var(--text-dim); font-weight:bold;">#${idx + 1}</span>
        </div>
        <h4 style="font-size:1rem; font-weight:800; line-height:1.4;">${art.title}</h4>
        <p style="font-size:0.825rem; color:var(--text-muted); font-weight:400; line-clamp:3; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${art.shortDescription}</p>
        <button type="button" class="btn btn-secondary" style="margin-top:auto; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;" onclick="openArticleDetail('${art.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>Xem Chi Tiết Thủ Đoạn</button>
      </div>
    `).join('');
  }

  window.openArticleDetail = function(id) {
    const art = state.knowledgeArticles.find(a => a.id === id);
    if (!art) return;

    const titleEl = document.getElementById('art-modal-title');
    const bodyEl = document.getElementById('art-modal-body');
    if (titleEl) titleEl.innerText = art.title;

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="margin-bottom:1rem;"><span class="badge-threat badge-critical">${art.category}</span></div>
        
        <div style="background:var(--bg-input); padding:1rem; border-radius:12px; margin-bottom:1rem;">
          <strong style="color:var(--accent-cyan); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.3rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Hình thức này là gì?</strong>
          <p style="color:var(--text-muted); font-size:0.85rem;">${art.whatIsIt}</p>
        </div>

        ${art.howItWorks && art.howItWorks.length > 0 ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:var(--accent-indigo); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Cách thức hoạt động của kẻ lừa đảo:</strong>
            <ul style="padding-left:1.2rem; color:var(--text-muted); font-size:0.85rem;">
              ${art.howItWorks.map(step => `<li style="margin-bottom:0.3rem;">${step}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${art.warningSigns && art.warningSigns.length > 0 ? `
          <div style="margin-bottom:1rem; background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); padding:1rem; border-radius:12px;">
            <strong style="color:var(--accent-rose); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Dấu hiệu nhận biết cốt lõi:</strong>
            <ul style="padding-left:1.2rem; color:var(--text-main); font-size:0.85rem;">
              ${art.warningSigns.map(w => `<li style="margin-bottom:0.3rem;">${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${art.howToVerify && art.howToVerify.length > 0 ? `
          <div style="margin-bottom:1rem; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:1rem; border-radius:12px;">
            <strong style="color:var(--accent-emerald); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>Cách tự xác minh độc lập:</strong>
            <ul style="padding-left:1.2rem; color:var(--text-main); font-size:0.85rem;">
              ${art.howToVerify.map(v => `<li style="margin-bottom:0.3rem;">${v}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
    }

    openModal('modal-article-detail');
  };

  // 100% Interactive Academy View with 30 Scenarios
  async function loadAcademyView() {
    if (state.academy.scenarios.length === 0) {
      const res = await ApiClient.getScenarios();
      if (res && res.data) {
        state.academy.scenarios = res.data;
        if (!state.academy.selectedId && res.data.length > 0) {
          state.academy.selectedId = res.data[0].id;
        }
      }
    }
    renderAcademyScenario();
  }

  function renderAcademyScenario() {
    const container = document.getElementById('academy-container');
    if (!container || state.academy.scenarios.length === 0) return;

    const scenarios = state.academy.scenarios;
    const currentIndex = scenarios.findIndex(s => s.id === state.academy.selectedId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const currentSc = scenarios[validIndex] || scenarios[0];
    const steps = currentSc.steps || [];
    const currentStep = steps[state.academy.currentStepIndex] || steps[0];
    const choices = currentStep?.choices || currentStep?.options || [];

    const totalSteps = 2;
    const stepNum = state.academy.currentStepIndex === 0 ? 1 : 2;
    const progressPercent = (stepNum / totalSteps) * 100;
    const hasChoices = choices && choices.length > 0;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Top Scenario Picker Card -->
        <div class="glass-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.75rem;">
            <label class="form-label" style="margin:0; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>KỊCH BẢN THỰC HÀNH (${validIndex + 1}/${scenarios.length}):</label>
            <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Tiến trình: Bước ${stepNum}/${totalSteps}</span>
          </div>

          <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
            <button type="button" class="btn btn-secondary" style="flex:1; min-width:220px; justify-content:space-between; text-align:left; padding:0.75rem 1rem; border:1.5px solid var(--border-color); background:#ffffff;" onclick="openScenarioPickerModal()">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; color:var(--text-main); font-size:0.875rem;">
                #${validIndex + 1} [${currentSc.category}] — ${currentSc.title}
              </span>
              <span style="font-size:0.85rem; color:var(--primary-coral); flex-shrink:0; font-weight:800; margin-left:0.5rem; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Danh sách ▾</span>
            </button>

            <div style="display:flex; gap:0.4rem; width:auto;">
              <button type="button" class="btn btn-secondary" style="padding:0.75rem 0.9rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.3rem;" onclick="prevAcademyScenario()" ${validIndex === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Trước
              </button>
              <button type="button" class="btn btn-secondary" style="padding:0.75rem 0.9rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.3rem;" onclick="nextAcademyScenario()" ${validIndex === scenarios.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                Tiếp <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Practice Interactive Workspace Panel -->
        <div class="glass-panel" style="padding:2rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <span class="badge-threat badge-high">${currentSc.category}</span>
              <h3 style="margin-top:0.4rem; font-size:1.2rem;">${currentSc.title}</h3>
            </div>
            <span class="badge-threat badge-safe" style="font-size:0.8rem;">Bước ${stepNum}/${totalSteps}</span>
          </div>

          <!-- Progress Bar -->
          <div style="width:100%; height:6px; background:var(--bg-input); border-radius:999px; margin-bottom:1.5rem; overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--primary-coral), #6366F1); border-radius:999px; transition:width 0.3s ease;"></div>
          </div>

          <!-- Scammer Message Bubble -->
          <div style="background:var(--bg-input); border-left:4px solid var(--primary-coral); padding:1.25rem; border-radius:14px; margin-bottom:1.5rem; font-size:0.9rem; line-height:1.6;">
            <strong style="color:var(--primary-coral); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Kịch bản đối tượng tương tác:
            </strong>
            <p style="color:var(--text-main); font-weight:500;">${currentStep?.message || currentStep?.situation}</p>
          </div>

          <!-- User Response Options or Outcome Actions -->
          ${hasChoices ? `
            <h4 style="margin-bottom:1rem; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:0.4rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Bạn sẽ xử lý tình huống này thế nào?</h4>
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${choices.map((opt, idx) => `
                <div class="quiz-option" onclick="chooseAcademyOption('${opt.id}')">
                  <span style="width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, var(--primary-coral), #FF8E53); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0;">${String.fromCharCode(65 + idx)}</span>
                  <span style="font-size:0.875rem; font-weight:600; color:var(--text-main);">${opt.text}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="selectAcademyScenario('${currentSc.id}')" style="padding:0.75rem 1.25rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Thực Hành Lại Kịch Bản
              </button>
              ${validIndex < scenarios.length - 1 ? `
                <button type="button" class="btn btn-primary" onclick="nextAcademyScenario()" style="padding:0.75rem 1.25rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
                  Tiếp Tục Kịch Bản Tiếp Theo <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              ` : ''}
            </div>
          `}
        </div>
      </div>
    `;
  }

  window.openScenarioPickerModal = function() {
    renderScenarioPickerModal('');
    openModal('modal-scenario-picker');
    const input = document.getElementById('scenario-modal-search');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  };

  window.prevAcademyScenario = function() {
    const scenarios = state.academy.scenarios;
    if (scenarios.length === 0) return;
    const currentIndex = scenarios.findIndex(s => s.id === state.academy.selectedId);
    if (currentIndex > 0) {
      selectAcademyScenario(scenarios[currentIndex - 1].id);
    }
  };

  window.nextAcademyScenario = function() {
    const scenarios = state.academy.scenarios;
    if (scenarios.length === 0) return;
    const currentIndex = scenarios.findIndex(s => s.id === state.academy.selectedId);
    if (currentIndex >= 0 && currentIndex < scenarios.length - 1) {
      selectAcademyScenario(scenarios[currentIndex + 1].id);
    }
  };

  function renderScenarioPickerModal(searchTerm = '') {
    const listContainer = document.getElementById('scenario-modal-list');
    if (!listContainer) return;

    const scenarios = state.academy.scenarios;
    const term = searchTerm.toLowerCase().trim();

    const filtered = scenarios.filter((sc, i) => {
      const text = `#${i + 1} ${sc.category} ${sc.title} ${sc.description || ''}`.toLowerCase();
      return text.includes(term);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">
          Không tìm thấy kịch bản nào phù hợp với từ khóa "${searchTerm}"
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map((sc) => {
      const realIndex = scenarios.findIndex(s => s.id === sc.id);
      const isSelected = sc.id === state.academy.selectedId;
      return `
        <div class="glass-card" style="padding:0.9rem 1.1rem; cursor:pointer; border:${isSelected ? '2px solid var(--primary-coral)' : '1px solid var(--border-color)'}; background:${isSelected ? 'rgba(255,107,107,0.06)' : '#ffffff'}; transition:all 0.2s ease;" onclick="selectAcademyScenario('${sc.id}'); closeModal('modal-scenario-picker');">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
            <span class="badge-threat ${isSelected ? 'badge-critical' : 'badge-high'}" style="font-size:0.7rem;">#${realIndex + 1} — ${sc.category}</span>
            ${isSelected ? '<span style="font-size:0.75rem; font-weight:800; color:var(--primary-coral); display:inline-flex; align-items:center; gap:0.2rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Đang chọn</span>' : ''}
          </div>
          <h4 style="font-size:0.925rem; font-weight:700; color:var(--text-main); line-height:1.35;">${sc.title}</h4>
          ${sc.description ? `<p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${sc.description}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  // Bind scenario modal search input event listener
  const scenarioSearchInput = document.getElementById('scenario-modal-search');
  if (scenarioSearchInput) {
    scenarioSearchInput.addEventListener('input', (e) => {
      renderScenarioPickerModal(e.target.value);
    });
  }

  window.selectAcademyScenario = function(id) {
    state.academy.selectedId = id;
    state.academy.currentStepIndex = 0;
    renderAcademyScenario();
  };

  window.chooseAcademyOption = function(optionId) {
    const sc = state.academy.scenarios.find(s => s.id === state.academy.selectedId) || state.academy.scenarios[0];
    const steps = sc.steps || [];
    const currentStep = steps[state.academy.currentStepIndex] || steps[0];
    const choices = currentStep?.choices || currentStep?.options || [];
    const opt = choices.find(o => o.id === optionId);

    if (opt) {
      if (opt.isCorrect || opt.isSafeOutcome) {
        showToast('Chính xác! ' + opt.feedback, 'success');
      } else {
        showToast('Rủi ro cao! ' + opt.feedback, 'error');
      }

      if (opt.nextStepId) {
        const nextIndex = steps.findIndex(st => st.id === opt.nextStepId);
        state.academy.currentStepIndex = nextIndex >= 0 ? nextIndex : 1;
      } else {
        state.academy.currentStepIndex = 1;
      }
      renderAcademyScenario();
    }
  };

  // 100% Spot Game Quiz
  async function loadSpotGameView() {
    if (state.spotGame.questions.length === 0) {
      const res = await ApiClient.getGameQuestions();
      if (res.data) state.spotGame.questions = res.data;
    }
    renderSpotGameQuestion();
  }

  function renderSpotGameQuestion() {
    const q = state.spotGame.questions[state.spotGame.currentIndex];
    const container = document.getElementById('spotgame-container');
    if (!container || !q) return;

    container.innerHTML = `
      <div class="glass-panel" style="padding:2.5rem; width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <span class="badge-threat badge-high">Câu hỏi ${state.spotGame.currentIndex + 1}/${state.spotGame.questions.length}</span>
          <span style="font-weight:900; font-size:1.1rem; color:var(--accent-cyan);">Điểm: ${state.spotGame.score}</span>
        </div>

        <h3 style="margin-bottom:1rem; font-size:1.2rem;">${q.title}</h3>
        <div style="background:var(--bg-input); border:1px solid var(--border-color); padding:1.5rem; border-radius:16px; font-family:var(--font-mono); font-size:0.875rem; line-height:1.6; margin-bottom:2rem; white-space:pre-wrap;">${q.content}</div>

        <div class="spotgame-actions-grid">
          <button type="button" class="btn btn-danger" style="padding:1rem; font-size:1rem; display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;" onclick="answerSpotGame('SCAM')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ĐÂY LÀ LỪA ĐẢO
          </button>
          <button type="button" class="btn btn-success" style="padding:1rem; font-size:1rem; display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;" onclick="answerSpotGame('LEGITIMATE')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            CHÍNH THỐNG
          </button>
        </div>
      </div>
    `;
  }

  window.answerSpotGame = function(ans) {
    const q = state.spotGame.questions[state.spotGame.currentIndex];
    if (!q) return;
    if (ans === q.correctAnswer) {
      state.spotGame.score += 1;
      showToast('Đoán chính xác! ' + q.explanation, 'success');
    } else {
      showToast('Chưa chính xác! ' + q.explanation, 'error');
    }

    if (state.spotGame.currentIndex + 1 < state.spotGame.questions.length) {
      state.spotGame.currentIndex += 1;
      renderSpotGameQuestion();
    } else {
      showToast(`Hoàn tất game! Điểm số: ${state.spotGame.score}/${state.spotGame.questions.length}`, 'info');
      state.spotGame.currentIndex = 0;
      state.spotGame.score = 0;
      renderSpotGameQuestion();
    }
  };

  // Cases Dossiers View
  async function loadCasesView() {
    const res = await ApiClient.getCases();
    const list = document.getElementById('cases-list-container');
    if (!list) return;
    if (res.data) {
      list.innerHTML = res.data.map(c => `
        <div class="glass-card card-item">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:1rem;">${c.title}</strong>
            <span class="badge-threat badge-critical">${c.status}</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">${c.description}</p>
          <div style="font-size:0.75rem; color:var(--text-dim);">Số lượng bằng chứng: ${c.evidenceItems ? c.evidenceItems.length : 0}</div>
        </div>
      `).join('');
    }
  }

  window.viewHistoryDetail = function(repId) {
    const rep = state.savedReports.find(r => r.id === repId);
    if (!rep || !rep.result) {
      showToast('Không tìm thấy dữ liệu kết quả phân tích.', 'error');
      return;
    }
    state.analysisResult = rep.result;
    switchTab('analyzer');
    renderAnalysisResult(rep.result);
    showToast('Đã tải lại kết quả phân tích từ lịch sử!', 'info');
  };

  window.deleteHistoryItem = function(repId) {
    state.savedReports = state.savedReports.filter(r => r.id !== repId);
    localStorage.setItem('cybershield_history', JSON.stringify(state.savedReports));
    loadHistoryView();
    showToast('Đã xóa bản ghi lịch sử.', 'info');
  };

  window.clearAllHistory = function() {
    if (!state.savedReports || state.savedReports.length === 0) {
      showToast('Hiện chưa có lịch sử nào để xóa.', 'info');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử phân tích không?')) return;
    state.savedReports = [];
    localStorage.setItem('cybershield_history', JSON.stringify([]));
    loadHistoryView();
    showToast('Đã xóa sạch toàn bộ lịch sử phân tích!', 'info');
  };

  function loadHistoryView() {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (!state.savedReports || state.savedReports.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="padding:2.5rem; text-align:center; color:var(--text-muted);">
          <div style="margin-bottom:0.5rem; opacity:0.6; display:flex; justify-content:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5z"/><path d="M5.45 5.11L2 12v0h20v0l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          </div>
          <p style="font-size:0.95rem; margin:0;">Chưa có lịch sử phân tích nào được lưu.</p>
          <p style="font-size:0.8rem; opacity:0.8; margin-top:0.35rem;">Các kết quả kiểm tra lừa đảo của bạn sẽ tự động xuất hiện tại đây.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.savedReports.map(rep => {
      const riskScore = rep.result ? (rep.result.risk_score ?? 50) : 50;
      let badgeClass = 'badge-low';
      let verdictLabel = rep.result ? (rep.result.verdict || 'An Toàn') : 'Chưa xác định';
      
      if (riskScore >= 75) {
        badgeClass = 'badge-critical';
      } else if (riskScore >= 40) {
        badgeClass = 'badge-medium';
      }

      const inputSnippet = rep.inputText ? (rep.inputText.length > 150 ? rep.inputText.slice(0, 150) + '...' : rep.inputText) : 'Dữ liệu đa phương thức / ảnh / URL';

      return `
        <div class="glass-card" style="padding:1.25rem 1.5rem; margin-bottom:1rem; transition:all 0.2s ease; border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <strong style="font-size:0.95rem; color:var(--text-main);">Phân tích ngày: ${new Date(rep.createdAt).toLocaleString()}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span class="badge-threat ${badgeClass}">${verdictLabel} (${riskScore}/100)</span>
              
              <button type="button" class="btn btn-secondary" onclick="viewHistoryDetail('${rep.id}')" title="Xem kết quả phân tích" style="padding:0.35rem 0.75rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.3rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Xem kết quả
              </button>
              
              <button type="button" class="btn btn-secondary" onclick="deleteHistoryItem('${rep.id}')" title="Xóa bản ghi này" style="padding:0.35rem 0.6rem; font-size:0.8rem; color:var(--accent-coral); border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:0.25rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Xóa
              </button>
            </div>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin:0; background:rgba(255,255,255,0.03); padding:0.6rem 0.8rem; border-radius:6px; border-left:3px solid var(--primary-coral);">
            ${inputSnippet}
          </p>
        </div>
      `;
    }).join('');
  }



  // Export JSON Report
  window.exportReportJson = function() {
    if (!state.analysisResult) {
      showToast('Chưa có báo cáo nào để xuất.', 'error');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.analysisResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cybershield_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Settings Management
  window.selectApiMode = function(mode) {
    ApiClient.setApiMode(mode);
    window.updateSettingsUI();
  };

  window.saveSettingsForm = async function() {
    const selectedMode = ApiClient.getApiMode();
    const apiKeyVal = document.getElementById('setting-api-key').value.trim();

    if (selectedMode === 'custom_key') {
      if (!apiKeyVal) {
        showToast('Vui lòng nhập Gemini API Key cá nhân của bạn.', 'error');
        return;
      }
      showToast('Đang kiểm tra khóa API cá nhân...', 'info');
      const testRes = await ApiClient.validateApiKey(apiKeyVal);
      if (testRes && testRes.valid) {
        ApiClient.setStoredApiKey(apiKeyVal);
        showToast('Khóa API cá nhân hợp lệ! Đã lưu cài đặt.', 'success');
      } else {
        showToast('Khóa API không hợp lệ: ' + (testRes.error || 'Vui lòng kiểm tra lại khóa Google Gemini API.'), 'error');
        return;
      }
    } else {
      showToast('Đã lưu cấu hình: Sử dụng API có sẵn (Hệ thống CyberÚ)!', 'success');
    }
    window.updateSettingsUI();
  };

  window.updateSettingsUI = function() {
    const currentMode = ApiClient.getApiMode();
    const currentKey = ApiClient.getStoredApiKey();

    const radioCustom = document.getElementById('radio-mode-custom');
    const radioSystem = document.getElementById('radio-mode-system');
    if (radioCustom && radioSystem) {
      radioCustom.checked = (currentMode === 'custom_key');
      radioSystem.checked = (currentMode === 'system_default');
    }

    const keyInput = document.getElementById('setting-api-key');
    if (keyInput) keyInput.value = currentKey;

    const customCard = document.getElementById('api-option-card-custom');
    const systemCard = document.getElementById('api-option-card-system');
    if (customCard && systemCard) {
      if (currentMode === 'custom_key') {
        customCard.style.borderColor = 'var(--primary-coral)';
        customCard.style.background = 'rgba(255, 107, 107, 0.05)';
        systemCard.style.borderColor = 'var(--border-color)';
        systemCard.style.background = '#ffffff';
      } else {
        systemCard.style.borderColor = 'var(--primary-coral)';
        systemCard.style.background = 'rgba(255, 107, 107, 0.05)';
        customCard.style.borderColor = 'var(--border-color)';
        customCard.style.background = '#ffffff';
      }
    }
  };

  // Boot Init
  await loadTranslations();
  updateSettingsUI();
  ApiClient.checkHealth().then(res => {
    const badge = document.getElementById('health-status-badge');
    if (badge) {
      if (res.status === 'ok') {
        badge.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8" style="vertical-align:middle; margin-right:0.35rem;"><circle cx="4" cy="4" r="4" fill="#34d399"/></svg> Python FastAPI Online';
        badge.style.color = '#34d399';
      } else {
        badge.innerHTML = '<svg width="8" height="8" viewBox="0 0 8 8" style="vertical-align:middle; margin-right:0.35rem;"><circle cx="4" cy="4" r="4" fill="#fb7185"/></svg> Backend Offline';
        badge.style.color = '#fb7185';
      }
    }
  });

  drawRiskGauge(0);
});
