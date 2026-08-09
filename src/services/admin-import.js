import { API_URL, getAuthHeaders, requestWithAuth } from './core';

// ============================================================
// Excel Bulk Import APIs
// ============================================================
export function getImportTemplateUrl() {
  return `${API_URL}/admin/products/import/template`;
}


export function getExportUrl() {
  return `${API_URL}/admin/products/export`;
}


export async function previewImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await requestWithAuth(`${API_URL}/admin/products/import/preview`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể đọc file Excel');
    }
    return res.json();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Quá thời gian chờ xử lý (120 giây) — file quá lớn hoặc máy chủ quá chậm. Vui lòng thử lại hoặc chia nhỏ file.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


export async function confirmImport(importSessionId, confirmedRowIndexes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await requestWithAuth(`${API_URL}/admin/products/import/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ importSessionId, confirmedRowIndexes }),
      signal: controller.signal
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xác nhận nhập hàng loạt');
    }
    return res.json();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Quá thời gian chờ xác nhận nhập (120 giây) — vui lòng thử lại.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
