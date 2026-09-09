// CyberU Frontend API Client Layer

const getApiBaseUrl = () => {
  const customUrl = localStorage.getItem('cyberu_backend_url');
  if (customUrl) return customUrl.replace(/\/+$/, '') + (customUrl.endsWith('/api') ? '' : '/api');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  return 'https://cyberu-be.vercel.app/api';
};

let API_BASE_URL = getApiBaseUrl();

class ApiClient {
  static getBackendUrl() {
    return API_BASE_URL;
  }

  static setBackendUrl(url) {
    if (url) {
      let formatted = url.trim().replace(/\/+$/, '');
      if (!formatted.endsWith('/api')) formatted += '/api';
      localStorage.setItem('cyberu_backend_url', formatted);
      API_BASE_URL = formatted;
    } else {
      localStorage.removeItem('cyberu_backend_url');
      API_BASE_URL = getApiBaseUrl();
    }
  }
  static getApiMode() {
    return localStorage.getItem('cybershield_api_mode') || 'system_default';
  }

  static setApiMode(mode) {
    localStorage.setItem('cybershield_api_mode', mode);
  }

  static getStoredApiKey() {
    return localStorage.getItem('cybershield_api_key') || '';
  }

  static setStoredApiKey(key) {
    if (key) {
      localStorage.setItem('cybershield_api_key', key.trim());
    } else {
      localStorage.removeItem('cybershield_api_key');
    }
  }

  static getHeaders(customApiKey = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    const mode = this.getApiMode();
    if (mode === 'custom_key') {
      const apiKey = customApiKey || this.getStoredApiKey();
      if (apiKey) {
        headers['X-Gemini-API-Key'] = apiKey;
      }
    }
    return headers;
  }

  static async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch (err) {
      console.warn('Backend API connection warning:', err);
      return { status: 'offline', error: err.message };
    }
  }

  static async getI18n(lang = 'vi') {
    try {
      const res = await fetch(`${API_BASE_URL}/i18n?lang=${lang}`);
      return await res.json();
    } catch (err) {
      return { success: false, data: {} };
    }
  }

  static async validateApiKey(apiKey) {
    try {
      const res = await fetch(`${API_BASE_URL}/gemini/validate-key`, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify({ apiKey }),
      });
      return await res.json();
    } catch (err) {
      return { valid: false, error: err.message || 'Không thể kết nối đến máy chủ Backend Python' };
    }
  }

  static async analyzeScam(payload) {
    try {
      const fullPayload = {
        ...payload,
        apiMode: this.getApiMode()
      };
      const res = await fetch(`${API_BASE_URL}/gemini/analyze`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `HTTP ${res.status}: Lỗi máy chủ phân tích`);
      }

      return await res.json();
    } catch (err) {
      console.error('API analyzeScam error:', err);
      throw err;
    }
  }

  static async getEncyclopedia(query = '', category = 'all') {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (category) params.append('category', category);
      const res = await fetch(`${API_BASE_URL}/knowledge/encyclopedia?${params.toString()}`);
      return await res.json();
    } catch (err) {
      return { success: false, data: [] };
    }
  }

  static async getScenarios(query = '', category = 'all') {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (category) params.append('category', category);
      const res = await fetch(`${API_BASE_URL}/knowledge/scenarios?${params.toString()}`);
      return await res.json();
    } catch (err) {
      return { success: false, data: [] };
    }
  }

  static async getCases() {
    try {
      const res = await fetch(`${API_BASE_URL}/cases`);
      return await res.json();
    } catch (err) {
      return { success: false, data: [] };
    }
  }

  static async getGameQuestions() {
    try {
      const res = await fetch(`${API_BASE_URL}/game/questions`);
      return await res.json();
    } catch (err) {
      return { success: false, data: [] };
    }
  }
}

window.ApiClient = ApiClient;
