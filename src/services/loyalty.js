import { API_URL, getAuthHeaders, requestWithAuth } from './core';

export async function fetchMyLoyaltySummary() {
  const res = await requestWithAuth(`${API_URL}/loyalty/me`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải thông tin điểm tích lũy');
  return res.json();
}

export async function redeemLoyaltyPoints(points) {
  const res = await requestWithAuth(`${API_URL}/loyalty/redeem`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ points }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Không thể đổi điểm lấy voucher');
  return data;
}
