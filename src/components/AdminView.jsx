import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { 
  ShoppingCart, Star, Leaf, Eye, Calendar, Plus, Edit2, Trash2, 
  User, Users, Activity, FileText, Package, BarChart2, Shield, Check, X, Info
} from 'lucide-react';
import './AdminView.css';

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders | patients | appointments | prescriptions | inventory | users | stats | products
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data States
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  // Form States - Patient
  const [patientModal, setPatientModal] = useState(null); // 'add' | 'edit' | null
  const [currentPatient, setCurrentPatient] = useState({ name: '', gender: 'Nam', dateOfBirth: '', phone: '', address: '', medicalHistory: '' });

  // Form States - Appointment
  const [appointmentModal, setAppointmentModal] = useState(null); // 'add' | 'edit' | null
  const [currentAppointment, setCurrentAppointment] = useState({ patientId: '', doctorId: '', appointmentDate: '', reason: '', status: 'Scheduled', notes: '' });

  // Form States - Prescription
  const [prescriptionModal, setPrescriptionModal] = useState(null); // 'add' | null
  const [currentPrescription, setCurrentPrescription] = useState({ patientId: '', doctorName: 'Bác sĩ Đông Y', hospital: 'Phòng khám Đông Y', items: [] });
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedMedicineQty, setSelectedMedicineQty] = useState(1);

  // Form States - Product (Herbal Medicine)
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState(1); // Default to Herbal TPCN
  const [prodSupplierId, setProdSupplierId] = useState(1);
  const [prodPrice, setProdPrice] = useState('');
  const [prodOldPrice, setProdOldPrice] = useState('');
  const [prodStock, setProdStock] = useState('100');
  const [prodUnit, setProdUnit] = useState('Hộp');
  const [prodOrigin, setProdOrigin] = useState('Việt Nam');
  const [prodPackaging, setProdPackaging] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodReqPrescription, setProdReqPrescription] = useState(false);

  // Current logged in user profile (from localStorage)
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setLoggedInUser(JSON.parse(storedUser));
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
        const medData = await api.fetchMedicines();
        setMedicines(medData);
        const apptsData = await api.fetchAppointments();
        setAppointments(apptsData);
        const usersData = await api.fetchUsers();
        setUsers(usersData.filter(u => u.role_id === 3)); // Only doctors for pharmacist authorization select
      } else if (activeTab === 'inventory') {
        const data = await api.fetchWarehouses();
        setWarehouses(data);
      } else if (activeTab === 'users') {
        const data = await api.fetchUsers();
        setUsers(data);
      } else if (activeTab === 'stats') {
        const ordersData = await api.fetchAdminOrders();
        setOrders(ordersData);
        const patientsData = await api.fetchPatients();
        setPatients(patientsData);
        const appointmentsData = await api.fetchAppointments();
        setAppointments(appointmentsData);
        const medData = await api.fetchMedicines();
        setMedicines(medData);
      } else if (activeTab === 'products') {
        const medData = await api.fetchMedicines();
        setMedicines(medData);
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Roles Authorization
  const hasAccess = (allowedRoles) => {
    if (!loggedInUser) return false;
    return allowedRoles.includes(loggedInUser.role_id);
  };

  // Orders functions
  const handleStatusChange = async (orderId, newStatus) => {
    if (!hasAccess([1, 4])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền cập nhật trạng thái đơn hàng.');
      return;
    }
    try {
      await api.updateOrderStatus(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showSuccess('Cập nhật trạng thái đơn hàng thành công!');
    } catch (err) {
      setError('Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  };

  const handlePaymentStatusToggle = async (order, currentPaymentStatus) => {
    if (!hasAccess([1, 4])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền cập nhật trạng thái thanh toán.');
      return;
    }
    const newPaymentStatus = currentPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      await api.updateOrderStatus(order.id, { payment_status: newPaymentStatus });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: newPaymentStatus } : o));
      showSuccess('Cập nhật trạng thái thanh toán thành công!');
    } catch (err) {
      setError('Lỗi khi cập nhật thanh toán.');
    }
  };

  // Patients functions
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Bác sĩ có quyền chỉnh sửa thông tin bệnh nhân.');
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
      setError('Lỗi khi lưu bệnh nhân.');
    }
  };

  const handleDeletePatient = async (id) => {
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Bác sĩ có quyền xóa bệnh nhân.');
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
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Bác sĩ có quyền điều chỉnh lịch hẹn.');
      return;
    }
    try {
      const payload = {
        patientId: parseInt(currentAppointment.patientId),
        doctorId: currentAppointment.doctorId ? parseInt(currentAppointment.doctorId) : null,
        appointmentDate: new Date(currentAppointment.appointmentDate),
        reason: currentAppointment.reason,
        status: currentAppointment.status,
        notes: currentAppointment.notes
      };

      if (appointmentModal === 'add') {
        await api.createAppointment(payload);
        showSuccess('Tạo lịch hẹn thành công!');
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
    if (!hasAccess([1, 3])) {
      setError('Chỉ Admin hoặc Bác sĩ có quyền xóa lịch hẹn.');
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

  // Prescription functions
  const addMedicineToPrescription = () => {
    if (!selectedMedicineId) return;
    const med = medicines.find(m => m.id === parseInt(selectedMedicineId));
    if (!med) return;

    // Check duplicate
    if (currentPrescription.items.some(i => i.medicineId === med.id)) {
      setError('Dược phẩm này đã được chọn trong đơn thuốc.');
      return;
    }

    setCurrentPrescription(prev => ({
      ...prev,
      items: [...prev.items, { medicineId: med.id, medicineName: med.name, quantity: selectedMedicineQty }]
    }));
    setSelectedMedicineId('');
    setSelectedMedicineQty(1);
    setError('');
  };

  const removeMedicineFromPrescription = (id) => {
    setCurrentPrescription(prev => ({
      ...prev,
      items: prev.items.filter(i => i.medicineId !== id)
    }));
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([1, 3, 4])) {
      setError('Bạn không có quyền kê đơn thuốc.');
      return;
    }
    if (!currentPrescription.patientId) {
      setError('Vui lòng chọn bệnh nhân!');
      return;
    }
    if (currentPrescription.items.length === 0) {
      setError('Vui lòng thêm ít nhất một vị thuốc/thảo dược vào đơn thuốc!');
      return;
    }

    try {
      const payload = {
        patientId: parseInt(currentPrescription.patientId),
        doctorName: currentPrescription.doctorName,
        hospital: currentPrescription.hospital,
        items: currentPrescription.items.map(i => ({
          medicineId: i.medicineId,
          quantity: i.quantity
        }))
      };

      await api.createPrescription(payload);
      showSuccess('Kê đơn thuốc Đông Y thành công!');
      setPrescriptionModal(null);
      loadTabContent();
    } catch (err) {
      setError('Không thể kê đơn thuốc. Vui lòng kiểm tra lại.');
    }
  };

  const handlePrescriptionStatus = async (id, status) => {
    if (!hasAccess([1, 4])) {
      setError('Chỉ Dược sĩ có quyền cập nhật bốc thuốc/cấp phát thuốc.');
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
  const handleUserRoleChange = async (userId, roleId) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền phân quyền người dùng.');
      return;
    }
    try {
      await api.updateUserRole(userId, roleId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_id: roleId } : u));
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

  // Add Product (Herbal Catalog)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!hasAccess([1, 4])) {
      setError('Chỉ Admin hoặc Dược sĩ có quyền quản lý kho dược phẩm.');
      return;
    }

    if (!prodName.trim() || !prodPrice || !prodImgUrl.trim()) {
      setError('Vui lòng điền đầy đủ Tên, Giá, và Ảnh sản phẩm!');
      return;
    }

    try {
      const payload = {
        name: prodName,
        category_id: parseInt(prodCategoryId),
        supplier_id: parseInt(prodSupplierId),
        price: parseFloat(prodPrice),
        old_price: prodOldPrice ? parseFloat(prodOldPrice) : null,
        stock_quantity: parseInt(prodStock),
        unit: prodUnit,
        origin: prodOrigin,
        packaging: prodPackaging,
        image_url: prodImgUrl,
        description: prodDesc,
        requires_prescription: prodReqPrescription,
        manufacture_date: new Date(),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      await api.addMedicine(payload);
      showSuccess('Thêm thuốc/thảo dược mới thành công!');
      
      // Reset form
      setProdName('');
      setProdPrice('');
      setProdOldPrice('');
      setProdPackaging('');
      setProdImgUrl('');
      setProdDesc('');
      setProdReqPrescription(false);
      setActiveTab('products');
    } catch (err) {
      setError('Không thể thêm sản phẩm mới. Vui lòng kiểm tra lại!');
    }
  };

  // Helper Formats
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Stats Logic
  const getStats = () => {
    const totalRev = orders.filter(o => o.payment_status === 'Paid').reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const lowStock = medicines.filter(m => m.stock_quantity < 20);
    return {
      revenue: totalRev,
      ordersCount: orders.length,
      patientsCount: patients.length,
      appointmentsCount: appointments.length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      activeAppointments: appointments.filter(a => a.status === 'Scheduled').length,
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
            {loggedInUser?.role_id === 3 && ' Thầy thuốc / Bác sĩ'}
            {loggedInUser?.role_id === 4 && ' Dược sĩ'}
          </strong>
        </span>
      </div>

      <div className="admin-header">
        <div className="admin-title-wrap">
          <Leaf className="admin-title-icon" />
          <h2 className="admin-title">Bảng Quản Trị & Điều Hành Lâm Sàng</h2>
        </div>
        
        {/* Navigation Tabs based on Role */}
        <div className="admin-tabs">
          {hasAccess([1, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ShoppingCart size={16} /> Đơn hàng & Hóa đơn
            </button>
          )}
          {hasAccess([1, 3, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
              <Users size={16} /> Hồ sơ Bệnh nhân
            </button>
          )}
          {hasAccess([1, 3, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
              <Calendar size={16} /> Quản lý Lịch hẹn
            </button>
          )}
          {hasAccess([1, 3, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
              <FileText size={16} /> Chẩn đoán & Kê đơn
            </button>
          )}
          {hasAccess([1, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              <Package size={16} /> Kho hàng & Dược liệu
            </button>
          )}
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <User size={16} /> Quản lý Người dùng
            </button>
          )}
          {hasAccess([1, 3, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <BarChart2 size={16} /> Báo cáo & Thống kê
            </button>
          )}
          {hasAccess([1, 4]) && (
            <button className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Plus size={16} /> Thêm Thảo Dược
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
              {orders.length === 0 ? (
                <div className="admin-empty">Không có đơn đặt hàng nào.</div>
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
                      {orders.map((o) => {
                        const paymentStatus = o.payment_status || o.paymentStatus || 'Unpaid';
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
                              </div>
                            </td>
                            <td className="col-total">{formatPrice(o.total_amount || o.totalAmount)}</td>
                            <td>
                              <select 
                                className={`status-select ${o.status.toLowerCase()}`}
                                value={o.status}
                                onChange={(e) => handleStatusChange(o.id, e.target.value)}
                              >
                                <option value="Pending">Chờ duyệt</option>
                                <option value="Shipping">Đang giao</option>
                                <option value="Delivered">Đã giao</option>
                              </select>
                            </td>
                            <td>
                              <button
                                className={`payment-toggle-btn ${paymentStatus.toLowerCase()}`}
                                onClick={() => handlePaymentStatusToggle(o, paymentStatus)}
                              >
                                {paymentStatus === 'Paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
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
                          <td><strong>{p.name}</strong></td>
                          <td>{p.gender}</td>
                          <td>{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</td>
                          <td>{p.phone}</td>
                          <td>{p.address || 'Chưa có'}</td>
                          <td><div className="med-history-text">{p.medicalHistory || 'Không có'}</div></td>
                          <td>
                            <div className="table-actions-row">
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
            </div>
          )}

          {/* TAB: APPOINTMENT MANAGEMENT */}
          {activeTab === 'appointments' && (
            <div className="admin-card">
              <div className="card-header-actions">
                <h3 className="card-title">Quản lý Lịch hẹn khám bệnh</h3>
                <button className="btn-add-action" onClick={() => {
                  setCurrentAppointment({ patientId: patients[0]?.id || '', doctorId: users[0]?.id || '', appointmentDate: '', reason: '', status: 'Scheduled', notes: '' });
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
                    <div className="form-group">
                      <label className="form-label">Trạng thái cuộc hẹn</label>
                      <select className="form-select" value={currentAppointment.status} onChange={e => setCurrentAppointment({...currentAppointment, status: e.target.value})}>
                        <option value="Scheduled">Đã lên lịch</option>
                        <option value="Completed">Đã hoàn thành</option>
                        <option value="Cancelled">Đã hủy</option>
                      </select>
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
                          <td>{a.reason}</td>
                          <td>
                            <span className={`appointment-status ${a.status.toLowerCase()}`}>
                              {a.status === 'Scheduled' ? 'Chờ khám' : a.status === 'Completed' ? 'Hoàn thành' : 'Đã hủy'}
                            </span>
                          </td>
                          <td><div className="med-history-text">{a.notes || 'Không'}</div></td>
                          <td>
                            <div className="table-actions-row">
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
                  setCurrentPrescription({ patientId: patients[0]?.id || '', doctorName: `Thầy thuốc ${loggedInUser?.username || ''}`, hospital: 'Phòng khám Đông Y', items: [] });
                  setPrescriptionModal('add');
                }}><Plus size={16} /> Kê đơn thuốc thảo dược</button>
              </div>
 
              {/* SECTION: Danh sách hàng chờ cần kê đơn */}
              <div className="prescription-queue-section" style={{ marginBottom: '28px', padding: '18px', backgroundColor: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Danh sách bệnh nhân chờ kê đơn (Lịch hẹn khám chưa có đơn thuốc)
                </h4>
                {appointments.filter(appt => !prescriptions.some(presc => presc.patientId === appt.patientId) && appt.status !== 'Cancelled').length === 0 ? (
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
                        {appointments.filter(appt => !prescriptions.some(presc => presc.patientId === appt.patientId) && appt.status !== 'Cancelled').map(appt => (
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
                                    patientId: appt.patientId,
                                    doctorName: nameForDoctor,
                                    hospital: 'Phòng khám Đông Y',
                                    items: suggestedHerbs
                                  });
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

              {prescriptionModal && (
                <form className="modal-form-box" onSubmit={handlePrescriptionSubmit}>
                  <h4>Kê đơn thuốc Đông Y mới</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Hồ sơ bệnh nhân khám *</label>
                      <select className="form-select" required value={currentPrescription.patientId} onChange={e => setCurrentPrescription({...currentPrescription, patientId: e.target.value})}>
                        <option value="">-- Chọn bệnh nhân chỉ định --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
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
                          <div>• Ngày sinh: <strong>{selPatient.dateOfBirth ? new Date(selPatient.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa có'}</strong></div>
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
                  <div className="med-prescribe-box">
                    <h5>Thêm vị thuốc / Thảo dược vào thang đơn</h5>
                    <div className="prescribe-inputs">
                      <select className="form-select flex-1" value={selectedMedicineId} onChange={e => setSelectedMedicineId(e.target.value)}>
                        <option value="">-- Chọn thảo dược/thuốc --</option>
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.price.toLocaleString()}đ/{m.unit}) - Tồn kho: {m.stock_quantity}</option>
                        ))}
                      </select>
                      <input type="number" className="form-input w-24" min="1" value={selectedMedicineQty} onChange={e => setSelectedMedicineQty(parseInt(e.target.value))} placeholder="SL" />
                      <button type="button" className="btn-add-item" onClick={addMedicineToPrescription}><Plus size={16} /> Thêm vị</button>
                    </div>

                    <div className="prescription-items-preview">
                      <h6>Chi tiết đơn thuốc:</h6>
                      {currentPrescription.items.length === 0 ? (
                        <p className="no-items-alert">Chưa có vị thuốc nào được thêm.</p>
                      ) : (
                        <div className="preview-items-list">
                          {currentPrescription.items.map(item => (
                            <div key={item.medicineId} className="preview-item-row">
                              <span>🌿 <strong>{item.medicineName}</strong> - Số lượng: {item.quantity}</span>
                              <button type="button" className="btn-remove-item" onClick={() => removeMedicineFromPrescription(item.medicineId)}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">Hoàn thành kê đơn</button>
                    <button type="button" className="btn-cancel" onClick={() => setPrescriptionModal(null)}>Hủy bỏ</button>
                  </div>
                </form>
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
                        <th>Ngày kê đơn</th>
                        <th>Thầy thuốc phụ trách</th>
                        <th>Đại lý/Nơi kê đơn</th>
                        <th>Các vị thuốc chỉ định</th>
                        <th>Trạng thái đơn</th>
                        <th>Xử lý đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map(p => (
                        <tr key={p.id}>
                          <td className="col-id">#{p.id}</td>
                          <td><strong>{p.patientName}</strong></td>
                          <td>{formatDate(p.prescriptionDate)}</td>
                          <td>{p.doctorName}</td>
                          <td>{p.hospital}</td>
                          <td>
                            <div className="prescription-medicines-cell">
                              {p.items && p.items.map((item, idx) => (
                                <span key={idx} className="prescription-med-tag">
                                  🌿 {item.medicineName} (x{item.quantity})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`prescription-status ${p.status?.toLowerCase()}`}>
                              {p.status === 'Active' ? 'Hoạt động' : p.status === 'Filled' ? 'Đã bốc thuốc' : 'Đã hủy'}
                            </span>
                          </td>
                          <td>
                            <div className="pres-actions">
                              {p.status === 'Active' && (
                                <button className="btn-pres-action fill" onClick={() => handlePrescriptionStatus(p.id, 'Filled')} title="Bốc thuốc và cấp phát">
                                  <Check size={12} /> Bốc thuốc
                                </button>
                              )}
                              {p.status === 'Active' && (
                                <button className="btn-pres-action cancel" onClick={() => handlePrescriptionStatus(p.id, 'Cancelled')} title="Hủy đơn thuốc">
                                  <X size={12} /> Hủy
                                </button>
                              )}
                              {p.status !== 'Active' && <span className="completed-text">Đã xử lý</span>}
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

          {/* TAB: INVENTORY & WAREHOUSE */}
          {activeTab === 'inventory' && (
            <div className="admin-card">
              <h3 className="card-title">Tình trạng Kho hàng & Kiểm kê Dược liệu</h3>
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
                          <span className="wh-stat-num">{w.total_quantity.toLocaleString()}</span>
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
                              value={u.role_id}
                              onChange={(e) => handleUserRoleChange(u.id, parseInt(e.target.value))}
                            >
                              <option value={1}>Quản trị viên (Admin)</option>
                              <option value={2}>Khách hàng (Customer)</option>
                              <option value={3}>Thầy thuốc / Bác sĩ</option>
                              <option value={4}>Dược sĩ</option>
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
                    <span className="stat-val">{formatPrice(stats.revenue)}</span>
                    <span className="stat-lbl">Tổng Doanh thu (Đã thu)</span>
                  </div>
                </div>

                <div className="stat-summary-card patients">
                  <div className="card-icon-wrap"><Users size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.patientsCount}</span>
                    <span className="stat-lbl">Số lượng Bệnh nhân</span>
                  </div>
                </div>

                <div className="stat-summary-card appointments">
                  <div className="card-icon-wrap"><Calendar size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.appointmentsCount}</span>
                    <span className="stat-lbl">Lịch hẹn khám bệnh</span>
                  </div>
                </div>

                <div className="stat-summary-card warning">
                  <div className="card-icon-wrap"><Package size={24} /></div>
                  <div className="stat-data">
                    <span className="stat-val">{stats.lowStockCount}</span>
                    <span className="stat-lbl">Dược liệu cần bổ sung gấp</span>
                  </div>
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
                  <h4>💡 Tình trạng hoạt động phòng khám</h4>
                  <div className="clinic-status-rows">
                    <div className="status-row">
                      <span>Đơn hàng đang chờ duyệt giao:</span>
                      <strong>{stats.pendingOrders} đơn hàng</strong>
                    </div>
                    <div className="status-row">
                      <span>Lịch hẹn khám đang chờ khám:</span>
                      <strong>{stats.activeAppointments} lịch</strong>
                    </div>
                    <div className="status-row">
                      <span>Tổng danh mục thuốc/thảo dược:</span>
                      <strong>{stats.medicinesCount} sản phẩm</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADD NEW HERBAL MEDICINES */}
          {activeTab === 'products' && (
            <div className="admin-card">
              <h3 className="card-title">Thêm Thuốc & Thảo Dược Đông Y mới vào cơ sở dữ liệu</h3>
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
                      <option value={1}>Thực phẩm chức năng / Bổ dưỡng</option>
                      <option value={2}>Dược mỹ phẩm thảo dược</option>
                      <option value={3}>Thuốc điều trị Đông Y</option>
                      <option value={4}>Chăm sóc cá nhân tự nhiên</option>
                      <option value={5}>Thiết bị y tế</option>
                      <option value={6}>Châm cứu & Trị liệu</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nhà cung cấp / Đại lý phân phối *</label>
                    <select 
                      className="form-select"
                      value={prodSupplierId}
                      onChange={(e) => setProdSupplierId(e.target.value)}
                    >
                      <option value={1}>Công ty Cổ phần Traphaco</option>
                      <option value={2}>Công ty TNHH Dược phẩm OPC</option>
                      <option value={3}>Công ty Cổ phần Bách Thảo Dược</option>
                      <option value={4}>Nhà sâm KGC Hàn Quốc</option>
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
                    <label className="form-label">Giá niêm yết cũ (nếu muốn giảm giá)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="105000"
                      value={prodOldPrice}
                      onChange={(e) => setProdOldPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số lượng nhập kho khởi tạo *</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required
                      placeholder="100"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                    />
                  </div>

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
                    <label className="form-label">Hình ảnh minh họa (URL) *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required
                      placeholder="https://images.unsplash.com/..."
                      value={prodImgUrl}
                      onChange={(e) => setProdImgUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0' }}>
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

                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết của vị thuốc</label>
                  <textarea 
                    className="form-textarea" 
                    rows="4" 
                    placeholder="Mô tả công dụng, tính vị quy kinh, chỉ định liều dùng và cách nấu xông uống..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                  />
                </div>

                <button type="submit" className="add-submit-btn">Nhập kho thảo dược</button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AdminView;
