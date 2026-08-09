import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { formatPrice, formatDate } from './shared/adminFormat';

const ORDER_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Pending', label: 'Đang xử lý' },
  { key: 'Shipping', label: 'Đang giao' },
  { key: 'Delivered', label: 'Đã giao' },
  { key: 'Cancelled', label: 'Đã hủy' },
  { key: 'Returned', label: 'Trả hàng' }
];

// Đơn hàng & Thu tiền — tách từ AdminView.jsx (tab "orders").
// Tab này tự tải dữ liệu của chính nó khi được active, giữ nguyên hành vi gốc
// (mỗi lần chuyển sang tab này, loadTabContent() trong bản gốc đều gọi lại api.fetchAdminOrders()).
const OrdersTab = ({ hasAccess, showSuccess, setError }) => {
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAdminOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

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
      await loadTabData();
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
      await loadTabData();
    } catch (err) {
      setError('Lỗi khi cập nhật thanh toán.');
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
  );
};

export default OrdersTab;
