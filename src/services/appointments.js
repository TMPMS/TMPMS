import { API_URL, getAuthHeaders, requestWithAuth } from './core';

// Appointment Management APIs

export async function fetchAppointments() {
  const res = await requestWithAuth(`${API_URL}/Appointment/all`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách lịch hẹn');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(a => ({
    id: a.id || a.Id,
    patientId: a.patientId || a.PatientId,
    patientName: a.patientName || a.PatientName || "Bệnh nhân",
    patientPhone: a.patientPhone || a.PatientPhone || "",
    doctorId: a.doctorId || a.DoctorId || 10,
    doctorName: a.doctorName || a.DoctorName || "Bác sĩ phụ trách",
    appointmentDate: a.appointmentDate || a.AppointmentDate,
    reason: a.reason || a.Reason || "",
    status: a.status || a.Status || "Scheduled",
    notes: a.notes || a.Notes || a.note || a.Note || "",
    created_at: a.createdAt || a.CreatedAt,
    confirmationDeadline: a.confirmationDeadline || a.ConfirmationDeadline,
    confirmedAt: a.confirmedAt || a.ConfirmedAt,
    rejectionReason: a.rejectionReason || a.RejectionReason,
    symptomDescription: a.symptomDescription || a.SymptomDescription || "",
    prescriptionImageUrl: a.prescriptionImageUrl || a.PrescriptionImageUrl,
    location: a.location || a.Location || "",
    depositAmount: a.depositAmount ?? a.DepositAmount ?? 0,
    paymentStatus: a.paymentStatus || a.PaymentStatus || "",
    paymentMethod: a.paymentMethod || a.PaymentMethod,
    refundAmount: a.refundAmount ?? a.RefundAmount ?? 0
  }));
}


export async function createAppointment(appointmentData) {
  const payload = {
    patientId: appointmentData.patientId || appointmentData.PatientId,
    staffId: appointmentData.doctorId || appointmentData.DoctorId || appointmentData.staffId,
    doctorId: appointmentData.doctorId || appointmentData.DoctorId || appointmentData.staffId,
    appointmentDate: appointmentData.appointmentDate || appointmentData.AppointmentDate,
    reason: appointmentData.reason || appointmentData.Reason || "",
    note: appointmentData.notes || appointmentData.Notes || appointmentData.note,
    notes: appointmentData.notes || appointmentData.Notes || appointmentData.note,
    status: appointmentData.status || appointmentData.Status || "Scheduled"
  };
  const res = await requestWithAuth(`${API_URL}/Appointment/book`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const err = new Error(errBody?.message || errBody?.Message || 'Không thể tạo lịch hẹn');
    if (errBody?.blockingAppointment) {
      err.blockingAppointment = errBody.blockingAppointment;
      err.isBlocked = true;
    }
    throw err;
  }
  return res.json();
}


export async function cancelAppointment(appointmentId) {
  const res = await requestWithAuth(`${API_URL}/Appointment/cancel/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.Message || errBody?.message || 'Không thể hủy lịch hẹn');
  }
  return res.json();
}


export async function approveAppointment(appointmentId) {
  const res = await requestWithAuth(`${API_URL}/Appointment/approve/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.Message || errBody?.message || 'Không thể xác nhận lịch hẹn');
  }
  return res.json();
}


export async function rejectAppointment(appointmentId, reason) {
  const res = await requestWithAuth(`${API_URL}/Appointment/reject/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.Message || errBody?.message || 'Không thể từ chối lịch hẹn');
  }
  return res.json();
}


export async function completeAppointment(appointmentId) {
  const res = await requestWithAuth(`${API_URL}/Appointment/complete/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.Message || errBody?.message || 'Không thể hoàn thành lịch hẹn');
  }
  return res.json();
}


