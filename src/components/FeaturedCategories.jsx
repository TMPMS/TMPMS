import React from 'react';
import './FeaturedCategories.css';

const cats = [
  { icon: '🌿', label: 'Thảo Dược Đông Y', sub: '120+ sản phẩm', color: '#f0fdf4', iconBg: '#dcfce7', accent: '#059669', hot: true },
  { icon: '💊', label: 'Thuốc Đông Y', sub: '80+ sản phẩm', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0284c7' },
  { icon: '🍯', label: 'Mật Ong & Tinh Dầu', sub: '45+ sản phẩm', color: '#fffbeb', iconBg: '#fef3c7', accent: '#d97706', hot: true },
  { icon: '🫖', label: 'Trà Thảo Dược', sub: '60+ sản phẩm', color: '#f7fee7', iconBg: '#ecfccb', accent: '#65a30d' },
  { icon: '🌺', label: 'Linh Chi & Nấm', sub: '30+ sản phẩm', color: '#fdf4ff', iconBg: '#f3e8ff', accent: '#9333ea' },
  { icon: '🧘', label: 'Bổ Gan Thận', sub: '55+ sản phẩm', color: '#fff1f2', iconBg: '#ffe4e6', accent: '#e11d48' },
  { icon: '💪', label: 'Tăng Sinh Lực', sub: '40+ sản phẩm', color: '#fff7ed', iconBg: '#ffedd5', accent: '#ea580c' },
  { icon: '🩺', label: 'Thiết Bị Y Tế', sub: '70+ sản phẩm', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0369a1' },
  { icon: '💄', label: 'Dược Mỹ Phẩm', sub: '90+ sản phẩm', color: '#fdf2f8', iconBg: '#fce7f3', accent: '#db2777' },
  { icon: '🦴', label: 'Xương Khớp', sub: '35+ sản phẩm', color: '#fefce8', iconBg: '#fef9c3', accent: '#ca8a04' },
];

const FeaturedCategories = () => (
  <section className="feat-cats-section">
    <div className="feat-cats-header">
      <div className="feat-cats-title-wrap">
        <div className="feat-cats-bar" />
        <h2 className="feat-cats-title">Danh Mục Nổi Bật</h2>
      </div>
      <a href="#" className="feat-cats-all">Xem tất cả →</a>
    </div>
    <div className="feat-cats-grid">
      {cats.map(c => (
        <a key={c.label} href="#" className="feat-cat-item" style={{ '--cat-accent': c.accent }}>
          {c.hot && <span className="feat-cat-hot">HOT</span>}
          <div
            className="feat-cat-icon-wrap"
            style={{ background: `linear-gradient(135deg, ${c.iconBg}, ${c.color})` }}
          >
            <span className="feat-cat-icon">{c.icon}</span>
          </div>
          <span className="feat-cat-label">{c.label}</span>
          <span className="feat-cat-sub">{c.sub}</span>
        </a>
      ))}
    </div>
  </section>
);

export default FeaturedCategories;
