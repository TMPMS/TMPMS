import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

export async function fetchNewsArticles(tag) {
  try {
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    const res = await apiFetch(`${API_URL}/news${qs}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  return [];
}


function mapNewsPayload(articleData) {
  return {
    title: articleData.title,
    excerpt: articleData.excerpt,
    content: articleData.content,
    tag: articleData.tag,
    imageUrl: articleData.imageUrl || '',
    isActive: articleData.isActive !== undefined ? articleData.isActive : true,
  };
}


export async function createNewsArticle(articleData) {
  const res = await requestWithAuth(`${API_URL}/News`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapNewsPayload(articleData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể thêm bài viết');
  }
  return res.json();
}


export async function updateNewsArticle(id, articleData) {
  const res = await requestWithAuth(`${API_URL}/News/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapNewsPayload(articleData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể cập nhật bài viết');
  }
  return res.json();
}


export async function deleteNewsArticle(id) {
  const res = await requestWithAuth(`${API_URL}/News/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể xóa bài viết');
  }
  return true;
}

export async function fetchHealthReelsVideos() {
  const res = await apiFetch(`${API_URL}/HealthReels/videos`);
  if (!res.ok) throw new Error('Không thể tải bản tin video sức khỏe');
  return res.json();
}

