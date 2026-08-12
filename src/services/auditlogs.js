import { API_URL, requestWithAuth } from './core';

export async function fetchAuditLogs(query = {}) {
  const params = new URLSearchParams();
  if (query.userId) params.set('userId', query.userId);
  if (query.entityName) params.set('entityName', query.entityName);
  if (query.action) params.set('action', query.action);
  if (query.fromDate) params.set('fromDate', query.fromDate);
  if (query.toDate) params.set('toDate', query.toDate);
  params.set('page', query.page || 1);
  params.set('pageSize', query.pageSize || 50);

  const res = await requestWithAuth(`${API_URL}/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error('Không thể tải nhật ký thao tác');
  return res.json();
}
