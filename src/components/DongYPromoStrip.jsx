import React from 'react';
import './DongYPromoStrip.css';

const items = [
  { icon: '🌿', text: 'Đông Trùng Hạ Thảo Militaris' },
  { icon: '🍃', text: 'Nhân Sâm Hàn Quốc 6 Năm Tuổi' },
  { icon: '🌺', text: 'Linh Chi Đỏ Nguyên Chất' },
  { icon: '🫚', text: 'Cao Atiso Đà Lạt' },
  { icon: '🌾', text: 'Tam Thất Bắc Bồi Bổ' },
  { icon: '🍯', text: 'Mật Ong Rừng Tây Nguyên' },
  { icon: '🌱', text: 'Đinh Lăng Bổ Khí Huyết' },
  { icon: '🧡', text: 'Nghệ Nano Curcumin' },
  { icon: '🌿', text: 'Hà Thủ Ô Đỏ Đen Tóc' },
  { icon: '🫖', text: 'Trà Khổ Qua Giảm Đường' },
  { icon: '🍀', text: 'Hoàng Kỳ Tăng Miễn Dịch' },
  { icon: '💊', text: 'An Cung Ngưu Hoàng Hoàn' },
];

const DongYPromoStrip = () => (
  <div className="dongy-strip">
    <div className="dongy-strip-label">
      <span>🌿</span>
      <span>Đông Y</span>
    </div>
    <div className="dongy-marquee-wrap">
      <div className="dongy-marquee">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="dongy-marquee-item">
            <span className="dongy-marquee-icon">{item.icon}</span>
            {item.text}
            <span className="dongy-sep">•</span>
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default DongYPromoStrip;
