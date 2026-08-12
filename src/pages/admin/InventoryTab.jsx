import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Package, Info, ScanLine } from 'lucide-react';
import { formatDateVN } from '../../utils/dateUtils';
import { formatPrice } from './shared/adminFormat';
import BarcodeScannerModal from '../../components/admin/BarcodeScannerModal';

// Kho Dược liệu — tách từ AdminView.jsx (tab "inventory").
// Toàn bộ state/handler trong tab này chỉ được dùng riêng ở đây trong bản gốc
// nên có thể chuyển hẳn vào local state, tự tải dữ liệu khi tab được mở.
const InventoryTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [profitReport, setProfitReport] = useState([]);

  // Nhập kho theo lô (batch/lot) — state
  const [batchMedicineId, setBatchMedicineId] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [batchWarehouseId, setBatchWarehouseId] = useState('');
  const [existingBatches, setExistingBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [batchManufactureDate, setBatchManufactureDate] = useState('');
  const [batchExpiryDate, setBatchExpiryDate] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchCostPrice, setBatchCostPrice] = useState('');
  const batchSupplierIdState = useState('');
  const [batchSupplierId, setBatchSupplierId] = batchSupplierIdState;
  const [batchNote, setBatchNote] = useState('');
  const [batchRegNumber, setBatchRegNumber] = useState('');
  const [batchStorageCondition, setBatchStorageCondition] = useState('Kho Thường (<30°C)');
  const [batchQcStatus, setBatchQcStatus] = useState('Pass');

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const [whData, medData, supData, alertsData, flashSaleData] = await Promise.all([
        api.fetchWarehouses(),
        api.fetchMedicines(null, '', null, null, true).catch(() => []),
        api.fetchSuppliers().catch(() => []),
        api.fetchExpiryAlerts(30).catch(() => []),
        api.fetchFlashSaleList(true).catch(() => []),
      ]);
      setWarehouses(whData);
      setMedicines(medData);
      setSuppliers(supData);
      setFlashSales(flashSaleData);
      setExpiryAlerts(alertsData);
      if (whData.length > 0 && !batchWarehouseId) setBatchWarehouseId(String(whData[0].id));
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

  const loadExistingBatches = async (medicineId, warehouseId) => {
    if (!medicineId) { setExistingBatches([]); setProfitReport([]); return; }
    setBatchesLoading(true);
    try {
      const [data, profitData] = await Promise.all([
        api.fetchBatchesByMedicine(medicineId, warehouseId || null),
        api.fetchBatchProfitReport(warehouseId || null, medicineId).catch(() => []),
      ]);
      setExistingBatches(data);
      setProfitReport(profitData);
    } catch (err) {
      setExistingBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    if (batchMedicineId) {
      loadExistingBatches(batchMedicineId, batchWarehouseId);
    }
  }, [batchMedicineId, batchWarehouseId]);

  const handleBarcodeScanned = async (code) => {
    setShowBarcodeScanner(false);
    const found = medicines.find(m => m.barcode && m.barcode === code);
    if (found) {
      setBatchMedicineId(String(found.id));
      showSuccess(`Đã chọn: ${found.name}`);
      return;
    }
    try {
      const med = await api.fetchMedicineByBarcode(code);
      if (med) {
        setBatchMedicineId(String(med.id));
        showSuccess(`Đã chọn: ${med.name}`);
      } else {
        setError(`Không tìm thấy sản phẩm với mã vạch "${code}"`);
      }
    } catch (err) {
      setError(err.message || 'Không thể tra cứu mã vạch');
    }
  };

  const refreshExpiryAlerts = async () => {
    const alertsData = await api.fetchExpiryAlerts(30).catch(() => []);
    setExpiryAlerts(alertsData);
  };

  const refreshFlashSales = async () => {
    const data = await api.fetchFlashSaleList(true).catch(() => []);
    setFlashSales(data);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setError('');
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền nhập kho.');
      return;
    }
    if (!batchMedicineId || !batchWarehouseId || !batchManufactureDate || !batchExpiryDate || !batchQuantity) {
      setError('Vui lòng chọn thuốc/dược liệu, kho, ngày sản xuất, hạn sử dụng và số lượng.');
      return;
    }
    try {
      await api.createStockBatch({
        medicineId: batchMedicineId,
        warehouseId: batchWarehouseId,
        batchNumber,
        manufactureDate: batchManufactureDate,
        expiryDate: batchExpiryDate,
        quantity: batchQuantity,
        unitCostPrice: batchCostPrice || null,
        supplierId: batchSupplierId || null,
        registrationNumber: batchRegNumber || null,
        storageCondition: batchStorageCondition || null,
        qcStatus: batchQcStatus,
        note: batchNote || null,
      });
      showSuccess(batchQcStatus === 'Fail' ? 'Lô hàng bị đánh giá KHÔNG ĐẠT QC — Đã chuyển vào Kho Biệt Trữ (Quarantine)!' : 'Nghiệm thu QC đạt chuẩn — Đã nhập kho khả dụng!');
      setBatchNumber('');
      setBatchManufactureDate('');
      setBatchExpiryDate('');
      setBatchQuantity('');
      setBatchCostPrice('');
      setBatchRegNumber('');
      setBatchNote('');
      await loadExistingBatches(batchMedicineId, batchWarehouseId);
      const medData = await api.fetchMedicines(null, '', null, null, true).catch(() => []);
      setMedicines(medData);
      await refreshExpiryAlerts();
    } catch (err) {
      setError(err.message || 'Lỗi khi nhập lô hàng.');
    }
  };

  const handleDisposeBatch = async (batch) => {
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền hủy hàng.');
      return;
    }
    if (!window.confirm(`Xác nhận hủy toàn bộ ${batch.quantityRemaining} đơn vị còn lại của lô "${batch.batchNumber}"?`)) return;
    setError('');
    try {
      await api.disposeBatch(batch.id, null, 'Hủy hàng hết hạn sử dụng');
      showSuccess('Đã hủy lô hàng.');
      await loadExistingBatches(batchMedicineId, batchWarehouseId);
      await refreshExpiryAlerts();
    } catch (err) {
      setError(err.message || 'Lỗi khi hủy lô hàng.');
    }
  };

  const handleApplyFlashSale = async (medicineId) => {
    setError('');
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền áp dụng Flash Sale.');
      return;
    }
    try {
      await api.applyFlashSale(medicineId);
      showSuccess('Đã đưa sản phẩm vào Flash Sale!');
      await refreshExpiryAlerts();
      await refreshFlashSales();
      if (batchMedicineId) await loadExistingBatches(batchMedicineId, batchWarehouseId);
    } catch (err) {
      setError(err.message || 'Lỗi khi áp dụng Flash Sale.');
    }
  };

  const handleRemoveFlashSale = async (medicineId) => {
    setError('');
    if (!window.confirm('Gỡ Flash Sale cho sản phẩm này? Giá sẽ trở về giá gốc.')) return;
    try {
      await api.removeFlashSale(medicineId);
      showSuccess('Đã gỡ Flash Sale.');
      await refreshFlashSales();
    } catch (err) {
      setError(err.message || 'Lỗi khi gỡ Flash Sale.');
    }
  };

  const severityLabel = (sev) => ({
    Expired: { text: 'Đã hết hạn', color: '#7f1d1d', bg: '#fee2e2' },
    Critical: { text: 'Nguy cấp (≤7 ngày)', color: '#991b1b', bg: '#fee2e2' },
    Warning: { text: 'Sắp hết hạn (≤30 ngày)', color: '#92400e', bg: '#fef3c7' },
    Notice: { text: 'Còn hạn', color: '#065f46', bg: '#d1fae5' },
  }[sev] || { text: sev, color: '#374151', bg: '#f3f4f6' });

  const batchStatusLabel = (status) => ({
    Active: { text: 'Còn hạn', color: '#065f46', bg: '#d1fae5' },
    Expired: { text: 'Hết hạn', color: '#7f1d1d', bg: '#fee2e2' },
    Depleted: { text: 'Đã bán hết', color: '#374151', bg: '#f3f4f6' },
    Disposed: { text: 'Đã hủy', color: '#374151', bg: '#f3f4f6' },
  }[status] || { text: status, color: '#374151', bg: '#f3f4f6' });

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
            <>
              {showBarcodeScanner && (
                <BarcodeScannerModal onDetected={handleBarcodeScanned} onClose={() => setShowBarcodeScanner(false)} />
              )}
              <div className="admin-card">
                <h3 className="card-title">Tình trạng Kho hàng</h3>
                {warehouses.length === 0 ? (
                  <div className="admin-empty">Không có thông tin nhà kho.</div>
                ) : (
                  <div className="inventory-grid">
                    {warehouses.map(w => (
                      <div key={w.id} className="warehouse-card">
                        <div className="wh-header">
                          <Package className="wh-icon" size={24} />
                          <div>
                            <h4>{w.name}</h4>
                            <span className="sub-text">{w.address}</span>
                          </div>
                        </div>
                        <div className="wh-body">
                          <div className="wh-stat">
                            <span className="wh-stat-num">{(w.total_quantity ?? w.totalQuantity ?? 0).toLocaleString()}</span>
                            <span className="wh-stat-lbl">Tổng vị thuốc lưu kho</span>
                          </div>
                          <div className="wh-info">
                            <Info size={14} /> <span>Tình trạng kho: Hoạt động bình thường. Đảm bảo điều kiện độ ẩm lý tưởng cho thảo dược Đông Y.</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* QUẢN LÝ FLASH SALE */}
              <div className="admin-card">
                <h3 className="card-title">🔥 Quản lý Flash Sale đang áp dụng</h3>
                {flashSales.length === 0 ? (
                  <div className="admin-empty">Chưa có sản phẩm nào đang Flash Sale. Áp dụng từ bảng cảnh báo hạn dùng bên dưới.</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Thuốc/Dược liệu</th>
                          <th>Giá gốc</th>
                          <th>Giá Flash Sale</th>
                          <th>Giảm</th>
                          <th>Số lô</th>
                          <th>HSD lô</th>
                          <th>Áp dụng bởi</th>
                          <th>Ngày áp dụng</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flashSales.map(f => (
                          <tr key={f.id}>
                            <td><strong>{f.medicineName}</strong></td>
                            <td style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatPrice(f.originalPrice)}</td>
                            <td style={{ color: '#dc2626', fontWeight: 700 }}>{formatPrice(f.salePrice)}</td>
                            <td>
                              <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#991b1b', background: '#fee2e2' }}>
                                -{f.discountPercent}%
                              </span>
                            </td>
                            <td>{f.batchNumber || '—'}</td>
                            <td>{f.batchExpiryDate ? formatDateVN(f.batchExpiryDate) : '—'}</td>
                            <td>{f.appliedByStaffName || '—'}</td>
                            <td>{formatDateVN(f.appliedAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="cancel-edit-btn"
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                onClick={() => handleRemoveFlashSale(f.medicineId)}
                              >
                                Gỡ Flash Sale
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CẢNH BÁO HẠN DÙNG THEO LÔ */}
              <div className="admin-card">
                <h3 className="card-title">⚠️ Cảnh báo hạn dùng theo lô (≤30 ngày)</h3>
                {expiryAlerts.length === 0 ? (
                  <div className="admin-empty">Không có lô hàng nào sắp hết hạn hoặc đã hết hạn.</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Số lô</th>
                          <th>Thuốc/Dược liệu</th>
                          <th>Kho</th>
                          <th>Hạn dùng</th>
                          <th>Còn lại</th>
                          <th>Số lượng</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiryAlerts.map(a => {
                          const sev = severityLabel(a.severity);
                          return (
                            <tr key={a.batchId}>
                              <td>{a.batchNumber}</td>
                              <td><strong>{a.medicineName}</strong></td>
                              <td>{a.warehouseName}</td>
                              <td>{formatDateVN(a.expiryDate)}</td>
                              <td>
                                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: sev.color, background: sev.bg }}>
                                  {a.daysRemaining < 0 ? `${sev.text} (${Math.abs(a.daysRemaining)} ngày trước)` : `${sev.text} · còn ${a.daysRemaining} ngày`}
                                </span>
                              </td>
                              <td>{a.quantityRemaining}</td>
                              <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="add-submit-btn"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  onClick={() => handleApplyFlashSale(a.medicineId)}
                                >
                                  🔥 Đưa vào Flash Sale
                                </button>
                                <button
                                  type="button"
                                  className="cancel-edit-btn"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  onClick={() => handleDisposeBatch({ id: a.batchId, batchNumber: a.batchNumber, quantityRemaining: a.quantityRemaining })}
                                >
                                  🗑️ Xuất hủy
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

              {/* NHẬP LÔ HÀNG MỚI */}
              <div className="admin-card">
                <h3 className="card-title">📦 Nhập lô hàng mới (theo dõi hạn dùng riêng từng đợt)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Thuốc/Dược liệu *</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="form-select" value={batchMedicineId} onChange={(e) => setBatchMedicineId(e.target.value)}>
                        <option value="">-- Chọn thuốc/dược liệu --</option>
                        {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowBarcodeScanner(true)}
                        title="Quét mã vạch để chọn nhanh"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                          background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                          borderRadius: 6, padding: '0 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13
                        }}
                      >
                        <ScanLine size={15} /> Quét
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kho nhập *</label>
                    <select className="form-select" value={batchWarehouseId} onChange={(e) => setBatchWarehouseId(e.target.value)}>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                {batchMedicineId && (
                  <div style={{ margin: '12px 0' }}>
                    <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>Các lô hiện có trong kho này</h4>
                    {batchesLoading ? (
                      <div className="admin-empty">Đang tải...</div>
                    ) : existingBatches.length === 0 ? (
                      <div className="admin-empty">Chưa có lô hàng nào cho thuốc này tại kho đã chọn. Đây là đợt nhập đầu tiên.</div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Số lô</th>
                              <th>NSX</th>
                              <th>HSD</th>
                              <th>SL nhập</th>
                              <th>SL còn</th>
                              <th>Giá nhập/đv</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {existingBatches.map(b => {
                              const st = batchStatusLabel(b.status);
                              return (
                                <tr key={b.id}>
                                  <td>{b.batchNumber}</td>
                                  <td>{formatDateVN(b.manufactureDate)}</td>
                                  <td>{formatDateVN(b.expiryDate)}</td>
                                  <td>{b.quantityReceived}</td>
                                  <td>{b.quantityRemaining}</td>
                                  <td>{b.unitCostPrice != null ? formatPrice(b.unitCostPrice) : '—'}</td>
                                  <td>
                                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: st.color, background: st.bg }}>
                                      {st.text}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <form className="add-product-form" onSubmit={handleCreateBatch}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Số lô (để trống sẽ tự sinh)</label>
                      <input type="text" className="form-input" placeholder="LOT-2026-08-01" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số lượng nhập *</label>
                      <input type="number" min="1" className="form-input" required value={batchQuantity} onChange={(e) => setBatchQuantity(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày sản xuất *</label>
                      <input type="date" className="form-input" required value={batchManufactureDate} onChange={(e) => setBatchManufactureDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hạn sử dụng *</label>
                      <input type="date" className="form-input" required value={batchExpiryDate} onChange={(e) => setBatchExpiryDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giá nhập / đơn vị (VND)</label>
                      <input type="number" min="0" className="form-input" value={batchCostPrice} onChange={(e) => setBatchCostPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nhà cung cấp lô này</label>
                      <select className="form-select" value={batchSupplierId} onChange={(e) => setBatchSupplierId(e.target.value)}>
                        <option value="">-- Không chọn --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name || s.companyName}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số đăng ký thuốc (SĐK) / GP</label>
                      <input type="text" className="form-input" placeholder="VD: VD-28491-17" value={batchRegNumber} onChange={(e) => setBatchRegNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Điều kiện bảo quản (SOP Step 1)</label>
                      <select className="form-select" value={batchStorageCondition} onChange={(e) => setBatchStorageCondition(e.target.value)}>
                        <option value="Kho Thường (<30°C)">Kho Thường (&lt;30°C, Độ ẩm &lt;75%)</option>
                        <option value="Kho Mát (<25°C)">Kho Mát (&lt;25°C - Thảo dược nhạy cảm)</option>
                        <option value="Cold Chain (2-8°C)">Cold Chain Chuỗi Lạnh (2°C - 8°C - Vắc-xin/Sinh phẩm)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Đánh giá Chất lượng QC (SOP Step 3)</label>
                      <select className="form-select" style={{ fontWeight: '700', color: batchQcStatus === 'Pass' ? '#166534' : '#991b1b', background: batchQcStatus === 'Pass' ? '#f0fdf4' : '#fef2f2' }} value={batchQcStatus} onChange={(e) => setBatchQcStatus(e.target.value)}>
                        <option value="Pass">✅ ĐẠT QC (Bao bì, HSD, Cảm quan đạt → Cho bán)</option>
                        <option value="Fail">⚠️ KHÔNG ĐẠT (Biệt trữ Quarantine → Trả lại NCC)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ghi chú kiểm nghiệm / Lý do biệt trữ (nếu không đạt)</label>
                    <textarea className="form-textarea" rows="2" placeholder="Ghi chú thêm về cảm quan bao bì, tem niêm phong hoặc lý do biệt trữ..." value={batchNote} onChange={(e) => setBatchNote(e.target.value)} />
                  </div>
                  <div className="product-form-actions">
                    <button type="submit" className="add-submit-btn">📦 Nhập lô hàng</button>
                  </div>
                </form>
              </div>

              {/* BÁO CÁO LÃI GỘP ƯỚC TÍNH THEO LÔ */}
              <div className="admin-card">
                <h3 className="card-title">💰 Báo cáo lãi gộp ước tính theo lô</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '-6px', marginBottom: '12px' }}>
                  Doanh thu tính theo <strong>giá bán hiện tại</strong> của sản phẩm, chỉ tính đơn <strong>đã thanh toán</strong> và không bị hủy/trả hàng — chỉ mang tính tham khảo, không phải sổ sách kế toán chính xác.
                  Chỉ hiển thị các lô của sản phẩm đang chọn ở trên và đã điền Giá nhập.
                </p>
                {!batchMedicineId ? (
                  <div className="admin-empty">Chọn thuốc/dược liệu ở mục "Nhập lô hàng mới" phía trên để xem báo cáo lãi gộp.</div>
                ) : profitReport.length === 0 ? (
                  <div className="admin-empty">Sản phẩm này chưa có lô nào được điền Giá nhập, hoặc chưa bán được lô nào.</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Số lô</th>
                          <th>Thuốc/Dược liệu</th>
                          <th>SL đã bán</th>
                          <th>Giá vốn/đv</th>
                          <th>Giá bán hiện tại</th>
                          <th>Doanh thu ước tính</th>
                          <th>Lãi gộp ước tính</th>
                          <th>Biên LN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitReport.map(p => (
                          <tr key={p.batchId}>
                            <td>{p.batchNumber}</td>
                            <td><strong>{p.medicineName}</strong></td>
                            <td>{p.quantitySold}</td>
                            <td>{formatPrice(p.unitCostPrice)}</td>
                            <td>{p.currentSellPrice != null ? formatPrice(p.currentSellPrice) : '—'}</td>
                            <td>{formatPrice(p.estimatedRevenue)}</td>
                            <td style={{ color: p.estimatedGrossProfit >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                              {formatPrice(p.estimatedGrossProfit)}
                            </td>
                            <td>{p.grossMarginPercent != null ? `${p.grossMarginPercent}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
  );
};

export default InventoryTab;
