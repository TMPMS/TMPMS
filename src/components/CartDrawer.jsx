import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckoutClick = () => {
    if (!user) {
      setError('Vui lòng đăng nhập để thực hiện thanh toán!');
      return;
    }
    setError('');
    setCheckoutMode(true);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng!');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const orderPayload = {
        user_id: user.id,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        items: cartItems.map(item => ({
          medicine_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      await api.createOrder(orderPayload);
      clearCart();
      setSuccessMsg('Đặt hàng thành công! Đơn hàng của bạn đã được ghi nhận.');
      setCheckoutMode(false);
      setShippingAddress('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Không thể tạo đơn hàng. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} className="cart-title-icon" />
            <span>Giỏ Hàng</span>
            <span className="cart-badge-count">({cartItems.length})</span>
          </div>
          <button className="cart-drawer-close" onClick={onClose} title="Đóng giỏ hàng">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {successMsg ? (
            <div className="cart-success-view">
              <div className="success-icon">✓</div>
              <h3>Đặt hàng thành công!</h3>
              <p>{successMsg}</p>
              <button className="success-btn" onClick={onClose}>Tiếp tục mua sắm</button>
            </div>
          ) : checkoutMode ? (
            /* Checkout Form */
            <form className="checkout-form" onSubmit={handleOrderSubmit}>
              <h3 className="checkout-section-title">Thông tin giao hàng</h3>
              {error && <div className="checkout-error">{error}</div>}
              
              <div className="checkout-field">
                <label className="checkout-label">Người nhận</label>
                <input type="text" className="checkout-input" value={user?.username || ''} disabled />
              </div>

              <div className="checkout-field">
                <label className="checkout-label">Số điện thoại</label>
                <input type="text" className="checkout-input" value={user?.phone || ''} disabled />
              </div>

              <div className="checkout-field">
                <label className="checkout-label">Địa chỉ giao hàng *</label>
                <textarea 
                  className="checkout-textarea" 
                  required
                  placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>

              <div className="checkout-field">
                <label className="checkout-label">Phương thức thanh toán</label>
                <div className="payment-options">
                  <label className={`payment-option-card ${paymentMethod === 'COD' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')} 
                    />
                    <div>
                      <span className="option-title">Thanh toán khi nhận hàng (COD)</span>
                      <span className="option-desc">Thanh toán bằng tiền mặt khi nhận hàng.</span>
                    </div>
                  </label>
                  <label className={`payment-option-card ${paymentMethod === 'Chuyển khoản' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="Chuyển khoản"
                      checked={paymentMethod === 'Chuyển khoản'}
                      onChange={() => setPaymentMethod('Chuyển khoản')} 
                    />
                    <div>
                      <span className="option-title">Chuyển khoản ngân hàng</span>
                      <span className="option-desc">Quét mã QR hoặc chuyển khoản.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="summary-total">{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <div className="checkout-actions">
                <button type="button" className="checkout-back-btn" onClick={() => setCheckoutMode(false)}>
                  Quay lại
                </button>
                <button type="submit" className="checkout-submit-btn" disabled={loading}>
                  {loading ? 'Đang tạo đơn...' : 'Xác nhận đặt hàng'}
                </button>
              </div>
            </form>
          ) : cartItems.length === 0 ? (
            /* Empty Cart */
            <div className="cart-empty-view">
              <ShoppingBag size={64} className="empty-cart-icon" />
              <h3>Giỏ hàng của bạn đang trống</h3>
              <p>Hãy chọn thêm các sản phẩm thảo dược và thuốc Đông y chất lượng cao.</p>
              <button className="empty-cart-btn" onClick={onClose}>Mua sắm ngay</button>
            </div>
          ) : (
            /* Cart List */
            <div className="cart-items-list">
              {error && <div className="checkout-error">{error}</div>}
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <img src={item.imageUrl || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100&h=100&fit=crop'} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">{formatPrice(item.price)}</span>
                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={12} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button className="item-delete-btn" onClick={() => removeFromCart(item.id)} title="Xóa khỏi giỏ hàng">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!checkoutMode && cartItems.length > 0 && !successMsg && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal-row">
              <span className="subtotal-label">Tổng tiền tạm tính:</span>
              <span className="subtotal-val">{formatPrice(totalAmount)}</span>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckoutClick}>
              Tiến hành thanh toán
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
