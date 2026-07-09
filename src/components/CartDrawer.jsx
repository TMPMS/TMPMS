import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, MapPin, Truck, Ticket, CreditCard, Landmark, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import './CartDrawer.css';

const PICKUP_STORES = [
  'Trung tâm 102 Cầu Giấy, Hà Nội',
  'Trung tâm 54 Chùa Bộc, Đống Đa, Hà Nội',
  'Trung tâm 12 Nguyễn Huệ, Quận 1, TP. HCM',
  'Trung tâm 52 Nguyễn Văn Linh, Hải Châu, Đà Nẵng'
];

const CartDrawer = ({ isOpen, onClose, onOpenAuth }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('shipping'); // shipping or pickup
  const [pickupStore, setPickupStore] = useState(PICKUP_STORES[0]);
  
  // Recipient details (supports guest/logged-in user)
  const [recipientName, setRecipientName] = useState(user?.username || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [addressDetail, setAddressDetail] = useState('');
  
  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, discount }
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD, MOMO, ZALOPAY
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeVal, setQrCodeVal] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate voucher discount
  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.code === 'THAIMINH50') {
      discountAmount = 50000;
    } else if (appliedVoucher.code === 'LONGCHAU10') {
      discountAmount = Math.round(totalAmount * 0.1);
    } else if (appliedVoucher.code === 'FREESHIP') {
      discountAmount = 20000;
    }
  }
  const finalAmount = Math.max(0, totalAmount - discountAmount);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckoutClick = () => {
    setError('');
    // Pre-populate user details if logged in
    if (user) {
      setRecipientName(user.username || '');
      setRecipientPhone(user.phone || '');
    }
    setCheckoutMode(true);
  };

  // Voucher apply
  const handleApplyVoucher = (e) => {
    e.preventDefault();
    setVoucherError('');
    setVoucherSuccess('');
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'THAIMINH50') {
      setAppliedVoucher({ code, discount: 50000 });
      setVoucherSuccess('Áp dụng mã THAIMINH50 thành công: Giảm 50.000đ');
    } else if (code === 'LONGCHAU10') {
      setAppliedVoucher({ code, discount: Math.round(totalAmount * 0.1) });
      setVoucherSuccess('Áp dụng mã LONGCHAU10 thành công: Giảm 10%');
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({ code, discount: 20000 });
      setVoucherSuccess('Áp dụng mã FREESHIP thành công: Miễn phí vận chuyển (-20.000đ)');
    } else {
      setVoucherError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      setAppliedVoucher(null);
    }
  };

  const triggerOrderCreation = async () => {
    setLoading(true);
    setError('');
    setShowQRModal(false);

    try {
      // Build composite address depending on delivery mode
      let compositeAddress = '';
      if (deliveryMode === 'shipping') {
        compositeAddress = `[GIAO TẬN NƠI] Người nhận: ${recipientName} | SĐT: ${recipientPhone} | Địa chỉ: ${addressDetail}`;
      } else {
        compositeAddress = `[NHẬN TẠI NHÀ THUỐC] Cửa hàng: ${pickupStore} | Người nhận: ${recipientName} | SĐT: ${recipientPhone}`;
      }

      // Guest checkout uses user.id if logged in, otherwise default to 3 (seeded Customer account) to satisfy foreign key constraint
      const userId = user ? user.id : 3;

      const orderPayload = {
        userId: userId,
        totalAmount: finalAmount,
        shippingAddress: compositeAddress,
        paymentMethod: paymentMethod,
        items: cartItems.map(item => ({
          medicineId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      await api.createOrder(orderPayload);
      clearCart();
      setSuccessMsg('Đặt hàng thành công! Đơn hàng của bạn đã được chuyển cho dược sĩ xử lý.');
      setCheckoutMode(false);
      setAddressDetail('');
      setAppliedVoucher(null);
      setVoucherCode('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 3500);
    } catch (err) {
      console.error(err);
      setError('Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError('Vui lòng điền Họ tên và Số điện thoại người nhận!');
      return;
    }
    if (deliveryMode === 'shipping' && !addressDetail.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng chi tiết!');
      return;
    }

    if (paymentMethod === 'MOMO' || paymentMethod === 'ZALOPAY') {
      // Trigger QR code modal before saving
      const txnCode = 'LC' + Date.now().toString().slice(-6);
      setQrCodeVal(txnCode);
      setShowQRModal(true);
    } else {
      triggerOrderCreation();
    }
  };

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} className="cart-title-icon" />
            <span>Giỏ Hàng của bạn</span>
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
              <div className="success-icon-badge">✓</div>
              <h3>Đặt Hàng Thành Công!</h3>
              <p>{successMsg}</p>
              <p className="success-sub">Dược sĩ của chúng tôi sẽ gọi điện xác nhận đơn hàng của bạn trong vòng 5 phút.</p>
              <button className="success-btn" onClick={onClose}>Tiếp tục mua sắm</button>
            </div>
          ) : checkoutMode ? (
            /* Checkout Form */
            <form className="checkout-form" onSubmit={handleOrderSubmit}>
              <h3 className="checkout-section-title">Thông tin nhận hàng</h3>
              {error && <div className="checkout-error">{error}</div>}

              {/* Delivery method toggle */}
              <div className="delivery-toggle-container">
                <button 
                  type="button" 
                  className={`toggle-btn ${deliveryMode === 'shipping' ? 'active' : ''}`}
                  onClick={() => setDeliveryMode('shipping')}
                >
                  <Truck size={16} />
                  <span>Giao hàng tận nơi</span>
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${deliveryMode === 'pickup' ? 'active' : ''}`}
                  onClick={() => setDeliveryMode('pickup')}
                >
                  <MapPin size={16} />
                  <span>Nhận tại nhà thuốc</span>
                </button>
              </div>
              
              {/* Contact info */}
              <div className="checkout-field-row">
                <div className="checkout-field">
                  <label className="checkout-label">Họ và tên người nhận *</label>
                  <input 
                    type="text" 
                    className="checkout-input" 
                    required 
                    placeholder="Nhập họ tên người nhận"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="checkout-field">
                  <label className="checkout-label">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    className="checkout-input" 
                    required 
                    placeholder="Nhập số điện thoại nhận hàng"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Conditional address selection */}
              {deliveryMode === 'shipping' ? (
                <div className="checkout-field">
                  <label className="checkout-label">Địa chỉ giao hàng chi tiết *</label>
                  <textarea 
                    className="checkout-textarea" 
                    required
                    placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                  />
                </div>
              ) : (
                <div className="checkout-field animate-fade-in">
                  <label className="checkout-label">Lựa chọn cửa hàng nhận hàng *</label>
                  <select 
                    className="checkout-select"
                    value={pickupStore}
                    onChange={(e) => setPickupStore(e.target.value)}
                  >
                    {PICKUP_STORES.map((store, index) => (
                      <option key={index} value={store}>{store}</option>
                    ))}
                  </select>
                  <span className="pickup-notice">💡 Vui lòng qua cửa hàng nhận thuốc sau 30 phút kể từ khi xác nhận.</span>
                </div>
              )}

              {/* Voucher section */}
              <div className="checkout-voucher-section">
                <label className="checkout-label"><Ticket size={14} /> Mã giảm giá (Voucher)</label>
                <div className="voucher-input-wrap">
                  <input 
                    type="text" 
                    placeholder="Nhập mã (THAIMINH50, LONGCHAU10, FREESHIP)" 
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  <button type="button" onClick={handleApplyVoucher}>Áp dụng</button>
                </div>
                {voucherError && <span className="voucher-err-text">{voucherError}</span>}
                {voucherSuccess && <span className="voucher-success-text">{voucherSuccess}</span>}
              </div>

              {/* Payment methods */}
              <div className="checkout-field">
                <label className="checkout-label"><CreditCard size={14} /> Phương thức thanh toán</label>
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
                      <span className="option-desc">Thanh toán tiền mặt khi giao hàng.</span>
                    </div>
                  </label>
                  
                  <label className={`payment-option-card ${paymentMethod === 'MOMO' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="MOMO"
                      checked={paymentMethod === 'MOMO'}
                      onChange={() => setPaymentMethod('MOMO')} 
                    />
                    <div>
                      <span className="option-title">Ví điện tử MoMo (Quét QR)</span>
                      <span className="option-desc">Thanh toán chuyển khoản qua MoMo.</span>
                    </div>
                  </label>

                  <label className={`payment-option-card ${paymentMethod === 'ZALOPAY' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="ZALOPAY"
                      checked={paymentMethod === 'ZALOPAY'}
                      onChange={() => setPaymentMethod('ZALOPAY')} 
                    />
                    <div>
                      <span className="option-title">Ví điện tử ZaloPay (Quét QR)</span>
                      <span className="option-desc">Thanh toán chuyển khoản qua ZaloPay.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Price summary table */}
              <div className="checkout-summary-box">
                <div className="price-calc-row">
                  <span>Tổng tiền hàng:</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="price-calc-row discount animate-fade-in">
                    <span>Giảm giá Voucher:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="price-calc-row grand-total">
                  <span>Cần thanh toán:</span>
                  <span className="summary-total">{formatPrice(finalAmount)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="checkout-actions">
                <button type="button" className="checkout-back-btn" onClick={() => setCheckoutMode(false)}>
                  Quay lại giỏ hàng
                </button>
                <button type="submit" className="checkout-submit-btn" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
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

        {/* Footer for Cart list mode */}
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

      {/* MoMo / ZaloPay QR Scan Mock Modal Popup */}
      {showQRModal && (
        <div className="qr-pay-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-pay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <Landmark size={20} />
              <h4>Quét Mã QR Thanh Toán Trực Tuyến</h4>
              <button className="qr-close-btn" onClick={() => setShowQRModal(false)}><X size={18} /></button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-brand-badge">
                <span className={`brand-logo ${paymentMethod.toLowerCase()}`}>{paymentMethod}</span>
              </div>
              
              <div className="qr-image-wrapper">
                {/* SVG mock of a high-fidelity QR Code */}
                <svg width="180" height="180" viewBox="0 0 100 100" className="qr-svg-code">
                  <path d="M 0 0 L 0 30 L 10 30 L 10 10 L 30 10 L 30 0 Z" fill="#000" />
                  <path d="M 70 0 L 70 10 L 90 10 L 90 30 L 100 30 L 100 0 Z" fill="#000" />
                  <path d="M 0 70 L 0 100 L 30 100 L 30 90 L 10 90 L 10 70 Z" fill="#000" />
                  <path d="M 70 100 L 100 100 L 100 70 L 90 70 L 90 90 L 70 90 Z" fill="#000" />
                  <rect x="15" y="15" width="15" height="15" fill="#000" />
                  <rect x="70" y="15" width="15" height="15" fill="#000" />
                  <rect x="15" y="70" width="15" height="15" fill="#000" />
                  {/* Scatter matrix */}
                  <rect x="40" y="10" width="8" height="8" fill="#000" />
                  <rect x="52" y="25" width="6" height="6" fill="#000" />
                  <rect x="45" y="45" width="10" height="10" fill="#000" />
                  <rect x="75" y="45" width="8" height="8" fill="#000" />
                  <rect x="10" y="45" width="8" height="8" fill="#000" />
                  <rect x="45" y="75" width="8" height="8" fill="#000" />
                  <rect x="68" y="72" width="6" height="6" fill="#000" />
                </svg>
                <div className="qr-center-logo">{paymentMethod === 'MOMO' ? 'MoMo' : 'Zalo'}</div>
              </div>

              <div className="qr-details-table">
                <div className="qr-det-row">
                  <span>Chủ tài khoản:</span>
                  <strong>CÔNG TY CP DƯỢC PHẨM FPT LONG CHÂU</strong>
                </div>
                <div className="qr-det-row">
                  <span>Số tiền:</span>
                  <strong className="qr-amount-text">{formatPrice(finalAmount)}</strong>
                </div>
                <div className="qr-det-row">
                  <span>Nội dung chuyển khoản:</span>
                  <strong className="qr-code-highlight">{qrCodeVal}</strong>
                </div>
              </div>

              <div className="qr-instruction-alert">
                <span>⚠️ Quý khách vui lòng quét mã đúng số tiền và điền chính xác nội dung chuyển khoản để đơn hàng tự động duyệt lập tức.</span>
              </div>
            </div>
            <div className="qr-modal-footer">
              <button className="qr-cancel-btn" onClick={() => setShowQRModal(false)}>Hủy giao dịch</button>
              <button className="qr-confirm-btn" onClick={triggerOrderCreation}>
                <Check size={16} />
                <span>Tôi đã chuyển khoản thành công</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
