import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Plus, Check, X, AlertTriangle, User, Search } from 'lucide-react';
import {
  getPrescriptionStatusClass,
  getPrescriptionStatusLabel,
  PRESCRIPTION_ACTION,
} from '../../utils/prescriptionStatus';
import { formatDateVN } from '../../utils/dateUtils';
import { formatDate } from './shared/adminFormat';

// Chẩn đoán & Kê đơn — tách từ AdminView.jsx (tab "prescriptions").
// `appointments`/`setAppointments` và `prescriptions`/`setPrescriptions` được truyền
// từ AdminView (shell) vì tab Hồ sơ Bệnh nhân đọc 2 mảng này trong modal xem chi tiết —
// giữ nguyên hành vi chia sẻ gốc.
const PrescriptionsTab = ({ hasAccess, showSuccess, setError, loggedInUser, appointments, setAppointments, prescriptions, setPrescriptions }) => {
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [prescriptionModal, setPrescriptionModal] = useState(null); // 'add' | null
  const [currentPrescription, setCurrentPrescription] = useState({ patientId: '', doctorName: 'Bác sĩ Đông Y', hospital: 'Phòng khám Đông Y', items: [] });
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedMedicineQty, setSelectedMedicineQty] = useState(1);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [prescriptionCategoryTab, setPrescriptionCategoryTab] = useState('all'); // 'all' | 'dongy' | 'tanduoc'
  const [safetyWarning, setSafetyWarning] = useState(null); // { conflicts, pendingItems } | null
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [ocrResult, setOcrResult] = useState(null); // Gợi ý AI đọc từ ảnh toa thuốc khách gửi | null
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrReviewQty, setOcrReviewQty] = useState({}); // { [ocrItemIndex]: qty } - Dược sĩ chỉnh SL trước khi thêm
  const [newItemInstructions, setNewItemInstructions] = useState(''); // Ghi chú cách dùng cho vị thuốc sắp thêm

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchPrescriptions();
      setPrescriptions(data);
      const patientsData = await api.fetchPatients();
      setPatients(patientsData);
      const medData = await api.fetchMedicines(null, '', null, null, true);
      setMedicines(medData);
      const apptsData = await api.fetchAppointments();
      setAppointments(apptsData);
      const usersData = await api.fetchUsers();
      setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors for pharmacist authorization select
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

  // Prescription functions
  const buildNextPrescriptionItems = (med, qty, instructions = '') => {
    const existingInDraft = currentPrescription.items.find(i => i.medicineId === med.id);
    if (existingInDraft) {
      return currentPrescription.items.map(i => i.medicineId === med.id
        ? { ...i, quantity: i.quantity + qty, instructions: instructions || i.instructions || '' }
        : i);
    }
    return [...currentPrescription.items, { medicineId: med.id, medicineName: med.name, quantity: qty, instructions: instructions || '' }];
  };

  const commitPrescriptionItems = (items) => {
    setCurrentPrescription(prev => ({ ...prev, items }));
    setSelectedMedicineId('');
    setSelectedMedicineQty(1);
    setNewItemInstructions('');
    setError('');
    setSafetyWarning(null);
  };

  const updateItemInstructions = (medicineId, instructions) => {
    setCurrentPrescription(prev => ({
      ...prev,
      items: prev.items.map(i => i.medicineId === medicineId ? { ...i, instructions } : i)
    }));
  };

  // overrideMed/overrideQty/overrideInstructions cho phép gọi trực tiếp từ danh sách gợi ý AI quét toa
  // (Dược sĩ chỉnh số lượng trước khi bấm thêm), khác với nút "Thêm vị" thủ công dùng state đã chọn.
  const addMedicineToPrescription = async (overrideMed, overrideQty, overrideInstructions) => {
    const med = overrideMed || (selectedMedicineId ? medicines.find(m => m.id === parseInt(selectedMedicineId)) : null);
    if (!med) return;
    const qty = overrideQty ?? selectedMedicineQty;
    const instructions = overrideInstructions !== undefined ? overrideInstructions : newItemInstructions;

    const existingInDraft = currentPrescription.items.find(i => i.medicineId === med.id);
    const addedQty = existingInDraft ? existingInDraft.quantity : 0;
    const stockInDb = med.stock_quantity ?? med.stockQuantity ?? 0;
    const availableStock = stockInDb - addedQty;

    if (availableStock <= 0) {
      setError(`Vị thuốc/dược phẩm '${med.name}' hiện đã hết hàng khả dụng trong kho!`);
      return;
    }
    if (qty > availableStock) {
      setError(`Vị thuốc/dược phẩm '${med.name}' chỉ còn ${availableStock}${med.unit || 'g'} khả dụng trong kho, không đủ để kê ${qty}${med.unit || 'g'}!`);
      return;
    }

    const nextItems = buildNextPrescriptionItems(med, qty, instructions);

    if (nextItems.length < 2) {
      commitPrescriptionItems(nextItems);
      return;
    }

    setCheckingSafety(true);
    try {
      const result = await api.checkHerbalSafety(nextItems.map(i => i.medicineId));
      if (!result.isSafe) {
        setSafetyWarning({ conflicts: result.conflicts, pendingItems: nextItems });
        return;
      }
    } catch (err) {
      console.error('Lỗi kiểm tra an toàn tương tác vị thuốc:', err);
      // Không chặn kê đơn nếu API kiểm tra lỗi — chỉ bỏ qua cảnh báo AI cho lượt này.
    } finally {
      setCheckingSafety(false);
    }

    commitPrescriptionItems(nextItems);
  };

  const applySafetyReplacement = () => {
    if (!safetyWarning) return;
    let items = [...safetyWarning.pendingItems];
    for (const conflict of safetyWarning.conflicts) {
      const replaceId = conflict.replacementForAId ?? conflict.ReplacementForAId;
      const replaceName = conflict.replacementForAName ?? conflict.ReplacementForAName;
      const targetId = conflict.herbAId ?? conflict.HerbAId;
      const altReplaceId = conflict.replacementForBId ?? conflict.ReplacementForBId;
      const altReplaceName = conflict.replacementForBName ?? conflict.ReplacementForBName;
      const altTargetId = conflict.herbBId ?? conflict.HerbBId;

      if (replaceId && items.some(i => i.medicineId === targetId)) {
        items = items.map(i => i.medicineId === targetId ? { ...i, medicineId: replaceId, medicineName: replaceName } : i);
      } else if (altReplaceId && items.some(i => i.medicineId === altTargetId)) {
        items = items.map(i => i.medicineId === altTargetId ? { ...i, medicineId: altReplaceId, medicineName: altReplaceName } : i);
      }
    }
    commitPrescriptionItems(items);
    showSuccess('Đã tự động đổi sang vị thuốc thay thế an toàn hơn!');
  };

  const confirmAddDespiteWarning = () => {
    if (!safetyWarning) return;
    commitPrescriptionItems(safetyWarning.pendingItems);
  };

  const cancelSafetyWarning = () => setSafetyWarning(null);

  const removeMedicineFromPrescription = (id) => {
    setCurrentPrescription(prev => ({
      ...prev,
      items: prev.items.filter(i => i.medicineId !== id)
    }));
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền kê đơn thuốc.');
      return;
    }
    if (currentPrescription.items.length === 0) {
      setError('Vui lòng thêm ít nhất một vị thuốc/thảo dược vào đơn thuốc!');
      return;
    }

    try {
      const itemsPayload = currentPrescription.items.map(i => ({
        medicineId: parseInt(i.medicineId),
        quantity: parseInt(i.quantity),
        instructions: i.instructions || null
      }));

      if (currentPrescription.id) {
        if (!currentPrescription.patientId) {
          setError('Vui lòng chọn đúng hồ sơ bệnh nhân khám!');
          return;
        }
        // Hoàn thiện (kê đơn) một đơn thuốc "Pending" mà khách hàng đã gửi kèm ảnh toa thuốc —
        // gắn thuốc đã xác nhận vào đúng đơn đó thay vì tạo đơn mới, rồi duyệt trong 1 bước.
        // patientId cho phép Dược sĩ đối chiếu lại đúng bệnh nhân, phòng trường hợp tài khoản gửi
        // toa hộ người thân (tên trên toa AI đọc được khác với tên tài khoản).
        await api.finalizePrescription(currentPrescription.id, {
          items: itemsPayload,
          doctorName: currentPrescription.doctorName || null,
          hospital: currentPrescription.hospital || null,
          diagnosisNote: currentPrescription.diagnosisNote || null,
          patientId: parseInt(currentPrescription.patientId)
        });
        showSuccess('Kê đơn & duyệt toa thuốc khách gửi thành công!');
      } else {
        const patientIdInt = parseInt(currentPrescription.patientId) || patients[0]?.id || 1;
        if (!patientIdInt) {
          setError('Vui lòng chọn bệnh nhân!');
          return;
        }
        const payload = {
          userId: patientIdInt,
          patientId: patientIdInt,
          appointmentId: currentPrescription.appointmentId ? parseInt(currentPrescription.appointmentId) : null,
          doctorName: currentPrescription.doctorName || 'Bác sĩ Đông Y',
          hospital: currentPrescription.hospital || 'Phòng khám Đông Y TMPMS',
          diagnosisNote: currentPrescription.diagnosisNote || 'Thể bệnh Tâm Tỳ Lưỡng Hư',
          items: itemsPayload
        };

        await api.createPrescription(payload);
        showSuccess('Kê đơn thuốc Đông Y thành công!');
      }

      // Cập nhật ngay tồn kho trong state FE để giao diện phản hồi tức thì
      setMedicines(prev => prev.map(m => {
        const item = currentPrescription.items.find(i => i.medicineId === m.id);
        if (item) {
          const oldStock = m.stock_quantity ?? m.stockQuantity ?? 0;
          const newStock = Math.max(0, oldStock - item.quantity);
          return { ...m, stock_quantity: newStock, stockQuantity: newStock };
        }
        return m;
      }));

      setPrescriptionModal(null);
      setOcrResult(null);
      await loadTabData();
    } catch (err) {
      setError(err.message || 'Không thể kê đơn thuốc. Vui lòng kiểm tra lại.');
    }
  };

  const handlePrescriptionStatus = async (id, status) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền duyệt/từ chối đơn thuốc.');
      return;
    }
    try {
      await api.updatePrescriptionStatus(id, status);
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showSuccess('Cập nhật đơn thuốc thành công!');
    } catch (err) {
      setError('Lỗi cập nhật trạng thái đơn thuốc.');
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
                <h3 className="card-title">Danh sách Đơn thuốc & Kê đơn Lâm sàng</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentPrescription({ patientId: patients[0]?.id || '', doctorName: `Thầy thuốc ${loggedInUser?.username || ''}`, hospital: 'Phòng khám Đông Y', diagnosisNote: 'Thể bệnh Tâm Tỳ Lưỡng Hư', items: [] });
                  setOcrResult(null);
                  setPrescriptionModal('add');
                }}><Plus size={16} /> Kê đơn thuốc thảo dược</button>
              </div>
 
              {/* SECTION: Danh sách hàng chờ cần kê đơn */}
              <div className="prescription-queue-section" style={{ marginBottom: '28px', padding: '18px', backgroundColor: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Danh sách bệnh nhân chờ kê đơn (Lịch hẹn khám chưa có đơn thuốc)
                </h4>
                {appointments.filter(appt => (appt.status === 'PendingConfirmation' || appt.status === 'Scheduled' || appt.status === 'Confirmed') && !prescriptions.some(presc => presc.appointmentId === appt.id)).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Hàng chờ trống. Không có lịch hẹn khám nào cần kê đơn thuốc.</p>
                ) : (
                  <div className="table-wrapper" style={{ border: '1px solid #d1fae5' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Bệnh nhân</th>
                          <th>Điện thoại</th>
                          <th>Thời gian hẹn</th>
                          <th>Lý do khám / Triệu chứng</th>
                          <th>Bác sĩ chỉ định</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.filter(appt => (appt.status === 'PendingConfirmation' || appt.status === 'Scheduled' || appt.status === 'Confirmed') && !prescriptions.some(presc => presc.appointmentId === appt.id)).map(appt => (
                          <tr key={appt.id}>
                            <td><strong>{appt.patientName}</strong></td>
                            <td>{appt.patientPhone}</td>
                            <td>{formatDate(appt.appointmentDate)}</td>
                            <td>{appt.reason}</td>
                            <td>Thầy thuốc {appt.doctorName || 'Chưa phân công'}</td>
                            <td>
                              <button 
                                className="btn-add-action" 
                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                onClick={() => {
                                  // Pre-fill the prescription modal
                                  const nameForDoctor = loggedInUser?.role_id === 4 
                                    ? '' 
                                    : `Thầy thuốc ${loggedInUser?.username || ''}`;
                                  
                                  // Pre-fill herbs based on keywords
                                  let suggestedHerbs = [];
                                  const lowerReason = (appt.reason || '').toLowerCase();
                                  if (lowerReason.includes('mất ngủ') || lowerReason.includes('ngủ')) {
                                    suggestedHerbs = [{ medicineId: 101, medicineName: 'Hoạt Huyết Dưỡng Não Traphaco', quantity: 1 }];
                                  } else if (lowerReason.includes('đau lưng') || lowerReason.includes('gối')) {
                                    suggestedHerbs = [{ medicineId: 310, medicineName: 'Bát Vị Quế Phụ OPC', quantity: 1 }];
                                  } else if (lowerReason.includes('nóng') || lowerReason.includes('mụn') || lowerReason.includes('ngứa')) {
                                    suggestedHerbs = [{ medicineId: 102, medicineName: 'Trà túi lọc Cà Gai Leo thải độc gan', quantity: 1 }];
                                  } else if (lowerReason.includes('tiêu hóa') || lowerReason.includes('đầy bụng') || lowerReason.includes('dạ dày')) {
                                    suggestedHerbs = [{ medicineId: 414, medicineName: 'Berberin Traphaco Hỗ Trợ Tiêu Hóa', quantity: 1 }];
                                  }

                                  setCurrentPrescription({
                                    patientId: appt.patientId || appt.userId,
                                    appointmentId: appt.id,
                                    doctorName: nameForDoctor,
                                    hospital: 'Phòng khám Đông Y',
                                    diagnosisNote: appt.reason || 'Thể bệnh Tâm Tỳ Lưỡng Hư',
                                    items: suggestedHerbs
                                  });
                                  setOcrResult(null);
                                  setPrescriptionModal('add');
                                }}
                              >
                                <Plus size={12} /> Kê đơn
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION: Toa thuốc khách hàng tự gửi (tính năng "Gửi Toa Thuốc", miễn phí, không qua đặt lịch khám) */}
              {(() => {
                const pendingUploads = prescriptions.filter(p => !p.appointmentId && p.imageUrl && p.status === 'Pending' && (!p.items || p.items.length === 0));
                return (
                  <div className="prescription-queue-section" style={{ marginBottom: '28px', padding: '18px', backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📥 Toa thuốc khách hàng gửi chờ xem & kê đơn ({pendingUploads.length})
                    </h4>
                    {pendingUploads.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Hàng chờ trống. Không có toa thuốc nào khách hàng vừa gửi lên.</p>
                    ) : (
                      <div className="table-wrapper" style={{ border: '1px solid #bfdbfe' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Ảnh toa thuốc</th>
                              <th>Khách hàng</th>
                              <th>Bác sĩ/Nơi khám (khách khai)</th>
                              <th>Ngày gửi</th>
                              <th>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingUploads.map(p => {
                              const matchingPatient = patients.find(pt => pt.id === (p.patientId || p.userId));
                              const displayName = p.patientName || p.userName || matchingPatient?.name || `Bệnh nhân #${p.userId}`;
                              return (
                                <tr key={p.id}>
                                  <td>
                                    <img
                                      src={api.formatImageUrl(p.imageUrl)}
                                      alt="Toa thuốc"
                                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'zoom-in' }}
                                      onClick={() => window.open(api.formatImageUrl(p.imageUrl), '_blank')}
                                    />
                                  </td>
                                  <td><strong>{displayName}</strong></td>
                                  <td>{p.doctorName} — {p.hospital}</td>
                                  <td>{formatDate(p.prescriptionDate)}</td>
                                  <td>
                                    <button
                                      className="btn-add-action"
                                      style={{ padding: '6px 12px', fontSize: '11px' }}
                                      onClick={() => {
                                        setCurrentPrescription({
                                          id: p.id,
                                          patientId: p.userId,
                                          patientDisplayName: displayName,
                                          doctorName: '',
                                          hospital: p.hospital || '',
                                          diagnosisNote: p.diagnosisNote || '',
                                          items: [],
                                          imageUrl: p.imageUrl
                                        });
                                        setOcrResult(null);
                                        setPrescriptionModal('add');
                                      }}
                                    >
                                      📷 Xem toa & Kê đơn
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {prescriptionModal && (
                <form className="modal-form-box" onSubmit={handlePrescriptionSubmit}>
                  <h4>{currentPrescription.id ? '📷 Xem Toa Thuốc Khách Gửi & Hoàn Thiện Kê Đơn' : 'Kê đơn thuốc Đông Y mới'}</h4>

                  {currentPrescription.imageUrl && (
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Ảnh toa thuốc khách hàng gửi</label>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <img
                          src={api.formatImageUrl(currentPrescription.imageUrl)}
                          alt="Toa thuốc"
                          style={{ width: 180, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'zoom-in' }}
                          onClick={() => window.open(api.formatImageUrl(currentPrescription.imageUrl), '_blank')}
                        />
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <button
                            type="button"
                            className="btn-add-action"
                            disabled={ocrScanning}
                            onClick={async () => {
                              setOcrScanning(true);
                              setError('');
                              try {
                                const result = await api.scanPrescriptionImage(currentPrescription.id);
                                setOcrResult(result);
                                // Chỉ gợi ý — KHÔNG tự động thêm vào đơn. Dược sĩ phải xem lại & bấm
                                // "Thêm vào đơn" cho từng vị thuốc sau khi chỉnh đúng số lượng thực tế.
                                const initialQty = {};
                                (result.items || []).forEach((it, idx) => {
                                  if (it.matchedMedicineId) initialQty[idx] = it.suggestedQuantity || 1;
                                });
                                setOcrReviewQty(initialQty);
                                setCurrentPrescription(prev => ({
                                  ...prev,
                                  doctorName: prev.doctorName || result.doctorName || '',
                                  hospital: prev.hospital || result.hospital || '',
                                  diagnosisNote: prev.diagnosisNote || result.diagnosis || ''
                                }));
                              } catch (err) {
                                setError(err.message || 'Không thể quét ảnh bằng AI.');
                              } finally {
                                setOcrScanning(false);
                              }
                            }}
                            style={{ marginBottom: 10 }}
                          >
                            {ocrScanning ? 'Đang quét ảnh bằng AI...' : '🔍 Quét AI từ ảnh toa thuốc'}
                          </button>
                          {ocrResult && (
                            <div style={{ fontSize: 12.5, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                              {ocrResult.patientName && <p style={{ margin: '2px 0' }}>👤 AI đọc được tên trên toa: <strong>{ocrResult.patientName}</strong> (vui lòng đối chiếu thủ công với hồ sơ khách hàng)</p>}
                              {ocrResult.diagnosis && <p style={{ margin: '2px 0' }}>🩺 Chẩn đoán trên toa: {ocrResult.diagnosis}</p>}
                              {ocrResult.disclaimer && <p style={{ margin: '2px 0', color: '#b45309' }}>⚠️ {ocrResult.disclaimer}</p>}
                              {ocrResult.items?.some(it => it.matchedMedicineId) && (
                                <div style={{ marginTop: 8 }}>
                                  <strong style={{ color: '#0f766e' }}>AI nhận diện được — kiểm tra lại số lượng rồi bấm thêm:</strong>
                                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {ocrResult.items.map((it, idx) => {
                                      if (!it.matchedMedicineId) return null;
                                      const med = medicines.find(m => m.id === it.matchedMedicineId);
                                      const alreadyAdded = currentPrescription.items.some(i => i.medicineId === it.matchedMedicineId);
                                      const qty = ocrReviewQty[idx] ?? (it.suggestedQuantity || 1);
                                      return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px' }}>
                                          <span style={{ flex: 1 }}>🌿 {it.matchedMedicineName}</span>
                                          <input
                                            type="number"
                                            min="1"
                                            value={qty}
                                            disabled={alreadyAdded}
                                            onChange={e => setOcrReviewQty(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 1 }))}
                                            style={{ width: 60, padding: '4px', borderRadius: 6, border: '1px solid #cbd5e1', textAlign: 'center' }}
                                          />
                                          <button
                                            type="button"
                                            disabled={alreadyAdded || !med}
                                            onClick={() => addMedicineToPrescription(med, qty, '')}
                                            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', backgroundColor: alreadyAdded ? '#cbd5e1' : '#0d9488', color: '#fff', fontWeight: 600, cursor: alreadyAdded ? 'default' : 'pointer', fontSize: 12 }}
                                          >
                                            {alreadyAdded ? '✓ Đã thêm' : '+ Thêm vào đơn'}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {ocrResult.items?.some(it => !it.matchedMedicineId) && (
                                <div style={{ marginTop: 6 }}>
                                  <strong style={{ color: '#b91c1c' }}>Không tìm thấy trong hệ thống:</strong>
                                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ocrResult.items.map((it, idx) => {
                                      if (it.matchedMedicineId) return null;
                                      return (
                                        <div key={idx} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 8px' }}>
                                          <div>{it.rawText}</div>
                                          {it.similarSuggestions?.length > 0 ? (
                                            <div style={{ marginTop: 6 }}>
                                              <span style={{ fontSize: 11.5, color: '#64748b' }}>Không có sẵn — gợi ý thuốc có tên/công dụng gần giống:</span>
                                              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {it.similarSuggestions.map((sug) => {
                                                  const med = medicines.find(m => m.id === sug.medicineId);
                                                  const alreadyAdded = currentPrescription.items.some(i => i.medicineId === sug.medicineId);
                                                  return (
                                                    <button
                                                      key={sug.medicineId}
                                                      type="button"
                                                      disabled={alreadyAdded || !med}
                                                      onClick={() => addMedicineToPrescription(med, it.suggestedQuantity || 1, '')}
                                                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #0d9488', background: alreadyAdded ? '#cbd5e1' : '#f0fdfa', color: alreadyAdded ? '#475569' : '#0f766e', fontWeight: 600, cursor: alreadyAdded ? 'default' : 'pointer', fontSize: 11.5 }}
                                                    >
                                                      {alreadyAdded ? '✓ Đã thêm' : `+ ${sug.medicineName}`}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: 11.5, color: '#64748b' }}>Vui lòng tự thêm thủ công bên dưới.</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Hồ sơ bệnh nhân khám *</label>
                      <select className="form-select" required value={currentPrescription.patientId || ''} onChange={e => setCurrentPrescription({...currentPrescription, patientId: e.target.value})}>
                        <option value="">-- Chọn bệnh nhân chỉ định --</option>
                        {currentPrescription.id && currentPrescription.patientId && !patients.some(p => String(p.id) === String(currentPrescription.patientId)) && (
                          <option value={currentPrescription.patientId}>
                            {currentPrescription.patientDisplayName || `Bệnh nhân #${currentPrescription.patientId}`} (tài khoản gửi toa)
                          </option>
                        )}
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
                      {currentPrescription.id && (
                        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                          📨 Tài khoản đã gửi ảnh toa: <strong>{currentPrescription.patientDisplayName || `Bệnh nhân #${currentPrescription.patientId}`}</strong>. Nếu toa thuốc này là gửi hộ người khác (vd: người thân), vui lòng đổi đúng hồ sơ bệnh nhân ở trên trước khi kê đơn.
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        {loggedInUser?.role_id === 4 ? 'Bác sĩ ủy quyền kê đơn *' : 'Thầy thuốc chuẩn trị *'}
                      </label>
                      {loggedInUser?.role_id === 4 ? (
                        <select 
                          className="form-select" 
                          required 
                          value={currentPrescription.doctorName} 
                          onChange={e => setCurrentPrescription({...currentPrescription, doctorName: e.target.value})}
                        >
                          <option value="">-- Chọn bác sĩ ủy quyền --</option>
                          {users.map(doc => (
                            <option key={doc.id} value={`Bác sĩ ${doc.username}`}>Bác sĩ {doc.username}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" className="form-input" required value={currentPrescription.doctorName} onChange={e => setCurrentPrescription({...currentPrescription, doctorName: e.target.value})} />
                      )}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Nơi khám bệnh *</label>
                      <input type="text" className="form-input" required value={currentPrescription.hospital} onChange={e => setCurrentPrescription({...currentPrescription, hospital: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Chẩn đoán y khoa / Thể bệnh Đông Y *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Ví dụ: Thể bệnh Tâm Tỳ Lưỡng Hư, Suy Nhược Thần Kinh, Đau thần kinh tọa..." 
                        value={currentPrescription.diagnosisNote || ''} 
                        onChange={e => setCurrentPrescription({...currentPrescription, diagnosisNote: e.target.value})} 
                      />
                    </div>
                  </div>

                  {currentPrescription.patientId && (() => {
                    const selPatient = patients.find(p => p.id === parseInt(currentPrescription.patientId));
                    if (!selPatient) return null;
                    return (
                      <div className="patient-summary-bubble" style={{ padding: '14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginTop: '16px', fontSize: '13px', lineHeight: '1.5' }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800' }}>
                          <User size={14} /> Thông tin chi tiết bệnh nhân:
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          <div>• Giới tính: <strong>{selPatient.gender || 'Chưa rõ'}</strong></div>
                          <div>• Ngày sinh: <strong>{selPatient.dateOfBirth ? formatDateVN(selPatient.dateOfBirth) : 'Chưa có'}</strong></div>
                          <div>• Điện thoại: <strong>{selPatient.phone || 'Chưa có'}</strong></div>
                          <div style={{ gridColumn: 'span 2' }}>• Địa chỉ: <strong>{selPatient.address || 'Chưa cập nhật'}</strong></div>
                          <div style={{ gridColumn: 'span 2', marginTop: '6px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                            <strong style={{ color: '#1e3a8a' }}>Tiền sử bệnh lý / Triệu chứng đăng ký:</strong>
                            <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontStyle: 'italic', fontSize: '12.5px' }}>{selPatient.medicalHistory || 'Chưa ghi nhận bệnh lý từ hồ sơ.'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add Medicines / Herbs Section */}
                  {(() => {
                    // Kiểm tra sản phẩm hợp lệ để kê đơn (bỏ mỹ phẩm, kem đánh răng, sữa tắm...)
                    const isPrescriptionItem = (m) => {
                      if (!m || !m.name) return false;
                      const nameLower = m.name.toLowerCase();
                      const descLower = (m.description || '').toLowerCase();
                      const catId = m.categoryId || m.category_id || 0;
                      const excludedKeywords = [
                        'kem đánh răng', 'sữa tắm', 'dầu gội', 'kem dưỡng', 'son môi', 'xà phòng',
                        'nước hoa', 'khăn giặt', 'băng vệ sinh', 'lăn nách', 'tẩy trang', 'sữa rửa mặt'
                      ];
                      if (excludedKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw))) return false;
                      if ((catId === 2 || catId === 4) && (nameLower.includes('kem') || nameLower.includes('tắm') || nameLower.includes('gội'))) return false;
                      return true;
                    };

                    // Phân loại Đông Y hay Tân Dược
                    const isDongYItem = (m) => {
                      if (!m || !m.name) return false;
                      const nameLower = m.name.toLowerCase();
                      const unit = (m.unit || '').toLowerCase();
                      const catId = m.categoryId || m.category_id || 0;
                      if (unit === 'gram' || unit === 'g' || unit === 'thang' || catId === 1) return true;
                      const dongyKeywords = [
                        'đương quy', 'bạch chỉ', 'cốt toái', 'sinh địa', 'bạc hà', 'bồ công anh', 
                        'sài đất', 'táo nhân', 'kinh giới', 'hoài sơn', 'kỷ tử', 'hà thủ ô', 
                        'thảo quyết minh', 'nhân sâm', 'cam thảo', 'bạch truật', 'quế chi', 'hoàng kỳ', 
                        'tam thất', 'xương bồ', 'mẫu đơn', 'xuyên khung', 'thục địa', 'phòng phong'
                      ];
                      return dongyKeywords.some(kw => nameLower.includes(kw));
                    };

                    const validMedicines = medicines.filter(isPrescriptionItem);
                    const dongYCount = validMedicines.filter(isDongYItem).length;
                    const tanDuocCount = validMedicines.filter(m => !isDongYItem(m)).length;

                    // Lọc và sắp xếp A-Z
                    const filteredList = validMedicines
                      .filter(m => {
                        if (prescriptionCategoryTab === 'dongy' && !isDongYItem(m)) return false;
                        if (prescriptionCategoryTab === 'tanduoc' && isDongYItem(m)) return false;

                        if (prescriptionSearch.trim()) {
                          const query = prescriptionSearch.toLowerCase().trim();
                          const matchName = (m.name || '').toLowerCase().includes(query);
                          const matchDesc = (m.description || '').toLowerCase().includes(query);
                          const matchUnit = (m.unit || '').toLowerCase().includes(query);
                          if (!matchName && !matchDesc && !matchUnit) return false;
                        }

                        const existingInDraft = currentPrescription.items.find(i => i.medicineId === m.id);
                        const addedQty = existingInDraft ? existingInDraft.quantity : 0;
                        const stockInDb = m.stock_quantity ?? m.stockQuantity ?? 0;
                        const availableStock = stockInDb - addedQty;
                        if (hideOutOfStock && availableStock <= 0) return false;

                        return true;
                      })
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

                    return (
                      <div className="med-prescribe-box" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <h5 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🌿 Thêm vị thuốc / Thảo dược / Thuốc vào đơn
                          </h5>
                          <label style={{ fontSize: '12px', color: '#0f766e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                            <input
                              type="checkbox"
                              checked={hideOutOfStock}
                              onChange={e => setHideOutOfStock(e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>Ẩn vị thuốc/thảo dược đã hết hàng (0g)</span>
                          </label>
                        </div>

                        {/* Bộ lọc loại thuốc & Ô tìm kiếm real-time */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          {/* Tabs phân loại */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setPrescriptionCategoryTab('all')}
                              style={{
                                padding: '5px 12px', fontSize: '12.5px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600',
                                backgroundColor: prescriptionCategoryTab === 'all' ? '#0d9488' : '#e2e8f0',
                                color: prescriptionCategoryTab === 'all' ? '#ffffff' : '#475569',
                                transition: 'all 0.2s'
                              }}
                            >
                              🌐 Tất cả ({validMedicines.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrescriptionCategoryTab('dongy')}
                              style={{
                                padding: '5px 12px', fontSize: '12.5px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600',
                                backgroundColor: prescriptionCategoryTab === 'dongy' ? '#16a34a' : '#e2e8f0',
                                color: prescriptionCategoryTab === 'dongy' ? '#ffffff' : '#475569',
                                transition: 'all 0.2s'
                              }}
                            >
                              🍃 Thảo dược & Vị thuốc Đông Y ({dongYCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrescriptionCategoryTab('tanduoc')}
                              style={{
                                padding: '5px 12px', fontSize: '12.5px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600',
                                backgroundColor: prescriptionCategoryTab === 'tanduoc' ? '#2563eb' : '#e2e8f0',
                                color: prescriptionCategoryTab === 'tanduoc' ? '#ffffff' : '#475569',
                                transition: 'all 0.2s'
                              }}
                            >
                              💊 Thuốc Tân Dược ({tanDuocCount})
                            </button>
                          </div>

                          {/* Ô Tìm kiếm Trực tiếp */}
                          <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                              type="text"
                              value={prescriptionSearch}
                              onChange={e => setPrescriptionSearch(e.target.value)}
                              placeholder="🔍 Gõ tên vị thuốc / thảo dược để tìm nhanh (Ví dụ: Đương quy, Paracetamol, Bạch chỉ...)..."
                              style={{
                                width: '100%', padding: '9px 36px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            />
                            {prescriptionSearch && (
                              <button
                                type="button"
                                onClick={() => setPrescriptionSearch('')}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Phân nhóm theo Thuốc Đông Y & Tân Dược */}
                        <div className="prescribe-inputs" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            className="form-select flex-1"
                            value={selectedMedicineId}
                            onChange={e => setSelectedMedicineId(e.target.value)}
                            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: '500' }}
                          >
                            <option value="">-- Chọn vị thuốc / thảo dược phù hợp ({filteredList.length} kết quả) --</option>
                            
                            {/* Nhom 1: Thao duoc / Vi thuoc Dong Y */}
                            {(prescriptionCategoryTab === 'all' || prescriptionCategoryTab === 'dongy') && (() => {
                              const list = filteredList.filter(isDongYItem);
                              if (list.length === 0) return null;
                              return (
                                <optgroup label="🍃 THẢO DƯỢC & VỊ THUỐC ĐÔNG Y (Sắp xếp A-Z)">
                                  {list.map(m => {
                                    const existingInDraft = currentPrescription.items.find(i => i.medicineId === m.id);
                                    const addedQty = existingInDraft ? existingInDraft.quantity : 0;
                                    const stockInDb = m.stock_quantity ?? m.stockQuantity ?? 0;
                                    const availableStock = stockInDb - addedQty;
                                    const unit = m.unit || 'gram';
                                    const priceText = m.price != null ? `${m.price.toLocaleString('vi-VN')}đ/${unit}` : 'Liên hệ';
                                    const isOutOfStock = availableStock <= 0;
                                    return (
                                      <option key={m.id} value={m.id} disabled={isOutOfStock}>
                                        🌿 {m.name} ({priceText}) - {isOutOfStock ? `❌ Hết hàng (còn 0${unit})` : `Tồn kho khả dụng: còn ${availableStock}${unit}`}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })()}

                            {/* Nhom 2: Thuoc Tan Duoc */}
                            {(prescriptionCategoryTab === 'all' || prescriptionCategoryTab === 'tanduoc') && (() => {
                              const list = filteredList.filter(m => !isDongYItem(m));
                              if (list.length === 0) return null;
                              return (
                                <optgroup label="💊 THUỐC TÂN DƯỢC / THUỐC TÂY (Sắp xếp A-Z)">
                                  {list.map(m => {
                                    const existingInDraft = currentPrescription.items.find(i => i.medicineId === m.id);
                                    const addedQty = existingInDraft ? existingInDraft.quantity : 0;
                                    const stockInDb = m.stock_quantity ?? m.stockQuantity ?? 0;
                                    const availableStock = stockInDb - addedQty;
                                    const unit = m.unit || 'Hộp';
                                    const priceText = m.price != null ? `${m.price.toLocaleString('vi-VN')}đ/${unit}` : 'Liên hệ';
                                    const isOutOfStock = availableStock <= 0;
                                    return (
                                      <option key={m.id} value={m.id} disabled={isOutOfStock}>
                                        💊 {m.name} ({priceText}) - {isOutOfStock ? `❌ Hết hàng (còn 0${unit})` : `Tồn kho khả dụng: còn ${availableStock}${unit}`}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })()}
                          </select>

                          <input
                            type="number"
                            className="form-input w-24"
                            min="1"
                            value={selectedMedicineQty}
                            onChange={e => setSelectedMedicineQty(parseInt(e.target.value) || 1)}
                            placeholder="SL"
                            style={{ width: '90px', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}
                          />

                          <button
                            type="button"
                            className="btn-add-item"
                            onClick={() => addMedicineToPrescription()}
                            disabled={checkingSafety || !selectedMedicineId}
                            style={{ padding: '9px 16px', borderRadius: '8px', backgroundColor: '#0d9488', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Plus size={16} /> {checkingSafety ? 'Đang kiểm tra AI...' : 'Thêm vị'}
                          </button>
                        </div>

                        <input
                          type="text"
                          className="form-input"
                          value={newItemInstructions}
                          onChange={e => setNewItemInstructions(e.target.value)}
                          placeholder="📝 Hướng dẫn sử dụng (vd: Sáng 1 viên - Tối 1 viên, sau ăn)..."
                          style={{ marginTop: '8px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%' }}
                        />
                      </div>
                    );
                  })()}

                    <div className="prescription-items-preview">
                      <h6>Chi tiết đơn thuốc:</h6>
                      {currentPrescription.items.length === 0 ? (
                        <p className="no-items-alert">Chưa có vị thuốc nào được thêm.</p>
                      ) : (
                        <div className="preview-items-list">
                          {currentPrescription.items.map(item => (
                            <div key={item.medicineId} className="preview-item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>🌿 <strong>{item.medicineName}</strong> - Số lượng: {item.quantity}</span>
                                <button type="button" className="btn-remove-item" onClick={() => removeMedicineFromPrescription(item.medicineId)}><X size={14} /></button>
                              </div>
                              <input
                                type="text"
                                className="form-input"
                                value={item.instructions || ''}
                                onChange={e => updateItemInstructions(item.medicineId, e.target.value)}
                                placeholder="📝 Hướng dẫn sử dụng (vd: Sáng 1 viên - Tối 1 viên, sau ăn)..."
                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">{currentPrescription.id ? 'Hoàn thành & Duyệt đơn' : 'Hoàn thành kê đơn'}</button>
                    <button type="button" className="btn-cancel" onClick={() => { setPrescriptionModal(null); setOcrResult(null); }}>Hủy bỏ</button>
                  </div>
                </form>
              )}

              {safetyWarning && (
                <div className="safety-warning-overlay" onClick={cancelSafetyWarning}>
                  <div className="safety-warning-box" onClick={e => e.stopPropagation()}>
                    <div className="safety-warning-header">
                      <AlertTriangle size={24} />
                      <h4>CẢNH BÁO TƯƠNG TÁC NGUY HIỂM</h4>
                    </div>
                    <p className="safety-warning-subtitle">
                      Hệ thống AI phát hiện {safetyWarning.conflicts.length} cặp vị thuốc kỵ nhau trong đơn đang kê (Thập Bát Phản):
                    </p>
                    <div className="safety-conflict-list">
                      {safetyWarning.conflicts.map((c, idx) => {
                        const severity = c.severity ?? c.Severity;
                        const herbAName = c.herbAName ?? c.HerbAName;
                        const herbBName = c.herbBName ?? c.HerbBName;
                        const mechanism = c.mechanismDescription ?? c.MechanismDescription;
                        const replA = c.replacementForAName ?? c.ReplacementForAName;
                        const replB = c.replacementForBName ?? c.ReplacementForBName;
                        return (
                          <div key={idx} className={`safety-conflict-item severity-${(severity || '').toLowerCase()}`}>
                            <div className="safety-conflict-pair">
                              {herbAName} <span>+</span> {herbBName}
                              <span className="severity-badge">{severity === 'Critical' ? 'NGUY HIỂM' : 'CẢNH BÁO'}</span>
                            </div>
                            <p className="safety-conflict-mechanism">{mechanism}</p>
                            {(replA || replB) && (
                              <p className="safety-conflict-suggestion">
                                💡 Đề xuất thay thế: {replA && <>dùng <strong>{replA}</strong> thay cho {herbAName}</>}
                                {replA && replB && ' hoặc '}
                                {replB && <>dùng <strong>{replB}</strong> thay cho {herbBName}</>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="safety-warning-actions">
                      {safetyWarning.conflicts.some(c => (c.replacementForAId ?? c.ReplacementForAId) || (c.replacementForBId ?? c.ReplacementForBId)) && (
                        <button type="button" className="btn-safety-replace" onClick={applySafetyReplacement}>
                          ⚡ Cho AI tự động đổi sang vị thuốc thay thế
                        </button>
                      )}
                      <button type="button" className="btn-safety-override" onClick={confirmAddDespiteWarning}>
                        Vẫn thêm vào đơn (bỏ qua cảnh báo)
                      </button>
                      <button type="button" className="btn-safety-cancel" onClick={cancelSafetyWarning}>
                        Hủy — không thêm vị này
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {prescriptions.length === 0 ? (
                <div className="admin-empty">Không có đơn thuốc nào được lưu trên hệ thống.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID Đơn</th>
                        <th>Bệnh nhân</th>
                        <th>Chẩn đoán y khoa</th>
                        <th>Ngày kê đơn</th>
                        <th>Thầy thuốc phụ trách</th>
                        <th>Đại lý/Nơi kê đơn</th>
                        <th>Các vị thuốc chỉ định</th>
                        <th>Trạng thái đơn</th>
                        <th>Xử lý đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(p => {
                        const matchingPatient = patients.find(pt => pt.id === (p.patientId || p.userId));
                        const displayName = p.patientName || p.userName || matchingPatient?.name || `Bệnh nhân #${p.userId}`;
                        const displayPhone = matchingPatient?.phone;
                        // Toa thuốc khách tự gửi kèm ảnh, chưa được kê thuốc — không thể "Duyệt" trực tiếp
                        // vì chưa có PrescriptionItem nào, phải xem ảnh & kê đơn qua khu vực hàng chờ phía trên.
                        const isPendingImageOnly = !p.appointmentId && p.imageUrl && p.status === 'Pending' && (!p.items || p.items.length === 0);
                        return (
                          <tr key={p.id}>
                            <td className="col-id">#{p.id}</td>
                            <td>
                              <strong style={{ color: '#0f172a', display: 'block', fontWeight: '700' }}>
                                {displayName}
                              </strong>
                              {displayPhone && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  📞 {displayPhone}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="prescription-med-tag" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: '600', padding: '4px 8px' }}>
                                🩺 {p.diagnosisNote || 'Thể bệnh Tâm Tỳ Lưỡng Hư'}
                              </span>
                            </td>
                            <td>{formatDate(p.prescriptionDate)}</td>
                            <td>{p.doctorName}</td>
                            <td>{p.hospital}</td>
                            <td>
                              <div className="prescription-medicines-cell">
                                {p.items && p.items.map((item, idx) => (
                                  <span key={idx} className="prescription-med-tag" title={item.instructions || ''}>
                                    🌿 {item.medicineName} (x{item.quantity}){item.instructions ? ` — ${item.instructions}` : ''}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={`prescription-status ${getPrescriptionStatusClass(p.status)}`}>
                                {getPrescriptionStatusLabel(p.status, 'admin')}
                              </span>
                            </td>
                            <td>
                              <div className="pres-actions">
                                {isPendingImageOnly ? (
                                  <button
                                    className="btn-pres-action fill"
                                    title="Xem ảnh toa thuốc khách gửi và kê đơn trước khi duyệt"
                                    onClick={() => {
                                      setCurrentPrescription({
                                        id: p.id,
                                        patientId: p.userId,
                                        patientDisplayName: displayName,
                                        doctorName: '',
                                        hospital: p.hospital || '',
                                        diagnosisNote: p.diagnosisNote || '',
                                        items: [],
                                        imageUrl: p.imageUrl
                                      });
                                      setOcrResult(null);
                                      setPrescriptionModal('add');
                                    }}
                                  >
                                    📷 Xem toa & Kê đơn
                                  </button>
                                ) : p.status === 'Pending' && (
                                  <button className="btn-pres-action fill" onClick={() => handlePrescriptionStatus(p.id, PRESCRIPTION_ACTION.APPROVE)} title="Duyệt đơn thuốc, mở khóa cho bệnh nhân thêm vào giỏ hàng">
                                    <Check size={12} /> Duyệt đơn
                                  </button>
                                )}
                                {(p.status === 'Pending' || p.status === 'Approved') && (
                                  <button className="btn-pres-action cancel" onClick={() => handlePrescriptionStatus(p.id, PRESCRIPTION_ACTION.REJECT)} title="Từ chối đơn thuốc">
                                    <X size={12} /> Từ chối
                                  </button>
                                )}
                                {p.status !== 'Pending' && p.status !== 'Approved' && <span className="completed-text">Đã xử lý</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
  );
};

export default PrescriptionsTab;
