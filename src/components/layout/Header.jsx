import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ShoppingCart, User, Mic, Camera, Phone, Download, ChevronDown, MapPin, Syringe, Menu, ChevronRight, FileText } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CartDrawer from '../CartDrawer';
import UploadPrescriptionModal from '../ui/UploadPrescriptionModal';
import SpinWheelModal from '../SpinWheelModal';
import { fetchMedicines, formatImageUrl, FALLBACK_MED_IMG, requestPasswordReset, resetPassword, sendOtp, fetchWheelStatus, searchMedicineByImage } from '../../services/api';
import './Header.css';

const USERNAME_PATTERN = /^[A-Za-z]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/;

const categories = [
  { label: 'Thảo Dược Đông Y', sub: ['Vị thuốc kê đơn', 'Cao dược liệu', 'Nhân sâm & Đông trùng'] },
  { label: 'Thực phẩm chức năng', sub: ['Vitamin & Khoáng chất', 'Bổ não', 'Hỗ trợ gan', 'Đẹp da'] },
  { label: 'Dược mỹ phẩm', sub: ['Kem dưỡng da', 'Chống nắng', 'Tẩy trang', 'Serum'] },
  { label: 'Thuốc', sub: ['Thuốc kê đơn', 'Thuốc không kê đơn', 'Kháng sinh', 'Hạ sốt'] },
  { label: 'Chăm sóc cá nhân', sub: ['Dầu gội', 'Sữa tắm', 'Vệ sinh phụ nữ'] },
  { label: 'Thiết bị y tế', sub: ['Máy đo huyết áp', 'Nhiệt kế', 'Máy xông khí'] },
  { label: 'Châm cứu', sub: ['Châm cứu bấm huyệt', 'Điện châm trị liệu', 'Thuỷ châm'] },
  { label: 'Bệnh & Góc sức khỏe', sub: ['Bài viết', 'Video sức khỏe'] },
  { label: 'Hệ thống nhà thuốc', sub: [] },
];



