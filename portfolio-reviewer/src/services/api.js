const API_BASE = '/api';

/**
 * API client for authentication and file management
 */
export const api = {
  // --- Auth ---
  async login(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
    return data;
  },

  async logout() {
    const res = await fetch(`${API_BASE}/logout`, { method: 'POST' });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/me`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  },

  // --- Files ---
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || 'อัปโหลดไม่สำเร็จ'));
        } catch {
          reject(new Error('เกิดข้อผิดพลาด'));
        }
      };
      xhr.onerror = () => reject(new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์'));
      xhr.open('POST', `${API_BASE}/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },

  async getFiles() {
    const res = await fetch(`${API_BASE}/files`);
    if (!res.ok) throw new Error('ไม่สามารถโหลดรายการไฟล์');
    const data = await res.json();
    return data.files;
  },

  async deleteFile(id) {
    const res = await fetch(`${API_BASE}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('ลบไฟล์ไม่สำเร็จ');
    return res.json();
  },

  // --- AI ---
  async analyzeFile(id) {
    const res = await fetch(`${API_BASE}/ai/analyze/${id}`, { method: 'POST' });
    if (!res.ok) throw new Error('สั่งวิเคราะห์ไม่สำเร็จ');
    return res.json();
  },

  async analyzeAll() {
    const res = await fetch(`${API_BASE}/ai/analyze-all`, { method: 'POST' });
    if (!res.ok) throw new Error('สั่งวิเคราะห์ไม่สำเร็จ');
    return res.json();
  },

  async getAiStatus(id) {
    const res = await fetch(`${API_BASE}/ai/status/${id}`);
    return res.json();
  },

  async getAiStats() {
    const res = await fetch(`${API_BASE}/ai/stats`);
    return res.json();
  }
};