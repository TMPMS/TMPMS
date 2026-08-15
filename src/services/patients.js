import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

export async function createDiagnosis(diagnosisData) {
  const res = await requestWithAuth(`${API_URL}/Diagnosis`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(diagnosisData)
  });
  if (!res.ok) throw new Error('Không thể lưu hồ sơ chẩn đoán');
  return res.json();
}


export async function fetchPatientDiagnoses(patientId) {
  const res = await requestWithAuth(`${API_URL}/Diagnosis/patient/${patientId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử chẩn đoán');
  return res.json();
}


export async function fetchDiagnosisQuestions() {
  const res = await apiFetch(`${API_URL}/Diagnosis/questions`);
  if (!res.ok) throw new Error('Không thể tải bộ câu hỏi chẩn đoán');
  return res.json();
}


export async function classifyDiagnosis(answers) {
  const res = await requestWithAuth(`${API_URL}/Diagnosis/classify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers })
  });
  if (!res.ok) throw new Error('Không thể phân tích chẩn đoán');
  return res.json();
}


// Câu hỏi tự chẩn đoán thích ứng: BE chọn câu hỏi tiếp theo phân biệt tốt nhất giữa các thể bệnh
// đang dẫn đầu dựa trên answers đã trả lời, hoặc báo done=true khi đã đủ rõ ràng / hết câu hỏi.
export async function fetchNextDiagnosisQuestion(answers) {
  const res = await requestWithAuth(`${API_URL}/Diagnosis/next-question`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers })
  });
  if (!res.ok) throw new Error('Không thể tải câu hỏi tiếp theo');
  return res.json();
}


// Phân tích ảnh lưỡi bằng AI (Thiệt chẩn) — bổ trợ cho kết quả tự chẩn đoán theo bảng câu hỏi
export async function analyzeTongueImage(file) {
  const body = new FormData(); body.append('file', file);
  const res = await requestWithAuth(`${API_URL}/TongueAnalysis/analyze`, { method: 'POST', body });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể phân tích ảnh lưỡi');
  return data;
}


export async function getPatientAddresses(userId) {
  try {
    const res = await requestWithAuth(`${API_URL}/patient-address/user/${userId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Không thể lấy danh sách địa chỉ:', err);
    return [];
  }
}


export async function addAddress(userId, dto) {
  const res = await requestWithAuth(`${API_URL}/patient-address/user/${userId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể thêm địa chỉ');
  return data;
}


export async function updateAddress(addressId, dto) {
  const res = await requestWithAuth(`${API_URL}/patient-address/${addressId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể cập nhật địa chỉ');
  return data;
}


export async function deleteAddress(addressId) {
  const res = await requestWithAuth(`${API_URL}/patient-address/${addressId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể xóa địa chỉ');
  return data;
}


export async function setDefaultAddress(addressId) {
  const res = await requestWithAuth(`${API_URL}/patient-address/${addressId}/set-default`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể đặt địa chỉ mặc định');
  return data;
}

// Patient Management APIs

export async function fetchPatients() {
  const res = await requestWithAuth(`${API_URL}/patients`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách bệnh nhân');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id || p.Id,
    name: p.name || p.Name || p.username || p.Username || "Bệnh nhân",
    username: p.username || p.Username || "",
    email: p.email || p.Email || "",
    phone: p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || "",
    phoneNumber: p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || "",
    gender: p.gender || p.Gender || "Nam",
    date_of_birth: p.dateOfBirth || p.DateOfBirth || null,
    dateOfBirth: p.dateOfBirth || p.DateOfBirth || null,
    address: p.address || p.Address || "",
    is_active: p.isActive !== undefined ? p.isActive : p.IsActive,
    created_at: p.createdAt || p.CreatedAt
  }));
}


export async function createPatient(patientData) {
  const payload = {
    name: patientData.name || patientData.Name,
    username: patientData.username || patientData.Username,
    email: patientData.email || patientData.Email,
    phone: patientData.phone || patientData.phoneNumber || patientData.Phone,
    phoneNumber: patientData.phone || patientData.phoneNumber || patientData.Phone,
    gender: patientData.gender || patientData.Gender || 'Nam',
    dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth,
    address: patientData.address || patientData.Address
  };
  const res = await requestWithAuth(`${API_URL}/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Không thể thêm bệnh nhân');
  }
  return res.json();
}


export async function updatePatient(patientId, patientData) {
  const payload = {
    name: patientData.name || patientData.Name,
    username: patientData.username || patientData.Username,
    email: patientData.email || patientData.Email,
    phone: patientData.phone || patientData.phoneNumber || patientData.Phone,
    phoneNumber: patientData.phone || patientData.phoneNumber || patientData.Phone,
    gender: patientData.gender || patientData.Gender,
    dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth,
    address: patientData.address || patientData.Address,
    isActive: patientData.is_active !== undefined ? patientData.is_active : patientData.isActive
  };
  const res = await requestWithAuth(`${API_URL}/patients/${patientId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Không thể cập nhật thông tin bệnh nhân');
  }
  return res.json();
}


export async function deletePatient(patientId) {
  const res = await requestWithAuth(`${API_URL}/patients/${patientId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xóa bệnh nhân');
  return res.json();
}
