

document.addEventListener('DOMContentLoaded', async () => {
  // trang thai chung (state) cua ung dung
  const state = {
    currentTab: 'analyzer',
    language: localStorage.getItem('cybershield_lang') || 'vi',
    preferredModel: 'AUTO',
    apiKey: ApiClient.getStoredApiKey(),
    user: JSON.parse(localStorage.getItem('cybershield_user') || 'null'),
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

  // he thong thong bao toast ui
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

  // tai tu dien ngon ngu i18n
  async function loadTranslations() {
    const res = await ApiClient.getI18n(state.language);
    if (res && res.data) {
      state.i18nDict = res.data;
      applyTranslations();
    }
  }

  function t(key, fallback) {
    if (state.i18nDict && state.i18nDict[key]) {
      return state.i18nDict[key];
    }
    return fallback;
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
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    const knowledgeSearch = document.getElementById('knowledge-search-input');
    if (knowledgeSearch && dict['knowledgeSearchPlaceholder']) {
      knowledgeSearch.placeholder = dict['knowledgeSearchPlaceholder'];
    }

    if (state.currentTab === 'knowledge') loadKnowledgeView(true);
    else if (state.currentTab === 'academy') loadAcademyView(true);
    else if (state.currentTab === 'spotgame') loadSpotGameView(true);
    else if (state.currentTab === 'history') loadHistoryView(true);
    else if (state.currentTab === 'settings') renderAuthView();
    else if (state.currentTab === 'analyzer') updateAnalyzerFormUI(activeFeatureMode);
  }

  // xu ly nut chuyen doi ngon ngu viet - anh (desktop sidebar & mobile topbar)
  const langBtn = document.getElementById('btn-lang-toggle');
  const mobileLangBtn = document.getElementById('btn-lang-toggle-mobile');

  const vnFlagSvg = `<svg width="20" height="14" viewBox="0 0 30 20" style="border-radius:2px; vertical-align:middle; flex-shrink:0;"><rect width="30" height="20" fill="#DA251D"/><polygon fill="#FFFF00" points="15,4 16.65,9.08 22,9.08 17.67,12.23 19.32,17.31 15,14.16 10.68,17.31 12.33,12.23 8,9.08 13.35,9.08"/></svg>`;
  const ukFlagSvg = `<svg width="20" height="14" viewBox="0 0 60 30" style="border-radius:2px; vertical-align:middle; flex-shrink:0;"><clipPath id="uk-clip-s"><rect width="60" height="30" rx="3"/></clipPath><g clip-path="url(#uk-clip-s)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></g></svg>`;

  function updateLangBtnUI() {
    const isVi = state.language === 'vi';
    const label = document.getElementById('lang-flag-label');
    const icon = document.getElementById('lang-flag-icon');
    const mobileIcon = document.getElementById('mobile-lang-flag-icon');
    const mobileCode = document.getElementById('mobile-lang-code');

    if (label) label.innerText = isVi ? 'Tiếng Việt' : 'English';
    if (icon) icon.innerHTML = isVi ? vnFlagSvg : ukFlagSvg;
    if (mobileIcon) mobileIcon.innerHTML = isVi ? vnFlagSvg : ukFlagSvg;
    if (mobileCode) mobileCode.innerText = isVi ? 'VI' : 'EN';
  }

  async function toggleLanguage() {
    state.language = state.language === 'vi' ? 'en' : 'vi';
    localStorage.setItem('cybershield_lang', state.language);
    updateLangBtnUI();

    // Reset in-memory cached arrays to force fresh fetch in new language
    state.knowledgeArticles = null;
    state.academy.scenarios = [];
    state.spotGame.questions = [];

    await loadTranslations();
    showToast(state.language === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English', 'info');
    await switchTab(state.currentTab, true);
  }

  updateLangBtnUI();
  if (langBtn) langBtn.addEventListener('click', toggleLanguage);
  if (mobileLangBtn) mobileLangBtn.addEventListener('click', toggleLanguage);

  // xu ly menu drawer tren thiet bi di dong
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
  function switchTab(tabId, forceReload = false) {
    state.currentTab = tabId;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    if (tabId === 'knowledge') loadKnowledgeView(forceReload);
    if (tabId === 'academy') loadAcademyView(forceReload);
    if (tabId === 'spotgame') loadSpotGameView(forceReload);
    if (tabId === 'history') loadHistoryView(forceReload);
    if (tabId === 'settings') renderAuthView();

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
    const isEn = state.language === 'en';

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
        if (textLabel) textLabel.innerText = t('labelSmsInput', isEn ? 'SUSPICIOUS MESSAGE / SMS / EMAIL / CHAT CONTENT:' : 'NỘI DUNG VĂN BẢN / TIN NHẮN:');
        if (textInput) {
          textInput.rows = 4;
          textInput.placeholder = t('placeholderSmsInput', isEn ? 'Paste suspicious SMS text, email, link or chat transcript here...' : 'Dán nội dung tin nhắn SMS, email, link Zalo hoặc đoạn chat nghi vấn tại đây...');
        }
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ${t('btnScanSms', isEn ? 'Scan Message Now' : 'Kiểm Tra Tin Nhắn Ngay')}`;
        break;

      case 'URL':
        if (groupUrl) groupUrl.style.display = 'block';
        if (urlInput) urlInput.placeholder = t('placeholderUrlInput', isEn ? 'Enter or paste suspicious link (e.g. https://bank-login-fake.com)...' : 'Nhập hoặc dán link website nghi vấn (ví dụ: https://bank-login-khuyenmai.com)...');
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> ${t('btnScanUrl', isEn ? 'Scan URL Now' : 'Quét URL Ngay')}`;
        break;

      case 'IMAGE':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = isEn ? 'ADDITIONAL NOTES FOR IMAGE (OPTIONAL):' : 'GHI CHÚ THÊM VỀ ẢNH (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = isEn ? 'Additional notes on screenshot (e.g. "Sent via unknown WhatsApp claiming to be bank manager")...' : 'Ghi chú thêm về ảnh chụp màn hình (ví dụ: "Số lạ gửi qua Zalo xưng cán bộ ngân hàng")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'image/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> ${t('dropzoneTitle', isEn ? 'Drag & drop screenshots (Payment receipts, Fake apps...) here' : 'Kéo thả ảnh chụp màn hình (Bill chuyển tiền, App giả...) vào đây')}`;
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = t('dropzoneSubtitle', isEn ? 'Supports PNG, JPG, WEBP image files (Max 50MB)' : 'Hỗ trợ tệp ảnh PNG, JPG, WEBP (Tối đa 50MB)');
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> ${t('btnScanImage', isEn ? 'Analyze Screenshot' : 'Soi Ảnh Bóc Mẽ')}`;
        break;

      case 'AUDIO':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = isEn ? 'ADDITIONAL NOTES FOR AUDIO (OPTIONAL):' : 'GHI CHÚ THÊM VỀ CUỘC GỌI (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = isEn ? 'Notes on audio call (e.g. "Unknown call claiming to be police officer")...' : 'Ghi chú thêm về cuộc gọi (ví dụ: "Số +84... gọi xưng công an đòi phạt nguội")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'audio/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> ${t('dropzoneTitle', isEn ? 'Drag & drop voice call recordings here' : 'Kéo thả tệp ghi âm cuộc gọi lạ vào đây')}`;
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = t('dropzoneSubtitle', isEn ? 'Supports MP3, WAV, M4A, AAC audio files (Max 50MB)' : 'Hỗ trợ tệp ghi âm MP3, WAV, M4A, AAC (Tối đa 50MB)');
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> ${t('btnScanAudio', isEn ? 'Analyze Voice & AI' : 'Phân Tích Giọng Nói AI')}`;
        break;

      case 'VIDEO':
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = isEn ? 'ADDITIONAL NOTES FOR VIDEO (OPTIONAL):' : 'GHI CHÚ THÊM VỀ VIDEO (KHÔNG BẮT BUỘC):';
        if (textInput) {
          textInput.rows = 2;
          textInput.placeholder = isEn ? 'Notes on video call (e.g. "Deepfake video call showing glitched face")...' : 'Ghi chú thêm về video (ví dụ: "Cuộc gọi video Deepfake có dấu hiệu giật lag mặt")...';
        }
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.accept = 'video/*';
        if (dropzoneTitle) dropzoneTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> ${t('dropzoneTitle', isEn ? 'Drag & drop Deepfake screen recording video here' : 'Kéo thả video quay màn hình cuộc gọi Deepfake vào đây')}`;
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = t('dropzoneSubtitle', isEn ? 'Supports MP4, MOV, AVI, WEBM video files (Max 50MB)' : 'Hỗ trợ tệp MP4, MOV, AVI, WEBM (Tối đa 50MB)');
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> ${t('btnScanVideo', isEn ? 'Analyze Deepfake Video' : 'Phân Tích Deepfake Video')}`;
        break;

      case 'MULTI':
      default:
        if (groupText) groupText.style.display = 'block';
        if (textLabel) textLabel.innerText = isEn ? 'MULTIMODAL CASE DESCRIPTION:' : 'MÔ TẢ CHI TIẾT TỔNG HỢP VỤ VIỆC:';
        if (textInput) {
          textInput.rows = 3;
          textInput.placeholder = isEn ? 'Enter full context, narrative, phone numbers, bank accounts involved...' : 'Nhập toàn bộ bối cảnh, câu chuyện, số điện thoại, tài khoản ngân hàng liên quan...';
        }
        if (groupUrl) groupUrl.style.display = 'block';
        if (groupDropzone) groupDropzone.style.display = 'block';
        if (fileInputEl) fileInputEl.removeAttribute('accept');
        if (dropzoneTitle) dropzoneTitle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> ${t('dropzoneTitle', isEn ? 'Drag & drop evidence files here or click to browse' : 'Kéo thả tệp bằng chứng vào đây hoặc bấm để chọn tệp')}`;
        if (dropzoneSubtitle) dropzoneSubtitle.innerText = t('dropzoneSubtitle', isEn ? 'Supports attaching multiple images, audio, and video files at once' : 'Hỗ trợ đính kèm nhiều ảnh, tệp ghi âm, video cùng lúc');
        if (btnAnalyze) btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:0.3rem;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ${t('btnScanMultimodal', isEn ? 'Run Multimodal Scan' : 'Bắt Đầu Phân Tích Đa Nguồn')}`;
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
        textContent = (document.getElementById('analyzer-url-input')?.value || '').trim().toLowerCase();
        apiMode = 'URL_PHISHING';
        if (!textContent) {
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
          if (res.providerUsed || res.modelUsed) {
            res.analysis.providerUsed = res.providerUsed || res.modelUsed;
          }
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
            showToast(`${res.switchReason || `Phân tích thành công qua ${res.providerUsed || res.modelUsed}`}`, 'info');
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
    if (!res) return;
    const resultSection = document.getElementById('analysis-result-section');
    if (!resultSection) return;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });

    const verdictVal = (res.verdict || res.verdict_level || res.status || 'SUSPICIOUS').toString().toUpperCase();
    const threatLabel = res.threat_level_label || res.threat_label || res.threatLevel || verdictVal;
    const riskScore = typeof res.risk_score === 'number' ? res.risk_score : (typeof res.riskScore === 'number' ? res.riskScore : 50);
    const summaryText = res.summary || res.summary_text || res.description || 'Đã hoàn thành phân tích đe dọa.';
    const whyItems = res.why_is_this_suspicious || res.suspicious_points || res.reasons || [];
    const recommendedActions = res.recommended_actions || res.actions || res.safety_steps || [];

    // Emergency Banner check
    const emergencyBanner = document.getElementById('emergency-threat-banner');
    if (emergencyBanner) {
      if (res.emergency_active_threat || riskScore >= 75) {
        emergencyBanner.style.display = 'block';
      } else {
        emergencyBanner.style.display = 'none';
      }
    }

    // Verdict Badge & Provider Badge
    const badge = document.getElementById('res-verdict-badge');
    if (badge) {
      const v = verdictVal.toLowerCase();
      let badgeClass = 'badge-safe';
      if (v.includes('critical') || v.includes('malicious')) badgeClass = 'badge-critical';
      else if (v.includes('high') || v.includes('suspicious')) badgeClass = 'badge-high';
      else if (v.includes('medium')) badgeClass = 'badge-medium';

      badge.className = `badge-threat ${badgeClass}`;
      badge.innerText = threatLabel;
    }

    const providerBadge = document.getElementById('res-provider-badge');
    if (providerBadge) {
      const p = res.providerUsed || res.provider || res.modelUsed || '';
      if (p) {
        providerBadge.style.display = 'inline-block';
        providerBadge.innerText = `${t('sourcePrefix', 'Nguồn:')} ${p}`;
      } else {
        providerBadge.style.display = 'none';
      }
    }

    drawRiskGauge(riskScore);

    const summary = document.getElementById('res-summary');
    if (summary) summary.innerText = summaryText;

    const whyList = document.getElementById('res-why-list');
    if (whyList) {
      whyList.innerHTML = whyItems.map(item => {
        let titleStr = 'Dấu hiệu nghi vấn';
        let expStr = '';
        if (typeof item === 'object' && item !== null) {
          titleStr = item.title || item.point || 'Dấu hiệu nghi vấn';
          expStr = item.explanation || item.detail || item.description || item.action || item.text || '';
        } else if (typeof item === 'string') {
          expStr = item;
        }
        if (!expStr) expStr = String(item);
        return `
          <div style="padding:0.8rem 1.1rem; background:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:0.6rem;">
            <strong style="color:var(--accent-rose); font-size:0.9rem; display:inline-flex; align-items:center; gap:0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${titleStr}</strong>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">${expStr}</p>
          </div>
        `;
      }).join('');
    }

    const actionsList = document.getElementById('res-actions-list');
    if (actionsList) {
      actionsList.innerHTML = recommendedActions.map((act, idx) => {
        let stepNum = idx + 1;
        let titleStr = `Bước ${stepNum}`;
        let actStr = '';
        if (typeof act === 'object' && act !== null) {
          stepNum = act.step_number || idx + 1;
          titleStr = act.title || `Bước ${stepNum}`;
          actStr = act.action || act.explanation || act.detail || act.description || act.text || '';
        } else if (typeof act === 'string') {
          actStr = act;
        }
        if (!actStr) actStr = String(act);
        return `
          <div style="display:flex; gap:0.85rem; align-items:flex-start; margin-bottom:0.75rem;">
            <span style="width:26px; height:26px; border-radius:50%; background:var(--accent-indigo); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:bold; flex-shrink:0;">${stepNum}</span>
            <div>
              <strong style="font-size:0.9rem; color:#fff;">${titleStr}</strong>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">${actStr}</p>
            </div>
          </div>
        `;
      }).join('');
    }

  }

  // 100% Knowledge View with 30 Encyclopedia Articles Detail Modal
  async function loadKnowledgeView(forceReload = false) {
    if (forceReload || !state.knowledgeArticles || state.knowledgeArticles.length === 0) {
      const res = await ApiClient.getEncyclopedia('', 'all', state.language);
      if (res && res.data) {
        state.knowledgeArticles = res.data;
      }
    }
    renderKnowledgeGrid(state.knowledgeArticles || []);

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
        <button type="button" class="btn btn-secondary" style="margin-top:auto; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;" onclick="openArticleDetail('${art.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>${t('viewThreatDetailBtn', 'Xem Chi Tiết Thủ Đoạn')}</button>
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
          <strong style="color:var(--accent-cyan); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.3rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${t('whatIsItLabel', 'Hình thức này là gì?')}</strong>
          <p style="color:var(--text-muted); font-size:0.85rem;">${art.whatIsIt}</p>
        </div>

        ${art.howItWorks && art.howItWorks.length > 0 ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:var(--accent-indigo); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>${t('howItWorksLabel', 'Cách thức hoạt động của kẻ lừa đảo:')}</strong>
            <ul style="padding-left:1.2rem; color:var(--text-muted); font-size:0.85rem;">
              ${art.howItWorks.map(step => `<li style="margin-bottom:0.3rem;">${step}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${art.warningSigns && art.warningSigns.length > 0 ? `
          <div style="margin-bottom:1rem; background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); padding:1rem; border-radius:12px;">
            <strong style="color:var(--accent-rose); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${t('warningSignsLabel', 'Dấu hiệu nhận biết cốt lõi:')}</strong>
            <ul style="padding-left:1.2rem; color:var(--text-main); font-size:0.85rem;">
              ${art.warningSigns.map(w => `<li style="margin-bottom:0.3rem;">${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${art.howToVerify && art.howToVerify.length > 0 ? `
          <div style="margin-bottom:1rem; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:1rem; border-radius:12px;">
            <strong style="color:var(--accent-emerald); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>${t('howToVerifyLabel', 'Cách tự xác minh độc lập:')}</strong>
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
  async function loadAcademyView(forceReload = false) {
    if (forceReload || !state.academy.scenarios || state.academy.scenarios.length === 0) {
      const res = await ApiClient.getScenarios('', 'all', state.language);
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
            <label class="form-label" style="margin:0; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>${t('academyHeader', 'KỊCH BẢN THỰC HÀNH')} (${validIndex + 1}/${scenarios.length}):</label>
            <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">${t('academyProgress', 'Tiến trình: Bước')} ${stepNum}/${totalSteps}</span>
          </div>

          <div style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
            <button type="button" class="btn btn-secondary" style="flex:1; min-width:220px; justify-content:space-between; text-align:left; padding:0.75rem 1rem; border:1.5px solid var(--border-color); background:#ffffff;" onclick="openScenarioPickerModal()">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; color:var(--text-main); font-size:0.875rem;">
                #${validIndex + 1} [${currentSc.category}] — ${currentSc.title}
              </span>
              <span style="font-size:0.85rem; color:var(--primary-coral); flex-shrink:0; font-weight:800; margin-left:0.5rem; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>${t('academyListBtn', 'Danh sách')} ▾</span>
            </button>

            <div style="display:flex; gap:0.4rem; width:auto;">
              <button type="button" class="btn btn-secondary" style="padding:0.75rem 0.9rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.3rem;" onclick="prevAcademyScenario()" ${validIndex === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>${t('btnPrev', 'Trước')}
              </button>
              <button type="button" class="btn btn-secondary" style="padding:0.75rem 0.9rem; font-size:0.85rem; font-weight:700; display:inline-flex; align-items:center; gap:0.3rem;" onclick="nextAcademyScenario()" ${validIndex === scenarios.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                ${t('btnNext', 'Tiếp')} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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
            <span class="badge-threat badge-safe" style="font-size:0.8rem;">${t('academyStep', 'Bước')} ${stepNum}/${totalSteps}</span>
          </div>

          <!-- Progress Bar -->
          <div style="width:100%; height:6px; background:var(--bg-input); border-radius:999px; margin-bottom:1.5rem; overflow:hidden;">
            <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--primary-coral), #6366F1); border-radius:999px; transition:width 0.3s ease;"></div>
          </div>

          <!-- Scammer Message Bubble -->
          <div style="background:var(--bg-input); padding:1.25rem; border-radius:14px; margin-bottom:1.5rem; font-size:0.9rem; line-height:1.6;">
            <strong style="color:var(--primary-coral); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${t('scammerBubbleTitle', 'Kịch bản đối tượng tương tác:')}
            </strong>
            <p style="color:var(--text-main); font-weight:500;">${currentStep?.message || currentStep?.situation}</p>
          </div>

          <!-- User Response Options or Outcome Actions -->
          ${hasChoices ? `
            <h4 style="margin-bottom:1rem; color:var(--text-main); font-size:1rem; display:flex; align-items:center; gap:0.4rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${t('quizPrompt', 'Bạn sẽ xử lý tình huống này thế nào?')}</h4>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>${t('retryScenario', 'Thực Hành Lại Kịch Bản')}
              </button>
              ${validIndex < scenarios.length - 1 ? `
                <button type="button" class="btn btn-primary" onclick="nextAcademyScenario()" style="padding:0.75rem 1.25rem; font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;">
                  ${t('nextScenario', 'Tiếp Tục Kịch Bản Tiếp Theo')} <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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
        showToast(t('correctChoicePrefix', 'Chính xác! ') + opt.feedback, 'success');
      } else {
        showToast(t('highRiskPrefix', 'Rủi ro cao! ') + opt.feedback, 'error');
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
  async function loadSpotGameView(forceReload = false) {
    if (forceReload || !state.spotGame.questions || state.spotGame.questions.length === 0) {
      const res = await ApiClient.getGameQuestions(state.language);
      if (res && res.data) state.spotGame.questions = res.data;
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
          <span class="badge-threat badge-high">${t('questionLabel', 'Câu hỏi')} ${state.spotGame.currentIndex + 1}/${state.spotGame.questions.length}</span>
          <span style="font-weight:900; font-size:1.1rem; color:var(--accent-cyan);">${t('scoreLabelText', 'Điểm')}: ${state.spotGame.score}</span>
        </div>

        <h3 style="margin-bottom:1rem; font-size:1.2rem;">${q.title}</h3>
        <div style="background:var(--bg-input); border:1px solid var(--border-color); padding:1.5rem; border-radius:16px; font-family:var(--font-mono); font-size:0.875rem; line-height:1.6; margin-bottom:2rem; white-space:pre-wrap;">${q.content}</div>

        <div class="spotgame-actions-grid">
          <button type="button" class="btn btn-danger" style="padding:1rem; font-size:1rem; display:inline-flex; align-items:center; justify-content:center; font-weight:700;" onclick="answerSpotGame('SCAM')">
            ${t('btnScamText', 'Lừa đảo')}
          </button>
          <button type="button" class="btn btn-success" style="padding:1rem; font-size:1rem; display:inline-flex; align-items:center; justify-content:center; font-weight:700;" onclick="answerSpotGame('LEGITIMATE')">
            ${t('btnSafeText', 'An toàn')}
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
  async function loadCasesView(forceReload = false) {
    const res = await ApiClient.getCases(state.language);
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
    const res = rep.result;
    const riskScore = typeof res.risk_score === 'number' ? res.risk_score : (typeof res.riskScore === 'number' ? res.riskScore : 50);
    const verdictVal = (res.verdict || res.verdict_level || res.status || 'SUSPICIOUS').toString().toUpperCase();
    const threatLabel = res.threat_level_label || res.threat_label || res.threatLevel || verdictVal;
    const summaryText = res.summary || res.summary_text || res.description || 'Đã hoàn thành phân tích đe dọa.';
    const whyItems = res.why_is_this_suspicious || res.suspicious_points || res.reasons || [];
    const recommendedActions = res.recommended_actions || res.actions || res.safety_steps || [];
    const providerUsed = res.providerUsed || res.provider || res.modelUsed || 'Heuristic Security Scanner';

    let badgeClass = 'badge-safe';
    const v = verdictVal.toLowerCase();
    if (v.includes('critical') || v.includes('malicious')) badgeClass = 'badge-critical';
    else if (v.includes('high') || v.includes('suspicious')) badgeClass = 'badge-high';
    else if (v.includes('medium')) badgeClass = 'badge-medium';

    let scoreColor = '#10B981';
    if (riskScore >= 75) scoreColor = '#EF4444';
    else if (riskScore >= 40) scoreColor = '#F59E0B';

    const modalBody = document.getElementById('history-modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="badge-threat ${badgeClass}">${threatLabel}</span>
            <span class="badge-threat badge-safe" style="background:rgba(99,102,241,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); font-size:0.75rem;">${t('sourcePrefix', 'Nguồn:')} ${providerUsed}</span>
          </div>
          <span style="font-size:0.8rem; color:var(--text-muted);">
            Phân tích ngày: ${new Date(rep.createdAt).toLocaleString()}
          </span>
        </div>

        ${rep.inputText ? `
          <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:0.75rem 1rem; margin-bottom:1.25rem; word-break:break-all;">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:0.25rem;">${t('analyzedContentLabel', 'NỘI DUNG / ĐƯỜNG DẪN ĐÃ KIỂM TRA:')}</span>
            <strong style="font-size:0.9rem; color:var(--text-main);">${rep.inputText}</strong>
          </div>
        ` : ''}

        <!-- Risk Score & Summary Box -->
        <div style="display:flex; align-items:center; gap:1.5rem; background:var(--bg-input); padding:1.25rem; border-radius:12px; margin-bottom:1.25rem; flex-wrap:wrap;">
          <div style="text-align:center; min-width:100px; flex-shrink:0;">
            <div style="font-size:2.2rem; font-weight:900; color:${scoreColor}; line-height:1;">${riskScore}</div>
            <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-top:0.35rem;">${t('riskScoreLabel', 'Điểm Số Rủi Ro')}</div>
          </div>
          <div style="flex:1; min-width:200px;">
            <h4 style="font-size:0.9rem; color:var(--accent-coral); margin-bottom:0.35rem; font-weight:700;">${t('overviewSummaryTitle', 'Tóm Tắt Tổng Quan:')}</h4>
            <p style="font-size:0.85rem; color:var(--text-main); margin:0; line-height:1.5;">${summaryText}</p>
          </div>
        </div>

        <!-- Suspicious Points -->
        ${whyItems.length > 0 ? `
          <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.9rem; color:var(--accent-coral); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${t('whySuspiciousTitle', 'Dấu Hiệu Nghi Vấn Đáng Chú Ý:')}
            </h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${whyItems.map(item => {
                let titleStr = t('suspiciousSign', 'Dấu hiệu nghi vấn');
                let expStr = '';
                if (typeof item === 'object' && item !== null) {
                  titleStr = item.title || item.point || t('suspiciousSign', 'Dấu hiệu nghi vấn');
                  expStr = item.explanation || item.detail || item.description || item.action || item.text || '';
                } else if (typeof item === 'string') {
                  expStr = item;
                }
                if (!expStr) expStr = String(item);
                return `
                  <div style="padding:0.75rem 1rem; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <strong style="color:var(--accent-rose); font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${titleStr}</strong>
                    <p style="font-size:0.825rem; color:var(--text-muted); margin-top:0.25rem;">${expStr}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Recommended Actions -->
        ${recommendedActions.length > 0 ? `
          <div>
            <h4 style="font-size:0.9rem; color:var(--accent-emerald); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              ${t('recommendedActionsTitle', 'Hướng Dẫn Khắc Phục Khẩn Cấp:')}
            </h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${recommendedActions.map((act, idx) => {
                let actStr = typeof act === 'object' ? (act.text || act.action || act.title || '') : String(act);
                return `
                  <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.6rem 0.8rem; background:rgba(16,185,129,0.05); border-radius:8px; border:1px solid rgba(16,185,129,0.15);">
                    <span style="background:var(--accent-emerald); color:#fff; font-weight:800; font-size:0.75rem; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:0.1rem;">${idx + 1}</span>
                    <span style="font-size:0.825rem; color:var(--text-main); font-weight:500;">${actStr}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      `;
    }
    openModal('modal-history-detail');
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
              <strong style="font-size:0.95rem; color:var(--text-main);">${t('dateAnalyzed', 'Phân tích ngày')}: ${new Date(rep.createdAt).toLocaleString()}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span class="badge-threat ${badgeClass}">${verdictLabel} (${riskScore}/100)</span>
              
              <button type="button" class="btn btn-secondary" onclick="viewHistoryDetail('${rep.id}')" title="Xem kết quả phân tích" style="padding:0.35rem 0.75rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.3rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${t('viewResultBtn', 'Xem kết quả')}
              </button>
              
              <button type="button" class="btn btn-secondary" onclick="deleteHistoryItem('${rep.id}')" title="Xóa bản ghi này" style="padding:0.35rem 0.6rem; font-size:0.8rem; color:var(--accent-coral); border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:0.25rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>${t('deleteBtn', 'Xóa')}
              </button>
            </div>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin:0; background:rgba(255,255,255,0.03); padding:0.6rem 0.8rem; border-radius:6px;">
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

  const GOOGLE_CLIENT_ID = '474443255302-obr0748arjjqs9paq4c1e078rnt4jt8h.apps.googleusercontent.com';

  // Handle Google OAuth Credential (ID Token) callback
  window.handleGoogleCredentialResponse = async function(response) {
    if (!response || !response.credential) {
      showToast('Đăng nhập thất bại: Không nhận được thông tin xác thực từ Google.', 'error');
      return;
    }

    showToast('Đang gửi Token xác thực trực tiếp với máy chủ Google...', 'info');

    try {
      const res = await ApiClient.loginWithGoogle({ token: response.credential });

      if (res && res.success && res.user) {
        const googleUser = {
          isLoggedIn: true,
          name: res.user.name,
          email: res.user.email,
          avatar: res.user.avatar || 'google_avatar.png',
          id: res.user.id,
          googleSub: res.user.googleSub,
          loginTime: Date.now(),
          provider: 'Google OAuth 2.0 (Verified)',
          token: res.token
        };

        state.user = googleUser;
        localStorage.setItem('cybershield_user', JSON.stringify(googleUser));
        showToast(`Đăng nhập Google thành công! Chào mừng ${googleUser.name}.`, 'success');
        renderAuthView();
      } else {
        showToast(res?.detail || 'Xác thực tài khoản Google thất bại.', 'error');
      }
    } catch (err) {
      console.error('Google Verification Error:', err);
      showToast('Lỗi khi xác thực Token với máy chủ.', 'error');
    }
  };

  // Google Auth & User Account Management
  window.renderAuthView = function() {
    const container = document.getElementById('auth-container');
    const statusPill = document.getElementById('auth-status-pill');
    if (!container) return;

    const user = state.user;

    if (statusPill) {
      if (user && user.isLoggedIn) {
        statusPill.innerHTML = `
          <span class="badge-threat badge-safe" style="font-size:0.8rem; padding:0.4rem 0.9rem; display:inline-flex; align-items:center; gap:0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            ${t('statusLoggedIn', 'Đã đăng nhập (Google OAuth 2.0)')}
          </span>
        `;
      } else {
        statusPill.innerHTML = `
          <span class="badge-threat badge-high" style="font-size:0.8rem; padding:0.4rem 0.9rem; display:inline-flex; align-items:center; gap:0.35rem;">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            ${t('statusNotLoggedIn', 'Chưa đăng nhập')}
          </span>
        `;
      }
    }

    if (user && user.isLoggedIn) {
      // LOGGED IN STATE: Show User Profile
      container.innerHTML = `
        <div class="user-profile-panel">
          <!-- Profile Main Banner -->
          <div class="user-profile-header-card">
            <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
              <div class="user-avatar-ring">
                <img src="${user.avatar || 'google_avatar.png'}" alt="${user.name}" class="user-avatar-img" onerror="this.src='google_avatar.png'">
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                  <h3 style="font-size:1.35rem; margin:0;">${user.name || t('profileUserLabel', 'Người dùng Google')}</h3>
                  <span class="badge-threat badge-safe" style="font-size:0.7rem;">Google Verified</span>
                </div>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  ${user.email || 'user@gmail.com'}
                </p>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                  <span class="badge-threat badge-low" style="font-size:0.75rem;">ID: ${user.id || 'GOOG-88910'}</span>
                  <span class="badge-threat badge-medium" style="font-size:0.75rem;">${t('profileProtected', 'Đã bảo vệ an toàn')}</span>
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-secondary" onclick="handleLogout()" style="padding:0.65rem 1.25rem; font-size:0.875rem; color:var(--accent-coral); border-color:rgba(239,68,68,0.3); display:inline-flex; align-items:center; gap:0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              ${t('profileLogout', 'Đăng Xuất')}
            </button>
          </div>

          <!-- Account Stats & Synchronized Info -->
          <div class="user-stats-grid">
            <div class="user-stat-card">
              <div style="width:44px; height:44px; border-radius:12px; background:rgba(66,133,244,0.12); color:#4285F4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <strong style="font-size:1.1rem; color:var(--text-main); display:block;">${t('statProtectionLevel', 'Cấp Độ Bảo Vệ')}</strong>
                <span style="font-size:0.825rem; color:var(--text-muted);">${t('statProtectionDesc', 'An toàn tuyệt đối 100%')}</span>
              </div>
            </div>

            <div class="user-stat-card">
              <div style="width:44px; height:44px; border-radius:12px; background:rgba(255,107,107,0.12); color:var(--primary-coral); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <strong style="font-size:1.1rem; color:var(--text-main); display:block;">${t('statSyncedHistory', 'Lịch Sử Đã Đồng Bộ')}</strong>
                <span style="font-size:0.825rem; color:var(--text-muted);">${state.savedReports ? state.savedReports.length : 0} ${t('statSyncedDesc', 'bản ghi quét')}</span>
              </div>
            </div>

            <div class="user-stat-card">
              <div style="width:44px; height:44px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10B981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <strong style="font-size:1.1rem; color:var(--text-main); display:block;">${t('statAcademy', 'Học Viện An Ninh')}</strong>
                <span style="font-size:0.825rem; color:var(--text-muted);">${t('statAcademyDesc', 'Đã hoàn thành 30 kịch bản')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // LOGGED OUT STATE: Show Official Google Identity Sign-In Button
      container.innerHTML = `
        <div class="google-auth-wrapper">
          <div class="google-auth-card">
            <div class="google-brand-header">
              <svg class="google-icon-large" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <h3 style="font-size:1.25rem; font-weight:800; margin-top:0.2rem;">${t('authCardTitle', 'Đăng Nhập Nhanh Bằng Google')}</h3>
              <p style="font-size:0.85rem; color:var(--text-muted); max-width:320px;">
                ${t('authCardSubtitle', 'Đăng ký hoặc đăng nhập tài khoản CyberÚ chỉ với 1 cú nhấp chuột thông qua tài khoản Google của bạn.')}
              </p>
            </div>

            <!-- Google Official Render Container -->
            <div id="google-btn-target" style="margin-top:1.25rem; display:flex; justify-content:center; min-height:44px;"></div>
          </div>
        </div>
      `;

      // Initialize & render Google Button if SDK ready
      setTimeout(() => {
        setupGoogleGIS();
      }, 100);
    }
  };

  // Helper to initialize Google Identity Services SDK
  function setupGoogleGIS() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: window.handleGoogleCredentialResponse,
          auto_select: false
        });

        const btnTarget = document.getElementById('google-btn-target');
        if (btnTarget) {
          btnTarget.innerHTML = '';
          window.google.accounts.id.renderButton(btnTarget, {
            theme: 'filled_blue',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 280
          });
        }
      } catch (err) {
        console.warn('GIS Init warning:', err);
      }
    }
  }

  // Google Sign-In Prompt Trigger
  window.handleGoogleSignIn = function() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredentialResponse
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn('Google One-Tap notification skipped/not displayed:', notification.getNotDisplayedReason());
        }
      });
    } else {
      showToast('Đang tải thư viện Google SDK... Vui lòng thử lại sau giây lát.', 'warning');
    }
  };

  window.handleEmailSignIn = function(e) {
    if (e) e.preventDefault();
    const emailVal = document.getElementById('auth-email-input')?.value || 'user@cybershield.vn';
    const nameStr = emailVal.split('@')[0];

    const emailUser = {
      isLoggedIn: true,
      name: nameStr.charAt(0).toUpperCase() + nameStr.slice(1),
      email: emailVal,
      avatar: 'google_avatar.png',
      id: 'USER-' + Math.floor(10000 + Math.random() * 90000),
      loginTime: Date.now(),
      provider: 'Email & Password'
    };

    state.user = emailUser;
    localStorage.setItem('cybershield_user', JSON.stringify(emailUser));
    showToast(`Đăng nhập thành công! Chào mừng ${emailUser.name}.`, 'success');
    renderAuthView();
  };

  window.handleLogout = function() {
    state.user = null;
    localStorage.removeItem('cybershield_user');
    showToast('Đã đăng xuất tài khoản an toàn.', 'info');
    renderAuthView();
  };

  // Boot Init
  await loadTranslations();
  renderAuthView();
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
