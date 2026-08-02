import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './FlashSale.css';
import { fetchMedicines, formatImageUrl, FALLBACK_MED_IMG } from '../services/api';

const FLASH_PRODUCTS = [
  { id: 101, discount: 23, origin: 'Việt Nam', originColor: '#10b981' },
  { id: 206, discount: 21, origin: 'Việt Nam', originColor: '#10b981' },
  { id: 103, discount: 25, origin: 'Việt Nam', originColor: '#10b981' },
  { id: 203, discount: 20, origin: 'Hàn Quốc', originColor: '#1d4ed8' },
  { id: 204, discount: 23, origin: 'Hàn Quốc', originColor: '#1d4ed8' },
  { id: 102, discount: 25, origin: 'Việt Nam', originColor: '#10b981' },
];

const FALLBACK_FLASH_PRODUCTS = [
  { id: 101, name: 'Hoạt Huyết Dưỡng Não Traphaco (Hộp 5 vỉ x 20 viên)', price: 95000, oldPrice: 105000, unit: 'Hộp', discount: 23, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 206, name: 'Tinh Dầu Tràm Trà Bảo Linh phòng ho, giữ ấm (Lọ 10ml)', price: 125000, oldPrice: 140000, unit: 'Chai', discount: 21, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 103, name: 'Dầu Phật Linh Trường Sơn giữ ấm cơ thể (Chai 5ml)', price: 65000, oldPrice: 72000, unit: 'Hộp', discount: 25, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 203, name: 'Viên Sâm Nhung Linh Chi bổ khí huyết (Hộp 60 viên)', price: 350000, oldPrice: 380000, unit: 'Hộp', discount: 20, origin: 'Hàn Quốc', originColor: '#1d4ed8', image: '' },
  { id: 204, name: 'Cao Hồng Sâm Linh Chi KGC Daedong cao cấp (Hộp 2 lọ)', price: 1450000, oldPrice: null, unit: 'Hộp', discount: 23, origin: 'Hàn Quốc', originColor: '#1d4ed8', image: '' },
  { id: 102, name: 'Trà Sâm Đất Vy & Tea giải nhiệt giải độc (Hộp 20 gói)', price: 45000, oldPrice: null, unit: 'Hộp', discount: 25, origin: 'Việt Nam', originColor: '#10b981', image: '' },
];

const TIME_SLOTS = [
  { label: '08:00 – 22:00', date: '18/05', active: true },
  { label: '08:00 – 22:00', date: '19/05', active: false },
  { label: '08:00 – 22:00', date: '20/05', active: false },
];

const maskPrice = (price) => {
  const s = price.toString();
  if (s.length <= 5) return 'xx.x00đ';
  if (s.length === 6) return 'xxx.x00đ';
  return 'x.xxx.x00đ';
};

const pad = (n) => String(n).padStart(2, '0');

const FlashSale = ({ onProductClick }) => {
  const [time, setTime] = useState({ h: 0, m: 7, s: 42 });
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState(FALLBACK_FLASH_PRODUCTS);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchMedicines()
      .then(data => {
        if (!mounted || !Array.isArray(data)) return;
        const byId = new Map(data.map(m => [m.id, m]));
        setProducts(FLASH_PRODUCTS.map(spec => {
          const m = byId.get(spec.id);
          if (!m) return null;
          const discount = m.oldPrice && m.oldPrice > m.price
            ? Math.round(((m.oldPrice - m.price) / m.oldPrice) * 100)
            : spec.discount;
          return {
            ...spec,
            id: m.id,
            name: m.name,
            image: m.imageUrl || m.image,
            price: m.price,
            oldPrice: m.oldPrice,
            unit: m.unit || spec.unit,
            discount,
          };
        }).filter(Boolean));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <section className="flashsale-section">
      {/* Decorative tropical header */}
      <div className="flashsale-header">
        <div className="flashsale-bubbles">
          <div className="bubble b1" /><div className="bubble b2" /><div className="bubble b3" />
        </div>
        <div className="flashsale-header-content">
          <div className="flashsale-logo-wrap">
            <span className="flashsale-fire">🔥</span>
            <div className="flashsale-logo-text">
              <span className="fs-top">FLASH</span><span className="fs-bot">SALE</span>
            </div>
            <span className="fs-subtitle">GIÁ TỐT</span>
          </div>
          <a href="#" className="flashsale-see-rule">Xem thể lệ &rsaquo;</a>
        </div>
      </div>

      {/* Content panel */}
      <div className="flashsale-panel">
        {/* Tabs */}
        <div className="flashsale-tabs">
          {TIME_SLOTS.map((slot, i) => (
            <button
              key={i}
              className={`flashsale-tab ${i === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <span className="tab-time">{slot.label}</span>
              <span className="tab-date">{slot.date}</span>
              <span className="tab-status">Sắp diễn ra</span>
            </button>
          ))}
        </div>

        {/* Countdown */}
        <div className="flashsale-countdown">
          <span className="countdown-label">Bắt đầu sau</span>
          <div className="countdown-digits">
            <span className="digit-box">{pad(time.h)}</span>
            <span className="digit-sep">:</span>
            <span className="digit-box">{pad(time.m)}</span>
            <span className="digit-sep">:</span>
            <span className="digit-box">{pad(time.s)}</span>
          </div>
        </div>

        {/* Product Swiper */}
        <div className="flashsale-products">
          <Swiper modules={[Navigation]} spaceBetween={12} slidesPerView={5} navigation className="fs-swiper">
            {products.map(p => (
              <SwiperSlide key={p.id}>
                <div className="fs-card">
                  {/* Origin badge */}
                  <div className="fs-origin">
                    <span className="origin-dot" style={{ background: p.originColor }} />
                    {p.origin}
                  </div>
                  {/* Discount badge */}
                  <div className="fs-discount-badge">-{p.discount}%</div>

                  {/* Image */}
                  <div 
                    className="fs-img-wrap"
                    onClick={onProductClick ? () => onProductClick(p) : undefined}
                    style={onProductClick ? { cursor: 'pointer' } : {}}
                  >
                    <img src={formatImageUrl(p.image)} alt={p.name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; }} />
                  </div>

                  {/* Name */}
                  <p 
                    className="fs-name"
                    onClick={onProductClick ? () => onProductClick(p) : undefined}
                    style={onProductClick ? { cursor: 'pointer' } : {}}
                  >
                    {p.name}
                  </p>

                  {/* Price */}
                  <div className="fs-price-row">
                    <span className="fs-price">{p.price != null ? `${p.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
                    <span className="fs-unit">/ {p.unit}</span>
                  </div>
                  {p.oldPrice != null && <div className="fs-old-price">{p.oldPrice.toLocaleString('vi-VN')}đ</div>}

                  {/* Hot deal pill */}
                  <div className="fs-hot-pill">🔥 Ưu đãi cực sốc</div>

                  {/* CTA */}
                  <button 
                    className="fs-cta"
                    onClick={onProductClick ? () => onProductClick(p) : undefined}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default FlashSale;
