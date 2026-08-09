import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { User, Calendar, Plus, Edit2, Trash2, Eye, FileText, Activity, X } from 'lucide-react';
import {
  getPrescriptionStatusClass,
  getPrescriptionStatusLabel,
} from '../../utils/prescriptionStatus';
import { formatDateVN } from '../../utils/dateUtils';
import { formatDate } from './shared/adminFormat';

// Hồ sơ Bệnh nhân — tách từ AdminView.jsx (tab "patients").
// appointments/prescriptions được truyền xuống từ AdminView (shell) vì bản gốc
// đọc 2 mảng này (do tab Lịch hẹn / Kê đơn tải) trong modal xem chi tiết bệnh nhân
// mà KHÔNG tự tải lại — giữ nguyên hành vi đó (có thể trống nếu chưa từng ghé 2 tab kia).
const PatientsTab = ({ hasAccess, showSuccess, setError, appointments, prescriptions }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientModal, setPatientModal] = useState(null); // 'add' | 'edit' | null
  const [currentPatient, setCurrentPatient] = useState({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });
  const [viewingPatient, setViewingPatient] = useState(null); // Hồ sơ bệnh nhân đang xem chi tiết | null
  const [patientDiagnosisHistory, setPatientDiagnosisHistory] = useState([]);
  const [patientDetailLoading, setPatientDetailLoading] = useState(false);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchPatients();
      setPatients(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

  useEffect(() => {
    if (!viewingPatient) {
      setPatientDiagnosisHistory([]);
      return;
    }
    setPatientDetailLoading(true);
    api.fetchPatientDiagnoses(viewingPatient.id)
      .then(data => setPatientDiagnosisHistory(Array.isArray(data) ? data : []))
      .catch(() => setPatientDiagnosisHistory([]))
      .finally(() => setPatientDetailLoading(false));
  }, [viewingPatient]);

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền chỉnh sửa thông tin bệnh nhân.');
      return;
    }
    try {
      if (patientModal === 'add') {
        const added = await api.createPatient(currentPatient);
        setPatients(prev => [added, ...prev]);
        showSuccess('Thêm bệnh nhân thành công!');
      } else {
        const updated = await api.updatePatient(currentPatient.id, currentPatient);
        setPatients(prev => prev.map(p => p.id === currentPatient.id ? updated : p));
        showSuccess('Cập nhật bệnh nhân thành công!');
      }
      setPatientModal(null);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu bệnh nhân.');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xóa bệnh nhân.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa bệnh nhân này? Tất cả hồ sơ liên quan sẽ bị xóa.')) return;
    try {
      await api.deletePatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
      showSuccess('Xóa bệnh nhân thành công!');
    } catch (err) {
      setError('Lỗi khi xóa bệnh nhân.');
    }
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
                <h3 className="card-title">Hồ sơ khám bệnh của bệnh nhân</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentPatient({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });
                  setPatientModal('add');
                }}><Plus size={16} /> Đăng ký bệnh nhân</button>
              </div>

              {patientModal && (
                <form className="modal-form-box" onSubmit={handlePatientSubmit}>
                  <h4>{patientModal === 'add' ? 'Đăng ký hồ sơ bệnh nhân mới' : 'Chỉnh sửa hồ sơ bệnh nhân'}</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Họ và tên bệnh nhân *</label>
                      <input type="text" className="form-input" required value={currentPatient.name} onChange={e => setCurrentPatient({...currentPatient, name: e.target.value})} placeholder="Nguyễn Văn A" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giới tính</label>
                      <select className="form-select" value={currentPatient.gender} onChange={e => setCurrentPatient({...currentPatient, gender: e.target.value})}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày sinh</label>
                      <input type="date" className="form-input" value={currentPatient.dateOfBirth ? currentPatient.dateOfBirth.split('T')[0] : ''} onChange={e => setCurrentPatient({...currentPatient, dateOfBirth: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số điện thoại *</label>
                      <input type="tel" className="form-input" required value={currentPatient.phone} onChange={e => setCurrentPatient({...currentPatient, phone: e.target.value})} placeholder="0905123456" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Địa chỉ liên hệ</label>
                      <input type="text" className="form-input" value={currentPatient.address} onChange={e => setCurrentPatient({...currentPatient, address: e.target.value})} placeholder="Số nhà, tên đường, thành phố..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Tiền sử bệnh lý & Triệu chứng lâm sàng</label>
                      <textarea className="form-textarea" rows="3" value={currentPatient.medicalHistory} onChange={e => setCurrentPatient({...currentPatient, medicalHistory: e.target.value})} placeholder="Mô tả triệu chứng, các bệnh lý nền (tim mạch, dị ứng vị thuốc...)" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu thông tin</button>
                    <button type="button" className="btn-cancel" onClick={() => setPatientModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {patients.length === 0 ? (
                <div className="admin-empty">Chưa có bệnh nhân nào được lưu trữ.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Họ tên bệnh nhân</th>
                        <th>Giới tính</th>
                        <th>Ngày sinh</th>
                        <th>Số điện thoại</th>
                        <th>Địa chỉ</th>
                        <th>Tiền sử bệnh lý</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map(p => (
                        <tr key={p.id}>
                          <td className="col-id">#{p.id}</td>
                          <td>
                            <strong
                              style={{ cursor: 'pointer', color: '#0d9488', textDecoration: 'underline' }}
                              onClick={() => setViewingPatient(p)}
                              title="Xem hồ sơ chi tiết"
                            >
                              {p.name}
                            </strong>
                          </td>
                          <td>{p.gender}</td>
                          <td>{p.dateOfBirth ? formatDateVN(p.dateOfBirth) : 'Chưa cập nhật'}</td>
                          <td>{p.phone}</td>
                          <td>{p.address || 'Chưa có'}</td>
                          <td><div className="med-history-text">{p.medicalHistory || 'Không có'}</div></td>
                          <td>
                            <div className="table-actions-row">
                              <button className="action-icon-btn" onClick={() => setViewingPatient(p)} title="Xem chi tiết"><Eye size={14} /></button>
                              <button className="action-icon-btn edit" onClick={() => { setCurrentPatient(p); setPatientModal('edit'); }} title="Sửa"><Edit2 size={14} /></button>
                              <button className="action-icon-btn delete" onClick={() => handleDeletePatient(p.id)} title="Xóa"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewingPatient && (() => {
                const patientAppointments = appointments.filter(a => a.patientId === viewingPatient.id);
                const patientPrescriptions = prescriptions.filter(p => p.patientId === viewingPatient.id || p.userId === viewingPatient.id);
                return (
                  <div className="safety-warning-overlay" onClick={() => setViewingPatient(null)}>
                    <div className="safety-warning-box" style={{ maxWidth: 760, border: '2px solid #0d9488' }} onClick={e => e.stopPropagation()}>
                      <div className="safety-warning-header" style={{ color: '#0d9488', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <User size={22} /> <h4>Hồ sơ bệnh nhân: {viewingPatient.name}</h4>
                        </span>
                        <button type="button" onClick={() => setViewingPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                          <X size={20} />
                        </button>
                      </div>

                      {/* Thông tin cá nhân */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: 13.5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                        <div>• Giới tính: <strong>{viewingPatient.gender || 'Chưa rõ'}</strong></div>
                        <div>• Ngày sinh: <strong>{viewingPatient.dateOfBirth ? formatDateVN(viewingPatient.dateOfBirth) : 'Chưa có'}</strong></div>
                        <div>• Điện thoại: <strong>{viewingPatient.phone || 'Chưa có'}</strong></div>
                        <div>• Email: <strong>{viewingPatient.email || 'Chưa có'}</strong></div>
                        <div style={{ gridColumn: 'span 2' }}>• Địa chỉ: <strong>{viewingPatient.address || 'Chưa cập nhật'}</strong></div>
                        <div style={{ gridColumn: 'span 2' }}>• Tiền sử bệnh lý: <strong>{viewingPatient.medicalHistory || 'Không có'}</strong></div>
                      </div>

                      {/* Lịch sử đặt lịch khám */}
                      <h5 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={15} /> Lịch sử đặt lịch khám ({patientAppointments.length})
                      </h5>
                      {patientAppointments.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 18px 0' }}>Chưa có lịch hẹn nào.</p>
                      ) : (
                        <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {patientAppointments.map(a => (
                            <div key={a.id} className="preview-item-row" style={{ fontSize: 12.5 }}>
                              <span>📅 {formatDate(a.appointmentDate)} — {a.reason || 'Không rõ lý do'}</span>
                              <span className={`prescription-status ${getPrescriptionStatusClass(a.status)}`}>{a.status}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Đơn thuốc đã kê */}
                      <h5 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={15} /> Đơn thuốc đã kê ({patientPrescriptions.length})
                      </h5>
                      {patientPrescriptions.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 18px 0' }}>Chưa có đơn thuốc nào.</p>
                      ) : (
                        <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {patientPrescriptions.map(pr => (
                            <div key={pr.id} style={{ fontSize: 12.5, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <strong>#{pr.id} — {formatDate(pr.prescriptionDate)}</strong>
                                <span className={`prescription-status ${getPrescriptionStatusClass(pr.status)}`}>{getPrescriptionStatusLabel(pr.status, 'admin')}</span>
                              </div>
                              {pr.isSubmittedForOther && (
                                <div style={{ color: '#b45309', marginBottom: 4 }}>📨 Gửi bởi tài khoản: {pr.userName}</div>
                              )}
                              <div className="prescription-medicines-cell">
                                {pr.items && pr.items.map((item, idx) => (
                                  <span key={idx} className="prescription-med-tag">🌿 {item.medicineName} (x{item.quantity})</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Lịch sử chẩn đoán */}
                      <h5 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={15} /> Lịch sử chẩn đoán ({patientDiagnosisHistory.length})
                      </h5>
                      {patientDetailLoading ? (
                        <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Đang tải...</p>
                      ) : patientDiagnosisHistory.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Chưa có lần chẩn đoán nào.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {patientDiagnosisHistory.map(d => (
                            <div key={d.id} className="preview-item-row" style={{ fontSize: 12.5, flexDirection: 'column', alignItems: 'stretch' }}>
                              <span>🩺 {formatDate(d.diagnosisDate)} — <strong>{d.diagnosisResult || 'Chưa có kết luận'}</strong></span>
                              {d.note && <span style={{ color: '#64748b', marginTop: 2 }}>Ghi chú: {d.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
  );
};

export default PatientsTab;
