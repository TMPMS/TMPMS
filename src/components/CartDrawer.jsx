import { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, MapPin, Truck, Ticket, CreditCard } from 'lucide-react';
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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null); // null = "địa chỉ khác" (nhập tay)

  const formatSavedAddress = (a) => [a.addressLine, a.ward, a.district, a.city].filter(Boolean).join(', ');
  
  // Voucher states — tối đa 1 voucher giảm sản phẩm + 1 voucher giảm phí ship, áp dụng song song.
  // Tự động chọn voucher lợi nhất cho mỗi loại; người dùng có thể xem danh sách và đổi ý.
  const [productVoucherCode, setProductVoucherCode] = useState('');
  const [appliedProductVoucher, setAppliedProductVoucher] = useState(null); // { code, discount, name }
  const [productVoucherError, setProductVoucherError] = useState('');
  const [productVoucherSuccess, setProductVoucherSuccess] = useState('');
  const [productVoucherAutoApplied, setProductVoucherAutoApplied] = useState(false);
  const [productVoucherDismissed, setProductVoucherDismissed] = useState(false);
  const [availableProductVouchers, setAvailableProductVouchers] = useState([]);
  const [showProductVoucherList, setShowProductVoucherList] = useState(false);

  const [shippingVoucherCode, setShippingVoucherCode] = useState('');
  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState(null);
  const [shippingVoucherError, setShippingVoucherError] = useState('');
  const [shippingVoucherSuccess, setShippingVoucherSuccess] = useState('');
  const [shippingVoucherAutoApplied, setShippingVoucherAutoApplied] = useState(false);
  const [shippingVoucherDismissed, setShippingVoucherDismissed] = useState(false);
  const [availableShippingVouchers, setAvailableShippingVouchers] = useState([]);
  const [showShippingVoucherList, setShowShippingVoucherList] = useState(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD, PAYOS

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Chờ đăng nhập xong để tự động tiếp tục thanh toán (null | 'checkout' | 'submit')
  const [loginRedirectAction, setLoginRedirectAction] = useState(null);

  const [shippingFee, setShippingFee] = useState(0);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!checkoutMode) return;
    
    const calculateFee = async () => {
      try {
        const addr = deliveryMode === 'shipping' ? addressDetail : pickupStore;
        if (deliveryMode === 'shipping' && !addressDetail.trim()) {
          setShippingFee(0);
          setDistance(0);
          return;
        }
        const data = await api.calculateShipping(addr, deliveryMode);
        setShippingFee(data.shippingFee);
        setDistance(data.distance);
      } catch (err) {
        console.error("Error calculating shipping:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      calculateFee();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [addressDetail, pickupStore, deliveryMode, checkoutMode]);

  // Nạp danh sách voucher (công khai + cá nhân) khi vào thanh toán, để tự động chọn mã lợi nhất
  // và cho phép người dùng xem/đổi sang mã khác.
  useEffect(() => {
    if (!checkoutMode || !user) return;
    let cancelled = false;
    Promise.all([api.fetchVouchers(), api.fetchMyVouchers().catch(() => [])])
      .then(([pub, mine]) => {
        if (cancelled) return;
        const all = [...pub, ...mine];
        setAvailableProductVouchers(all.filter(v => v.type === 'product'));
        setAvailableShippingVouchers(all.filter(v => v.type === 'shipping'));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [checkoutMode, user]);

  // Ẩn tất cả nút floating widget/chat ở góc dưới màn hình khi mở Giỏ hàng
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('cart-drawer-open');
    } else {
      document.body.classList.remove('cart-drawer-open');
    }
    return () => document.body.classList.remove('cart-drawer-open');
  }, [isOpen]);

  // Sau khi đăng nhập thành công (từ modal login), tự động tiếp tục thanh toán
  useEffect(() => {
    if (!loginRedirectAction || !user) return;
    const action = loginRedirectAction;
    setTimeout(async () => {
      setLoginRedirectAction(null);
      try {
        const profile = await api.fetchMyProfile();
        setRecipientName(profile.fullName || profile.username || '');
        setRecipientPhone(profile.phone || '');
      } catch {
        setRecipientName(user.username || '');
        setRecipientPhone(user.phone || '');
      }
      if (action === 'checkout') {
        setCheckoutMode(true);
      }
    }, 0);
  }, [loginRedirectAction, user]);

  const rxItems = cartItems.filter(item => item.requiresPrescription);
  const otcItems = cartItems.filter(item => !item.requiresPrescription);

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Số tiền giảm — do server tính khi validate/checkout, FE chỉ hiển thị lại kết quả đã áp dụng.
  const productDiscount = appliedProductVoucher?.discount || 0;
  const shippingDiscount = appliedShippingVoucher?.discount || 0;
  const discountAmount = productDiscount + shippingDiscount;
  const finalAmount = Math.max(0, totalAmount + shippingFee - discountAmount);

  // Ước tính nhanh mức giảm phía client để xếp hạng voucher (số tiền thật vẫn do server xác nhận
  // khi áp dụng qua validateVoucher).
  const estimateVoucherDiscount = (voucher, baseAmount) => {
    let discount = voucher.discountType === 'percent'
      ? baseAmount * voucher.discountValue / 100
      : voucher.discountValue;
    if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    return Math.max(0, Math.min(discount, baseAmount));
  };

  const eligibleProductVouchers = availableProductVouchers
    .filter(v => totalAmount >= v.minOrderValue)
    .map(v => ({ ...v, estimatedDiscount: estimateVoucherDiscount(v, totalAmount) }))
    .filter(v => v.estimatedDiscount > 0)
    .sort((a, b) => b.estimatedDiscount - a.estimatedDiscount);

  const eligibleShippingVouchers = availableShippingVouchers
    .filter(v => totalAmount >= v.minOrderValue)
    .map(v => ({ ...v, estimatedDiscount: estimateVoucherDiscount(v, shippingFee) }))
    .filter(v => v.estimatedDiscount > 0)
    .sort((a, b) => b.estimatedDiscount - a.estimatedDiscount);

  const bestProductVoucherCode = eligibleProductVouchers[0]?.code || null;
  const bestShippingVoucherCode = eligibleShippingVouchers[0]?.code || null;

  const formatPrice = (price) => {
    if (price == null) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Bắt buộc đăng nhập trước khi thanh toán: mở modal login, sau khi đăng nhập
  // thành công tự động mở form thanh toán để tiếp tục.
  const requireLogin = () => {
    setLoginRedirectAction('checkout');
    if (onOpenAuth) onOpenAuth();
    else window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
  };

  const handleCheckoutClick = async () => {
    setError('');
    if (!user) {
      requireLogin();
      return;
    }
    // Pre-populate user details if logged in — dùng hồ sơ mới nhất thay vì dữ liệu đăng nhập cũ
    let freshProfile = null;
    try {
      freshProfile = await api.fetchMyProfile();
      setRecipientName(freshProfile.fullName || freshProfile.username || '');
      setRecipientPhone(freshProfile.phone || '');
    } catch {
      setRecipientName(user.username || '');
      setRecipientPhone(user.phone || '');
    }

    // Nạp sổ địa chỉ đã lưu, tự chọn địa chỉ mặc định (nếu có)
    const fallbackAddress = freshProfile?.address || user.address || 'Quận Ba Đình, Hà Nội';
    try {
      const addresses = await api.getPatientAddresses(user.id);
      if (Array.isArray(addresses) && addresses.length > 0) {
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find(a => a.isDefault || a.is_default) || addresses[0];
        setSelectedAddressId(defaultAddr.id);
        setAddressDetail(formatSavedAddress(defaultAddr));
      } else {
        setSavedAddresses([]);
        setSelectedAddressId(null);
        setAddressDetail(fallbackAddress);
      }
    } catch {
      setSavedAddresses([]);
      setSelectedAddressId(null);
      setAddressDetail(fallbackAddress);
    }

    setCheckoutMode(true);
  };

  // Voucher apply — gọi API thật, mỗi ô chỉ nhận đúng loại voucher tương ứng (sản phẩm/ship).
  // isAuto=true khi hệ thống tự chọn mã lợi nhất (không hiện thông báo/lỗi làm phiền người dùng).
  const applyProductVoucherByCode = async (code, isAuto = false) => {
    if (!isAuto) { setProductVoucherError(''); setProductVoucherSuccess(''); }
    try {
      const result = await api.validateVoucher(code, totalAmount, 'product');
      setAppliedProductVoucher({ code, discount: result.discount, name: result.voucher?.name });
      setProductVoucherCode(code);
      setProductVoucherAutoApplied(isAuto);
      if (!isAuto) setProductVoucherSuccess(`Áp dụng mã ${code} thành công: Giảm ${formatPrice(result.discount)}`);
    } catch (err) {
      if (!isAuto) {
        setProductVoucherError(err.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        setAppliedProductVoucher(null);
      }
    }
  };

  const applyShippingVoucherByCode = async (code, isAuto = false) => {
    if (!isAuto) { setShippingVoucherError(''); setShippingVoucherSuccess(''); }
    try {
      const result = await api.validateVoucher(code, totalAmount, 'shipping', shippingFee);
      setAppliedShippingVoucher({ code, discount: result.discount, name: result.voucher?.name });
      setShippingVoucherCode(code);
      setShippingVoucherAutoApplied(isAuto);
      if (!isAuto) setShippingVoucherSuccess(`Áp dụng mã ${code} thành công: Giảm ${formatPrice(result.discount)} phí vận chuyển`);
    } catch (err) {
      if (!isAuto) {
        setShippingVoucherError(err.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        setAppliedShippingVoucher(null);
      }
    }
  };

  const handleApplyProductVoucher = (e) => {
    e.preventDefault();
    const code = productVoucherCode.trim().toUpperCase();
    if (!code) return;
    setProductVoucherDismissed(false);
    applyProductVoucherByCode(code, false);
  };

  const handleApplyShippingVoucher = (e) => {
    e.preventDefault();
    const code = shippingVoucherCode.trim().toUpperCase();
    if (!code) return;
    setShippingVoucherDismissed(false);
    applyShippingVoucherByCode(code, false);
  };

  const pickProductVoucher = (code) => {
    setProductVoucherDismissed(false);
    setShowProductVoucherList(false);
    applyProductVoucherByCode(code, false);
  };

  const pickShippingVoucher = (code) => {
    setShippingVoucherDismissed(false);
    setShowShippingVoucherList(false);
    applyShippingVoucherByCode(code, false);
  };

  const clearProductVoucher = () => {
    setAppliedProductVoucher(null);
    setProductVoucherCode('');
    setProductVoucherError('');
    setProductVoucherSuccess('');
    setProductVoucherDismissed(true);
  };

  const clearShippingVoucher = () => {
    setAppliedShippingVoucher(null);
    setShippingVoucherCode('');
    setShippingVoucherError('');
    setShippingVoucherSuccess('');
    setShippingVoucherDismissed(true);
  };

  // Tự động áp mã lợi nhất cho mỗi loại — chỉ khi người dùng chưa tự chọn/bỏ chọn mã nào khác.
  useEffect(() => {
    if (!checkoutMode || !bestProductVoucherCode || productVoucherDismissed) return;
    if (appliedProductVoucher && !productVoucherAutoApplied) return;
    if (appliedProductVoucher?.code === bestProductVoucherCode) return;
    applyProductVoucherByCode(bestProductVoucherCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutMode, bestProductVoucherCode, productVoucherDismissed]);

  useEffect(() => {
    if (!checkoutMode || !bestShippingVoucherCode || shippingVoucherDismissed) return;
    if (appliedShippingVoucher && !shippingVoucherAutoApplied) return;
    if (appliedShippingVoucher?.code === bestShippingVoucherCode) return;
    applyShippingVoucherByCode(bestShippingVoucherCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutMode, bestShippingVoucherCode, shippingVoucherDismissed]);

  if (!isOpen) return null;

  const triggerOrderCreation = async () => {
    if (!user) {
      requireLogin();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build composite address depending on delivery mode
      let compositeAddress = '';
      if (deliveryMode === 'shipping') {
        compositeAddress = `[GIAO TẬN NƠI] Người nhận: ${recipientName} | SĐT: ${recipientPhone} | Địa chỉ: ${addressDetail}`;
      } else {
        compositeAddress = `[NHẬN TẠI NHÀ THUỐC] Cửa hàng: ${pickupStore} | Người nhận: ${recipientName} | SĐT: ${recipientPhone}`;
      }

      const orderPayload = {
        userId: user.id,
        totalAmount: finalAmount,
        shippingAddress: compositeAddress,
        paymentMethod: paymentMethod,
        deliveryMethod: deliveryMode === 'shipping' ? 'Giao hàng hỏa tốc (Ship 2 Giờ)' : 'Nhận tại cửa hàng',
        shippingFee: shippingFee,
        productVoucherCode: appliedProductVoucher?.code || null,
        shippingVoucherCode: appliedShippingVoucher?.code || null,
        items: cartItems.map(item => ({
          medicineId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const order = await api.createOrder(orderPayload);

      if (paymentMethod === 'PAYOS') {
        const baseUrl = window.location.origin;
        const paymentLink = await api.createPayOSPaymentLink(
          order.id,
          `${baseUrl}/?payment=success&orderCode=${order.id}`,
          `${baseUrl}/?payment=cancelled&orderCode=${order.id}`
        );
        clearCart();
        window.location.assign(paymentLink.checkoutUrl);
        return;
      }

      clearCart();
      setSuccessMsg('Đặt hàng thành công! Đơn hàng của bạn đã được chuyển cho dược sĩ xử lý.');
      setCheckoutMode(false);
      setAddressDetail('');
      setAppliedProductVoucher(null);
      setProductVoucherCode('');
      setProductVoucherAutoApplied(false);
      setProductVoucherDismissed(false);
      setAppliedShippingVoucher(null);
      setShippingVoucherCode('');
      setShippingVoucherAutoApplied(false);
      setShippingVoucherDismissed(false);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 3500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const triggerDemoPayOSOrderCreation = async () => {
    if (!user) {
      requireLogin();
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError('Vui lòng điền Họ tên và Số điện thoại người nhận!');
      return;
    }
    if (deliveryMode === 'shipping' && !addressDetail.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng chi tiết!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let compositeAddress = '';
      if (deliveryMode === 'shipping') {
        compositeAddress = `[GIAO TẬN NƠI] Người nhận: ${recipientName} | SĐT: ${recipientPhone} | Địa chỉ: ${addressDetail}`;
      } else {
        compositeAddress = `[NHẬN TẠI NHÀ THUỐC] Cửa hàng: ${pickupStore} | Người nhận: ${recipientName} | SĐT: ${recipientPhone}`;
      }

      const orderPayload = {
        userId: user.id,
        totalAmount: finalAmount,
        shippingAddress: compositeAddress,
        paymentMethod: 'PAYOS',
        deliveryMethod: deliveryMode === 'shipping' ? 'Giao hàng hỏa tốc (Ship 2 Giờ)' : 'Nhận tại cửa hàng',
        shippingFee: shippingFee,
        productVoucherCode: appliedProductVoucher?.code || null,
        shippingVoucherCode: appliedShippingVoucher?.code || null,
        items: cartItems.map(item => ({
          medicineId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const order = await api.createOrder(orderPayload);
      await api.demoPayOSPayment(order.id);
      clearCart();

      const baseUrl = window.location.origin;
      window.location.assign(`${baseUrl}/?payment=success&orderCode=${order.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tạo đơn hàng demo. Vui lòng thử lại!');
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

    triggerOrderCreation();
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
                  <span>Giao hàng hỏa tốc (Ship 2 Giờ)</span>
                </button>
                <button 
                  type="button" 
                  className={`toggle-btn ${deliveryMode === 'pickup' ? 'active' : ''}`}
                  onClick={() => setDeliveryMode('pickup')}
                >
                  <MapPin size={16} />
                  <span>Nhận tại cửa hàng</span>
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
                  <label className="checkout-label">Địa chỉ giao hàng *</label>
                  {savedAddresses.length > 0 && (
                    <div className="saved-address-list">
                      {savedAddresses.map(addr => (
                        <label key={addr.id} className={`saved-address-option ${selectedAddressId === addr.id ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="saved_address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => { setSelectedAddressId(addr.id); setAddressDetail(formatSavedAddress(addr)); }}
                          />
                          <span>
                            {addr.isDefault && <strong className="saved-address-default-tag">Mặc định · </strong>}
                            {formatSavedAddress(addr)}
                          </span>
                        </label>
                      ))}
                      <label className={`saved-address-option ${selectedAddressId === null ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="saved_address"
                          checked={selectedAddressId === null}
                          onChange={() => { setSelectedAddressId(null); setAddressDetail(''); }}
                        />
                        <span>Địa chỉ khác...</span>
                      </label>
                    </div>
                  )}
                  {selectedAddressId === null && (
                    <textarea
                      className="checkout-textarea"
                      required
                      placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                    />
                  )}
                  {addressDetail.trim() && (
                    <div style={{
                      marginTop: 6,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: shippingFee === 0 ? '#f0fdf4' : '#fff7ed',
                      color: shippingFee === 0 ? '#15803d' : '#c2410c',
                      border: `1px solid ${shippingFee === 0 ? '#bbf7d0' : '#ffedd5'}`
                    }}>
                      {shippingFee === 0 ? '🎉 Miễn phí giao hàng (Nội thành Hà Nội - 0đ)' : '🚚 Phí giao hàng: 40.000đ (Ngoại thành / Tỉnh)'}
                    </div>
                  )}
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

              {/* Voucher section — tối đa 1 mã giảm sản phẩm + 1 mã giảm phí ship.
                  Hệ thống tự chọn mã lợi nhất; người dùng có thể xem danh sách và đổi mã. */}
              <div className="checkout-voucher-section">
                <label className="checkout-label"><Ticket size={14} /> Mã giảm giá sản phẩm</label>
                {appliedProductVoucher ? (
                  <div className="voucher-applied-card">
                    <div className="voucher-applied-info">
                      <strong>{appliedProductVoucher.code}</strong>
                      <span>{appliedProductVoucher.name || 'Voucher giảm giá sản phẩm'} · -{formatPrice(appliedProductVoucher.discount)}</span>
                      {productVoucherAutoApplied && <span className="voucher-auto-badge">Tự động chọn mã lợi nhất</span>}
                    </div>
                    <div className="voucher-applied-actions">
                      {eligibleProductVouchers.length > 1 && (
                        <button type="button" onClick={() => setShowProductVoucherList(v => !v)}>Đổi mã</button>
                      )}
                      <button type="button" onClick={clearProductVoucher}>Bỏ chọn</button>
                    </div>
                  </div>
                ) : (
                  <div className="voucher-input-wrap">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá sản phẩm"
                      value={productVoucherCode}
                      onChange={(e) => setProductVoucherCode(e.target.value)}
                    />
                    <button type="button" onClick={handleApplyProductVoucher}>Áp dụng</button>
                  </div>
                )}
                {eligibleProductVouchers.length > 0 && (
                  <button type="button" className="voucher-list-toggle" onClick={() => setShowProductVoucherList(v => !v)}>
                    🎟️ Xem {eligibleProductVouchers.length} voucher khả dụng {showProductVoucherList ? '▲' : '▼'}
                  </button>
                )}
                {showProductVoucherList && (
                  <div className="voucher-list-panel">
                    {eligibleProductVouchers.map(v => (
                      <button
                        type="button"
                        key={v.id}
                        className={`voucher-list-item ${appliedProductVoucher?.code === v.code ? 'active' : ''}`}
                        onClick={() => pickProductVoucher(v.code)}
                      >
                        <span className="voucher-list-item-code">{v.code}</span>
                        <span className="voucher-list-item-name">{v.name}</span>
                        <span className="voucher-list-item-value">-{formatPrice(v.estimatedDiscount)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {productVoucherError && <span className="voucher-err-text">{productVoucherError}</span>}
                {productVoucherSuccess && <span className="voucher-success-text">{productVoucherSuccess}</span>}
              </div>

              <div className="checkout-voucher-section">
                <label className="checkout-label"><Truck size={14} /> Mã giảm phí vận chuyển</label>
                {appliedShippingVoucher ? (
                  <div className="voucher-applied-card">
                    <div className="voucher-applied-info">
                      <strong>{appliedShippingVoucher.code}</strong>
                      <span>{appliedShippingVoucher.name || 'Voucher giảm phí vận chuyển'} · -{formatPrice(appliedShippingVoucher.discount)}</span>
                      {shippingVoucherAutoApplied && <span className="voucher-auto-badge">Tự động chọn mã lợi nhất</span>}
                    </div>
                    <div className="voucher-applied-actions">
                      {eligibleShippingVouchers.length > 1 && (
                        <button type="button" onClick={() => setShowShippingVoucherList(v => !v)}>Đổi mã</button>
                      )}
                      <button type="button" onClick={clearShippingVoucher}>Bỏ chọn</button>
                    </div>
                  </div>
                ) : (
                  <div className="voucher-input-wrap">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm phí vận chuyển"
                      value={shippingVoucherCode}
                      onChange={(e) => setShippingVoucherCode(e.target.value)}
                    />
                    <button type="button" onClick={handleApplyShippingVoucher}>Áp dụng</button>
                  </div>
                )}
                {eligibleShippingVouchers.length > 0 && (
                  <button type="button" className="voucher-list-toggle" onClick={() => setShowShippingVoucherList(v => !v)}>
                    🚚 Xem {eligibleShippingVouchers.length} voucher khả dụng {showShippingVoucherList ? '▲' : '▼'}
                  </button>
                )}
                {showShippingVoucherList && (
                  <div className="voucher-list-panel">
                    {eligibleShippingVouchers.map(v => (
                      <button
                        type="button"
                        key={v.id}
                        className={`voucher-list-item ${appliedShippingVoucher?.code === v.code ? 'active' : ''}`}
                        onClick={() => pickShippingVoucher(v.code)}
                      >
                        <span className="voucher-list-item-code">{v.code}</span>
                        <span className="voucher-list-item-name">{v.name}</span>
                        <span className="voucher-list-item-value">-{formatPrice(v.estimatedDiscount)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {shippingVoucherError && <span className="voucher-err-text">{shippingVoucherError}</span>}
                {shippingVoucherSuccess && <span className="voucher-success-text">{shippingVoucherSuccess}</span>}
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
                  
                  <label className={`payment-option-card ${paymentMethod === 'PAYOS' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="PAYOS"
                      checked={paymentMethod === 'PAYOS'}
                      onChange={() => setPaymentMethod('PAYOS')}
                    />
                    <div>
                      <span className="option-title">Thanh toán online qua PayOS</span>
                      <span className="option-desc">Quét VietQR hoặc thanh toán trên trang bảo mật của PayOS.</span>
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
                {deliveryMode === 'shipping' && (
                  <div className="price-calc-row animate-fade-in">
                    <span>Phí vận chuyển ({distance > 0 ? `${distance}km` : 'Hà Nội'}):</span>
                    <span>
                      {shippingFee === 0 ? (
                        <strong style={{ color: '#166534' }}>0 đ (Miễn phí)</strong>
                      ) : (
                        formatPrice(shippingFee)
                      )}
                    </span>
                  </div>
                )}
                {productDiscount > 0 && (
                  <div className="price-calc-row discount animate-fade-in">
                    <span>Giảm giá sản phẩm:</span>
                    <span>-{formatPrice(productDiscount)}</span>
                  </div>
                )}
                {shippingDiscount > 0 && (
                  <div className="price-calc-row discount animate-fade-in">
                    <span>Giảm phí vận chuyển:</span>
                    <span>-{formatPrice(shippingDiscount)}</span>
                  </div>
                )}
                <div className="price-calc-row grand-total">
                  <span>Cần thanh toán:</span>
                  <span className="summary-total">{formatPrice(finalAmount)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="checkout-actions" style={{ flexDirection: paymentMethod === 'PAYOS' ? 'column' : 'row', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button type="button" className="checkout-back-btn" onClick={() => setCheckoutMode(false)} style={{ flex: 1 }}>
                    Quay lại
                  </button>
                  <button type="submit" className="checkout-submit-btn" disabled={loading} style={{ flex: 2 }}>
                    {loading ? 'Đang xử lý...' : (paymentMethod === 'PAYOS' ? '🔗 Cổng PayOS thật' : 'Xác nhận đặt hàng')}
                  </button>
                </div>
                {paymentMethod === 'PAYOS' && (
                  <button
                    type="button"
                    onClick={triggerDemoPayOSOrderCreation}
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    ⚡ Thanh toán DEMO (Xác nhận Đã thanh toán ngay)
                  </button>
                )}
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
              {otcItems.map((item) => {
                const otcAtLimit = item.stockQuantity != null && item.quantity >= item.stockQuantity;
                return (
                <div key={item.id} className="cart-item-card">
                  <img src={api.formatImageUrl(item.imageUrl || item.image)} alt={item.name} className="cart-item-img" onError={(e) => { e.target.onerror = null; e.target.src = api.FALLBACK_MED_IMG; }} />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">{formatPrice(item.price)}</span>
                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={12} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={otcAtLimit}
                          title={otcAtLimit ? 'Đã đạt số lượng tồn kho hiện có' : 'Tăng số lượng'}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button className="item-delete-btn" onClick={() => removeFromCart(item.id)} title="Xóa khỏi giỏ hàng">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {otcAtLimit && (
                      <span className="cart-item-stock-warning">Đã đạt số lượng tồn kho hiện có ({item.stockQuantity})</span>
                    )}
                  </div>
                </div>
                );
              })}

              {rxItems.length > 0 && (
                <div className="cart-rx-group">
                  <div className="cart-rx-group-header">
                    <span className="cart-rx-badge">💊 Thuốc kê đơn</span>
                    <span className="cart-rx-note">Số lượng giới hạn theo đơn thuốc đã duyệt</span>
                  </div>
                  {rxItems.map((item) => {
                    const atLimit = item.allowedQuantity != null && item.quantity >= item.allowedQuantity;
                    return (
                      <div key={item.id} className="cart-item-card">
                        <img src={api.formatImageUrl(item.imageUrl || item.image)} alt={item.name} className="cart-item-img" onError={(e) => { e.target.onerror = null; e.target.src = api.FALLBACK_MED_IMG; }} />
                        <div className="cart-item-info">
                          <span className="cart-item-name">{item.name}</span>
                          <span className="cart-item-price">{formatPrice(item.price)}</span>
                          <div className="cart-item-actions">
                            <div className="quantity-controls">
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                <Minus size={12} />
                              </button>
                              <span className="qty-val">{item.quantity}</span>
                              <button
                                className="qty-btn"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={atLimit}
                                title={atLimit ? 'Đã đạt liều lượng tối đa trong đơn thuốc' : 'Tăng số lượng'}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button className="item-delete-btn" onClick={() => removeFromCart(item.id)} title="Xóa khỏi giỏ hàng">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

    </div>
  );
};

export default CartDrawer;
