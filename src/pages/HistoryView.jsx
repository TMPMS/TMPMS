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
    if (price == null) return 'Liên hệ';
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

  const [invoiceModalData, setInvoiceModalData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleViewInvoice = async (orderId) => {
    try {
      setInvoiceLoading(true);
      const data = await api.fetchInvoiceByOrder(orderId);
      setInvoiceModalData(data);
    } catch (err) {
      console.error(err);
      alert('Chưa thể lấy hóa đơn cho đơn hàng này: ' + (err.message || 'Lỗi server'));
    } finally {
      setInvoiceLoading(false);
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
                      {item.price != null ? formatPrice(item.price * item.quantity) : 'Liên hệ'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Summary & Footer */}
              <div className="order-card-footer">
                <div className="order-shipping-address">
                  <strong>Địa chỉ giao hàng:</strong> {order.shipping_address || order.shippingAddress}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

                  <button 
                    className="view-invoice-btn"
                    onClick={() => handleViewInvoice(order.id)}
                    disabled={invoiceLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1e293b',
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
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                  >
                    📄 Xem Hóa Đơn GTGT
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

      {/* Invoice Modal */}
      {invoiceModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            color: '#1e293b',
            fontFamily: 'sans-serif'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', pb: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f766e', fontSize: '22px', fontWeight: 'bold' }}>🧾 HÓA ĐƠN GIÁ TRỊ GIA TĂNG (GTGT)</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Hệ Thống Nhà Thuốc & Dược Liệu Đông Y TMPMS</p>
              </div>
              <button 
                onClick={() => setInvoiceModalData(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
              <div><strong>Số hóa đơn:</strong> <span style={{ color: '#0d9488', fontWeight: 'bold' }}>{invoiceModalData.invoiceCode || invoiceModalData.InvoiceCode}</span></div>
              <div><strong>Ngày xuất:</strong> {formatDate(invoiceModalData.issuedAt || invoiceModalData.IssuedAt)}</div>
              <div><strong>Mã đơn hàng:</strong> #{invoiceModalData.orderId || invoiceModalData.OrderId}</div>
              <div><strong>Khách hàng:</strong> {invoiceModalData.customerName || invoiceModalData.CustomerName || user.username}</div>
              <div style={{ gridColumn: 'span 2' }}><strong>Địa chỉ nhận hàng:</strong> {invoiceModalData.shippingAddress || invoiceModalData.ShippingAddress}</div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}>Chi tiết danh mục thuốc & dược liệu:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Sản phẩm</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(invoiceModalData.items || invoiceModalData.Items || []).map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>{it.medicineName || it.MedicineName}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{it.quantity || it.Quantity}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{formatPrice(it.price || it.Price)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>{(it.price || it.Price) != null ? formatPrice((it.price || it.Price) * (it.quantity || it.Quantity)) : 'Liên hệ'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Tổng thanh toán (Đã gồm thuế GTGT):</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f766e' }}>
                {formatPrice(invoiceModalData.totalAmount || invoiceModalData.TotalAmount)}
              </span>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button 
                onClick={() => setInvoiceModalData(null)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Đóng Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
