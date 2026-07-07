import React, { useState } from 'react';
import { Search, ShoppingCart, User, Mic, Camera, Phone, Download, ChevronDown, MapPin, Syringe, Menu, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartDrawer from './CartDrawer';
import './Header.css';

const categories = [
  { label: 'Thực phẩm chức năng', sub: ['Vitamin & Khoáng chất', 'Bổ não', 'Hỗ trợ gan', 'Đẹp da'] },
  { label: 'Dược mỹ phẩm', sub: ['Kem dưỡng da', 'Chống nắng', 'Tẩy trang', 'Serum'] },
  { label: 'Thuốc', sub: ['Thuốc kê đơn', 'Thuốc không kê đơn', 'Kháng sinh', 'Hạ sốt'] },
  { label: 'Chăm sóc cá nhân', sub: ['Dầu gội', 'Sữa tắm', 'Vệ sinh phụ nữ'] },
  { label: 'Thiết bị y tế', sub: ['Máy đo huyết áp', 'Nhiệt kế', 'Máy xông khí'] },
  { label: 'Châm cứu', sub: ['Châm cứu bấm huyệt', 'Điện châm trị liệu', 'Thuỷ châm'] },
  { label: 'Bệnh & Góc sức khỏe', sub: ['Bài viết', 'Video sức khỏe'] },
  { label: 'Hệ thống nhà thuốc', sub: [] },
];



const Header = ({ onSearch, onNavigate, onSelectCategory }) => {
  const { cartCount } = useCart();
  const { user, login, register, logout } = useAuth();
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');

  // Search input state
  const [searchText, setSearchText] = useState('');

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    if (onSearch) onSearch(val);
  };

  const handleQuickSearchClick = (tag) => {
    setSearchText(tag);
    if (onSearch) onSearch(tag);
  };

  const handleCategoryClick = (catLabel) => {
    const catMap = {
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

    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    if (onNavigate) {
      onNavigate('home');
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
    setIsAuthModalOpen(true);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const loggedInUser = await login(username, password);
        setIsAuthModalOpen(false);
        // If logged in user is admin, navigate them to admin view automatically
        if ([1, 3, 4].includes(loggedInUser.role_id) && onNavigate) {
          onNavigate('admin');
        }
      } else {
        await register(username, email, password, phone);
        setAuthMode('login');
        setAuthError('Đăng ký thành công! Vui lòng đăng nhập.');
        setPassword('');
      }
    } catch (err) {
      setAuthError(err.message || 'Có lỗi xảy ra');
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
            <div className="logo-badge">TC</div>
            <div className="logo-text">
              <span className="logo-name">TCMPAM</span>
              <span className="logo-sub">Dược Phẩm Đông Y</span>
            </div>
          </a>

          {/* Search */}
          <div className="search-wrap">
            <div className="search-bar">
              <Search size={18} className="search-icon-left" />
              <input 
                type="text" 
                placeholder="Tìm tên thuốc, bệnh lý, thực phẩm chức năng..." 
                value={searchText}
                onChange={handleSearchChange}
              />
              <div className="search-divider" />
              <button className="search-icon-btn" title="Tìm bằng giọng nói"><Mic size={18} /></button>
              <button className="search-icon-btn" title="Tìm bằng hình ảnh"><Camera size={18} /></button>
            </div>

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
                    <button className="user-dropdown-item" style={{ color: '#0d9488' }} onClick={() => { onNavigate('history'); setIsUserMenuOpen(false); }}>Lịch sử mua</button>
                    {user.role_id === 2 && (
                      <button className="user-dropdown-item" style={{ color: '#0f766e', fontWeight: 'bold' }} onClick={() => { onNavigate('patient-portal'); setIsUserMenuOpen(false); }}>Sức khỏe & Lịch hẹn</button>
                    )}
                    {[1, 3, 4].includes(user.role_id) && (
                      <button className="user-dropdown-item" style={{ color: '#0f766e', fontWeight: 'bold' }} onClick={() => { onNavigate('admin'); setIsUserMenuOpen(false); }}>Trang quản trị</button>
                    )}
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
              {authMode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản'}
            </h3>
            
            {authError && <div className="auth-error">{authError}</div>}
            
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Tên tài khoản</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập" 
                />
              </div>

              {authMode === 'register' && (
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

              <div className="auth-input-group">
                <label className="auth-input-label">Mật khẩu</label>
                <input 
                  type="password" 
                  className="auth-input" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu" 
                />
              </div>

              {authMode === 'register' && (
                <div className="auth-input-group">
                  <label className="auth-input-label">Số điện thoại</label>
                  <input 
                    type="tel" 
                    className="auth-input" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại" 
                  />
                </div>
              )}

              <button type="submit" className="auth-submit-btn">
                {authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>

            <p className="auth-switch-text">
              {authMode === 'login' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <span className="auth-switch-link" onClick={() => openAuthModal('register')}>
                    Đăng ký ngay
                  </span>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <span className="auth-switch-link" onClick={() => openAuthModal('login')}>
                    Đăng nhập
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      )}
      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
};

export default Header;
