import React, { useEffect, useState } from 'react';
import { fetchCategories } from '../services/api';
import './FeaturedCategories.css';

// Bảng tra icon/màu trang trí theo tên category thật lấy từ API — chỉ để trang trí,
// không phải dữ liệu. Category nào không khớp từ khóa nào sẽ dùng style mặc định.
const STYLE_RULES = [
  { match: /thảo dược|đông y/i, icon: '🌿', color: '#f0fdf4', iconBg: '#dcfce7', accent: '#059669', hot: true },
  { match: /thuốc/i, icon: '💊', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0284c7' },
  { match: /mật ong|tinh dầu/i, icon: '🍯', color: '#fffbeb', iconBg: '#fef3c7', accent: '#d97706', hot: true },
  { match: /trà/i, icon: '🫖', color: '#f7fee7', iconBg: '#ecfccb', accent: '#65a30d' },
  { match: /linh chi|nấm/i, icon: '🌺', color: '#fdf4ff', iconBg: '#f3e8ff', accent: '#9333ea' },
  { match: /gan|thận/i, icon: '🧘', color: '#fff1f2', iconBg: '#ffe4e6', accent: '#e11d48' },
  { match: /sinh lực|bổ/i, icon: '💪', color: '#fff7ed', iconBg: '#ffedd5', accent: '#ea580c' },
  { match: /thiết bị y tế/i, icon: '🩺', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0369a1' },
  { match: /mỹ phẩm/i, icon: '💄', color: '#fdf2f8', iconBg: '#fce7f3', accent: '#db2777' },
  { match: /xương khớp/i, icon: '🦴', color: '#fefce8', iconBg: '#fef9c3', accent: '#ca8a04' },
  { match: /chăm sóc cá nhân/i, icon: '🧴', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0891b2' },
  { match: /châm cứu/i, icon: '📍', color: '#fdf4ff', iconBg: '#f3e8ff', accent: '#7e22ce' },
  { match: /thực phẩm chức năng/i, icon: '🥗', color: '#f7fee7', iconBg: '#ecfccb', accent: '#4d7c0f' },
  { match: /nhà thuốc/i, icon: '🏥', color: '#f0f9ff', iconBg: '#e0f2fe', accent: '#0369a1' },
];
const DEFAULT_STYLE = { icon: '🌱', color: '#f8fafc', iconBg: '#e2e8f0', accent: '#475569' };

const getStyle = (name = '') => STYLE_RULES.find(r => r.match.test(name)) || DEFAULT_STYLE;

const FeaturedCategories = ({ onSelectCategory, onNavigate }) => {
  const [cats, setCats] = useState([]);

  useEffect(() => {
    fetchCategories().then(data => {
      if (Array.isArray(data)) setCats(data);
    }).catch(() => setCats([]));
  }, []);

  const handleClick = (e, id) => {
    e.preventDefault();
    if (onSelectCategory) onSelectCategory(id);
    if (onNavigate) onNavigate('home');
  };

  if (cats.length === 0) return null;

  return (
    <section className="feat-cats-section">
      <div className="feat-cats-header">
        <div className="feat-cats-title-wrap">
          <div className="feat-cats-bar" />
          <h2 className="feat-cats-title">Danh Mục Nổi Bật</h2>
        </div>
      </div>
      <div className="feat-cats-grid">
        {cats.map(c => {
          const id = c.id ?? c.Id;
          const name = c.name ?? c.Name;
          const count = c.productCount ?? c.ProductCount ?? 0;
          const style = getStyle(name);
          return (
            <a
              key={id}
              href="#"
              className="feat-cat-item"
              style={{ '--cat-accent': style.accent }}
              onClick={(e) => handleClick(e, id)}
            >
              {style.hot && count > 20 && <span className="feat-cat-hot">HOT</span>}
              <div
                className="feat-cat-icon-wrap"
                style={{ background: `linear-gradient(135deg, ${style.iconBg}, ${style.color})` }}
              >
                <span className="feat-cat-icon">{style.icon}</span>
              </div>
              <span className="feat-cat-label">{name}</span>
              <span className="feat-cat-sub">{count > 0 ? `${count} sản phẩm` : 'Chưa có sản phẩm'}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedCategories;