const Header = ({ onSearch, onNavigate, onSelectCategory, onSelectProduct }) => {
  const { cartCount } = useCart();
  const { user, login, register, logout, loginWithGoogle, loginWithOtp } = useAuth();

  const [activeMenu, setActiveMenu] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login | register | forgot | reset | otp-login
  const [otpSent, setOtpSent] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartStartInCheckout, setCartStartInCheckout] = useState(false);

  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  // Voice & Image Search states
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState('Đang chuẩn bị...');
  const [voiceSearchError, setVoiceSearchError] = useState('');
  const recognitionRef = useRef(null);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageSearchError, setImageSearchError] = useState('');

  // Search input state
  const [searchText, setSearchText] = useState('');
  
  // Autocomplete / suggestions states
  const [allMedicines, setAllMedicines] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen) {
      setAuthError('');
    }
  }, [isAuthModalOpen]);

  // Mỗi ngày khi user đăng nhập vào, tự động gợi ý quay vòng quay may mắn 1 lần
  // (chỉ nhắc trong phiên/ngày, server vẫn là nguồn xác thực thật cho việc còn lượt quay hay không).
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const promptKey = `wheelPrompted_${user.id}_${today}`;
    if (sessionStorage.getItem(promptKey)) return;
    sessionStorage.setItem(promptKey, '1');
    fetchWheelStatus()
      .then((status) => {
        if (status.canSpinToday) setIsWheelModalOpen(true);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const handleOpenAuth = (e) => {
      openAuthModal(e.detail || 'login');
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Cho phép các nơi khác trong app (vd: lời mời "cần đơn thuốc" khi mua thuốc kê đơn) mở
  // thẳng modal "Gửi Toa Thuốc" mà không cần biết Header đang quản lý state này.
  useEffect(() => {
    const handleOpenUploadPrescription = () => {
      if (!user) openAuthModal('login');
      else setIsPrescriptionModalOpen(true);
    };
    window.addEventListener('open-upload-prescription-modal', handleOpenUploadPrescription);
    return () => window.removeEventListener('open-upload-prescription-modal', handleOpenUploadPrescription);
  }, [user]);

  // Cho phép Trợ lý AI (AIChatbot) mở giỏ hàng sau khi tự thêm sản phẩm theo lệnh của khách
  // (vd "mua 2 hộp sâm nhật"), thẳng vào bước thanh toán nếu khách dùng ý "mua"/"thanh toán luôn".
  useEffect(() => {
    const handleOpenCartDrawer = (e) => {
      setCartStartInCheckout(!!e.detail?.checkout);
      setIsCartOpen(true);
    };
    window.addEventListener('open-cart-drawer', handleOpenCartDrawer);
    return () => window.removeEventListener('open-cart-drawer', handleOpenCartDrawer);
  }, []);

  const loadSuggestions = async () => {
    try {
      const data = await fetchMedicines(null, '', null, null, true);
      setAllMedicines(data);
    } catch (e) {
      console.error('Lỗi khi tải gợi ý tìm kiếm:', e);
    }
  };

  const filteredSuggestions = useMemo(() => {
    if (!searchText) return [];
    const words = searchText.toLowerCase().split(' ').filter(Boolean);
    return allMedicines.filter(m => {
      const name = m.name.toLowerCase();
      return words.every(w => name.includes(w));
    }).slice(0, 5);
  }, [searchText, allMedicines]);

  const handlePrescriptionClick = () => {
    if (!user) {
      openAuthModal('login');
    } else {
      setIsPrescriptionModalOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    if (onSearch) onSearch(val);
  };

  const handleQuickSearchClick = (tag) => {
    setSearchText(tag);
    if (onSearch) onSearch(tag);
  };

  // Voice Search Activation — dùng Web Speech API thật của trình duyệt (Chrome/Edge)
  const startVoiceSearch = () => {
    setIsVoiceSearchOpen(true);
    setVoiceSearchError('');

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceSearchStatus('Không hỗ trợ');
      setVoiceSearchError('Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    setVoiceSearchStatus('Đang nghe... 🎤');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        setVoiceSearchError('Không nghe rõ, vui lòng thử lại.');
        return;
      }
      setIsVoiceSearchOpen(false);
      setSearchText(transcript);
      if (onSearch) onSearch(transcript);
      // Trigger focus and load suggestions
      setIsSearchFocused(true);
      loadSuggestions();
    };

    recognition.onspeechend = () => {
      setVoiceSearchStatus('Đang phân tích giọng nói... ⚙️');
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceSearchError('Vui lòng cho phép truy cập micro để sử dụng tìm kiếm bằng giọng nói.');
      } else if (event.error === 'no-speech') {
        setVoiceSearchError('Không nghe thấy gì. Vui lòng thử lại.');
      } else {
        setVoiceSearchError('Không thể nhận diện giọng nói. Vui lòng thử lại.');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setVoiceSearchError('Không thể khởi động micro. Vui lòng thử lại.');
    }
  };

  const closeVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsVoiceSearchOpen(false);
  };

  // Image Search Activation
  const startImageSearch = () => {
    setIsImageSearchOpen(true);
    setIsScanning(false);
    setImageFile(null);
    setImageSearchError('');
  };

  const processImageSearchFile = async (file) => {
    if (!file) return;
    setImageFile(file);
    setIsScanning(true);
    setImageSearchError('');

    try {
      const result = await searchMedicineByImage(file);
      if (!result || !result.keyword) {
        setIsScanning(false);
        setImageSearchError(result?.disclaimer || 'Không nhận diện được sản phẩm trong ảnh. Vui lòng thử ảnh khác hoặc tìm bằng tên.');
        return;
      }

      setIsImageSearchOpen(false);
      setIsScanning(false);
      setSearchText(result.keyword);
      if (onSearch) onSearch(result.keyword);
      // Trigger focus and load suggestions
      setIsSearchFocused(true);
      loadSuggestions();
    } catch (err) {
      setIsScanning(false);
      setImageSearchError(err.message || 'Không thể nhận diện ảnh sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageSearchFile(e.target.files[0]);
    }
  };

  // Allow pasting an image (Ctrl+V) from the clipboard while the modal is open
  useEffect(() => {
    if (!isImageSearchOpen || imageFile) return;

    const handlePaste = (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processImageSearchFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isImageSearchOpen, imageFile]);

  const handleCategoryClick = (catLabel) => {
    const catMap = {
      'Thảo Dược Đông Y': 9,
      'Thực phẩm chức năng': 1,
      'Dược mỹ phẩm': 2,
      'Thuốc': 3,
      'Chăm sóc cá nhân': 4,
      'Thiết bị y tế': 5,
      'Châm cứu': 6,
      'Bệnh & Góc sức khỏe': 7,
      'Hệ thống nhà thuốc': 8
    };
    const catId = catMap[catLabel];
    
    // Clear search text
    setSearchText('');
    if (onSearch) onSearch('');

    if (catLabel === 'Hệ thống nhà thuốc') {
      if (onNavigate) onNavigate('store-finder');
    } else if (catLabel === 'Bệnh & Góc sức khỏe') {
      if (onNavigate) onNavigate('reels');
    } else {
      if (onSelectCategory) {
        onSelectCategory(catId);
      }
      if (onNavigate) {
        onNavigate('home');
      }
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    setSearchText('');
    if (onSearch) onSearch('');
    if (onSelectCategory) onSelectCategory(null);
    if (onNavigate) onNavigate('home');
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');
    setOtpCode('');
    setConfirmPassword('');
    setResendSeconds(0);
    setOtpSent(false);
    setIsAuthModalOpen(true);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if ((authMode === 'login' || authMode === 'register') && !USERNAME_PATTERN.test(username)) {
      setAuthError('Tên đăng nhập chỉ được chứa chữ cái, không có số, khoảng trắng hoặc ký tự đặc biệt.');
      return;
    }

    if (authMode === 'register' && !PASSWORD_PATTERN.test(password)) {
      setAuthError('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        const loggedInUser = await login(username, password);
        setIsAuthModalOpen(false);
        // If logged in user is admin, navigate them to admin view automatically
        if ([1, 3, 4].includes(loggedInUser.role_id) && onNavigate) {
          onNavigate('admin');
        }
      } else if (authMode === 'register') {
        await register(username, email, password, phone);
        setAuthMode('login');
        setAuthError('Đăng ký thành công! Vui lòng đăng nhập.');
        setPassword('');
      } else if (authMode === 'forgot') {
        await requestPasswordReset(email);
        setAuthMode('reset');
        setResendSeconds(60);
        setAuthError('Mã xác nhận đã được gửi nếu email tồn tại trong hệ thống.');
      } else if (authMode === 'otp-login') {
        if (!/^0\d{9}$/.test(phone)) {
          throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại Việt Nam.');
        }
        if (!otpSent) {
          await sendOtp(phone);
          setOtpSent(true);
          setResendSeconds(60);
          setAuthError('Mã OTP đã được gửi qua Zalo.');
        } else {
          const loggedInUser = await loginWithOtp(phone, otpCode);
          setIsAuthModalOpen(false);
          if ([1, 3, 4].includes(loggedInUser.role_id) && onNavigate) {
            onNavigate('admin');
          }
        }
      } else {
        if (!PASSWORD_PATTERN.test(password)) {
          throw new Error('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
        }
        await resetPassword(email, otpCode, password, confirmPassword);
        setAuthMode('login');
        setAuthError('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }
    } catch (err) {
      setAuthError(err.message || 'Có lỗi xảy ra');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (resendSeconds > 0 || authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError('');
    try {
      await requestPasswordReset(email);
      setResendSeconds(60);
      setAuthError('Mã xác nhận mới đã được gửi và có hiệu lực trong 2 phút.');
    } catch (err) {
      setAuthError(err.message || 'Không thể gửi lại mã xác nhận.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (resendSeconds > 0 || authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError('');
    try {
      await sendOtp(phone);
      setResendSeconds(60);
      setAuthError('Mã OTP mới đã được gửi qua Zalo.');
    } catch (err) {
      setAuthError(err.message || 'Không thể gửi lại mã OTP.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setAuthError('');
    try {
      const loggedInUser = await loginWithGoogle(credentialResponse.credential);
      setIsAuthModalOpen(false);
      if ([1, 3, 4].includes(loggedInUser.role_id) && onNavigate) {
        onNavigate('admin');
      }
    } catch (err) {
      setAuthError(err.message || 'Không thể đăng nhập bằng Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    if (onNavigate) onNavigate('home');
  };

  return (
    <header className="site-header">
      {/* Main Header */}
      <div className="main-header">
        <div className="main-header-inner">
          {/* Logo */}
          <a href="/" className="logo" onClick={handleHomeClick}>
            <img src="/logo.png" alt="TMPMS Logo" className="logo-img" />
          </a>

          {/* Search */}
          <div className="search-wrap" style={{ position: 'relative' }}>
            <div className="search-bar">
              <Search size={18} className="search-icon-left" />
              <input 
                type="text" 
                placeholder="Tìm tên thuốc, bệnh lý, thực phẩm chức năng..." 
                value={searchText}
                onChange={handleSearchChange}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (allMedicines.length === 0) loadSuggestions();
                }}
                onBlur={() => {
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
              />
              <div className="search-divider" />
              <button className="search-icon-btn" type="button" onClick={startVoiceSearch} title="Tìm bằng giọng nói"><Mic size={18} /></button>
              <button className="search-icon-btn" type="button" onClick={startImageSearch} title="Tìm bằng hình ảnh"><Camera size={18} /></button>
            </div>

            {/* Suggestions Popover */}
            {isSearchFocused && (
              <div className="search-suggestions-popover">
                {!searchText ? (
                  <div className="search-popover-inner">
                    <h4 className="popover-section-title">🔥 Tìm kiếm phổ biến</h4>
                    <div className="hot-tags-grid">
                      {['Khương Thảo Đan', 'Đông Trùng Hạ Thảo', 'Vương Niệu Đan', 'Sachi', 'Heviho', 'Bình Vị Thái Minh'].map(tag => (
                        <button 
                          key={tag}
                          type="button"
                          className="hot-tag-btn"
                          onMouseDown={() => handleQuickSearchClick(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="search-popover-inner">
                    <h4 className="popover-section-title">💡 Gợi ý sản phẩm ({filteredSuggestions.length})</h4>
                    {filteredSuggestions.length === 0 ? (
                      <div className="no-suggestions-found">
                        Không tìm thấy sản phẩm phù hợp
                      </div>
                    ) : (
                      <div className="suggestions-list-container">
                        {filteredSuggestions.map(m => (
                          <div 
                            key={m.id} 
                            className="suggestion-item-row"
                            onMouseDown={() => {
                              if (onSelectProduct) {
                                setSearchText('');
                                if (onSearch) onSearch('');
                                onSelectProduct({
                                  id: m.id,
                                  name: m.name,
                                  description: m.description,
                                  price: m.price,
                                  oldPrice: m.price * 1.15,
                                  image: m.imageUrl,
                                  unit: 'Hộp',
                                  requiresPrescription: m.requiresPrescription,
                                  supplierId: m.supplierId
                                });
                              }
                            }}
                          >
                            <img src={formatImageUrl(m.imageUrl)} alt={m.name} className="suggest-item-thumb" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; }} />
                            <div className="suggest-item-info">
                              <span className="suggest-item-name">{m.name}</span>
                              <span className="suggest-item-price">{m.price != null ? `${m.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="header-actions">
            {user ? (
              <div className="user-menu-container">
                <button 
                  className="header-action-btn" 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{ cursor: 'pointer' }}
                >
                  <User size={22} />
                  <div>
                    <span className="action-line1">Xin chào,</span>
                    <span className="action-line2" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {user.username} <ChevronDown size={12} />
                    </span>
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="user-dropdown-menu">
                    <button className="user-dropdown-item" onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false); }}>👤 Hồ sơ của tôi</button>
                    <button className="user-dropdown-item" onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false); }}>🎟️ Voucher của tôi</button>
                    <button className="user-dropdown-item" onClick={() => { setIsWheelModalOpen(true); setIsUserMenuOpen(false); }}>🎡 Vòng quay may mắn</button>
                    <button className="user-dropdown-item" style={{ color: '#0d9488' }} onClick={() => { onNavigate('history'); setIsUserMenuOpen(false); }}>Lịch sử mua</button>
                    {user.role_id === 2 && (
                      <button className="user-dropdown-item" style={{ color: '#0f766e', fontWeight: 'bold' }} onClick={() => { onNavigate('patient-portal'); setIsUserMenuOpen(false); }}>Sức khỏe & Lịch hẹn</button>
                    )}
                    {[1, 3, 4].includes(user.role_id) && (
                      <button className="user-dropdown-item" style={{ color: '#0f766e', fontWeight: 'bold' }} onClick={() => { onNavigate('admin'); setIsUserMenuOpen(false); }}>Trang quản trị</button>
                    )}
                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                    <button className="user-dropdown-item" onClick={handleLogout}>Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="header-action-btn" 
                onClick={() => openAuthModal('login')}
                style={{ cursor: 'pointer' }}
              >
                <User size={22} />
                <div>
                  <span className="action-line1">Đăng nhập</span>
                  <span className="action-line2">Tài khoản</span>
                </div>
              </button>
            )}

            {/* Gửi toa thuốc */}
            <button 
              className="header-action-btn presc-upload-btn" 
              onClick={handlePrescriptionClick}
              style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
            >
              <div className="cart-icon-wrap" style={{ background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} />
              </div>
              <div>
                <span className="action-line1" style={{ color: '#1d4ed8', fontWeight: 'bold' }}>Gửi toa thuốc</span>
                <span className="action-line2">Dược sĩ bốc thuốc</span>
              </div>
            </button>

            <button 
              className="header-action-btn cart-btn" 
              onClick={() => setIsCartOpen(true)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
            >
              <div className="cart-icon-wrap">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </div>
              <div>
                <span className="action-line1">Giỏ hàng</span>
                <span className="action-line2">{cartCount} sản phẩm</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Category Nav Bar */}
      <nav className="cat-nav">
        <div className="cat-nav-inner">
          <div
            className="cat-nav-all"
            onMouseEnter={() => setActiveMenu('all')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <Menu size={18} />
            <span>Danh mục</span>
            {activeMenu === 'all' && (
              <div className="mega-dropdown">
                {categories.map((cat) => (
                  <div 
                    key={cat.label} 
                    className="mega-item"
                    onClick={() => handleCategoryClick(cat.label)}
                  >
                    <span className="mega-item-label">{cat.label}</span>
                    <ChevronRight size={14} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cat-nav-links">
            {categories.slice(0, 6).map((cat) => (
              <div
                key={cat.label}
                className="cat-nav-link"
                onMouseEnter={() => setActiveMenu(cat.label)}
                onMouseLeave={() => setActiveMenu(null)}
                onClick={() => handleCategoryClick(cat.label)}
              >
                <span>{cat.label}</span>
                {cat.sub.length > 0 && <ChevronDown size={13} />}
                {activeMenu === cat.label && cat.sub.length > 0 && (
                  <div className="cat-dropdown" onClick={(e) => e.stopPropagation()}>
                    {cat.sub.map(s => (
                      <button 
                        key={s} 
                        onClick={() => handleQuickSearchClick(s)} 
                        className="cat-dropdown-item"
                        style={{ display: 'block', width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Special link to Suppliers & Warehouses */}
            <button 
              className="cat-nav-link" 
              onClick={() => onNavigate('suppliers')}
              style={{ background: 'none', border: 'none', fontWeight: '800', color: '#0d9488', marginLeft: 'auto' }}
            >
              Đại lý & Nhà kho
            </button>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setIsAuthModalOpen(false)}>×</button>
            <h3 className="auth-modal-title">
              {authMode === 'login' ? 'Đăng nhập tài khoản' : authMode === 'register' ? 'Đăng ký tài khoản' : authMode === 'otp-login' ? 'Đăng nhập bằng OTP' : authMode === 'forgot' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
            </h3>
            
            {authError && <div className="auth-error">{authError}</div>}
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {(authMode === 'login' || authMode === 'register') && <div className="auth-input-group">
                <label className="auth-input-label">Tên tài khoản</label>
                <input
                  type="text"
                  className="auth-input"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  pattern="[A-Za-z]+"
                  title="Tên đăng nhập chỉ được chứa chữ cái."
                  placeholder="Ví dụ: nguyenvana"
                />
                <span className="auth-field-hint">Chỉ dùng chữ cái, không có số hoặc ký tự đặc biệt.</span>
              </div>}

              {(authMode === 'register' || authMode === 'forgot' || authMode === 'reset') && (
                <div className="auth-input-group">
                  <label className="auth-input-label">Email</label>
                  <input
                    type="email"
                    className="auth-input" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                  />
                </div>
              )}

              {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && <div className="auth-input-group">
                <label className="auth-input-label">Mật khẩu</label>
                <input
                  type="password"
                  className="auth-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'reset' ? 'Nhập mật khẩu mới' : 'Nhập mật khẩu'}
                />
                {authMode === 'register' && (
                  <span className="auth-field-hint">
                    Ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
                  </span>
                )}
              </div>}

              {authMode === 'register' && (
                <div className="auth-input-group">
                  <label className="auth-input-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="auth-input"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    pattern="0[0-9]{9}"
                    inputMode="numeric"
                    title="Số điện thoại gồm 10 chữ số và bắt đầu bằng số 0."
                    placeholder="Ví dụ: 0912345678"
                  />
                </div>
              )}

              {authMode === 'otp-login' && <>
                <div className="auth-input-group">
                  <label className="auth-input-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="auth-input"
                    required
                    disabled={otpSent}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    pattern="0[0-9]{9}"
                    inputMode="numeric"
                    title="Số điện thoại gồm 10 chữ số và bắt đầu bằng số 0."
                    placeholder="Ví dụ: 0912345678"
                  />
                </div>
                {otpSent && (
                  <div className="auth-input-group">
                    <label className="auth-input-label">Mã OTP</label>
                    <input className="auth-input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="Nhập mã gồm 6 số" />
                    <div className="auth-otp-actions">
                      <span className="auth-field-hint">Mã có hiệu lực trong 3 phút, gửi qua Zalo.</span>
                      <button type="button" className="auth-resend-link" disabled={resendSeconds > 0 || authSubmitting} onClick={handleResendLoginOtp}>
                        {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : 'Gửi lại mã'}
                      </button>
                    </div>
                  </div>
                )}
              </>}

              {authMode === 'reset' && <>
                <div className="auth-input-group">
                  <label className="auth-input-label">Mã xác nhận</label>
                  <input className="auth-input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="Nhập mã gồm 6 số" />
                  <div className="auth-otp-actions">
                    <span className="auth-field-hint">Mã có hiệu lực trong 2 phút.</span>
                    <button type="button" className="auth-resend-link" disabled={resendSeconds > 0 || authSubmitting} onClick={handleResendResetOtp}>
                      {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : 'Gửi lại mã'}
                    </button>
                  </div>
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Xác nhận mật khẩu mới</label>
                  <input type="password" className="auth-input" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
                </div>
              </>}

              {authMode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="auth-forgot-link" onClick={() => { setAuthMode('forgot'); setAuthError(''); setEmail(''); }}>Quên mật khẩu?</button>
                  <button type="button" className="auth-forgot-link" onClick={() => openAuthModal('otp-login')}>Đăng nhập bằng OTP</button>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={authSubmitting}>
                {authSubmitting
                  ? 'Đang xử lý...'
                  : authMode === 'login' ? 'Đăng nhập'
                  : authMode === 'register' ? 'Đăng ký'
                  : authMode === 'forgot' ? 'Gửi mã xác nhận'
                  : authMode === 'otp-login' ? (otpSent ? 'Đăng nhập' : 'Gửi mã OTP')
                  : 'Đặt lại mật khẩu'}
              </button>
            </form>

            {authMode === 'login' && (
              <div className="auth-google-section">
                <div className="auth-divider"><span>hoặc</span></div>
                {googleLoading ? (
                  <button type="button" className="auth-google-loading" disabled>
                    Đang kết nối Google…
                  </button>
                ) : (
                  <div className="auth-google-btn-wrap">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setAuthError('Không thể đăng nhập bằng Google. Vui lòng thử lại.')}
                      useOneTap={false}
                      theme="outline"
                      size="large"
                      shape="rectangular"
                      text="continue_with"
                      locale="vi"
                      width="350"
                    />
                  </div>
                )}
              </div>
            )}

            <p className="auth-switch-text">
              {authMode === 'login' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <span className="auth-switch-link" onClick={() => openAuthModal('register')}>
                    Đăng ký ngay
                  </span>
                </>
              ) : authMode === 'register' ? (
                <>
                  Đã có tài khoản?{' '}
                  <span className="auth-switch-link" onClick={() => openAuthModal('login')}>
                    Đăng nhập
                  </span>
                </>
              ) : <span className="auth-switch-link" onClick={() => openAuthModal('login')}>Quay lại đăng nhập</span>}
            </p>
          </div>
        </div>
      )}

      {/* Voice Search Modal Popup — Web Speech API thật */}
      {isVoiceSearchOpen && (
        <div className="search-modal-overlay" onClick={closeVoiceSearch}>
          <div className="search-modal voice" onClick={(e) => e.stopPropagation()}>
            <button className="search-modal-close" onClick={closeVoiceSearch}>×</button>
            {!voiceSearchError && (
              <div className="voice-mic-wave-container">
                <div className="pulse-mic-circle">
                  <Mic size={36} className="mic-pulse-icon" />
                </div>
                <div className="mic-wave-bars">
                  <span className="wave-bar bar-1"></span>
                  <span className="wave-bar bar-2"></span>
                  <span className="wave-bar bar-3"></span>
                  <span className="wave-bar bar-4"></span>
                  <span className="wave-bar bar-5"></span>
                </div>
              </div>
            )}
            {voiceSearchError ? (
              <>
                <h4>Không thể tìm bằng giọng nói</h4>
                <p className="voice-search-tip">{voiceSearchError}</p>
                <button className="search-modal-close" style={{ position: 'static', marginTop: 12 }} onClick={startVoiceSearch}>Thử lại</button>
              </>
            ) : (
              <>
                <h4>{voiceSearchStatus}</h4>
                <p className="voice-search-tip">Hãy nói rõ tên sản phẩm bạn muốn tìm...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Search Modal Popup */}
      {isImageSearchOpen && (
        <div className="search-modal-overlay" onClick={() => setIsImageSearchOpen(false)}>
          <div className="search-modal image" onClick={(e) => e.stopPropagation()}>
            <button className="search-modal-close" onClick={() => setIsImageSearchOpen(false)}>×</button>
            <h4>Tìm Kiếm Thuốc Bằng Hình Ảnh</h4>

            {!imageFile ? (
              <div className="image-drag-area">
                <Camera size={44} className="image-camera-icon" />
                <p>Kéo thả, dán (Ctrl+V) ảnh đơn thuốc/vỏ thuốc hoặc click chọn tệp để quét</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  id="image-search-input"
                  className="hidden-file-input"
                />
                <label htmlFor="image-search-input" className="image-choose-btn">Chọn ảnh quét</label>
              </div>
            ) : (
              <div className="image-scanning-preview">
                <div className="scanning-container">
                  <img src={URL.createObjectURL(imageFile)} alt="Quét tìm kiếm" />
                  {isScanning && <div className="scanning-laser-line"></div>}
                </div>
                <h5 className="scanning-status-text">
                  {isScanning ? '🔍 Đang nhận diện nhãn hiệu và bốc thuốc...' : (imageSearchError || 'Quét hoàn thành')}
                </h5>
                {!isScanning && imageSearchError && (
                  <button
                    type="button"
                    className="image-choose-btn"
                    onClick={() => { setImageFile(null); setImageSearchError(''); }}
                  >
                    Thử ảnh khác
                  </button>
                )}
              </div>
            )}
            <p className="image-search-tip">💡 Tải lên hình ảnh vỏ thuốc rõ nét để hệ thống AI nhận diện tự động.</p>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenAuth={() => openAuthModal('login')}
        startInCheckout={cartStartInCheckout}
      />

      {/* Upload Prescription Modal */}
      <UploadPrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        user={user}
      />

      {/* Vòng quay may mắn hàng ngày */}
      <SpinWheelModal
        isOpen={isWheelModalOpen}
        onClose={() => setIsWheelModalOpen(false)}
      />
    </header>
  );
};

export default Header;
