import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

// ==== Quản lý theo lô (batch/lot) — nhập kho có hạn dùng riêng từng đợt ====

export async function createStockBatch(batchData) {
  const payload = {
    medicineId: parseInt(batchData.medicineId),
    warehouseId: parseInt(batchData.warehouseId),
    batchNumber: batchData.batchNumber || '',
    manufactureDate: batchData.manufactureDate,
    expiryDate: batchData.expiryDate,
    quantity: parseInt(batchData.quantity),
    unitCostPrice: batchData.unitCostPrice ? parseFloat(batchData.unitCostPrice) : null,
    supplierId: batchData.supplierId ? parseInt(batchData.supplierId) : null,
    note: batchData.note || null,
    registrationNumber: batchData.registrationNumber || null,
    storageCondition: batchData.storageCondition || null,
    qcStatus: batchData.qcStatus || 'Pass',
  };
  const res = await requestWithAuth(`${API_URL}/inventory/batches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể nhập lô hàng mới');
  }
  return res.json();
}


export async function fetchBatchesByMedicine(medicineId, warehouseId = null) {
  const qs = warehouseId ? `?warehouseId=${warehouseId}` : '';
  const res = await requestWithAuth(`${API_URL}/inventory/batches/medicine/${medicineId}${qs}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải danh sách lô hàng');
  return res.json();
}


export async function fetchBatchesByWarehouse(warehouseId) {
  const res = await requestWithAuth(`${API_URL}/inventory/batches/warehouse/${warehouseId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải danh sách lô hàng');
  return res.json();
}


export async function disposeBatch(batchId, quantity, reason) {
  const res = await requestWithAuth(`${API_URL}/inventory/batches/${batchId}/dispose`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity: quantity ? parseInt(quantity) : null, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể hủy lô hàng');
  }
  return res.json();
}


export async function adjustBatch(batchId, quantityRemaining, reason) {
  const res = await requestWithAuth(`${API_URL}/inventory/batches/${batchId}/adjust`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantityRemaining: parseInt(quantityRemaining), reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể điều chỉnh lô hàng');
  }
  return res.json();
}


export async function fetchExpiryAlerts(daysAhead = 30) {
  const res = await requestWithAuth(`${API_URL}/inventory/alerts/expiry?daysAhead=${daysAhead}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải cảnh báo hạn dùng');
  return res.json();
}

// ==== Flash Sale hàng gần hết hạn ====

export async function fetchFlashSaleCandidates(daysThreshold = 30) {
  const res = await apiFetch(`${API_URL}/inventory/flash-sale/candidates?daysThreshold=${daysThreshold}`);
  if (!res.ok) throw new Error('Không thể tải danh sách Flash Sale');
  return res.json();
}


export async function applyFlashSale(medicineId, discountPercent = null) {
  const res = await requestWithAuth(`${API_URL}/inventory/flash-sale/${medicineId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ discountPercent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể đưa sản phẩm vào Flash Sale');
  }
  return res.json();
}


export async function removeFlashSale(medicineId) {
  const res = await requestWithAuth(`${API_URL}/inventory/flash-sale/${medicineId}/remove`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể gỡ Flash Sale');
  }
  return res.json();
}


export async function fetchFlashSaleList(activeOnly = true) {
  const res = await requestWithAuth(`${API_URL}/inventory/flash-sale/list?activeOnly=${activeOnly}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải bảng quản lý Flash Sale');
  return res.json();
}


export async function fetchBatchProfitReport(warehouseId = null, medicineId = null) {
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouseId', warehouseId);
  if (medicineId) params.set('medicineId', medicineId);
  const res = await requestWithAuth(`${API_URL}/inventory/reports/profit?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải báo cáo lãi gộp');
  return res.json();
}


export async function fetchWarehouses() {
  const res = await requestWithAuth(`${API_URL}/Warehouse`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách nhà kho');
  return res.json();
}
