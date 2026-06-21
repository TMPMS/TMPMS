import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './Brands.css';

const brands = [
  { id: 1, name: 'Traphaco', discount: 30, color: '#f0fdfa', textColor: '#0d9488' },
  { id: 2, name: 'DHC', discount: 25, color: '#fce4ec', textColor: '#c2185b' },
  { id: 3, name: 'Nature Made', discount: 20, color: '#e8f5e9', textColor: '#2e7d32' },
  { id: 4, name: 'Blackmores', discount: 18, color: '#fff3e0', textColor: '#e65100' },
  { id: 5, name: 'La Roche-Posay', discount: 15, color: '#e0f7fa', textColor: '#006064' },
  { id: 6, name: 'Centrum', discount: 22, color: '#f3e5f5', textColor: '#6a1b9a' },
  { id: 7, name: 'Hada Labo', discount: 12, color: '#e8eaf6', textColor: '#283593' },
  { id: 8, name: 'Omron', discount: 10, color: '#fafafa', textColor: '#374151' },
];

const Brands = () => (
  <section className="brands-section">
    <div className="brands-header">
      <div className="brands-title-wrap">
        <div className="brands-title-bar" />
        <h2 className="brands-title">Thương hiệu yêu thích</h2>
        <span className="brands-shield" title="Thương hiệu uy tín">🛡️</span>
      </div>
      <a href="#" className="brands-all">Xem tất cả →</a>
    </div>
    <Swiper modules={[Navigation]} spaceBetween={14} slidesPerView={6} navigation className="brands-swiper">
      {brands.map(b => (
        <SwiperSlide key={b.id}>
          <a href="#" className="brand-card" style={{ background: b.color }}>
            <div className="brand-img-placeholder">
              <span className="brand-name-text" style={{ color: b.textColor }}>{b.name}</span>
            </div>
            <div className="brand-discount" style={{ color: b.textColor }}>
              Giảm đến {b.discount}%
            </div>
          </a>
        </SwiperSlide>
      ))}
    </Swiper>
  </section>
);

export default Brands;
