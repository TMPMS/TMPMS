import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import * as api from '../../services/api';
import { Upload, Download, ScanLine } from 'lucide-react';
import BarcodeScannerModal from '../../components/admin/BarcodeScannerModal';

const FALLBACK_MED_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23e5e7eb'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='26'>🌿</text></svg>";

// Tách riêng + memo hóa để danh sách hàng trăm sản phẩm không re-render mỗi khi gõ phím
// trong form thêm/sửa sản phẩm bên cạnh (2 khối này cùng nằm trong ProductsTab).
const MedicineListPanel = memo(function MedicineListPanel({ medicines, editingMedicineId, onEdit, onDelete, onDeleteMultiple }) {
  const [filterSearch, setFilterSearch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [brokenImgIds, setBrokenImgIds] = useState(() => new Set());

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markImageBroken = (id) => {
    setBrokenImgIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  const origins = useMemo(() => {
    const set = new Set();
    medicines.forEach(m => {
      if (m.origin) set.add(m.origin.trim());
    });
    return Array.from(set);
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (filterSearch.trim()) {
        const term = filterSearch.trim().toLowerCase();
        const matchName = m.name && m.name.toLowerCase().includes(term);
        const matchDesc = m.description && m.description.toLowerCase().includes(term);
        if (!matchName && !matchDesc) return false;
      }
      if (filterOrigin !== 'all') {
        if ((m.origin || '').trim() !== filterOrigin) return false;
      }
      if (filterLowStock) {
        if (m.stock_quantity >= 20) return false;
      }
      return true;
    });
  }, [medicines, filterSearch, filterOrigin, filterLowStock]);

  return (
    <div className="admin-card products-list-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="card-title" style={{ margin: 0 }}>📋 Danh sách Dược phẩm ({filteredMedicines.length}/{medicines.length})</h3>
        {brokenImgIds.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(filteredMedicines.filter(m => brokenImgIds.has(m.id)).map(m => m.id)))}
            style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' }}
          >
            🖼️ Chọn tất cả ảnh lỗi ({brokenImgIds.size})
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Đã chọn {selectedIds.size} sản phẩm</span>
          <button
            type="button"
            onClick={() => onDeleteMultiple(Array.from(selectedIds), () => setSelectedIds(new Set()))}
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}
          >
            🗑️ Xóa mục đã chọn
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' }}
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Admin Filter Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Tìm theo tên..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          style={{ flex: 1, minWidth: 140, padding: '6px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6 }}
        />
        <select
          value={filterOrigin}
          onChange={e => setFilterOrigin(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}
        >
          <option value="all">🌐 Tất cả xuất xứ</option>
          {origins.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilterLowStock(p => !p)}
          style={{
            padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid', cursor: 'pointer',
            background: filterLowStock ? '#fee2e2' : '#f8fafc',
            color: filterLowStock ? '#991b1b' : '#475569',
            borderColor: filterLowStock ? '#fca5a5' : '#cbd5e1'
          }}
        >
          ⚠️ Sắp hết hàng (&lt;20)
        </button>
      </div>

      <div className="medicine-crud-list">
        {filteredMedicines.length === 0 && (
          <div className="admin-empty">Không có dược phẩm nào phù hợp với bộ lọc.</div>
        )}
        {filteredMedicines.map(m => (
          <div key={m.id} className={`medicine-crud-row ${editingMedicineId === m.id ? 'editing' : ''}`}>
            <input
              type="checkbox"
              checked={selectedIds.has(m.id)}
              onChange={() => toggleSelected(m.id)}
              style={{ marginRight: 4, width: 16, height: 16, cursor: 'pointer', alignSelf: 'center' }}
              title="Chọn để xóa hàng loạt"
            />
            <div className="medicine-crud-img">
              <img src={api.formatImageUrl(m.image_url)} alt={m.name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; markImageBroken(m.id); }} />
            </div>
            <div className="medicine-crud-info">
              <strong>{m.name}</strong>
              <span className="med-meta">{m.packaging || m.unit} · {m.origin}</span>
              <span className="med-price">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m.price)}</span>
              <span className={`med-stock ${m.stock_quantity < 20 ? 'low' : ''}`}>
                Tồn kho: {m.stock_quantity} {m.unit}
              </span>
            </div>
            <div className="medicine-crud-actions">
              <button className="med-edit-btn" onClick={() => onEdit(m)} title="Chỉnh sửa">
                ✏️ Sửa
              </button>
              <button className="med-delete-btn" onClick={() => onDelete(m.id)} title="Xóa khỏi danh mục">
                🗑️ Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Quản lý Dược phẩm — tách từ AdminView.jsx (tab "products").
const ProductsTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Form States - Product (Herbal Medicine)
  const [editingMedicineId, setEditingMedicineId] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState(1); // Default to Herbal TPCN
  const [prodSupplierId, setProdSupplierId] = useState(1);
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('Hộp');
  const [prodOrigin, setProdOrigin] = useState('Việt Nam');
  const [prodPackaging, setProdPackaging] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodReqPrescription, setProdReqPrescription] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // AI Image Verification State
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiVerifyResult, setAiVerifyResult] = useState(null);
  const [aiVerifyError, setAiVerifyError] = useState('');

  // Excel Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importSessionId, setImportSessionId] = useState('');
  const [importSelectedRows, setImportSelectedRows] = useState(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const [medData, catData, supData] = await Promise.all([
        api.fetchMedicines(null, '', null, null, true),
        api.fetchCategories().catch(() => []),
        api.fetchSuppliers().catch(() => []),
      ]);
      setMedicines(medData);
      setCategories(catData);
      setSuppliers(supData);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);


  const handleEditMedicineClick = useCallback((medicine) => {
    setEditingMedicineId(medicine.id);
    setProdName(medicine.name || '');
    setProdCategoryId(medicine.category_id || 1);
    setProdSupplierId(medicine.supplier_id || 1);
    setProdPrice(medicine.price || '');
    setProdOldPrice(medicine.old_price || '');
    setProdUnit(medicine.unit || 'Hộp');
    setProdOrigin(medicine.origin || 'Việt Nam');
    setProdPackaging(medicine.packaging || '');
    setProdBarcode(medicine.barcode || '');
    setProdImgUrl(medicine.image_url || '');
    setProdDesc(medicine.description || '');
    setProdReqPrescription(medicine.requires_prescription || false);
    setAiVerifyResult(null);
    setAiVerifyError('');
  }, []);

  const handleCancelProductEdit = () => {
    setEditingMedicineId(null);
    setProdName('');
    setProdCategoryId(1);
    setProdSupplierId(1);
    setProdPrice('');
    setProdOldPrice('');
    setProdUnit('Hộp');
    setProdOrigin('Việt Nam');
    setProdPackaging('');
    setProdBarcode('');
    setProdImgUrl('');
    setProdDesc('');
    setProdReqPrescription(false);
    setAiVerifyResult(null);
    setAiVerifyError('');
  };

  const handleVerifyImageWithAi = async () => {
    if (!prodName.trim()) {
      setError('Vui lòng nhập Tên sản phẩm trước khi thẩm định bằng AI!');
      return;
    }
    if (!prodImgUrl.trim()) {
      setError('Vui lòng nhập URL hình ảnh sản phẩm để thẩm định!');
      return;
    }
    setAiVerifying(true);
    setAiVerifyError('');
    setAiVerifyResult(null);
    try {
      const res = await api.verifyMedicineImage({
        imageUrl: prodImgUrl,
        productName: prodName,
        description: prodDesc
      });
      setAiVerifyResult(res);
      if (res.isMatch && res.isMedicineImage) {
        showSuccess(`AI Xác nhận: Ảnh khớp với tên dược phẩm (${res.confidenceScore}%)`);
      } else {
        setError(`AI Cảnh báo: ${res.warningMessage || 'Hình ảnh không thực sự khớp với sản phẩm'}`);
      }
    } catch (err) {
      setAiVerifyError(err.message || 'Không thể thẩm định ảnh bằng AI.');
    } finally {
      setAiVerifying(false);
    }
  };

  const handleDeleteMedicine = useCallback(async (id) => {
    if (!hasAccess([1])) {
      setError('Chỉ Admin có quyền xóa thuốc.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa vị thuốc này khỏi hệ thống?')) return;
    try {
      await api.deleteMedicine(id);
      setMedicines(prev => prev.filter(m => m.id !== id));
      showSuccess('Xóa vị thuốc thành công!');
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa vị thuốc.');
    }
  }, [hasAccess, showSuccess]);

  const handleDeleteMultipleMedicines = useCallback(async (ids, onDone) => {
    if (!hasAccess([1])) {
      setError('Chỉ Admin có quyền xóa thuốc.');
      return;
    }
    if (!ids || ids.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${ids.length} sản phẩm đã chọn khỏi hệ thống? (sản phẩm đã có đơn hàng/lô nhập sẽ chỉ bị ẩn, không mất dữ liệu)`)) return;

    let okCount = 0;
    const failed = [];
    for (const id of ids) {
      try {
        await api.deleteMedicine(id);
        okCount++;
      } catch (err) {
        failed.push(id);
      }
    }
    setMedicines(prev => prev.filter(m => !ids.includes(m.id) || failed.includes(m.id)));
    if (failed.length === 0) {
      showSuccess(`Đã xóa/ẩn thành công ${okCount} sản phẩm.`);
    } else {
      setError(`Xóa được ${okCount}/${ids.length}. ${failed.length} sản phẩm lỗi (id: ${failed.join(', ')}).`);
    }
    if (onDone) onDone();
  }, [hasAccess, showSuccess]);

  // ---- Excel Bulk Import Handlers ----
  const handleImportPreview = async () => {
    if (!importFile) { setError('Vui lòng chọn file Excel (.xlsx)'); return; }
    setImportLoading(true);
    setError('');
    try {
      const data = await api.previewImport(importFile);
      setImportPreviewData(data);
      setImportSessionId(data.importSessionId);
      // Mặc định tick tất cả dòng không lỗi
      const defaultSelected = new Set(
        data.rows.filter(r => r.status !== 'Error' && r.status !== 'Delete').map(r => r.rowIndex)
      );
      setImportSelectedRows(defaultSelected);
      setImportResult(null);
    } catch (err) {
      setError(err.message || 'Không thể đọc file Excel');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importSessionId || importSelectedRows.size === 0) {
      setError('Vui lòng chọn ít nhất 1 dòng để nhập');
      return;
    }
    setImportLoading(true);
    setError('');
    try {
      const result = await api.confirmImport(importSessionId, Array.from(importSelectedRows));
      setImportResult(result);
      setImportPreviewData(null);
      setImportSessionId('');
      // Reload danh sách thuốc
      const meds = await api.fetchMedicines(null, '', null, null, true);
      setMedicines(meds);
      const msgs = [];
      if (result.successCount > 0) msgs.push(`Thêm/Cập nhật ${result.successCount} SP`);
      if (result.deletedCount > 0) msgs.push(`Xóa ${result.deletedCount} SP`);
      showSuccess(`Đồng bộ thành công! ${msgs.join(' — ')}`);
    } catch (err) {
      setError(err.message || 'Không thể xác nhận nhập hàng loạt');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportRow = (rowIndex) => {
    setImportSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreviewData(null);
    setImportSessionId('');
    setImportSelectedRows(new Set());
    setImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(api.getImportTemplateUrl());
      if (!res.ok) throw new Error('Không thể tải file mẫu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau_nhap_duoc_pham.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải file mẫu');
    }
  };

  const handleDownloadExport = async () => {
    try {
      const res = await fetch(api.getExportUrl());
      if (!res.ok) throw new Error('Không thể xuất file danh mục');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danh_muc_duoc_pham_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Lỗi khi xuất danh mục Excel');
    }
  };

  // Add/Edit Product (Herbal Catalog)
  const [productSubmitting, setProductSubmitting] = useState(false);
  // useState cập nhật bất đồng bộ (batch theo re-render) nên nếu bấm nhiều lần thật nhanh
  // (nhanh hơn 1 chu kỳ render), nhiều lần gọi vẫn đọc được productSubmitting=false cùng lúc
  // và lọt qua guard, tạo trùng sản phẩm. Dùng ref để chặn NGAY LẬP TỨC, đồng bộ.
  const productSubmittingRef = useRef(false);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (productSubmittingRef.current) return; // chặn bấm dồn dập tạo trùng sản phẩm
    if (!hasAccess([1])) {
      setError('Chỉ Admin có quyền quản lý kho dược phẩm.');
      return;
    }

    if (!prodName.trim() || !prodPrice || !prodImgUrl.trim()) {
      setError('Vui lòng điền đầy đủ Tên, Giá, và Ảnh sản phẩm!');
      return;
    }

    if (aiVerifyResult && (!aiVerifyResult.isMatch || !aiVerifyResult.isMedicineImage || aiVerifyResult.confidenceScore < 50)) {
      const confirmProceed = window.confirm(
        `⚠️ CẢNH BÁO AI THẨM ĐỊNH:\n\n${aiVerifyResult.warningMessage || 'Hình ảnh bị nghi ngờ không khớp với sản phẩm!'}\n\nBạn có chắc chắn vẫn muốn lưu thông tin này?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    productSubmittingRef.current = true;
    setProductSubmitting(true);
    try {
      const payload = {
        name: prodName,
        category_id: parseInt(prodCategoryId),
        supplier_id: parseInt(prodSupplierId),
        price: parseFloat(prodPrice),
        old_price: prodOldPrice ? parseFloat(prodOldPrice) : null,
        unit: prodUnit,
        origin: prodOrigin,
        packaging: prodPackaging,
        barcode: prodBarcode.trim() || null,
        image_url: prodImgUrl,
        description: prodDesc,
        requires_prescription: prodReqPrescription
      };

      if (editingMedicineId) {
        await api.updateMedicine(editingMedicineId, payload);
        showSuccess('Cập nhật thông tin thảo dược thành công!');
      } else {
        await api.addMedicine(payload);
        showSuccess('Thêm thảo dược mới thành công!');
      }

      // Tải lại danh sách thật từ server thay vì tự chắp dữ liệu trả về —
      // addMedicine/updateMedicine trả JSON camelCase thô, không có các field snake_case
      // mà danh sách đang dùng (image_url, stock_quantity...) nên ảnh/tồn kho sẽ hiện sai nếu tự ghép.
      handleCancelProductEdit();
      await loadTabData();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu sản phẩm. Vui lòng kiểm tra lại!');
    } finally {
      productSubmittingRef.current = false;
      setProductSubmitting(false);
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
    <>
            {showBarcodeScanner && (
              <BarcodeScannerModal
                onDetected={(code) => { setProdBarcode(code); setShowBarcodeScanner(false); showSuccess(`Đã quét mã: ${code}`); }}
                onClose={() => setShowBarcodeScanner(false)}
              />
            )}
            <div className="products-crud-layout">
              {/* LEFT: Add / Edit Form */}
              <div className="admin-card products-form-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    {editingMedicineId ? '✏️ Chỉnh sửa thông tin Dược phẩm' : '➕ Thêm Dược phẩm mới'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '8px 16px', cursor: 'pointer', fontWeight: '600',
                      fontSize: '13px', boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Upload size={15} /> 📤 Import Excel hàng loạt
                  </button>
                </div>
                {prodImgUrl && (
                  <div className="product-img-preview">
                    <img src={api.formatImageUrl(prodImgUrl)} alt="preview" onError={(e) => e.target.style.display='none'} />
                  </div>
                )}
                <form className="add-product-form" onSubmit={handleProductSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Tên thuốc/thảo dược *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Nhân Sâm Cao Cấp, Hoạt Huyết..."
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Danh mục dược liệu *</label>
                      <select
                        className="form-select"
                        value={prodCategoryId}
                        onChange={(e) => setProdCategoryId(e.target.value)}
                      >
                        {categories.length === 0 && <option value="">-- Chưa có danh mục --</option>}
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nhà cung cấp *</label>
                      <select
                        className="form-select"
                        value={prodSupplierId}
                        onChange={(e) => setProdSupplierId(e.target.value)}
                      >
                        {suppliers.length === 0 && <option value="">-- Chưa có nhà cung cấp --</option>}
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name || s.companyName}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Giá bán lẻ (VND) *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        placeholder="95000"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Giá niêm yết cũ (để hiện giảm giá)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="105000"
                        value={prodOldPrice}
                        onChange={(e) => setProdOldPrice(e.target.value)}
                      />
                    </div>

                    {editingMedicineId && (
                      <div className="form-group">
                        <label className="form-label">Số lượng tồn kho hiện tại</label>
                        <div className="form-input" style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', color: '#374151' }}>
                          {(medicines.find(m => m.id === editingMedicineId)?.stock_quantity ?? 0).toLocaleString()}
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>(quản lý qua tab "Kho hàng" — Nhập lô hàng mới)</span>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Đơn vị tính *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Hộp, Chai, Lọ, Thang..."
                        value={prodUnit}
                        onChange={(e) => setProdUnit(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quy cách đóng gói</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Hộp 100 viên, Gói 20 túi lọc..."
                        value={prodPackaging}
                        onChange={(e) => setProdPackaging(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mã vạch (Barcode)</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Quét hoặc nhập mã vạch..."
                          value={prodBarcode}
                          onChange={(e) => setProdBarcode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowBarcodeScanner(true)}
                          title="Quét mã vạch bằng camera"
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
                      <label className="form-label">Xuất xứ *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="Việt Nam, Hàn Quốc..."
                        value={prodOrigin}
                        onChange={(e) => setProdOrigin(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ margin: 0 }}>Hình ảnh (URL) *</label>
                        <button
                          type="button"
                          onClick={handleVerifyImageWithAi}
                          disabled={aiVerifying || !prodImgUrl.trim()}
                          style={{
                            background: aiVerifying ? '#e2e8f0' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                            color: aiVerifying ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: aiVerifying || !prodImgUrl.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(13,148,136,0.2)'
                          }}
                        >
                          {aiVerifying ? '⏳ AI đang kiểm tra...' : '✨ AI Thẩm định ảnh'}
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={prodImgUrl}
                        onChange={(e) => {
                          setProdImgUrl(e.target.value);
                          setAiVerifyResult(null);
                          setAiVerifyError('');
                        }}
                      />

                      {/* AI Verification Banner */}
                      {aiVerifyResult && (
                        <div style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${
                            aiVerifyResult.isMatch && aiVerifyResult.isMedicineImage && aiVerifyResult.confidenceScore >= 70
                              ? '#bbf7d0'
                              : (aiVerifyResult.isMedicineImage ? '#fef08a' : '#fecaca')
                          }`,
                          background:
                            aiVerifyResult.isMatch && aiVerifyResult.isMedicineImage && aiVerifyResult.confidenceScore >= 70
                              ? '#f0fdf4'
                              : (aiVerifyResult.isMedicineImage ? '#fefce8' : '#fef2f2'),
                          fontSize: '13px',
                          color:
                            aiVerifyResult.isMatch && aiVerifyResult.isMedicineImage && aiVerifyResult.confidenceScore >= 70
                              ? '#166534'
                              : (aiVerifyResult.isMedicineImage ? '#854d0e' : '#991b1b')
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700', marginBottom: '2px' }}>
                            <span>
                              {aiVerifyResult.isMatch && aiVerifyResult.isMedicineImage && aiVerifyResult.confidenceScore >= 70
                                ? '✅ Ảnh hợp lệ (AI khớp 90%+)'
                                : (!aiVerifyResult.isMedicineImage ? '🚫 Ảnh không phải Dược phẩm' : '⚠️ Cảnh báo sai khớp ảnh')}
                            </span>
                            <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                              Độ tin cậy: {aiVerifyResult.confidenceScore}%
                            </span>
                          </div>
                          {aiVerifyResult.detectedName && (
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>
                              Tên nhận diện trên ảnh: <strong>{aiVerifyResult.detectedName}</strong>
                            </div>
                          )}
                          {aiVerifyResult.warningMessage && (
                            <div style={{ fontSize: '12px', marginTop: '2px', fontStyle: 'italic' }}>
                              Lý do: {aiVerifyResult.warningMessage}
                            </div>
                          )}
                        </div>
                      )}

                      {aiVerifyError && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>
                          ❌ {aiVerifyError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: '8px 0' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        id="req-pres-herbal"
                        checked={prodReqPrescription}
                        onChange={(e) => setProdReqPrescription(e.target.checked)}
                      />
                      <label htmlFor="req-pres-herbal" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                        Yêu cầu có đơn thuốc của Bác sĩ mới được mua
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 24px' }}>
                      Bật ô này: sản phẩm sẽ <strong>KHÔNG hiển thị</strong> trên trang bán hàng công khai (trang chủ, danh mục, tìm kiếm) —
                      chỉ Dược sĩ/Admin nhìn thấy trong màn hình Kê đơn, Quản lý kho, Quản lý dược phẩm để đưa vào toa thuốc.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mô tả chi tiết</label>
                    <textarea
                      className="form-textarea"
                      rows="3"
                      placeholder="Mô tả công dụng, tính vị quy kinh, liều dùng..."
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                    />
                  </div>

                  <div className="product-form-actions">
                    <button type="submit" className="add-submit-btn" disabled={productSubmitting}>
                      {productSubmitting ? '⏳ Đang lưu...' : (editingMedicineId ? '💾 Lưu thay đổi' : '➕ Thêm dược liệu mới')}
                    </button>
                    {editingMedicineId && (
                      <button type="button" className="cancel-edit-btn" onClick={handleCancelProductEdit} disabled={productSubmitting}>
                        ✕ Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT: Medicine list with Edit/Delete */}
              <MedicineListPanel
                medicines={medicines}
                editingMedicineId={editingMedicineId}
                onEdit={handleEditMedicineClick}
                onDelete={handleDeleteMedicine}
                onDeleteMultiple={handleDeleteMultipleMedicines}
              />
            </div>
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#065f46' }}>
                  📤 Quản lý Dược phẩm 2 chiều qua Excel
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Xuất toàn bộ danh mục → chỉnh sửa → nhập lại để đồng bộ (Thêm / Sửa / Xóa). Hỗ trợ ảnh nhúng và link URL.
                </p>
              </div>
              <button onClick={handleCloseImportModal} style={{
                background: 'none', border: '1px solid #d1d5db', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer', color: '#6b7280', fontSize: '13px'
              }}>✕ Đóng</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* Step 1: Download + Upload */}
              {!importResult && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                      borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                      fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap'
                    }}
                  >
                    ⬇️ Tải file mẫu rỗng
                  </button>

                  {/* NÚT XUẤT TOÀN BỘ DANH MỤC */}
                  <button
                    type="button"
                    onClick={handleDownloadExport}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                      fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(14,165,233,0.35)'
                    }}
                  >
                    📥 Xuất toàn bộ danh mục ra Excel
                  </button>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: importFile ? '#f0fdf4' : '#f9fafb',
                    color: importFile ? '#065f46' : '#374151',
                    border: `1px solid ${importFile ? '#86efac' : '#d1d5db'}`,
                    borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '13px', flex: 1, minWidth: '220px'
                  }}>
                    📂 {importFile ? importFile.name : 'Chọn file Excel (.xlsx)'}
                    <input
                      type="file" accept=".xlsx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        setImportFile(e.target.files[0] || null);
                        setImportPreviewData(null);
                        setImportResult(null);
                      }}
                    />
                  </label>

                  <button
                    onClick={handleImportPreview}
                    disabled={!importFile || importLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: (!importFile || importLoading) ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: (!importFile || importLoading) ? '#9ca3af' : '#fff',
                      border: 'none', borderRadius: '8px', padding: '10px 20px',
                      cursor: (!importFile || importLoading) ? 'not-allowed' : 'pointer',
                      fontWeight: '600', fontSize: '13px'
                    }}
                  >
                    {importLoading ? '⏳ Đang xử lý...' : '🔍 Xem trước dữ liệu'}
                  </button>
                </div>
              )}

              {/* Preview Table */}
              {importPreviewData && !importResult && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                      Tổng <strong>{importPreviewData.totalRows}</strong> dòng — đang chọn <strong>{importSelectedRows.size}</strong> dòng để nhập
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setImportSelectedRows(new Set(
                        importPreviewData.rows
                          .filter(r => r.status !== 'Error' && r.status !== 'Delete')
                          .map(r => r.rowIndex)
                      ))}
                        style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}>
                        ☑️ Chọn tất cả (không tính Xóa)
                      </button>
                      <button onClick={() => setImportSelectedRows(new Set())}
                        style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}>
                        ☐ Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '40px' }}>✓</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '70px' }}>Ảnh</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tên sản phẩm</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Danh mục</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Giá bán</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ghi chú lỗi / cảnh báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewData.rows.map(row => {
                          const isSelected = importSelectedRows.has(row.rowIndex);
                          const isDelete = row.status === 'Delete';
                          const isError = row.status === 'Error';
                          const statusColor = isDelete ? '#7f1d1d' : row.status === 'New' ? '#16a34a' : row.status === 'Update' ? '#ca8a04' : '#dc2626';
                          const statusBg = isDelete ? '#fef2f2' : row.status === 'New' ? '#f0fdf4' : row.status === 'Update' ? '#fefce8' : '#fff5f5';
                          const statusLabel = isDelete ? '⚠️ SẼ XÓA VĨNH VIỄN' : row.status === 'New' ? '✨ Mới' : row.status === 'Update' ? '🔄 Cập nhật' : '❌ Lỗi';
                          return (
                            <tr key={row.rowIndex} style={{
                              background: isDelete ? '#fef2f2' : isError ? '#fff5f5' : isSelected ? '#f0fdf4' : '#fff',
                              borderBottom: '1px solid #f3f4f6',
                              opacity: isError ? 0.75 : 1,
                              outline: isDelete && isSelected ? '2px solid #dc2626' : 'none'
                            }}>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                {isDelete ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleImportRow(row.rowIndex)}
                                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#dc2626' }}
                                    />
                                    {!isSelected && <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: '700' }}>tick để xóa</span>}
                                  </div>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isError}
                                    onChange={() => toggleImportRow(row.rowIndex)}
                                    style={{ cursor: isError ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {row.imageThumbnailBase64 ? (
                                  <img
                                    src={row.imageThumbnailBase64}
                                    alt={row.name}
                                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '52px', height: '52px', borderRadius: '6px',
                                    background: '#f3f4f6', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '20px', margin: '0 auto'
                                  }}>🌿</div>
                                )}
                              </td>
                              <td style={{ padding: '10px', fontWeight: '600', color: '#1f2937', maxWidth: '180px' }}>
                                {row.name || <em style={{ color: '#9ca3af' }}>Tên rỗng</em>}
                              </td>
                              <td style={{ padding: '10px', color: '#6b7280' }}>{row.categoryName}</td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                                {row.price > 0
                                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.price)
                                  : <span style={{ color: '#9ca3af' }}>Liên hệ</span>}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
                                  fontWeight: '700', fontSize: '11px',
                                  background: statusBg, color: statusColor, border: `1px solid ${statusColor}40`
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{ padding: '10px', fontSize: '12px' }}>
                                {row.errorMessage && <div style={{ color: '#dc2626', fontWeight: '600' }}>⚠️ {row.errorMessage}</div>}
                                {row.warnings?.map((w, i) => (
                                  <div key={i} style={{ color: '#92400e' }}>💡 {w}</div>
                                ))}
                                {!row.errorMessage && (!row.warnings || row.warnings.length === 0) && (
                                  <span style={{ color: '#9ca3af' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Kết quả sau confirm */}
              {importResult && (
                <div style={{
                  textAlign: 'center', padding: '40px 20px',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
                  <h3 style={{ margin: '0 0 8px', color: '#065f46', fontSize: '22px' }}>
                    Đồng bộ hoàn tất!
                  </h3>
                  {importResult.successCount > 0 && (
                    <p style={{ margin: '0 0 4px', fontSize: '16px', color: '#374151' }}>
                      ✅ Thêm/Cập nhật: <strong style={{ color: '#16a34a', fontSize: '20px' }}>{importResult.successCount}</strong> sản phẩm
                    </p>
                  )}
                  {importResult.deletedCount > 0 && (
                    <p style={{ margin: '4px 0', fontSize: '15px', color: '#7f1d1d' }}>
                      🗑️ Đã xóa: <strong>{importResult.deletedCount}</strong> sản phẩm
                    </p>
                  )}
                  {importResult.failedCount > 0 && (
                    <p style={{ margin: '4px 0', color: '#dc2626', fontSize: '14px' }}>
                      ❌ Thất bại: <strong>{importResult.failedCount}</strong> dòng
                    </p>
                  )}
                  <button
                    onClick={handleCloseImportModal}
                    style={{
                      marginTop: '20px', padding: '10px 28px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '700', fontSize: '14px'
                    }}
                  >
                    Đóng & Xem danh sách mới
                  </button>
                </div>
              )}
            </div>

            {/* Footer: Confirm button */}
            {importPreviewData && !importResult && (
              <div style={{
                padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'flex-end', gap: '10px',
                background: '#f9fafb'
              }}>
                {/* Cảnh báo nếu có dòng Xóa được tick */}
                {importPreviewData && (() => {
                  const deleteCount = importPreviewData.rows.filter(
                    r => r.status === 'Delete' && importSelectedRows.has(r.rowIndex)
                  ).length;
                  return deleteCount > 0 ? (
                    <div style={{
                      padding: '8px 14px', background: '#fef2f2', borderRadius: '8px',
                      border: '1px solid #fca5a5', color: '#7f1d1d', fontSize: '13px', fontWeight: '600'
                    }}>
                      ⚠️ Xác nhận sẽ XÓA {deleteCount} sản phẩm. Không thể hoàn tác!
                    </div>
                  ) : null;
                })()}
                <button onClick={handleCloseImportModal} style={{
                  padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px',
                  cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: '600'
                }}>
                  Hủy
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={importSelectedRows.size === 0 || importLoading}
                  style={{
                    padding: '10px 24px', border: 'none', borderRadius: '8px',
                    cursor: importSelectedRows.size === 0 ? 'not-allowed' : 'pointer',
                    background: importSelectedRows.size === 0
                      ? '#e5e7eb'
                      : 'linear-gradient(135deg, #059669, #10b981)',
                    color: importSelectedRows.size === 0 ? '#9ca3af' : '#fff',
                    fontWeight: '700', fontSize: '14px'
                  }}
                >
                  {importLoading ? '⏳ Đang xử lý...' : `✅ Xác nhận ${importSelectedRows.size} dòng`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductsTab;
