import React from 'react';
import './PromoBanners.css';

const banners = [
  { id: 1, bg: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url('/images/promo_banner_1.png') center/cover no-repeat", title: 'Thảo Dược Bổ Gan Thải Độc', sub: 'Hỗ trợ mát gan, hạ men gan và thải độc tố cơ thể', tag: 'Giảm đến 30%', color: '#fef08a' },
  { id: 2, bg: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url('/images/promo_banner_2.png') center/cover no-repeat", title: 'Trà Thảo Mộc Dưỡng Nhan', sub: 'Làm đẹp tự nhiên, thanh lọc cơ thể từ bên trong', tag: 'Mới về hôm nay', color: '#d1fae5' },
];

const PromoBanners = () => (
  <div className="promo-banners">
    {banners.map(b => (
      <a key={b.id} href="#" className="promo-banner" style={{ background: b.bg }}>
        <div className="promo-tag" style={{ color: b.color }}>{b.tag}</div>
        <h3 className="promo-title">{b.title}</h3>
        <p className="promo-sub">{b.sub}</p>
        <span className="promo-link">Khám phá ngay →</span>
        <div className="promo-deco promo-deco-1" />
        <div className="promo-deco promo-deco-2" />
      </a>
    ))}
  </div>
);

export default PromoBanners;
