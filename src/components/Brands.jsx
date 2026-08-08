import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { fetchSuppliers } from '../services/api';
import './Brands.css';

// Bảng màu trang trí xoay vòng theo thứ tự nhà cung cấp thật — chỉ là màu sắc hiển thị,
// không phải dữ liệu bịa (khác với % giảm giá cứng trước đây).
const PALETTE = [
  { color: '#f0fdfa', textColor: '#0d9488' },
  { color: '#fce4ec', textColor: '#c2185b' },
  { color: '#e8f5e9', textColor: '#2e7d32' },
  { color: '#fff3e0', textColor: '#e65100' },
  { color: '#e0f7fa', textColor: '#006064' },
  { color: '#f3e5f5', textColor: '#6a1b9a' },
  { color: '#e8eaf6', textColor: '#283593' },
  { color: '#fafafa', textColor: '#374151' },
];

const Brands = ({ onSelectSupplier }) => {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetchSuppliers()
      .then(data => {
        if (!Array.isArray(data)) return;
        const sorted = [...data].sort((a, b) => (b.productCount ?? b.ProductCount ?? 0) - (a.productCount ?? a.ProductCount ?? 0));
        setBrands(sorted.slice(0, 10));
      })
      .catch(() => setBrands([]));
  }, []);

  const handleClick = (e, id, name) => {
    e.preventDefault();
    if (onSelectSupplier) onSelectSupplier(id, name);
  };

  if (brands.length === 0) return null;

  return (
    <section className="brands-section">
      <div className="brands-header">
        <div className="brands-title-wrap">
          <div className="brands-title-bar" />
          <h2 className="brands-title">Thương hiệu yêu thích</h2>
          <span className="brands-shield" title="Thương hiệu uy tín">🛡️</span>
        </div>
      </div>
      <Swiper modules={[Navigation]} spaceBetween={14} slidesPerView={6} navigation className="brands-swiper">
        {brands.map((b, i) => {
          const id = b.id ?? b.Id;
          const name = b.companyName ?? b.CompanyName ?? b.name;
          const count = b.productCount ?? b.ProductCount ?? 0;
          const { color, textColor } = PALETTE[i % PALETTE.length];
          return (
            <SwiperSlide key={id}>
              <a href="#" className="brand-card" style={{ background: color }} onClick={(e) => handleClick(e, id, name)}>
                <div className="brand-img-placeholder">
                  <span className="brand-name-text" style={{ color: textColor }}>{name}</span>
                </div>
                <div className="brand-discount" style={{ color: textColor }}>
                  {count > 0 ? `${count} sản phẩm` : 'Chưa có sản phẩm'}
                </div>
              </a>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};

export default Brands;
