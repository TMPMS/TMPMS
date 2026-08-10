import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './FlashSale.css';
import { fetchFlashSaleCandidates, formatImageUrl, FALLBACK_MED_IMG } from '../services/api';

const originColorFor = (origin) => {
  if (!origin) return '#6b7280';
  const o = origin.toLowerCase();
  if (o.includes('việt') || o.includes('viet')) return '#10b981';
  if (o.includes('hàn') || o.includes('han')) return '#1d4ed8';
  return '#7c3aed';
};

const FALLBACK_FLASH_PRODUCTS = [
  { id: 101, name: 'Hoạt Huyết Dưỡng Não Traphaco (Hộp 5 vỉ x 20 viên)', price: 95000, oldPrice: 105000, unit: 'Hộp', discount: 23, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 206, name: 'Tinh Dầu Tràm Trà Bảo Linh phòng ho, giữ ấm (Lọ 10ml)', price: 125000, oldPrice: 140000, unit: 'Chai', discount: 21, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 103, name: 'Dầu Phật Linh Trường Sơn giữ ấm cơ thể (Chai 5ml)', price: 65000, oldPrice: 72000, unit: 'Hộp', discount: 25, origin: 'Việt Nam', originColor: '#10b981', image: '' },
  { id: 203, name: 'Viên Sâm Nhung Linh Chi bổ khí huyết (Hộp 60 viên)', price: 350000, oldPrice: 380000, unit: 'Hộp', discount: 20, origin: 'Hàn Quốc', originColor: '#1d4ed8', image: '' },
  { id: 204, name: 'Cao Hồng Sâm Linh Chi KGC Daedong cao cấp (Hộp 2 lọ)', price: 1450000, oldPrice: null, unit: 'Hộp', discount: 23, origin: 'Hàn Quốc', originColor: '#1d4ed8', image: '' },
  { id: 102, name: 'Trà Sâm Đất Vy & Tea giải nhiệt giải độc (Hộp 20 gói)', price: 45000, oldPrice: null, unit: 'Hộp', discount: 25, origin: 'Việt Nam', originColor: '#10b981', image: '' },
];

const maskPrice = (price) => {
  const s = price.toString();
  if (s.length <= 5) return 'xx.x00đ';
  if (s.length === 6) return 'xxx.x00đ';
  return 'x.xxx.x00đ';
};

const FlashSale = ({ onProductClick }) => {
  const [products, setProducts] = useState(FALLBACK_FLASH_PRODUCTS);
  // Thẻ mẫu (FALLBACK_FLASH_PRODUCTS) dùng id tự đặt, có thể trùng ngẫu nhiên với id thuốc thật
  // trong DB — không cho bấm vào/thêm giỏ khi đang hiển thị thẻ mẫu, tránh trỏ nhầm sang sản phẩm
  // thật khác hoàn toàn (sai tên, sai ảnh) chỉ vì id trùng.
  const [isFallback, setIsFallback] = useState(true);

  // Sản phẩm Flash Sale = thuốc/dược liệu có lô sắp/đã hết hạn được Dược sĩ đưa vào giảm giá,
  // lấy trực tiếp từ tồn kho thật (không còn danh sách ID cứng).
  useEffect(() => {
    let mounted = true;
    fetchFlashSaleCandidates(30)
      .then(data => {
        if (!mounted || !Array.isArray(data)) return;
        const onSale = data
          .filter(c => c.isOnFlashSale && c.price != null)
          .map(c => ({
            id: c.medicineId,
            name: c.medicineName,
            image: c.imageUrl,
            price: c.price,
            oldPrice: c.oldPrice,
            unit: c.unit || 'Hộp',
            discount: c.discount || c.suggestedDiscountPercent,
            origin: c.origin || 'Việt Nam',
            originColor: originColorFor(c.origin),
            daysUntilExpiry: c.daysUntilExpiry,
          }));
        if (onSale.length > 0) {
          setProducts(onSale);
          setIsFallback(false);
        }
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
        {/* Các sản phẩm dưới đây đang giảm giá NGAY LÚC NÀY (lấy từ tồn kho thật, không phải lịch giảm giá
            theo khung giờ cố định) — nên hiển thị trạng thái "đang diễn ra" thay vì đếm ngược/tab ngày giả. */}
        <div className="flashsale-countdown">
          <span className="countdown-label">🔥 Đang diễn ra — số lượng có hạn</span>
        </div>

        {/* Product Swiper */}
        <div className="flashsale-products">
          <Swiper
            modules={[Navigation]}
            spaceBetween={10}
            slidesPerView={2.2}
            breakpoints={{
              480: { slidesPerView: 2.6, spaceBetween: 10 },
              640: { slidesPerView: 3.2, spaceBetween: 12 },
              900: { slidesPerView: 4, spaceBetween: 12 },
              1180: { slidesPerView: 5, spaceBetween: 12 },
            }}
            navigation
            className="fs-swiper"
          >
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
                    onClick={onProductClick && !isFallback ? () => onProductClick(p) : undefined}
                    style={onProductClick && !isFallback ? { cursor: 'pointer' } : {}}
                  >
                    <img src={formatImageUrl(p.image)} alt={p.name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; }} />
                  </div>

                  {/* Name */}
                  <p
                    className="fs-name"
                    onClick={onProductClick && !isFallback ? () => onProductClick(p) : undefined}
                    style={onProductClick && !isFallback ? { cursor: 'pointer' } : {}}
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

                  {/* CTA — thẻ mẫu (isFallback) không cho bấm để tránh trỏ nhầm sang sản phẩm thật
                      khác hoàn toàn chỉ vì id tự đặt trùng với id thật. */}
                  <button
                    className="fs-cta"
                    disabled={isFallback}
                    onClick={!isFallback ? () => onProductClick?.(p) : undefined}
                  >
                    {isFallback ? 'Sắp có ưu đãi' : 'Xem chi tiết'}
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
