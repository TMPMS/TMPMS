import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

export async function askAiChatbot(messageText, history = []) {
  const res = await apiFetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: messageText, history }),
  });
  if (!res.ok) throw new Error('Không thể kết nối trợ lý AI');
  return res.json();
}

// Pharmacy Live Chat APIs

export async function fetchMyPharmacyChatSession() {
  const res = await requestWithAuth(`${API_URL}/PharmacyChat/my-session`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải phiên tư vấn Dược sĩ');
  return res.json();
}


export async function fetchPharmacyChatSessions(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await requestWithAuth(`${API_URL}/PharmacyChat/sessions${query}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách phiên tư vấn');
  return res.json();
}


export async function fetchPharmacyChatMessages(sessionId) {
  const res = await requestWithAuth(`${API_URL}/PharmacyChat/sessions/${sessionId}/messages`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử tin nhắn');
  return res.json();
}


export async function assignPharmacyChatSession(sessionId) {
  const res = await requestWithAuth(`${API_URL}/PharmacyChat/sessions/${sessionId}/assign`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tiếp nhận phiên tư vấn');
  return res.json();
}


