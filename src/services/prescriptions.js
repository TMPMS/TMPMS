import { API_URL, getAuthHeaders, requestWithAuth } from './core';

// Diagnosis & Prescription APIs

export async function fetchPrescriptions() {
  const res = await requestWithAuth(`${API_URL}/prescription`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách đơn thuốc');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id || p.Id,
    userId: p.userId || p.UserId,
    userName: p.userName || p.UserName || "",
    patientId: p.patientId || p.PatientId || p.userId || p.UserId,
    patientName: p.patientName || p.PatientName || "",
    isSubmittedForOther: p.isSubmittedForOther ?? p.IsSubmittedForOther ?? false,
    doctorName: p.doctorName || p.DoctorName || "Thầy thuốc Đông Y",
    hospital: p.hospital || p.Hospital || "Phòng khám Đông Y",
    prescriptionDate: p.prescriptionDate || p.PrescriptionDate,
    diagnosisNote: p.diagnosisNote || p.DiagnosisNote || "",
    imageUrl: p.imageUrl || p.ImageUrl || "",
    status: p.status || p.Status || "Pending",
    appointmentId: p.appointmentId !== undefined ? p.appointmentId : (p.AppointmentId !== undefined ? p.AppointmentId : null),
    items: p.items || p.Items || []
  }));
}


export async function checkHerbalSafety(medicineIds) {
  const res = await requestWithAuth(`${API_URL}/herbalinteraction/check-safety`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ medicineIds }),
  });
  if (!res.ok) throw new Error('Không thể kiểm tra tương tác vị thuốc');
  return res.json();
}


export async function createPrescription(prescriptionData) {
  const res = await requestWithAuth(`${API_URL}/prescription`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(prescriptionData),
  });
  if (!res.ok) throw new Error('Không thể tạo đơn thuốc');
  return res.json();
}


export async function updatePrescriptionStatus(prescriptionId, status) {
  const res = await requestWithAuth(`${API_URL}/prescription/${prescriptionId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn thuốc');
  return res.json();
}

// Khách hàng tải ảnh toa thuốc thật lên (tính năng "Gửi Toa Thuốc" — miễn phí, không cần đặt lịch khám)

export async function uploadPrescriptionImage(file) {
  const body = new FormData(); body.append('file', file);
  const res = await requestWithAuth(`${API_URL}/prescription/upload-image`, { method: 'POST', body });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể tải ảnh toa thuốc');
  return data;
}

// Dược sĩ dùng AI đọc ảnh toa thuốc khách gửi để gợi ý sẵn thông tin & danh sách thuốc trước khi kê đơn

export async function scanPrescriptionImage(prescriptionId) {
  const res = await requestWithAuth(`${API_URL}/prescription/${prescriptionId}/scan-image`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể quét ảnh toa thuốc bằng AI');
  return data;
}

// Dược sĩ hoàn thiện (kê đơn) một đơn thuốc "Pending" khách gửi kèm ảnh: gắn thuốc + trừ kho + duyệt

export async function finalizePrescription(prescriptionId, payload) {
  const res = await requestWithAuth(`${API_URL}/prescription/${prescriptionId}/finalize`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể hoàn thiện đơn thuốc');
  return data;
}

export async function fetchUserPrescriptions(userId) {
  const endpoint = userId ? `${API_URL}/prescription/user/${userId}` : `${API_URL}/prescription`;
  const res = await requestWithAuth(endpoint, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id || p.Id,
    userId: p.userId || p.UserId,
    userName: p.userName || p.UserName || "",
    doctorName: p.doctorName || p.DoctorName || "Thầy thuốc Đông Y",
    hospital: p.hospital || p.Hospital || "Phòng khám Đông Y",
    prescriptionDate: p.prescriptionDate || p.PrescriptionDate,
    status: p.status || p.Status || "Pending",
    appointmentId: p.appointmentId !== undefined ? p.appointmentId : (p.AppointmentId !== undefined ? p.AppointmentId : null),
    items: p.items || p.Items || []
  }));
}
