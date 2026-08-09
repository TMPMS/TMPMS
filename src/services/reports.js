import { API_URL, getAuthHeaders, requestWithAuth } from './core';

export async function fetchReportDashboard() {
  const res = await requestWithAuth(`${API_URL}/Report/dashboard`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải báo cáo doanh thu & thống kê');
  return res.json();
}


export async function fetchReportTopSelling(from, to, top = 10) {
  const res = await requestWithAuth(`${API_URL}/Report/top-selling?from=${from}&to=${to}&top=${top}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách bán chạy');
  return res.json();
}


export async function fetchReportRevenue(fromDate, toDate, groupBy = 'Day') {
  const res = await requestWithAuth(`${API_URL}/Report/revenue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fromDate, toDate, groupBy })
  });
  if (!res.ok) throw new Error('Không thể tải báo cáo doanh thu theo khoảng thời gian');
  return res.json();
}


export async function fetchReportOrderStatus() {
  const res = await requestWithAuth(`${API_URL}/Report/order-status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải phân bố trạng thái đơn hàng');
  return res.json();
}


export async function fetchReportCategoryRevenue(from, to) {
  const res = await requestWithAuth(`${API_URL}/Report/category-revenue?from=${from}&to=${to}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải doanh thu theo danh mục');
  return res.json();
}


export async function fetchReportStaffRevenue(from, to) {
  const res = await requestWithAuth(`${API_URL}/Report/staff-revenue?from=${from}&to=${to}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải doanh thu theo nhân viên');
  return res.json();
}


export async function exportReportRevenueExcel(from, to, groupBy = 'Day') {
  const res = await requestWithAuth(`${API_URL}/Report/revenue/export-excel?from=${from}&to=${to}&groupBy=${groupBy}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xuất báo cáo Excel');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bao_cao_doanh_thu_${from.slice(0, 10)}_${to.slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


