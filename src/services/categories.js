import { API_URL, getAuthHeaders, requestWithAuth } from './core';

function mapCategoryPayload(categoryData) {
  return {
    name: categoryData.name,
    description: categoryData.description || '',
  };
}

export async function createCategory(categoryData) {
  const res = await requestWithAuth(`${API_URL}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapCategoryPayload(categoryData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể thêm danh mục');
  }
  return res.json();
}

export async function updateCategory(id, categoryData) {
  const res = await requestWithAuth(`${API_URL}/categories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapCategoryPayload(categoryData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể cập nhật danh mục');
  }
  return res.json();
}

export async function deleteCategory(id) {
  const res = await requestWithAuth(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể xóa danh mục');
  }
  return true;
}
