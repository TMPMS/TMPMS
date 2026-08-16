import React, { useState, useEffect, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './FlashSale.css';
import { fetchActiveFlashSales, formatImageUrl, FALLBACK_MED_IMG } from '../services/api';

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

// Định dạng đếm ngược: >=1 ngày hiện "Ngd HH:MM:SS", dưới 1 ngày hiện "HH:MM:SS"
const formatCountdown = (ms) => {
  if (ms == null || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (days > 0) return { days, parts: [pad(hours), pad(minutes), pad(seconds)] };
  return { days: 0, parts: [pad(hours), pad(minutes), pad(seconds)] };
};

const FlashSale = ({ onProductClick }) => {
  const [products, setProducts] = useState(FALLBACK_FLASH_PRODUCTS);
  // Thẻ mẫu (FALLBACK_FLASH_PRODUCTS) dùng id tự đặt, có thể trùng ngẫu nhiên với id thuốc thật
  // trong DB — không cho bấm vào/thêm giỏ khi đang hiển thị thẻ mẫu, tránh trỏ nhầm sang sản phẩm
  // thật khác hoàn toàn (sai tên, sai ảnh) chỉ vì id trùng.
  const [isFallback, setIsFallback] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Sản phẩm Flash Sale = mọi thuốc/dược liệu Admin đã đưa vào Flash Sale (đang chạy hoặc sắp diễn
  // ra theo lịch hẹn giờ), lấy trực tiếp từ bảng FlashSale — không giới hạn ở hàng sắp hết hạn.
  useEffect(() => {
    let mounted = true;
    fetchActiveFlashSales()
      .then(data => {
        if (!mounted || !Array.isArray(data)) return;
        const onSale = data
          .filter(c => c.salePrice != null)
          .map(c => ({
            id: c.medicineId,
            name: c.medicineName,
            image: formatImageUrl(c.imageUrl),
            price: c.salePrice,
            oldPrice: c.originalPrice,
            stockQuantity: c.stockQuantity ?? 0,
            unit: c.unit || 'Hộp',
            discount: c.discountPercent,
            origin: c.origin || 'Việt Nam',
            originColor: originColorFor(c.origin),
            startTime: c.startTime,
            endTime: c.endTime,
            quantityLimit: c.quantityLimit,
            quantitySold: c.quantitySold,
            isScheduled: c.status === 'Scheduled',
          }));
        if (onSale.length > 0) {
          setProducts(onSale);
          setIsFallback(false);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Tick mỗi giây để đếm ngược thật (đến EndTime nếu đang chạy, hoặc StartTime nếu đang chờ tới giờ)
  useEffect(() => {
    if (isFallback) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFallback]);

  const sortedProducts = useMemo(() => {
    if (isFallback) return products;
    return [...products].sort((a, b) => {
      if (a.isScheduled !== b.isScheduled) return a.isScheduled ? 1 : -1;
      const aTarget = a.isScheduled ? a.startTime : a.endTime;
      const bTarget = b.isScheduled ? b.startTime : b.endTime;
      if (!aTarget && !bTarget) return 0;
      if (!aTarget) return 1;
      if (!bTarget) return -1;
      return new Date(aTarget) - new Date(bTarget);
    });
  }, [products, isFallback]);

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
        {/* Đếm ngược thật theo EndTime của các Flash Sale đang chạy (lấy mốc gần kết thúc nhất) —
            nếu không có sản phẩm nào có hẹn giờ kết thúc, hiển thị nhãn tĩnh "đang diễn ra". */}
        {!isFallback && (() => {
          const runningWithEnd = products.filter(p => !p.isScheduled && p.endTime);
          if (runningWithEnd.length === 0) {
            return (
              <div className="flashsale-countdown">
                <span className="countdown-label">🔥 Đang diễn ra — số lượng có hạn</span>
              </div>
            );
          }
          const soonestEnd = runningWithEnd.reduce((min, p) => new Date(p.endTime) < new Date(min.endTime) ? p : min);
          const cd = formatCountdown(new Date(soonestEnd.endTime) - now);
          if (!cd) return (
            <div className="flashsale-countdown">
              <span className="countdown-label">🔥 Đang diễn ra — số lượng có hạn</span>
            </div>
          );
          return (
            <div className="flashsale-countdown">
              <span className="countdown-label">🔥 Kết thúc sớm nhất sau</span>
              <div className="countdown-digits">
                {cd.days > 0 && <><span className="digit-box">{cd.days}n</span><span className="digit-sep">:</span></>}
                <span className="digit-box">{cd.parts[0]}</span>
                <span className="digit-sep">:</span>
                <span className="digit-box">{cd.parts[1]}</span>
                <span className="digit-sep">:</span>
                <span className="digit-box">{cd.parts[2]}</span>
              </div>
            </div>
          );
        })()}

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
            {sortedProducts.map(p => {
              const soldPercent = p.quantityLimit ? Math.min(100, Math.round((p.quantitySold / p.quantityLimit) * 100)) : null;
              const remaining = p.quantityLimit != null ? Math.max(0, p.quantityLimit - (p.quantitySold || 0)) : null;
              const itemCd = !isFallback && (p.isScheduled ? p.startTime : p.endTime)
                ? formatCountdown(new Date(p.isScheduled ? p.startTime : p.endTime) - now)
                : null;
              const clickable = onProductClick && !isFallback;

              return (
                <SwiperSlide key={p.id}>
                  <div className={`fs-card${p.isScheduled ? ' fs-card-scheduled' : ''}`}>
                    {/* Origin badge */}
                    <div className="fs-origin">
                      <span className="origin-dot" style={{ background: p.originColor }} />
                      {p.origin}
                    </div>
                    {/* Discount badge */}
                    <div className="fs-discount-badge">-{p.discount}%</div>

                    {p.isScheduled && (
                      <div className="fs-scheduled-badge">
                        🕒 Sắp diễn ra{itemCd ? ` · ${itemCd.days > 0 ? `${itemCd.days}n ` : ''}${itemCd.parts.join(':')}` : ''}
                      </div>
                    )}

                    {/* Image */}
                    <div
                      className="fs-img-wrap"
                      onClick={clickable ? () => onProductClick(p) : undefined}
                      style={clickable ? { cursor: 'pointer' } : {}}
                    >
                      <img src={formatImageUrl(p.image)} alt={p.name} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_MED_IMG; }} />
                    </div>

                    {/* Name */}
                    <p
                      className="fs-name"
                      onClick={clickable ? () => onProductClick(p) : undefined}
                      style={clickable ? { cursor: 'pointer' } : {}}
                    >
                      {p.name}
                    </p>

                    {/* Price */}
                    <div className="fs-price-row">
                      <span className="fs-price">{p.price != null ? `${p.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}</span>
                      <span className="fs-unit">/ {p.unit}</span>
                    </div>
                    {p.oldPrice != null && <div className="fs-old-price">{p.oldPrice.toLocaleString('vi-VN')}đ</div>}

                    {/* Thanh tiến trình đã bán / giới hạn số lượng */}
                    {!p.isScheduled && soldPercent != null && (
                      <div className="fs-progress-wrap">
                        <div className="fs-progress-bar">
                          <div className="fs-progress-fill" style={{ width: `${soldPercent}%` }} />
                        </div>
                        <span className="fs-progress-label">
                          {remaining > 0 ? `Còn ${remaining} suất giá sốc` : 'Sắp hết suất giá sốc'}
                        </span>
                      </div>
                    )}

                    {/* Hot deal pill */}
                    {!p.isScheduled && <div className="fs-hot-pill">🔥 Ưu đãi cực sốc</div>}

                    {/* CTA — thẻ mẫu (isFallback) không cho bấm để tránh trỏ nhầm sang sản phẩm thật
                        khác hoàn toàn chỉ vì id tự đặt trùng với id thật. */}
                    <button
                      className="fs-cta"
                      disabled={isFallback}
                      onClick={!isFallback ? () => onProductClick?.(p) : undefined}
                    >
                      {isFallback ? 'Sắp có ưu đãi' : p.isScheduled ? 'Xem trước' : 'Xem chi tiết'}
                    </button>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default FlashSale;
