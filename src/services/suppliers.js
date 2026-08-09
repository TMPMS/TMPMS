import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

export async function fetchSuppliers() {
  const res = await apiFetch(`${API_URL}/suppliers`);
  if (!res.ok) throw new Error('Không thể tải danh sách nhà cung cấp');
  return res.json();
}


function mapSupplierPayload(supplierData) {
  return {
    companyName: supplierData.companyName,
    contactPerson: supplierData.contactPerson,
    email: supplierData.email,
    phone: supplierData.phone,
    address: supplierData.address,
    taxCode: supplierData.taxCode,
    status: supplierData.status || 'Active',
  };
}


export async function createSupplier(supplierData) {
  const res = await requestWithAuth(`${API_URL}/Supplier`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapSupplierPayload(supplierData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể thêm nhà cung cấp');
  }
  return res.json();
}


export async function updateSupplier(id, supplierData) {
  const res = await requestWithAuth(`${API_URL}/Supplier/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mapSupplierPayload(supplierData)),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể cập nhật nhà cung cấp');
  }
  return res.json();
}


export async function deleteSupplier(id) {
  const res = await requestWithAuth(`${API_URL}/Supplier/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể xóa nhà cung cấp');
  }
  return true;
}


