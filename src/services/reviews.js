import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

// Product Review & Rating APIs

export async function fetchProductReviews(productId) {
  const res = await apiFetch(`${API_URL}/reviews/medicine/${productId}`);
  if (!res.ok) throw new Error('Không thể tải đánh giá sản phẩm');
  return res.json();
}


export async function checkReviewEligibility(productId, userId) {
  const res = await requestWithAuth(`${API_URL}/reviews/check-eligibility?medicineId=${productId}&userId=${userId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể kiểm tra điều kiện đánh giá');
  const data = await res.json();
  return data.eligible;
}


export async function submitProductReview(rating, comment, productId, userId) {
  const res = await requestWithAuth(`${API_URL}/reviews`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: userId,
      medicineId: productId,
      rating: rating,
      comment: comment
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Không thể gửi đánh giá');
  }
  return res.json();
}


