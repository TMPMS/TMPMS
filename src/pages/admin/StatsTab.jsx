import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { BarChart2, Users, Calendar, Package, Download, Tag, UserCog, FileText } from 'lucide-react';
import { formatPrice } from './shared/adminFormat';

// Báo cáo & Thống kê — tách từ AdminView.jsx (tab "stats").
const StatsTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [categoryRevenueData, setCategoryRevenueData] = useState([]);
  const [staffRevenueData, setStaffRevenueData] = useState([]);
  const [statsDateFrom, setStatsDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [statsDateTo, setStatsDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [customRevenueTrend, setCustomRevenueTrend] = useState(null);
  const [statsRangeLoading, setStatsRangeLoading] = useState(false);
  const [appointmentStatusData, setAppointmentStatusData] = useState([]);
  const [prescriptionStatusData, setPrescriptionStatusData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [inventoryValueData, setInventoryValueData] = useState([]);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const last30From = new Date(Date.now() - 30 * 86400000).toISOString();
      const last30To = new Date().toISOString();
      const [ordersData, patientsData, appointmentsData, medData, repData, statusData, catRevData, staffRevData, apptStatusData, presStatusData, growthData, invValueData] = await Promise.all([
        api.fetchAdminOrders().catch(() => []),
        api.fetchPatients().catch(() => []),
        api.fetchAppointments().catch(() => []),
        api.fetchMedicines(null, '', null, null, true).catch(() => []),
        api.fetchReportDashboard().catch(err => { console.warn(err); return null; }),
        api.fetchReportOrderStatus().catch(() => []),
        api.fetchReportCategoryRevenue(last30From, last30To).catch(() => []),
        api.fetchReportStaffRevenue(last30From, last30To).catch(() => []),
        api.fetchReportAppointmentStatus().catch(() => []),
        api.fetchReportPrescriptionStatus().catch(() => []),
        api.fetchReportUserGrowth(last30From, last30To, 'Day').catch(() => []),
        api.fetchReportInventoryValue().catch(() => []),
      ]);
      setOrders(ordersData);
      setPatients(patientsData);
      setAppointments(appointmentsData);
      setMedicines(medData);
      setReportData(repData);
      setOrderStatusData(statusData);
      setCategoryRevenueData(catRevData);
      setStaffRevenueData(staffRevData);
      setAppointmentStatusData(apptStatusData);
      setPrescriptionStatusData(presStatusData);
      setUserGrowthData(growthData);
      setInventoryValueData(invValueData);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

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

  const stats = getStats();


  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
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
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 215, padding: '20px 10px 10px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', overflowY: 'hidden' }}>
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

              {/* Appointment & Prescription Status Breakdown + User Growth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    <Calendar size={16} /> Phân bố Trạng thái Lịch hẹn
                  </h4>
                  {appointmentStatusData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {appointmentStatusData.map((s, i) => (
                        <div key={s.status || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.status}</span>
                          <strong style={{ fontSize: 14, color: '#0f766e' }}>{s.count} lịch</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu lịch hẹn.</p>
                  )}
                </div>

                <div className="admin-card">
                  <h4 style={{ margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d9488', fontSize: 15 }}>
                    <FileText size={16} /> Phân bố Trạng thái Đơn thuốc
                  </h4>
                  {prescriptionStatusData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {prescriptionStatusData.map((s, i) => (
                        <div key={s.status || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.status}</span>
                          <strong style={{ fontSize: 14, color: '#0f766e' }}>{s.count} đơn</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu đơn thuốc.</p>
                  )}
                </div>
              </div>

              <div className="admin-card" style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f766e', fontSize: 16 }}>
                  <Users size={18} /> 📈 Người dùng mới đăng ký (30 Ngày gần nhất)
                </h4>
                {userGrowthData.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 195, padding: '20px 10px 10px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', overflowY: 'hidden' }}>
                    {userGrowthData.map((pt, idx) => {
                      const maxUsers = Math.max(...userGrowthData.map(p => p.newUsers || 1));
                      const barHeight = maxUsers > 0 ? Math.max(15, Math.round((pt.newUsers / maxUsers) * 120)) : 15;
                      return (
                        <div key={idx} style={{ flex: 1, minWidth: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${pt.period}: ${pt.newUsers} người dùng mới`}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e' }}>
                            {pt.newUsers > 0 ? pt.newUsers : ''}
                          </span>
                          <div style={{
                            width: '100%',
                            height: `${barHeight}px`,
                            background: 'linear-gradient(180deg, #6366f1 0%, #818cf8 100%)',
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
                ) : (
                  <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Chưa có người dùng mới đăng ký trong khoảng thời gian này.</p>
                )}
              </div>

              {/* Giá trị tồn kho theo từng kho (giá vốn các lô còn hàng) */}
              {inventoryValueData.length > 0 && (
                <div className="admin-card" style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f766e', fontSize: 16 }}>
                    <Package size={18} /> 💰 Giá trị Tồn kho hiện tại theo Kho (giá vốn)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(() => {
                      const maxVal = Math.max(...inventoryValueData.map(w => w.totalValue || 1));
                      return inventoryValueData.map(w => (
                        <div key={w.warehouseId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: '#1e293b', flexShrink: 0 }}>{w.warehouseName}</span>
                          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', height: 22 }}>
                            <div style={{
                              width: `${maxVal > 0 ? Math.max(4, Math.round((w.totalValue / maxVal) * 100)) : 4}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #0d9488, #14b8a6)',
                              borderRadius: 6
                            }} />
                          </div>
                          <span style={{ width: 150, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                            {formatPrice(w.totalValue)}
                          </span>
                          <span style={{ width: 90, textAlign: 'right', fontSize: 11, color: '#64748b', flexShrink: 0 }}>
                            {w.totalUnits} đơn vị
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Cảnh báo tồn kho & tình trạng hoạt động */}
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
  );
};

export default StatsTab;
