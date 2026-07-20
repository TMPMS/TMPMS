import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import OrderTrackingView from '../components/OrderTrackingView';
import './HistoryView.css';

const HistoryView = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);

  useEffect(() => {
    const getHistory = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const data = await api.fetchUserOrders(user.id);
        setOrders(data);
      } catch (err) {
        console.error(err);
        setError('Không thể tải lịch sử mua hàng.');
      } finally {
        setLoading(false);
      }
    };
    getHistory();
  }, [user]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="status-badge pending">Chờ duyệt</span>;
      case 'Shipping':
        return <span className="status-badge shipping">Đang giao</span>;
      case 'Delivered':
        return <span className="status-badge delivered">Đã giao</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Unpaid':
        return <span className="payment-badge unpaid">Chưa thanh toán</span>;
      case 'Paid':
        return <span className="payment-badge paid">Đã thanh toán</span>;
      default:
        return <span className="payment-badge">{status}</span>;
    }
  };

  if (!user) {
    return (
      <div className="history-container error-view">
        <h2>Vui lòng đăng nhập để xem lịch sử mua hàng!</h2>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2 className="history-title">Lịch Sử Mua Hàng</h2>
        <p className="history-subtitle">Danh sách các đơn đặt hàng của bạn trên hệ thống</p>
      </div>

      {loading ? (
        <div className="history-loading">Đang tải lịch sử mua hàng của bạn...</div>
      ) : error ? (
        <div className="history-error-msg">{error}</div>
      ) : orders.length === 0 ? (
        <div className="history-empty">
          <div className="empty-box-icon">📦</div>
          <h3>Bạn chưa có đơn đặt hàng nào</h3>
          <p>Hãy chọn sản phẩm từ trang chủ và đặt đơn hàng đầu tiên của bạn.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-history-card">
              {/* Order Info Bar */}
              <div className="order-card-header">
                <div className="order-meta-info">
                  <span className="order-id-tag">Mã đơn: #{order.id}</span>
                  <span className="order-date">{formatDate(order.created_at || order.createdAt)}</span>
                </div>
                <div className="order-badges">
                  {getStatusBadge(order.status)}
                  {getPaymentStatusBadge(order.payment_status || order.paymentStatus)}
                </div>
              </div>

              {/* Order Items */}
              <div className="order-card-body">
                {order.items && order.items.map((item) => (
                  <div key={item.id} className="order-item-row">
                    <img 
                      src={item.image_url || item.imageUrl || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100&h=100&fit=crop'} 
                      alt={item.medicine_name || item.medicineName} 
                      className="order-item-pic" 
                    />
                    <div className="order-item-details">
                      <span className="order-item-name">{item.medicine_name || item.medicineName}</span>
                      <span className="order-item-qty-price">
                        Số lượng: <strong>{item.quantity}</strong> × {formatPrice(item.price)}
                      </span>
                    </div>
                    <span className="order-item-subtotal">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Summary & Footer */}
              <div className="order-card-footer">
                <div className="order-shipping-address">
                  <strong>Địa chỉ giao hàng:</strong> {order.shipping_address || order.shippingAddress}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button 
                    className="track-shipper-btn"
                    onClick={() => setActiveTrackingOrder(order)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0f766e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0f766e'}
                  >
                    🏍️ Theo dõi Shipper
                  </button>
                  <div className="order-total-block">
                    <span className="total-label">Tổng tiền đơn hàng:</span>
                    <span className="total-val">{formatPrice(order.total_amount || order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTrackingOrder && (
        <OrderTrackingView 
          order={activeTrackingOrder} 
          onClose={() => setActiveTrackingOrder(null)} 
        />
      )}
    </div>
  );
};

export default HistoryView;
