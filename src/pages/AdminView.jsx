import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import * as api from '../services/api';
import { 
  ShoppingCart, Star, Leaf, Eye, Calendar, Plus, Edit2, Trash2, 
  User, Users, Activity, FileText, Package, BarChart2, Shield, Check, X, Info, Tag, MessageSquare, Upload, CheckCircle2, CheckCheck, AlertTriangle, UserCog, Download, Search
} from 'lucide-react';
import PharmacyChatDashboard from '../components/admin/PharmacyChatDashboard';
import {
  getPrescriptionStatusClass,
  getPrescriptionStatusLabel,
  PRESCRIPTION_ACTION,
} from '../utils/prescriptionStatus';
import { toLocalWallClockIso } from '../utils/dateTime';
import { formatDateTimeVN, formatDateVN } from '../utils/dateUtils';
import './AdminView.css';

const FALLBACK_MED_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23e5e7eb'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='26'>🌿</text></svg>";

const ORDER_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Pending', label: 'Đang xử lý' },
  { key: 'Shipping', label: 'Đang giao' },
  { key: 'Delivered', label: 'Đã giao' },
  { key: 'Cancelled', label: 'Đã hủy' },
  { key: 'Returned', label: 'Trả hàng' }
];

// Tách riêng + memo hóa để danh sách hàng trăm sản phẩm không re-render mỗi khi gõ phím
// trong form thêm/sửa sản phẩm bên cạnh (2 khối này cùng nằm trong AdminView).
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

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders | patients | appointments | prescriptions | inventory | users | stats | products
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [categoryRevenueData, setCategoryRevenueData] = useState([]);
  const [staffRevenueData, setStaffRevenueData] = useState([]);
  const [statsDateFrom, setStatsDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [statsDateTo, setStatsDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [customRevenueTrend, setCustomRevenueTrend] = useState(null);
  const [statsRangeLoading, setStatsRangeLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [profitReport, setProfitReport] = useState([]);

  // Nhập kho theo lô (batch/lot) — state
  const [batchMedicineId, setBatchMedicineId] = useState('');
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

  // Voucher form state
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const emptyVoucherForm = {
    code: '', name: '', discountType: 'percent', discountValue: '',
    minOrderValue: '', maxDiscount: '', endDate: '', usageLimit: 100, isActive: true,
    type: 'product', isWheelPrize: false, weight: 0
  };
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);

  // News form state
  const [newsArticles, setNewsArticles] = useState([]);
  const [editingNewsId, setEditingNewsId] = useState(null);
  const emptyNewsForm = {
    title: '', excerpt: '', content: '', tag: 'Dinh dưỡng', imageUrl: '', isActive: true
  };
  const [newsForm, setNewsForm] = useState(emptyNewsForm);

  // Form States - Patient
  const [patientModal, setPatientModal] = useState(null); // 'add' | 'edit' | null
  const [currentPatient, setCurrentPatient] = useState({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });
  const [viewingPatient, setViewingPatient] = useState(null); // Hồ sơ bệnh nhân đang xem chi tiết | null
  const [patientDiagnosisHistory, setPatientDiagnosisHistory] = useState([]);
  const [patientDetailLoading, setPatientDetailLoading] = useState(false);

  // Form States - Appointment
  const [appointmentModal, setAppointmentModal] = useState(null); // 'add' | 'edit' | null
  const [currentAppointment, setCurrentAppointment] = useState({ patientId: '', doctorId: '', appointmentDate: '', reason: '', status: 'PendingConfirmation', notes: '' });

  // Form States - Prescription
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

  // Form States - Product (Herbal Medicine)
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState(1); // Default to Herbal TPCN
  const [prodSupplierId, setProdSupplierId] = useState(1);
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('Hộp');
  const [prodOrigin, setProdOrigin] = useState('Việt Nam');
  const [prodPackaging, setProdPackaging] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodReqPrescription, setProdReqPrescription] = useState(false);

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

  // Current logged in user profile (from localStorage)
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setLoggedInUser(parsedUser);
        if (parsedUser.role_id === 1) {
          setActiveTab('users');
        } else {
          setActiveTab('orders');
        }
      } catch (e) {
        console.error('Dữ liệu người dùng trong localStorage bị hỏng', e);
      }
    }
  }, []);

  // Main Loader
  useEffect(() => {
    loadTabContent();
  }, [activeTab]);

  const loadTabContent = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'orders') {
        const data = await api.fetchAdminOrders();
        setOrders(data);
      } else if (activeTab === 'patients') {
        const data = await api.fetchPatients();
        setPatients(data);
      } else if (activeTab === 'appointments') {
        const data = await api.fetchAppointments();
        setAppointments(data);
        const usersData = await api.fetchUsers();
        setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors
        const patientsData = await api.fetchPatients();
        setPatients(patientsData);
      } else if (activeTab === 'prescriptions') {
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
      } else if (activeTab === 'inventory') {
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
      } else if (activeTab === 'users') {
        const data = await api.fetchUsers();
        setUsers(data);
      } else if (activeTab === 'stats') {
        const last30From = new Date(Date.now() - 30 * 86400000).toISOString();
        const last30To = new Date().toISOString();
        const [ordersData, patientsData, appointmentsData, medData, repData, statusData, catRevData, staffRevData] = await Promise.all([
          api.fetchAdminOrders().catch(() => []),
          api.fetchPatients().catch(() => []),
          api.fetchAppointments().catch(() => []),
          api.fetchMedicines(null, '', null, null, true).catch(() => []),
          api.fetchReportDashboard().catch(err => { console.warn(err); return null; }),
          api.fetchReportOrderStatus().catch(() => []),
          api.fetchReportCategoryRevenue(last30From, last30To).catch(() => []),
          api.fetchReportStaffRevenue(last30From, last30To).catch(() => []),
        ]);
        setOrders(ordersData);
        setPatients(patientsData);
        setAppointments(appointmentsData);
        setMedicines(medData);
        setReportData(repData);
        setOrderStatusData(statusData);
        setCategoryRevenueData(catRevData);
        setStaffRevenueData(staffRevData);
      } else if (activeTab === 'products') {
        const [medData, catData, supData] = await Promise.all([
          api.fetchMedicines(null, '', null, null, true),
          api.fetchCategories().catch(() => []),
          api.fetchSuppliers().catch(() => []),
        ]);
        setMedicines(medData);
        setCategories(catData);
        setSuppliers(supData);
      } else if (activeTab === 'vouchers') {
        const data = await api.fetchAdminVouchers();
        setVouchers(data);
      } else if (activeTab === 'news') {
        const data = await api.fetchNewsArticles();
        setNewsArticles(data);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  // ==== Nhập kho theo lô (batch/lot) ====
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
    if (activeTab === 'inventory' && batchMedicineId) {
      loadExistingBatches(batchMedicineId, batchWarehouseId);
    }
  }, [batchMedicineId, batchWarehouseId, activeTab]);

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

  // Roles Authorization - Admin (role_id === 1) luôn có toàn quyền truy cập tất cả chức năng
  const hasAccess = useCallback((allowedRoles) => {
    if (!loggedInUser) return false;
    if (loggedInUser.role_id === 1) return true;
    return allowedRoles.includes(loggedInUser.role_id);
  }, [loggedInUser]);

  // Orders functions
  const handleStatusChange = async (orderId, newStatus) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền cập nhật trạng thái đơn hàng.');
      return;
    }
    try {
      await api.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showSuccess('Cập nhật trạng thái đơn hàng thành công!');
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handleConfirmDelivered = async (orderId) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền xác nhận đã giao.');
      return;
    }
    try {
      await api.updateOrderStatus(orderId, { status: 'Delivered' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
      showSuccess('Đã xác nhận đơn hàng giao thành công!');
    } catch (err) {
      setError('Lỗi khi xác nhận đã giao đơn hàng.');
    }
  };

  // COD: xác nhận đã thu tiền mặt khi giao hàng (chỉ đơn đã giao, chưa thu, thanh toán COD)
  const handleConfirmCashCollected = async (order) => {
    if (!hasAccess([1, 3, 6])) {
      setError('Bạn không có quyền xác nhận thu tiền.');
      return;
    }
    if (!order.paymentId) {
      setError('Đơn hàng chưa có bản ghi thanh toán để cập nhật.');
      return;
    }
    if (!window.confirm(`Xác nhận đã thu tiền mặt ${formatPrice(order.total_amount || order.totalAmount)} của đơn #${order.id}?`)) return;
    try {
      await api.updatePaymentStatus(order.paymentId, 'Success');
      showSuccess(`Đã xác nhận thu tiền đơn #${order.id}!`);
      await loadTabContent();
    } catch (err) {
      setError('Lỗi khi xác nhận thu tiền đơn hàng.');
    }
  };

  const handleApproveReturn = async (order) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền duyệt trả hàng.');
      return;
    }
    if (!window.confirm(`Duyệt trả hàng cho đơn #${order.id}?\nSố tiền ${formatPrice(order.total_amount || order.totalAmount)} sẽ được hoàn lại cho khách hàng.`)) return;
    try {
      await api.updateOrderStatus(order.id, { status: 'Returned', paymentStatus: 'Refunded' });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Returned', paymentStatus: 'Refunded', payment_status: 'Refunded' } : o));
      showSuccess('Đã duyệt trả hàng và hoàn tiền cho khách hàng!');
    } catch (err) {
      setError('Lỗi khi duyệt trả hàng.');
    }
  };

  const handleRejectReturn = async (order) => {
    if (!hasAccess([3])) {
      setError('Chỉ nhân viên nhà thuốc có quyền từ chối trả hàng.');
      return;
    }
    if (!window.confirm(`Từ chối yêu cầu trả hàng của đơn #${order.id}?`)) return;
    try {
      await api.updateOrderStatus(order.id, { status: 'Delivered' });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Delivered', returnReason: '' } : o));
      showSuccess('Đã từ chối yêu cầu trả hàng.');
    } catch (err) {
      setError('Lỗi khi từ chối trả hàng.');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'Returned') return o.status === 'Returned' || o.status === 'ReturnRequested';
    return o.status === orderFilter;
  });

  const returnRequests = orders.filter(o => o.status === 'ReturnRequested');

  // Payment reconcile - only Admin/Accountant (Pharmacy chỉ xem)
  const handlePaymentReconcile = async (order, newPaymentStatus) => {
    if (!hasAccess([1, 6])) {
      setError('Chỉ Quản trị viên hoặc Kế toán mới được đối soát thanh toán.');
      return;
    }
    if (!order.paymentId) {
      setError('Đơn hàng chưa có bản ghi thanh toán để cập nhật.');
      return;
    }
    const statusMap = {
      Paid: 'Success',
      Success: 'Success',
      Unpaid: 'Pending',
      Pending: 'Pending',
      Failed: 'Failed',
      Refunded: 'Refunded',
    };
    try {
      await api.updatePaymentStatus(order.paymentId, statusMap[newPaymentStatus] || newPaymentStatus);
      showSuccess('Cập nhật trạng thái thanh toán thành công!');
      await loadTabContent();
    } catch (err) {
      setError('Lỗi khi cập nhật thanh toán.');
    }
  };

  // Patients functions
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

  // Appointments functions
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
      loadTabContent();
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
      await loadTabContent();
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
      await loadTabContent();
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
      await loadTabContent();
    } catch (err) {
      setError(err.message || 'Lỗi khi hoàn thành lịch hẹn.');
    }
  };

  const handleCheckInAppointment = async (id) => {
    try { await api.checkInAppointment(id); showSuccess('Đã check-in bệnh nhân!'); await loadTabContent(); }
    catch (err) { setError(err.message || 'Không thể check-in.'); }
  };

  const handleNoShowAppointment = async (id) => {
    if (!window.confirm('Xác nhận khách không đến? Tiền cọc sẽ không được hoàn.')) return;
    try { await api.markAppointmentNoShow(id); showSuccess('Đã đánh dấu khách không đến.'); await loadTabContent(); }
    catch (err) { setError(err.message || 'Không thể đánh dấu không đến.'); }
  };

  const handleApplyStatsDateRange = async () => {
    if (!statsDateFrom || !statsDateTo) return;
    setStatsRangeLoading(true);
    setError('');
    try {
      const fromIso = new Date(statsDateFrom).toISOString();
      const toIso = new Date(statsDateTo + 'T23:59:59').toISOString();
      const [trend, catRev, staffRev] = await Promise.all([
        api.fetchReportRevenue(fromIso, toIso, 'Day'),
        api.fetchReportCategoryRevenue(fromIso, toIso).catch(() => []),
        api.fetchReportStaffRevenue(fromIso, toIso).catch(() => []),
      ]);
      setCustomRevenueTrend(trend);
      setCategoryRevenueData(catRev);
      setStaffRevenueData(staffRev);
    } catch (err) {
      setError(err.message || 'Không thể tải thống kê theo khoảng thời gian đã chọn.');
    } finally {
      setStatsRangeLoading(false);
    }
  };

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
      await loadTabContent();
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

  // User Administration
  const handleUserRoleChange = async (userId, roleName) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền phân quyền người dùng.');
      return;
    }
    try {
      await api.updateUserRole(userId, roleName);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleName: roleName } : u));
      showSuccess('Cập nhật quyền người dùng thành công!');
      loadTabContent();
    } catch (err) {
      setError('Lỗi khi đổi quyền người dùng.');
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền kích hoạt/khóa tài khoản.');
      return;
    }
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      showSuccess('Cập nhật trạng thái hoạt động thành công!');
    } catch (err) {
      setError('Lỗi khi thay đổi trạng thái hoạt động.');
    }
  };

  const [editingMedicineId, setEditingMedicineId] = useState(null);

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
      await loadTabContent();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu sản phẩm. Vui lòng kiểm tra lại!');
    } finally {
      productSubmittingRef.current = false;
      setProductSubmitting(false);
    }
  };


  // Helper Formats
  const formatPrice = (price) => {
    if (price == null) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => formatDateTimeVN(dateStr);

  // Stats Logic
  const getStats = () => {
    if (reportData) {
      return {
        revenue: reportData.totalRevenue !== undefined ? reportData.totalRevenue : (reportData.TotalRevenue || 0),
        ordersCount: reportData.totalOrders !== undefined ? reportData.totalOrders : (reportData.TotalOrders || 0),
        patientsCount: reportData.totalCustomers !== undefined ? reportData.totalCustomers : (reportData.TotalCustomers || patients.length),
        appointmentsCount: appointments.length,
        pendingOrders: orders.filter(o => o.status === 'Pending').length,
        activeAppointments: appointments.filter(a => a.status === 'PendingConfirmation' || a.status === 'Scheduled' || a.status === 'Confirmed').length,
        lowStockCount: reportData.lowStockCount !== undefined ? reportData.lowStockCount : (reportData.LowStockCount || 0),
        medicinesCount: reportData.totalMedicines !== undefined ? reportData.totalMedicines : (reportData.TotalMedicines || medicines.length)
      };
    }

    const totalRev = orders.filter(o => o.payment_status === 'Paid').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const lowStock = medicines.filter(m => m.stock_quantity < 20);
    return {
      revenue: totalRev,
      ordersCount: orders.length,
      patientsCount: patients.length,
      appointmentsCount: appointments.length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      activeAppointments: appointments.filter(a => a.status === 'PendingConfirmation' || a.status === 'Scheduled' || a.status === 'Confirmed').length,
      lowStockCount: lowStock.length,
      medicinesCount: medicines.length
    };
  };

  const stats = activeTab === 'stats' ? getStats() : {};

  return (
    <div className="admin-container">
      {/* Role Banner / Auth details */}
      <div className="admin-role-badge">
        <Shield size={16} />
        <span>Tài khoản: <strong>{loggedInUser?.username}</strong> - Vai trò: 
          <strong className="role-highlight">
            {loggedInUser?.role_id === 1 && ' Quản trị viên (Admin)'}
            {loggedInUser?.role_id === 3 && ' Nhân viên Nhà thuốc (Pharmacy)'}
          </strong>
        </span>
      </div>

      <div className="admin-header">
        <div className="admin-title-wrap">
          <Leaf className="admin-title-icon" />
          <h2 className="admin-title">
            {loggedInUser?.role_id === 1 ? 'Bảng Quản Trị Hệ Thống' : 'Bảng Điều Hành Nhà Thuốc & Lâm Sàng'}
          </h2>
        </div>
        
        {/* Navigation Tabs based on Role */}
        <div className="admin-tabs">
          {/* ALL MANAGEMENT TABS FOR ADMIN (1), PHARMACY (3), ACCOUNTANT (6) */}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ShoppingCart size={16} /> Đơn hàng
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
              <Users size={16} /> Hồ sơ Bệnh nhân
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
              <Calendar size={16} /> Lịch hẹn Khám
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
              <FileText size={16} /> Chẩn đoán & Kê đơn
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <Package size={16} /> Kho Dược liệu
            </button>
          )}
          {hasAccess([1, 3, 6]) && (
            <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <BarChart2 size={16} /> Báo cáo & Thống kê
            </button>
          )}
          {hasAccess([1, 3]) && (
            <button className={`admin-tab-btn ${activeTab === 'pharmacy-chat' ? 'active' : ''}`} onClick={() => setActiveTab('pharmacy-chat')}>
              <MessageSquare size={16} /> Tư vấn trực tuyến
            </button>
          )}

          {/* ADMIN TABS: User Management + Medicine CRUD + Vouchers */}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <User size={16} /> Quản lý Người dùng
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Package size={16} /> Quản lý Dược phẩm
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'vouchers' ? 'active' : ''}`} onClick={() => setActiveTab('vouchers')}>
              <Tag size={16} /> Voucher & Khuyến mãi
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
              <FileText size={16} /> Tin tức sức khỏe
            </button>
          )}
        </div>
      </div>

      {success && <div className="admin-success-msg">{success}</div>}
      {error && <div className="admin-error-msg">{error}</div>}

      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
        </div>
      ) : (
        <div className="admin-tab-content">
          
          {/* TAB: ORDERS & INVOICES */}
          {activeTab === 'orders' && (
            <div className="admin-card">
              <h3 className="card-title">Quản lý Đơn đặt hàng & Thu tiền</h3>

              {/* Return approval area */}
              {returnRequests.length > 0 && (
                <div className="return-approval-box">
                  <h4 className="return-approval-title">🔄 Yêu cầu trả hàng chờ duyệt ({returnRequests.length})</h4>
                  {returnRequests.map(r => (
                    <div key={r.id} className="return-approval-row">
                      <div className="return-approval-info">
                        <div className="return-approval-head">
                          <strong>Đơn #{r.id}</strong>
                          <span>— {r.username} ({r.email || 'không có email'})</span>
                        </div>
                        <div className="return-approval-reason">Lý do: {r.returnReason || 'Không có lý do'}</div>
                      </div>
                      <div className="return-approval-actions">
                        <button className="btn-approve" onClick={() => handleApproveReturn(r)}>Duyệt trả & hoàn tiền</button>
                        <button className="btn-reject" onClick={() => handleRejectReturn(r)}>Từ chối</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status filter tabs */}
              <div className="admin-orders-tabs">
                {ORDER_FILTERS.map(f => {
                  const count = f.key === 'all'
                    ? orders.length
                    : f.key === 'Returned'
                      ? orders.filter(o => o.status === 'Returned' || o.status === 'ReturnRequested').length
                      : orders.filter(o => o.status === f.key).length;
                  return (
                    <button
                      key={f.key}
                      className={`admin-orders-tab ${orderFilter === f.key ? 'active' : ''}`}
                      onClick={() => setOrderFilter(f.key)}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="admin-empty">Không có đơn đặt hàng nào ở trạng thái này.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Đơn</th>
                        <th>Khách hàng</th>
                        <th>Thời gian</th>
                        <th>Nội dung đơn hàng</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái giao</th>
                        <th>Thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const detail = o.paymentStatusDetail || '';
                        const paymentStatus = detail === 'Success'
                          ? 'Paid'
                          : detail === 'Refunded'
                            ? 'Refunded'
                            : detail === 'Failed'
                              ? 'Failed'
                              : (o.payment_status || o.paymentStatus || 'Unpaid');
                        const statusCls = (o.status || '').toLowerCase() === 'returnrequested' ? 'return-requested' : (o.status || '').toLowerCase();
                        return (
                          <tr key={o.id}>
                            <td className="col-id">#{o.id}</td>
                            <td>
                              <strong>{o.username}</strong>
                              <div className="sub-text">{o.email}</div>
                            </td>
                            <td>{formatDate(o.created_at || o.createdAt)}</td>
                            <td>
                              <div className="order-items-list">
                                {o.items && o.items.map(item => (
                                  <div key={item.id} className="item-line">
                                    • {item.medicine_name || item.medicineName} (x{item.quantity})
                                  </div>
                                ))}
                                {o.returnReason && (
                                  <div className="return-reason-cell">🔄 Lý do trả: {o.returnReason}</div>
                                )}
                              </div>
                            </td>
                            <td className="col-total">{formatPrice(o.total_amount || o.totalAmount)}</td>
                            <td>
                              <div className="order-status-cell">
                                <span className={`status-text ${statusCls}`}>
                                  {o.status === 'ReturnRequested' ? 'Chờ duyệt trả hàng'
                                    : o.status === 'Returned' ? 'Đã trả hàng'
                                      : o.status === 'Pending' ? 'Chờ duyệt'
                                        : o.status === 'Shipping' ? 'Đang giao'
                                          : o.status === 'Delivered' ? 'Đã giao'
                                            : o.status === 'Cancelled' ? 'Đã hủy' : o.status}
                                </span>
                                {o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'ReturnRequested' && (
                                  <button
                                    className="confirm-delivered-btn"
                                    onClick={() => handleConfirmDelivered(o.id)}
                                    title="Xác nhận đã giao hàng cho khách"
                                  >
                                    ✓ Xác nhận đã giao
                                  </button>
                                )}
                                {o.status === 'Delivered' && o.paymentMethod === 'COD' && o.paymentId && paymentStatus !== 'Paid' && paymentStatus !== 'Refunded' && hasAccess([1, 3, 6]) && (
                                  <button
                                    className="collect-cash-btn"
                                    onClick={() => handleConfirmCashCollected(o)}
                                    title="Xác nhận đã thu tiền mặt khi giao hàng (COD)"
                                  >
                                    ✓ Xác nhận đã thu tiền
                                  </button>
                                )}
                                {o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'ReturnRequested' && (
                                  <select
                                    className={`status-select ${statusCls}`}
                                    value={o.status}
                                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                  >
                                    <option value="Pending">Chờ duyệt</option>
                                    <option value="Shipping">Đang giao</option>
                                    <option value="Delivered">Đã giao</option>
                                    <option value="Cancelled">Đã hủy</option>
                                  </select>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`payment-toggle-btn ${paymentStatus.toLowerCase()}`}>
                                {paymentStatus === 'Paid' ? 'Đã thu tiền' : paymentStatus === 'Refunded' ? 'Đã hoàn tiền' : 'Chưa thu tiền'}
                              </span>
                              {hasAccess([1, 6]) && (
                                <select
                                  className="payment-reconcile-select"
                                  value={paymentStatus}
                                  onChange={(e) => handlePaymentReconcile(o, e.target.value)}
                                  title="Đối soát thanh toán (Admin/Kế toán)"
                                >
                                  <option value="Paid">Đã thu (Success)</option>
                                  <option value="Unpaid">Chưa thu</option>
                                  <option value="Failed">Thất bại</option>
                                  <option value="Refunded">Hoàn tiền</option>
                                </select>
                              )}
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

          {/* TAB: PATIENT MANAGEMENT */}
          {activeTab === 'patients' && (
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
          )}

          {/* TAB: APPOINTMENT MANAGEMENT */}
          {activeTab === 'appointments' && (
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
          )}

          {/* TAB: DIAGNOSIS & PRESCRIPTION */}
          {activeTab === 'prescriptions' && (
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
                                  <strong style={{ color: '#b91c1c' }}>Không tìm thấy trong hệ thống — vui lòng tự thêm thủ công bên dưới:</strong>
                                  <ul style={{ margin: '4px 0 0 16px' }}>
                                    {ocrResult.items.filter(it => !it.matchedMedicineId).map((it, idx) => <li key={idx}>{it.rawText}</li>)}
                                  </ul>
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
          )}

          {/* TAB: INVENTORY & WAREHOUSE */}
          {activeTab === 'inventory' && (
            <>
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
                    <select className="form-select" value={batchMedicineId} onChange={(e) => setBatchMedicineId(e.target.value)}>
                      <option value="">-- Chọn thuốc/dược liệu --</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
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
          )}

          {/* TAB: USER ADMINISTRATION */}
          {activeTab === 'users' && (
            <div className="admin-card">
              <h3 className="card-title">Phân quyền & Quản lý Tài khoản người dùng</h3>
              {users.length === 0 ? (
                <div className="admin-empty">Không tìm thấy người dùng.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên tài khoản</th>
                        <th>Email đăng ký</th>
                        <th>Số điện thoại</th>
                        <th>Vai trò hiện tại</th>
                        <th>Ngày tạo</th>
                        <th>Trạng thái hoạt động</th>
                        <th>Phân quyền lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="col-id">#{u.id}</td>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td>{u.phone || 'Chưa đăng ký'}</td>
                          <td>
                            <span className={`role-badge role-${u.role_id}`}>
                              {u.roleName}
                            </span>
                          </td>
                          <td>{formatDate(u.created_at)}</td>
                          <td>
                            <button
                              className={`user-status-btn ${u.is_active ? 'active' : 'blocked'}`}
                              onClick={() => handleUserStatusToggle(u.id, u.is_active)}
                            >
                              {u.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                            </button>
                          </td>
                          <td>
                            <select 
                              className="role-assign-select"
                              value={u.roleName || "User"}
                              onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            >
                              <option value="Admin">Quản trị viên (Admin)</option>
                              <option value="User">Khách hàng / Bệnh nhân (User)</option>
                              <option value="Pharmacy">Nhân viên Nhà thuốc (Pharmacy)</option>
                              <option value="Staff">Nhân viên Lễ tân / Bệnh viện (Staff)</option>
                              <option value="Doctor">Bác sĩ / Thầy thuốc (Doctor)</option>
                              <option value="Accountant">Kế toán (Accountant)</option>
                              <option value="Warehouse">Thủ kho (Warehouse)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: STATS, CLINIC REPORTS */}
          {activeTab === 'stats' && (
            <div className="stats-dashboard">
              {/* Summary Cards */}
              <div className="stats-summary-grid">
                <div className="stat-summary-card revenue">
                  <div className="card-icon-wrap"><BarChart2 size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{formatPrice(reportData?.totalRevenue ?? 0)}</span>
                    <span className="stat-lbl">💰 Tổng Doanh thu Thực tế (Đã thu)</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Bán hàng: {formatPrice(reportData?.productSalesRevenue ?? 0)} · Đặt cọc khám: {formatPrice(reportData?.appointmentDepositRevenue ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="stat-summary-card patients">
                  <div className="card-icon-wrap"><Users size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.patientsCount || reportData?.totalCustomers || patients.length}</span>
                    <span className="stat-lbl">👥 Tổng Khách hàng & Bệnh nhân</span>
                  </div>
                </div>

                <div className="stat-summary-card appointments">
                  <div className="card-icon-wrap"><Calendar size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{orders.length}</span>
                    <span className="stat-lbl">📦 Tổng Đơn hàng ({orders.filter(o => o.paymentStatus === 'Paid' || o.payment_status === 'Paid').length} Đã thanh toán)</span>
                  </div>
                </div>

                <div className="stat-summary-card warning">
                  <div className="card-icon-wrap"><Package size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{medicines.filter(m => m.stock_quantity < 20).length}</span>
                    <span className="stat-lbl">⚠️ Dược liệu sắp hết hàng (&lt;20)</span>
                  </div>
                </div>
              </div>

              {/* Date range filter */}
              <div className="admin-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Từ ngày</label>
                  <input type="date" value={statsDateFrom} onChange={e => setStatsDateFrom(e.target.value)} className="admin-input" style={{ padding: '7px 10px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Đến ngày</label>
                  <input type="date" value={statsDateTo} onChange={e => setStatsDateTo(e.target.value)} className="admin-input" style={{ padding: '7px 10px' }} />
                </div>
                <button
                  onClick={handleApplyStatsDateRange}
                  disabled={statsRangeLoading}
                  style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 8, background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: 13, cursor: statsRangeLoading ? 'not-allowed' : 'pointer', opacity: statsRangeLoading ? 0.7 : 1 }}
                >
                  {statsRangeLoading ? 'Đang tải...' : 'Xem thống kê khoảng này'}
                </button>
                {customRevenueTrend && (
                  <button
                    onClick={() => setCustomRevenueTrend(null)}
                    style={{ height: 36, padding: '0 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    Về mặc định (30 ngày)
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      const fromIso = new Date(statsDateFrom).toISOString();
                      const toIso = new Date(statsDateTo + 'T23:59:59').toISOString();
                      await api.exportReportRevenueExcel(fromIso, toIso, 'Day');
                    } catch (err) {
                      setError(err.message || 'Không thể xuất báo cáo Excel.');
                    }
                  }}
                  style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #0d9488', borderRadius: 8, background: '#fff', color: '#0d9488', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  <Download size={14} /> Xuất Excel
                </button>
              </div>

              {/* Chart Visualizer: Revenue Trend & Order Distribution */}
              {(customRevenueTrend || reportData?.revenueTrend) && (customRevenueTrend || reportData.revenueTrend).length > 0 && (
                <div className="admin-card" style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f766e', fontSize: 16 }}>
                    <BarChart2 size={18} /> 📈 Biểu đồ Xu hướng Doanh thu {customRevenueTrend ? `(${statsDateFrom} → ${statsDateTo})` : '(30 Ngày gần nhất)'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '20px 10px 10px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    {(customRevenueTrend || reportData.revenueTrend).map((pt, idx) => {
                      const trendData = customRevenueTrend || reportData.revenueTrend;
                      const maxRev = Math.max(...trendData.map(p => p.revenue || 1));
                      const barHeight = maxRev > 0 ? Math.max(15, Math.round((pt.revenue / maxRev) * 140)) : 15;
                      return (
                        <div key={idx} style={{ flex: 1, minWidth: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${pt.period}: ${formatPrice(pt.revenue)} (${pt.orderCount} đơn)`}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>
                            {pt.revenue > 0 ? `${Math.round(pt.revenue / 1000)}k` : ''}
                          </span>
                          <div style={{
                            width: '100%',
                            height: `${barHeight}px`,
                            background: 'linear-gradient(180deg, #0d9488 0%, #14b8a6 100%)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                          }} />
                          <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                            {pt.period ? pt.period.slice(-5) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Selling Products & Order Status Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Top Selling Products */}
                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    🏆 Top Sản phẩm Bán chạy nhất
                  </h4>
                  {reportData?.topSellingMedicines && reportData.topSellingMedicines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {reportData.topSellingMedicines.map((item, index) => (
                        <div key={item.medicineId || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              fontWeight: 800, fontSize: 13, width: 24, height: 24, borderRadius: '50%',
                              background: index === 0 ? '#fef08a' : index === 1 ? '#e2e8f0' : index === 2 ? '#ffedd5' : '#f1f5f9',
                              color: index === 0 ? '#ca8a04' : index === 1 ? '#475569' : index === 2 ? '#c2410c' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {index + 1}
                            </span>
                            <div>
                              <strong style={{ fontSize: 13, color: '#1e293b' }}>{item.medicineName}</strong>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Đã bán: {item.totalQuantitySold} đơn vị</div>
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>
                            {formatPrice(item.totalRevenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Đang tổng hợp dữ liệu sản phẩm bán chạy...</p>
                  )}
                </div>

                {/* Order Status Distribution */}
                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    ⚖️ Phân bố Trạng thái Đơn hàng
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(() => {
                      // Ưu tiên số liệu từ backend /Report/order-status (nguồn chuẩn); nếu chưa tải
                      // được thì tạm tính từ danh sách orders đã tải ở FE.
                      const countByStatuses = (names) => orderStatusData.length > 0
                        ? orderStatusData.filter(s => names.includes(s.status)).reduce((sum, s) => sum + s.count, 0)
                        : orders.filter(o => names.includes(o.status)).length;
                      const buckets = [
                        { label: '✅ Đã hoàn thành / Đã giao:', statuses: ['Delivered', 'Completed'], bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', val: '#15803d' },
                        { label: '⏳ Chờ xử lý / Đã đặt:', statuses: ['Pending'], bg: '#fefce8', border: '#fef08a', text: '#854d0e', val: '#a16207' },
                        { label: '🚚 Đang đóng gói / Vận chuyển:', statuses: ['Processing', 'Shipping', 'Confirmed'], bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', val: '#1d4ed8' },
                        { label: '❌ Đã hủy / Trả hàng:', statuses: ['Cancelled', 'Returned', 'ReturnRequested'], bg: '#fef2f2', border: '#fecaca', text: '#991b1b', val: '#dc2626' },
                      ];
                      return buckets.map(b => (
                        <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: b.bg, border: `1px solid ${b.border}`, borderRadius: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: b.text }}>{b.label}</span>
                          <strong style={{ fontSize: 15, color: b.val }}>{countByStatuses(b.statuses)} đơn</strong>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Category & Staff Revenue */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    <Tag size={16} /> Doanh thu theo Danh mục
                  </h4>
                  {categoryRevenueData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {categoryRevenueData.map((c, i) => (
                        <div key={c.categoryName || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div>
                            <strong style={{ fontSize: 13, color: '#1e293b' }}>{c.categoryName}</strong>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Đã bán: {c.totalQuantitySold} đơn vị</div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>{formatPrice(c.totalRevenue)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu doanh thu theo danh mục trong khoảng thời gian này.</p>
                  )}
                </div>

                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    <UserCog size={16} /> Doanh thu theo Nhân viên
                  </h4>
                  {staffRevenueData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {staffRevenueData.map((s, i) => (
                        <div key={s.staffId || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div>
                            <strong style={{ fontSize: 13, color: '#1e293b' }}>{s.staffName}</strong>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Bán hàng: {formatPrice(s.productRevenue)} · Đặt cọc khám: {formatPrice(s.appointmentDepositRevenue)}</div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>{formatPrice(s.totalRevenue)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu doanh thu theo nhân viên trong khoảng thời gian này (đơn cần được giao thành công để ghi nhận nhân viên xử lý).</p>
                  )}
                </div>
              </div>

              {/* Detail graphs placeholder & Lists */}
              <div className="stats-detail-grid">
                <div className="stats-detail-card">
                  <h4>⚠️ Cảnh báo tồn kho cực thấp (dưới 20 đơn vị)</h4>
                  <div className="low-stock-list">
                    {medicines.filter(m => m.stock_quantity < 20).map(m => (
                      <div key={m.id} className="low-stock-row">
                        <span>🌿 <strong>{m.name}</strong> ({m.packaging || m.unit})</span>
                        <span className="stock-count-alert">Số lượng còn: {m.stock_quantity}</span>
                      </div>
                    ))}
                    {medicines.filter(m => m.stock_quantity < 20).length === 0 && (
                      <p className="no-warnings">Mọi vị thuốc đều có lượng dự trữ an toàn.</p>
                    )}
                  </div>
                </div>

                <div className="stats-detail-card">
                  <h4>💡 Tình trạng hoạt động hệ thống</h4>
                  <div className="clinic-status-rows">
                    <div className="status-row">
                      <span>Đơn hàng đang chờ duyệt giao:</span>
                      <strong>{orders.filter(o => o.status === 'Pending').length} đơn hàng</strong>
                    </div>
                    <div className="status-row">
                      <span>Lịch hẹn khám đang chờ khám:</span>
                      <strong>{appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length} lịch</strong>
                    </div>
                    <div className="status-row">
                      <span>Tổng danh mục thuốc/thảo dược:</span>
                      <strong>{medicines.length} sản phẩm</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MANAGE MEDICINES (Admin CRUD) */}
          {activeTab === 'products' && (
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
          )}

          {/* ─── TAB: VOUCHERS (Admin only) ─── */}
          {activeTab === 'vouchers' && hasAccess([1]) && (
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
          )}

          {/* ─── TAB: NEWS (Admin only) ─── */}
          {activeTab === 'news' && hasAccess([1]) && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
              {/* Form */}
              <div className="admin-card">
                <h3 className="admin-section-title">
                  <FileText size={16} /> {editingNewsId ? 'Cập nhật bài viết' : 'Thêm bài viết mới'}
                </h3>
                <div className="admin-form">
                  <div className="form-group">
                    <label>Tiêu đề *</label>
                    <input className="admin-input" value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} placeholder="VD: 5 loại dược liệu tăng đề kháng" />
                  </div>
                  <div className="form-group">
                    <label>Chuyên mục</label>
                    <select className="admin-input" value={newsForm.tag} onChange={e => setNewsForm(p => ({ ...p, tag: e.target.value }))}>
                      <option value="Dinh dưỡng">Dinh dưỡng</option>
                      <option value="Phòng chữa bệnh">Phòng chữa bệnh</option>
                      <option value="Khỏe đẹp">Khỏe đẹp</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tóm tắt</label>
                    <textarea className="admin-input" rows={2} value={newsForm.excerpt} onChange={e => setNewsForm(p => ({ ...p, excerpt: e.target.value }))} placeholder="Tóm tắt ngắn hiển thị ở trang chủ" />
                  </div>
                  <div className="form-group">
                    <label>Nội dung đầy đủ *</label>
                    <textarea className="admin-input" rows={6} value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} placeholder="Nội dung chi tiết bài viết" />
                  </div>
                  <div className="form-group">
                    <label>Ảnh minh họa (URL)</label>
                    <input className="admin-input" value={newsForm.imageUrl} onChange={e => setNewsForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="nIsActive" checked={newsForm.isActive} onChange={e => setNewsForm(p => ({ ...p, isActive: e.target.checked }))} />
                    <label htmlFor="nIsActive" style={{ fontWeight: 600, cursor: 'pointer' }}>Hiển thị trên trang chủ</label>
                  </div>
                  <div className="product-form-actions">
                    <button className="admin-add-btn" style={{ flex: 2 }} onClick={async () => {
                      if (!newsForm.title || !newsForm.content) { setError('Vui lòng nhập tiêu đề và nội dung'); return; }
                      try {
                        if (editingNewsId) {
                          await api.updateNewsArticle(editingNewsId, newsForm);
                          showSuccess('Cập nhật bài viết thành công!');
                        } else {
                          await api.createNewsArticle(newsForm);
                          showSuccess('Thêm bài viết thành công!');
                        }
                        setNewsForm(emptyNewsForm);
                        setEditingNewsId(null);
                        const data = await api.fetchNewsArticles(); setNewsArticles(data);
                      } catch (e) { setError(e.message); }
                    }}>
                      {editingNewsId ? '💾 Cập nhật' : '➕ Thêm bài viết'}
                    </button>
                    {editingNewsId && (
                      <button className="cancel-edit-btn" onClick={() => { setEditingNewsId(null); setNewsForm(emptyNewsForm); }}>Hủy</button>
                    )}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="admin-card">
                <h3 className="admin-section-title"><FileText size={16} /> Danh sách bài viết ({newsArticles.length})</h3>
                <div className="medicine-crud-list" style={{ maxHeight: 550 }}>
                  {newsArticles.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chưa có bài viết nào</p>
                  ) : newsArticles.map(a => (
                    <div key={a.id} className={`medicine-crud-row ${editingNewsId === a.id ? 'editing' : ''}`}>
                      <div className="medicine-crud-info" style={{ flex: 1 }}>
                        <strong>{a.title}</strong>
                        <span className="med-meta">{a.excerpt || '—'}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>{a.tag}</span>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: a.isActive ? '#dcfce7' : '#fee2e2', color: a.isActive ? '#166534' : '#991b1b', fontWeight: 700 }}>
                            {a.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                          </span>
                        </div>
                      </div>
                      <div className="medicine-crud-actions">
                        <button className="med-edit-btn" onClick={() => {
                          setEditingNewsId(a.id);
                          setNewsForm({
                            title: a.title, excerpt: a.excerpt || '', content: a.content || '',
                            tag: a.tag || 'Dinh dưỡng', imageUrl: a.imageUrl || '', isActive: a.isActive
                          });
                        }}>✏️ Sửa</button>
                        <button className="med-delete-btn" onClick={async () => {
                          if (!confirm(`Xóa bài viết "${a.title}"?`)) return;
                          await api.deleteNewsArticle(a.id);
                          const data = await api.fetchNewsArticles(); setNewsArticles(data);
                          showSuccess('Đã xóa bài viết!');
                        }}>🗑️ Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PHARMACY LIVE CHAT */}
          {activeTab === 'pharmacy-chat' && (
            <PharmacyChatDashboard loggedInUser={loggedInUser} />
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Import Excel hàng loạt                                */}
      {/* ============================================================ */}
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
    </div>
  );
};

export default AdminView;
