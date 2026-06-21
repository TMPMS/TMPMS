import React, { useState } from 'react';
import './HealthNews.css';

const TABS = ['Dinh dưỡng', 'Phòng chữa bệnh', 'Khỏe đẹp'];

const ARTICLES = {
  'Dinh dưỡng': [
    { id: 1, title: 'Vitamin D3 và K2: Cần uống như thế nào để hiệu quả nhất?', excerpt: 'Vitamin D3 và K2 thường được kết hợp sử dụng để tăng cường hấp thu canxi cho xương...', tag: 'Dinh dưỡng', date: '17/05/2025', featured: true },
    { id: 2, title: 'Canxi và Magie: Tại sao cần bổ sung cùng nhau?', excerpt: '', tag: 'Dinh dưỡng', date: '16/05/2025', featured: false },
    { id: 3, title: 'Top 5 thực phẩm giàu Omega-3 tốt cho não bộ', excerpt: '', tag: 'Dinh dưỡng', date: '15/05/2025', featured: false },
    { id: 4, title: 'Sữa công thức và những điều mẹ cần biết', excerpt: '', tag: 'Dinh dưỡng', date: '14/05/2025', featured: false },
    { id: 5, title: 'Chế độ ăn uống cho người bị tiểu đường type 2', excerpt: '', tag: 'Dinh dưỡng', date: '13/05/2025', featured: false },
  ],
  'Phòng chữa bệnh': [
    { id: 6, title: 'Cách phòng ngừa cảm cúm mùa hè hiệu quả', excerpt: 'Cảm cúm không chỉ xuất hiện vào mùa đông. Tìm hiểu ngay các biện pháp phòng ngừa...', tag: 'Phòng chữa bệnh', date: '17/05/2025', featured: true },
    { id: 7, title: 'Huyết áp cao: Dấu hiệu và cách kiểm soát', excerpt: '', tag: 'Phòng chữa bệnh', date: '16/05/2025', featured: false },
    { id: 8, title: 'Tiểu đường: Các biến chứng nguy hiểm cần biết', excerpt: '', tag: 'Phòng chữa bệnh', date: '15/05/2025', featured: false },
    { id: 9, title: 'Sỏi thận: Nguyên nhân và phòng tránh', excerpt: '', tag: 'Phòng chữa bệnh', date: '14/05/2025', featured: false },
    { id: 10, title: 'Các bệnh về gan: Dấu hiệu nhận biết sớm', excerpt: '', tag: 'Phòng chữa bệnh', date: '13/05/2025', featured: false },
  ],
  'Khỏe đẹp': [
    { id: 11, title: 'Chăm sóc da mặt đúng cách theo từng loại da', excerpt: 'Biết loại da của mình là bước đầu tiên để có làn da khỏe đẹp. Xem ngay hướng dẫn...', tag: 'Khỏe đẹp', date: '17/05/2025', featured: true },
    { id: 12, title: 'Kem chống nắng: Nên dùng SPF bao nhiêu?', excerpt: '', tag: 'Khỏe đẹp', date: '16/05/2025', featured: false },
    { id: 13, title: 'Retinol và cách sử dụng an toàn cho da', excerpt: '', tag: 'Khỏe đẹp', date: '15/05/2025', featured: false },
    { id: 14, title: 'Top 5 serum vitamin C tốt nhất hiện nay', excerpt: '', tag: 'Khỏe đẹp', date: '14/05/2025', featured: false },
    { id: 15, title: 'Chế độ ngủ ảnh hưởng thế nào đến làn da?', excerpt: '', tag: 'Khỏe đẹp', date: '13/05/2025', featured: false },
  ],
};

const HealthNews = () => {
  const [tab, setTab] = useState(TABS[0]);
  const articles = ARTICLES[tab] || [];
  const featured = articles.find(a => a.featured);
  const rest = articles.filter(a => !a.featured);

  return (
    <section className="hn-section">
      <div className="hn-header">
        <div className="hn-title-wrap">
          <div className="hn-title-bar" />
          <h2 className="hn-title">Bệnh & Góc sức khoẻ</h2>
        </div>
        <div className="hn-tabs">
          {TABS.map(t => (
            <button key={t} className={`hn-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <a href="#" className="hn-all">Xem tất cả →</a>
      </div>

      <div className="hn-content">
        {/* Featured */}
        {featured && (
          <a href="#" className="hn-featured">
            <div className="hn-featured-img">
              <div className="hn-img-placeholder">{featured.tag[0]}</div>
            </div>
            <div className="hn-featured-body">
              <span className="hn-tag">{featured.tag}</span>
              <h3 className="hn-featured-title">{featured.title}</h3>
              <p className="hn-featured-excerpt">{featured.excerpt}</p>
              <span className="hn-date">{featured.date}</span>
            </div>
          </a>
        )}

        {/* List */}
        <div className="hn-list">
          {rest.map(a => (
            <a key={a.id} href="#" className="hn-item">
              <div className="hn-item-img">
                <div className="hn-img-sm-placeholder">{a.tag[0]}</div>
              </div>
              <div className="hn-item-body">
                <span className="hn-tag">{a.tag}</span>
                <p className="hn-item-title">{a.title}</p>
                <span className="hn-date">{a.date}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HealthNews;
