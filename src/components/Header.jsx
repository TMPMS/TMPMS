import React, { useState } from 'react';
import { Search, ShoppingCart, User, Mic, Camera, Phone, Download, ChevronDown, MapPin, Syringe, Menu, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
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

const quickSearches = ['Canxi', 'Omega 3', 'Kẽm', 'Sắt', 'Kem chống nắng', 'Thuốc nhỏ mắt', 'Sữa rửa mặt', 'Men vi sinh'];

const Header = () => {
  const { cartCount } = useCart();
  const [activeMenu, setActiveMenu] = useState(null);

  return (
    <header className="site-header">
      {/* Main Header */}
      <div className="main-header">
        <div className="main-header-inner">
          {/* Logo */}
          <a href="/" className="logo">
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
              <input type="text" placeholder="Tìm tên thuốc, bệnh lý, thực phẩm chức năng..." />
              <div className="search-divider" />
              <button className="search-icon-btn" title="Tìm bằng giọng nói"><Mic size={18} /></button>
              <button className="search-icon-btn" title="Tìm bằng hình ảnh"><Camera size={18} /></button>
            </div>
            <div className="quick-searches">
              {quickSearches.map(t => <a key={t} href="#" className="quick-tag">{t}</a>)}
            </div>
          </div>

          {/* Actions */}
          <div className="header-actions">
            <a href="#" className="header-action-btn">
              <User size={22} />
              <div>
                <span className="action-line1">Đăng nhập</span>
                <span className="action-line2">Tài khoản</span>
              </div>
            </a>
            <a href="#" className="header-action-btn cart-btn">
              <div className="cart-icon-wrap">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </div>
              <div>
                <span className="action-line1">Giỏ hàng</span>
                <span className="action-line2">{cartCount} sản phẩm</span>
              </div>
            </a>
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
                  <div key={cat.label} className="mega-item">
                    <span className="mega-item-label">{cat.label}</span>
                    <ChevronRight size={14} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cat-nav-links">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="cat-nav-link"
                onMouseEnter={() => setActiveMenu(cat.label)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <span>{cat.label}</span>
                {cat.sub.length > 0 && <ChevronDown size={13} />}
                {activeMenu === cat.label && cat.sub.length > 0 && (
                  <div className="cat-dropdown">
                    {cat.sub.map(s => <a key={s} href="#" className="cat-dropdown-item">{s}</a>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
