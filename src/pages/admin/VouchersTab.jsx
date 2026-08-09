import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Tag } from 'lucide-react';

// Voucher & Khuyến mãi — tách từ AdminView.jsx (tab "vouchers", chỉ Admin).
const VouchersTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const emptyVoucherForm = {
    code: '', name: '', discountType: 'percent', discountValue: '',
    minOrderValue: '', maxDiscount: '', endDate: '', usageLimit: 100, isActive: true,
    type: 'product', isWheelPrize: false, weight: 0
  };
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAdminVouchers();
      setVouchers(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);


  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
              {/* Form */}
              <div className="admin-card">
                <h3 className="admin-section-title">
                  <Tag size={16} /> {editingVoucherId ? 'Cập nhật Voucher' : 'Thêm Voucher mới'}
                </h3>
                <div className="admin-form">
                  <div className="form-group">
                    <label>Mã voucher *</label>
                    <input className="admin-input" value={voucherForm.code} onChange={e => setVoucherForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="VD: LONGCHAU20" />
                  </div>
                  <div className="form-group">
                    <label>Tên mô tả</label>
                    <input className="admin-input" value={voucherForm.name} onChange={e => setVoucherForm(p => ({ ...p, name: e.target.value }))} placeholder="Giảm 20% cho đơn từ 200K" />
                  </div>
                  <div className="form-group">
                    <label>Loại voucher</label>
                    <select className="admin-input" value={voucherForm.type} onChange={e => setVoucherForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="product">Giảm giá sản phẩm</option>
                      <option value="shipping">Giảm phí vận chuyển</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Loại giảm</label>
                      <select className="admin-input" value={voucherForm.discountType} onChange={e => setVoucherForm(p => ({ ...p, discountType: e.target.value }))}>
                        <option value="percent">Phần trăm (%)</option>
                        <option value="flat">Số tiền (VNĐ)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Giá trị giảm *</label>
                      <input type="number" className="admin-input" value={voucherForm.discountValue} onChange={e => setVoucherForm(p => ({ ...p, discountValue: e.target.value }))} placeholder={voucherForm.discountType === 'percent' ? '10' : '20000'} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Đơn tối thiểu (đ)</label>
                      <input type="number" className="admin-input" value={voucherForm.minOrderValue} onChange={e => setVoucherForm(p => ({ ...p, minOrderValue: e.target.value }))} placeholder="200000" />
                    </div>
                    <div className="form-group">
                      <label>Giảm tối đa (đ)</label>
                      <input type="number" className="admin-input" value={voucherForm.maxDiscount} onChange={e => setVoucherForm(p => ({ ...p, maxDiscount: e.target.value }))} placeholder="50000" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Số lượng</label>
                      <input type="number" className="admin-input" value={voucherForm.usageLimit} onChange={e => setVoucherForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="100" />
                    </div>
                    <div className="form-group">
                      <label>Ngày hết hạn</label>
                      <input type="date" className="admin-input" value={voucherForm.endDate} onChange={e => setVoucherForm(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="vIsActive" checked={voucherForm.isActive} onChange={e => setVoucherForm(p => ({ ...p, isActive: e.target.checked }))} />
                    <label htmlFor="vIsActive" style={{ fontWeight: 600, cursor: 'pointer' }}>Kích hoạt ngay</label>
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="vIsWheelPrize" checked={voucherForm.isWheelPrize} onChange={e => setVoucherForm(p => ({ ...p, isWheelPrize: e.target.checked }))} />
                    <label htmlFor="vIsWheelPrize" style={{ fontWeight: 600, cursor: 'pointer' }}>Dùng làm phần thưởng vòng quay may mắn</label>
                  </div>
                  {voucherForm.isWheelPrize && (
                    <div className="form-group">
                      <label>Trọng số (số càng lớn càng dễ trúng)</label>
                      <input type="number" className="admin-input" value={voucherForm.weight} onChange={e => setVoucherForm(p => ({ ...p, weight: e.target.value }))} placeholder="20" />
                    </div>
                  )}
                  <div className="product-form-actions">
                    <button className="admin-add-btn" style={{ flex: 2 }} onClick={async () => {
                      if (!voucherForm.code || !voucherForm.discountValue) { setError('Vui lòng nhập mã và giá trị giảm'); return; }
                      try {
                        const payload = {
                          ...voucherForm,
                          discountValue: parseFloat(voucherForm.discountValue),
                          minOrderValue: parseFloat(voucherForm.minOrderValue) || 0,
                          maxDiscount: voucherForm.maxDiscount ? parseFloat(voucherForm.maxDiscount) : null,
                          endDate: voucherForm.endDate ? voucherForm.endDate : null,
                          usageLimit: parseInt(voucherForm.usageLimit) || 0,
                          weight: parseInt(voucherForm.weight) || 0
                        };
                        if (editingVoucherId) {
                          await api.updateVoucher(editingVoucherId, payload);
                          showSuccess('Cập nhật voucher thành công!');
                        } else {
                          await api.createVoucher(payload);
                          showSuccess('Thêm voucher thành công!');
                        }
                        setVoucherForm(emptyVoucherForm);
                        setEditingVoucherId(null);
                        const data = await api.fetchAdminVouchers(); setVouchers(data);
                      } catch (e) { setError(e.message); }
                    }}>
                      {editingVoucherId ? '💾 Cập nhật' : '➕ Thêm Voucher'}
                    </button>
                    {editingVoucherId && (
                      <button className="cancel-edit-btn" onClick={() => { setEditingVoucherId(null); setVoucherForm(emptyVoucherForm); }}>Hủy</button>
                    )}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="admin-card">
                <h3 className="admin-section-title"><Tag size={16} /> Danh sách Voucher ({vouchers.length})</h3>
                <div className="medicine-crud-list" style={{ maxHeight: 550 }}>
                  {vouchers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chưa có voucher nào</p>
                  ) : vouchers.map(v => {
                    const expired = v.endDate && new Date(v.endDate) < new Date();
                    const daysLeft = v.endDate ? Math.ceil((new Date(v.endDate) - new Date()) / 86400000) : null;
                    return (
                      <div key={v.id} className={`medicine-crud-row ${editingVoucherId === v.id ? 'editing' : ''}`}>
                        <div className="medicine-crud-info" style={{ flex: 1 }}>
                          <strong style={{ color: '#0d9488', fontFamily: 'monospace', fontSize: 15 }}>{v.code}</strong>
                          <span className="med-meta">{v.name || '—'}</span>
                          <span className="med-price">
                            {v.discountType === 'percent' ? `${v.discountValue}%` : new Intl.NumberFormat('vi-VN').format(v.discountValue) + 'đ'} OFF
                            {v.minOrderValue > 0 && <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400 }}> · Đơn từ {new Intl.NumberFormat('vi-VN').format(v.minOrderValue)}đ</span>}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: v.isActive && !expired ? '#dcfce7' : '#fee2e2', color: v.isActive && !expired ? '#166534' : '#991b1b', fontWeight: 700 }}>
                              {v.isActive && !expired ? 'Đang hoạt động' : expired ? 'Hết hạn' : 'Tắt'}
                            </span>
                            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: v.type === 'shipping' ? '#e0f2fe' : '#fef3c7', color: v.type === 'shipping' ? '#0369a1' : '#92400e', fontWeight: 700 }}>
                              {v.type === 'shipping' ? 'Giảm ship' : 'Giảm sản phẩm'}
                            </span>
                            {v.isWheelPrize && (
                              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>
                                🎡 Phần thưởng vòng quay (weight {v.weight})
                              </span>
                            )}
                            {v.ownerUserId && (
                              <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                                Cá nhân (user #{v.ownerUserId})
                              </span>
                            )}
                            {daysLeft !== null && !expired && (
                              <span style={{ fontSize: 11, color: daysLeft <= 3 ? '#dc2626' : '#64748b' }}>
                                ⏱ Còn {daysLeft} ngày
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Đã dùng: {v.usedCount}/{v.usageLimit}</span>
                          </div>
                        </div>
                        <div className="medicine-crud-actions">
                          <button className="med-edit-btn" onClick={() => {
                            setEditingVoucherId(v.id);
                            setVoucherForm({
                              code: v.code, name: v.name || '', discountType: v.discountType,
                              discountValue: v.discountValue, minOrderValue: v.minOrderValue || '',
                              maxDiscount: v.maxDiscount || '', endDate: v.endDate ? v.endDate.split('T')[0] : '',
                              usageLimit: v.usageLimit, isActive: v.isActive,
                              type: v.type || 'product', isWheelPrize: v.isWheelPrize || false, weight: v.weight || 0
                            });
                          }}>✏️ Sửa</button>
                          <button
                            className="med-edit-btn"
                            style={v.isActive
                              ? { background: 'rgba(245,158,11,0.1)', color: '#d97706', borderColor: '#d97706' }
                              : { background: 'rgba(13,148,136,0.1)', color: '#0d9488', borderColor: '#0d9488' }
                            }
                            onClick={async () => {
                              await api.updateVoucher(v.id, { isActive: !v.isActive });
                              const data = await api.fetchAdminVouchers(); setVouchers(data);
                            }}>
                            {v.isActive ? '⏸ Tắt' : '▶ Bật'}
                          </button>
                          <button className="med-delete-btn" onClick={async () => {
                            if (!confirm(`Xóa voucher "${v.code}"?`)) return;
                            await api.deleteVoucher(v.id);
                            const data = await api.fetchAdminVouchers(); setVouchers(data);
                            showSuccess('Đã xóa voucher!');
                          }}>🗑️ Xóa</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
  );
};

export default VouchersTab;
