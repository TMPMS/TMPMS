import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  ShoppingCart, Leaf, Calendar, FileText, Package, BarChart2, Shield, Tag, MessageSquare,
  User, Users, History
} from 'lucide-react';
import PharmacyChatDashboard from '../components/admin/PharmacyChatDashboard';
import './AdminView.css';

// ── AdminView shell ──────────────────────────────────────────────────────
// Bảng quản trị được tách thành các file theo từng tab trong src/pages/admin/*
// (mỗi tab tự quản lý state/dữ liệu riêng của nó — xem chi tiết trong từng file).
// Shell này chỉ còn giữ: điều hướng tab, người dùng đăng nhập, banner lỗi/thành công,
// và 2 mảng `appointments`/`prescriptions` — đây là state DUY NHẤT thực sự dùng chung
// giữa nhiều tab (tab "Hồ sơ Bệnh nhân" đọc lại 2 mảng này do tab "Lịch hẹn"/"Kê đơn"
// tải về, đúng như hành vi của bản gốc trước khi tách file).
const OrdersTab = lazy(() => import('./admin/OrdersTab'));
const PatientsTab = lazy(() => import('./admin/PatientsTab'));
const AppointmentsTab = lazy(() => import('./admin/AppointmentsTab'));
const PrescriptionsTab = lazy(() => import('./admin/PrescriptionsTab'));
const InventoryTab = lazy(() => import('./admin/InventoryTab'));
const UsersTab = lazy(() => import('./admin/UsersTab'));
const StatsTab = lazy(() => import('./admin/StatsTab'));
const ProductsTab = lazy(() => import('./admin/ProductsTab'));
const VouchersTab = lazy(() => import('./admin/VouchersTab'));
const NewsTab = lazy(() => import('./admin/NewsTab'));
const AuditLogTab = lazy(() => import('./admin/AuditLogTab'));

const TabFallback = () => (
  <div className="admin-loading">
    <div className="loading-spinner"></div>
    <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
  </div>
);

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders | patients | appointments | prescriptions | inventory | users | stats | products | vouchers | news | pharmacy-chat
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Duy nhất 2 mảng này được chia sẻ giữa nhiều tab (xem ghi chú ở đầu file).
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

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

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  // Roles Authorization - Admin (role_id === 1) luôn có toàn quyền truy cập tất cả chức năng,
  // TRỪ 4 tab nghiệp vụ lâm sàng/CSKH (Hồ sơ Bệnh nhân, Lịch hẹn Khám, Chẩn đoán & Kê đơn,
  // Tư vấn trực tuyến) — các tab này chỉ dành cho Pharmacy (3), Admin không thao tác nghiệp vụ.
  const hasAccess = useCallback((allowedRoles) => {
    if (!loggedInUser) return false;
    if (loggedInUser.role_id === 1) return true;
    return allowedRoles.includes(loggedInUser.role_id);
  }, [loggedInUser]);

  // Dùng riêng cho 4 tab lâm sàng/CSKH: không áp dụng bypass "Admin luôn có quyền" ở trên.
  const isPharmacyOnly = loggedInUser?.role_id === 3;

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
          {isPharmacyOnly && (
            <button className={`admin-tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
              <Users size={16} /> Hồ sơ Bệnh nhân
            </button>
          )}
          {isPharmacyOnly && (
            <button className={`admin-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
              <Calendar size={16} /> Lịch hẹn Khám
            </button>
          )}
          {isPharmacyOnly && (
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
          {isPharmacyOnly && (
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
          {hasAccess([1]) && (
            <button className={`admin-tab-btn ${activeTab === 'audit-log' ? 'active' : ''}`} onClick={() => setActiveTab('audit-log')}>
              <History size={16} /> Nhật ký thao tác
            </button>
          )}
        </div>
      </div>

      {success && <div className="admin-success-msg">{success}</div>}
      {error && <div className="admin-error-msg">{error}</div>}

      <div className="admin-tab-content">
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'orders' && (
            <OrdersTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'patients' && isPharmacyOnly && (
            <PatientsTab
              hasAccess={hasAccess}
              showSuccess={showSuccess}
              setError={setError}
              appointments={appointments}
              prescriptions={prescriptions}
            />
          )}

          {activeTab === 'appointments' && isPharmacyOnly && (
            <AppointmentsTab
              hasAccess={hasAccess}
              showSuccess={showSuccess}
              setError={setError}
              appointments={appointments}
              setAppointments={setAppointments}
            />
          )}

          {activeTab === 'prescriptions' && isPharmacyOnly && (
            <PrescriptionsTab
              hasAccess={hasAccess}
              showSuccess={showSuccess}
              setError={setError}
              loggedInUser={loggedInUser}
              appointments={appointments}
              setAppointments={setAppointments}
              prescriptions={prescriptions}
              setPrescriptions={setPrescriptions}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'users' && (
            <UsersTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'stats' && (
            <StatsTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'products' && (
            <ProductsTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'vouchers' && hasAccess([1]) && (
            <VouchersTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'news' && hasAccess([1]) && (
            <NewsTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {activeTab === 'audit-log' && hasAccess([1]) && (
            <AuditLogTab hasAccess={hasAccess} showSuccess={showSuccess} setError={setError} />
          )}

          {/* TAB: PHARMACY LIVE CHAT */}
          {activeTab === 'pharmacy-chat' && isPharmacyOnly && (
            <PharmacyChatDashboard loggedInUser={loggedInUser} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default AdminView;
