import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Plus, Edit2, Trash2, Check, X, CheckCircle2, CheckCheck } from 'lucide-react';
import { toLocalWallClockIso } from '../../utils/dateTime';
import { formatDate } from './shared/adminFormat';

// Lịch hẹn Khám — tách từ AdminView.jsx (tab "appointments").
// `appointments`/`setAppointments` được truyền từ AdminView (shell) vì tab Hồ sơ
// Bệnh nhân đọc mảng này trong modal xem chi tiết — giữ nguyên hành vi chia sẻ gốc.
const AppointmentsTab = ({ hasAccess, showSuccess, setError, appointments, setAppointments }) => {
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentModal, setAppointmentModal] = useState(null); // 'add' | 'edit' | null
  const [currentAppointment, setCurrentAppointment] = useState({ patientId: '', doctorId: '', appointmentDate: '', reason: '', status: 'PendingConfirmation', notes: '' });

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAppointments();
      setAppointments(data);
      const usersData = await api.fetchUsers();
      setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors
      const patientsData = await api.fetchPatients();
      setPatients(patientsData);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền điều chỉnh lịch hẹn.');
      return;
    }
    try {
      const payload = {
        patientId: parseInt(currentAppointment.patientId),
        doctorId: currentAppointment.doctorId ? parseInt(currentAppointment.doctorId) : null,
        appointmentDate: toLocalWallClockIso(currentAppointment.appointmentDate),
        reason: currentAppointment.reason,
        status: currentAppointment.status,
        notes: currentAppointment.notes
      };

      if (appointmentModal === 'add') {
        await api.createAppointment(payload);
        showSuccess('Tạo lịch hẹn thành công! Đang chờ xác nhận.');
      } else {
        await api.updateAppointment(currentAppointment.id, payload);
        showSuccess('Cập nhật lịch hẹn thành công!');
      }
      setAppointmentModal(null);
      loadTabData();
    } catch (err) {
      setError('Lỗi khi lưu lịch hẹn.');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xóa lịch hẹn.');
      return;
    }
    if (!window.confirm('Xóa lịch hẹn này?')) return;
    try {
      await api.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      showSuccess('Xóa lịch hẹn thành công!');
    } catch (err) {
      setError('Lỗi khi xóa lịch hẹn.');
    }
  };

  const handleApproveAppointment = async (id) => {
    if (!hasAccess([1, 3])) {
      setError('Bạn không có quyền xác nhận lịch hẹn.');
      return;
    }
    if (!window.confirm('Xác nhận duyệt lịch hẹn này?')) return;
    try {
      await api.approveAppointment(id);
      showSuccess('Đã xác nhận lịch hẹn!');
      await loadTabData();
    } catch (err) {
      setError(err.message || 'Lỗi khi xác nhận lịch hẹn.');
    }
  };

  const handleRejectAppointment = async (id) => {
    if (!hasAccess([1, 3])) {
      setError('Bạn không có quyền từ chối lịch hẹn.');
      return;
    }
    const reason = window.prompt('Nhập lý do từ chối lịch hẹn:', '');
    if (reason === null) return;
    try {
      await api.rejectAppointment(id, reason);
      showSuccess('Đã từ chối lịch hẹn!');
      await loadTabData();
    } catch (err) {
      setError(err.message || 'Lỗi khi từ chối lịch hẹn.');
    }
  };

  const handleCompleteAppointment = async (id) => {
    if (!hasAccess([1, 3])) {
      setError('Bạn không có quyền hoàn thành lịch hẹn.');
      return;
    }
    if (!window.confirm('Xác nhận bệnh nhân đã khám xong? Lịch hẹn sẽ được đánh dấu hoàn thành.')) return;
    try {
      await api.completeAppointment(id);
      showSuccess('Đã đánh dấu hoàn thành lịch hẹn!');
      await loadTabData();
    } catch (err) {
      setError(err.message || 'Lỗi khi hoàn thành lịch hẹn.');
    }
  };

  const handleCheckInAppointment = async (id) => {
    try { await api.checkInAppointment(id); showSuccess('Đã check-in bệnh nhân!'); await loadTabData(); }
    catch (err) { setError(err.message || 'Không thể check-in.'); }
  };

  const handleNoShowAppointment = async (id) => {
    if (!window.confirm('Xác nhận khách không đến? Tiền cọc sẽ không được hoàn.')) return;
    try { await api.markAppointmentNoShow(id); showSuccess('Đã đánh dấu khách không đến.'); await loadTabData(); }
    catch (err) { setError(err.message || 'Không thể đánh dấu không đến.'); }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
            <div className="admin-card">
              <div className="card-header-actions">
                <h3 className="card-title">Quản lý Lịch hẹn khám bệnh</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentAppointment({ patientId: patients[0]?.id || '', doctorId: users[0]?.id || '', appointmentDate: '', reason: '', status: 'PendingConfirmation', notes: '' });
                  setAppointmentModal('add');
                }}><Plus size={16} /> Đặt lịch hẹn mới</button>
              </div>

              {appointmentModal && (
                <form className="modal-form-box" onSubmit={handleAppointmentSubmit}>
                  <h4>{appointmentModal === 'add' ? 'Đặt lịch hẹn mới' : 'Cập nhật thông tin lịch hẹn'}</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Chọn Bệnh nhân *</label>
                      <select className="form-select" value={currentAppointment.patientId} onChange={e => setCurrentAppointment({...currentAppointment, patientId: e.target.value})}>
                        <option value="">-- Chọn bệnh nhân --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Thầy thuốc / Bác sĩ khám *</label>
                      <select className="form-select" value={currentAppointment.doctorId} onChange={e => setCurrentAppointment({...currentAppointment, doctorId: e.target.value})}>
                        <option value="">-- Chọn bác sĩ --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Thời gian khám *</label>
                      <input type="datetime-local" className="form-input" required value={currentAppointment.appointmentDate ? currentAppointment.appointmentDate.substring(0, 16) : ''} onChange={e => setCurrentAppointment({...currentAppointment, appointmentDate: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Lý do khám bệnh</label>
                      <input type="text" className="form-input" value={currentAppointment.reason} onChange={e => setCurrentAppointment({...currentAppointment, reason: e.target.value})} placeholder="Đau lưng, tái khám xương khớp..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Ghi chú lâm sàng</label>
                      <textarea className="form-textarea" rows="2" value={currentAppointment.notes} onChange={e => setCurrentAppointment({...currentAppointment, notes: e.target.value})} placeholder="Chỉ định đặc biệt, triệu chứng khẩn cấp..." />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu lịch hẹn</button>
                    <button type="button" className="btn-cancel" onClick={() => setAppointmentModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {appointments.length === 0 ? (
                <div className="admin-empty">Không có lịch hẹn nào được thiết lập.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID Lịch</th>
                        <th>Bệnh nhân</th>
                        <th>Điện thoại</th>
                        <th>Bác sĩ chỉ định</th>
                        <th>Thời gian hẹn</th>
                        <th>Lý do khám</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a.id}>
                          <td className="col-id">#{a.id}</td>
                          <td><strong>{a.patientName}</strong></td>
                          <td>{a.patientPhone}</td>
                          <td>Thầy thuốc {a.doctorName || 'Chưa phân công'}</td>
                          <td>{formatDate(a.appointmentDate)}</td>
                          <td>{a.symptomDescription || a.reason}{a.prescriptionImageUrl && <div><a href={api.formatImageUrl(a.prescriptionImageUrl)} target="_blank" rel="noreferrer">Xem ảnh đơn thuốc</a></div>}<small>{a.paymentStatus ? `Cọc: ${Number(a.depositAmount || 0).toLocaleString('vi-VN')}đ · ${a.paymentStatus}` : ''}</small></td>
                          <td>
                            <span className={`appointment-status ${a.status.toLowerCase()}`}>
                              {a.status === 'PendingConfirmation' || a.status === 'Pending' || a.status === 'Scheduled' ? 'Chờ xác nhận' : a.status === 'Confirmed' ? 'Đã xác nhận' : a.status === 'Completed' ? 'Hoàn thành' : a.status === 'Rejected' ? 'Đã từ chối' : a.status === 'Expired' ? 'Quá hạn' : 'Đã hủy'}
                            </span>
                          </td>
                          <td><div className="med-history-text">{a.notes || 'Không'}</div></td>
                          <td>
                            <div className="table-actions-row">
                              {a.status === 'PendingConfirmation' && (
                                <>
                                  <button className="action-icon-btn approve" onClick={() => handleApproveAppointment(a.id)} title="Xác nhận lịch hẹn"><CheckCircle2 size={14} /></button>
                                  <button className="action-icon-btn reject" onClick={() => handleRejectAppointment(a.id)} title="Từ chối lịch hẹn"><X size={14} /></button>
                                </>
                              )}
                              {a.status === 'Confirmed' && <>
                                <button className="action-icon-btn approve" onClick={() => handleCheckInAppointment(a.id)} title="Check-in bệnh nhân"><Check size={14} /></button>
                                <button className="action-icon-btn reject" onClick={() => handleNoShowAppointment(a.id)} title="Khách không đến"><X size={14} /></button>
                              </>}
                              {a.status === 'CheckedIn' && <button className="action-icon-btn complete" onClick={() => handleCompleteAppointment(a.id)} title="Đánh dấu đã khám xong"><CheckCheck size={14} /></button>}
                              <button className="action-icon-btn edit" onClick={() => { setCurrentAppointment(a); setAppointmentModal('edit'); }} title="Sửa lịch"><Edit2 size={14} /></button>
                              <button className="action-icon-btn delete" onClick={() => handleDeleteAppointment(a.id)} title="Xóa lịch"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
  );
};

export default AppointmentsTab;
