import React from 'react';
import './FeaturedCategories.css';

const cats = [
  { icon: '💊', label: 'Thuốc kê đơn', color: '#e8f0fe' },
  { icon: '🌿', label: 'Thực phẩm chức năng', color: '#e8f5e9' },
  { icon: '💄', label: 'Dược mỹ phẩm', color: '#fce4ec' },
  { icon: '🩺', label: 'Thiết bị y tế', color: '#fff3e0' },
  { icon: '🧴', label: 'Chăm sóc da', color: '#e0f7fa' },
  { icon: '🍼', label: 'Mẹ & Bé', color: '#f3e5f5' },
  { icon: '🪡', label: 'Châm cứu', color: '#e0f2f1' },
  { icon: '🦷', label: 'Chăm sóc răng miệng', color: '#e0f2f1' },
  { icon: '👁️', label: 'Chăm sóc mắt', color: '#fce4ec' },
  { icon: '🦴', label: 'Xương khớp', color: '#fff8e1' },
];

const FeaturedCategories = () => (
  <section className="feat-cats-section">
    <div className="feat-cats-header">
      <div className="feat-cats-bar" /><h2 className="feat-cats-title">Danh mục nổi bật</h2>
      <a href="#" className="feat-cats-all">Xem tất cả →</a>
    </div>
    <div className="feat-cats-grid">
      {cats.map(c => (
        <a key={c.label} href="#" className="feat-cat-item">
          <div className="feat-cat-icon" style={{ background: c.color }}>{c.icon}</div>
          <span className="feat-cat-label">{c.label}</span>
        </a>
      ))}
    </div>
  </section>
);

export default FeaturedCategories;