export async function updateAppointment(appointmentId, appointmentData) {
  const payload = {
    appointmentDate: appointmentData.appointmentDate || appointmentData.AppointmentDate,
    reason: appointmentData.reason || appointmentData.Reason || "",
    note: appointmentData.notes || appointmentData.Notes || appointmentData.note
  };
  const res = await requestWithAuth(`${API_URL}/Appointment/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể cập nhật lịch hẹn');
  return res.json();
}


export async function deleteAppointment(appointmentId) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${appointmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xóa lịch hẹn');
  return res.json();
}


export async function fetchAppointmentAvailability(date, location) {
  const params = new URLSearchParams({ date, location });
  const res = await requestWithAuth(`${API_URL}/Appointment/availability?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Không thể tải khung giờ');
  return res.json();
}


export async function holdAppointmentSlot(appointmentDate, location) {
  const res = await requestWithAuth(`${API_URL}/Appointment/hold`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ appointmentDate, location })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể giữ khung giờ');
  return data;
}


export async function uploadAppointmentPrescription(file) {
  const body = new FormData(); body.append('file', file);
  const res = await requestWithAuth(`${API_URL}/Appointment/upload-prescription`, { method: 'POST', body });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể tải ảnh đơn thuốc');
  return data;
}


export async function checkoutAppointment(payload) {
  const res = await requestWithAuth(`${API_URL}/Appointment/checkout`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể hoàn tất đặt lịch');
  return data;
}


export async function verifyAppointmentPayOS(orderCode) {
  const res = await requestWithAuth(`${API_URL}/payos/appointment/verify/${orderCode}`, { method: 'POST', headers: getAuthHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Không thể xác minh tiền cọc');
  return data;
}


export async function demoPayOSAppointment(orderCode) {
  const res = await requestWithAuth(`${API_URL}/payos/appointment/demo-pay/${orderCode}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Không thể giả lập thanh toán cọc lịch hẹn');
  return data;
}


export async function getAppointmentCancellationQuote(id) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${id}/cancellation-quote`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể tính tiền hoàn');
  return data;
}


export async function cancelAppointmentWithRefund(id) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${id}/cancel-with-refund`, { method: 'POST', headers: getAuthHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể hủy lịch');
  return data;
}


export async function rescheduleAppointment(id, appointmentDate, reason) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${id}/reschedule`, {
    method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ appointmentDate, reason })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Không thể đổi lịch');
  return data;
}


export async function checkInAppointment(id) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${id}/check-in`, { method: 'PUT', headers: getAuthHeaders() });
  const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.message || 'Không thể check-in'); return data;
}


export async function markAppointmentNoShow(id) {
  const res = await requestWithAuth(`${API_URL}/Appointment/${id}/no-show`, { method: 'PUT', headers: getAuthHeaders() });
  const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.message || 'Không thể đánh dấu không đến'); return data;
}

// Customer-facing Patient APIs

export async function fetchUserAppointments() {
  const res = await requestWithAuth(`${API_URL}/Appointment/my-appointments`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch hẹn cá nhân');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(a => ({
    id: a.id || a.Id,
    patientName: a.patientName || a.PatientName || "Bệnh nhân",
    doctorName: a.staffName || a.StaffName || a.doctorName || "Bác sĩ phụ trách",
    appointmentDate: a.appointmentDate || a.AppointmentDate,
    reason: a.reason || a.Reason || "",
    status: a.status || a.Status || "Scheduled",
    notes: a.note || a.Note || "",
    confirmationDeadline: a.confirmationDeadline || a.ConfirmationDeadline,
    confirmedAt: a.confirmedAt || a.ConfirmedAt,
    rejectionReason: a.rejectionReason || a.RejectionReason,
    symptomDescription: a.symptomDescription || a.SymptomDescription || "",
    prescriptionImageUrl: a.prescriptionImageUrl || a.PrescriptionImageUrl,
    location: a.location || a.Location || "",
    depositAmount: a.depositAmount ?? a.DepositAmount ?? 0,
    paymentStatus: a.paymentStatus || a.PaymentStatus || "",
    paymentMethod: a.paymentMethod || a.PaymentMethod,
    refundAmount: a.refundAmount ?? a.RefundAmount ?? 0
  }));
}


