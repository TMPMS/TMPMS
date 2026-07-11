import React, { useState, useRef } from 'react';
import { Play, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import './HealthVideoSection.css';

const HEALTH_VIDEOS = [
  {
    id: 1,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=260&fit=crop',
    title: 'Rối loạn tâm thần có thể bắt đầu từ những áp lực rất đời thường',
    category: 'RADAR SỨC KHỎE',
    views: '12.4K',
    duration: '2:35',
  },
  {
    id: 2,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400&h=260&fit=crop',
    title: 'TP.HCM ghi nhận hơn 17.700 ca sốt xuất huyết — Cách phòng bệnh tại nhà',
    category: 'RADAR SỨC KHỎE',
    views: '8.2K',
    duration: '3:10',
  },
  {
    id: 3,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=260&fit=crop',
    title: 'Cảnh giác với sản phẩm NICOTINE mới — Vô bọc hấp dẫn, hiểm họa khôn lường',
    category: 'RADAR SỨC KHỎE',
    views: '34.1K',
    duration: '4:20',
  },
  {
    id: 4,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=260&fit=crop',
    title: 'Bộ Y tế cập nhật danh mục 81 bệnh truyền nhiễm — Phòng ngừa như thế nào?',
    category: 'RADAR SỨC KHỎE',
    views: '5.6K',
    duration: '2:58',
  },
  {
    id: 5,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?w=400&h=260&fit=crop',
    title: 'Nhờ tiêm chủng, số ca viêm não Nhật Bản tại Việt Nam đã giảm từ 2.000 xuống 100',
    category: 'RADAR SỨC KHỎE',
    views: '9.8K',
    duration: '3:45',
  },
  {
    id: 6,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=260&fit=crop',
    title: '2 phút bác sĩ: Cách xử trí khi bé hóc dị vật đúng chuẩn y khoa',
    category: 'RADAR SỨC KHỎE',
    views: '67.3K',
    duration: '2:04',
  },
  {
    id: 7,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&h=260&fit=crop',
    title: 'Bí quyết sử dụng thảo dược Đông Y đúng cách — Lương y chia sẻ',
    category: 'ĐÔNG Y & SỨC KHỎE',
    views: '22.1K',
    duration: '5:15',
  },
  {
    id: 8,
    badge: 'VIDEO',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=260&fit=crop',
    title: 'Chế độ ăn uống cho người bị tiểu đường — Thực đơn hàng ngày đúng cách',
    category: 'DINH DƯỠNG',
    views: '15.7K',
    duration: '6:30',
  },
];

export default function HealthVideoSection({ onNavigate }) {
  const scrollRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="health-video-section">
      <div className="hv-header">
        <div className="hv-title-row">
          <span className="hv-icon">▶</span>
          <h2 className="hv-title">Video ngắn nổi bật</h2>
        </div>
        <button className="hv-see-all" onClick={() => onNavigate && onNavigate('reels')}>
          Xem tất cả <ChevronRight size={14} />
        </button>
      </div>

      <div className="hv-scroll-wrapper">
        <button className="hv-arrow hv-arrow-left" onClick={() => scroll(-1)}>
          <ChevronLeft size={18} />
        </button>

        <div className="hv-scroll-track" ref={scrollRef}>
          {HEALTH_VIDEOS.map(v => (
            <div key={v.id} className="hv-card" onClick={() => setActiveVideo(v)}>
              <div className="hv-thumb-wrap">
                <img src={v.thumbnail} alt={v.title} className="hv-thumb" />
                <div className="hv-play-overlay">
                  <div className="hv-play-btn"><Play size={18} fill="white" /></div>
                </div>
                <span className="hv-badge">{v.badge}</span>
                <span className="hv-duration">{v.duration}</span>
              </div>
              <div className="hv-card-body">
                <span className="hv-category">{v.category}</span>
                <p className="hv-card-title">{v.title}</p>
                <div className="hv-meta">
                  <Eye size={11} />
                  <span>{v.views} lượt xem</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="hv-arrow hv-arrow-right" onClick={() => scroll(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Lightbox */}
      {activeVideo && (
        <div className="hv-lightbox" onClick={() => setActiveVideo(null)}>
          <div className="hv-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="hv-lightbox-close" onClick={() => setActiveVideo(null)}>✕</button>
            <div className="hv-lightbox-video">
              <img src={activeVideo.thumbnail} alt={activeVideo.title} />
              <div className="hv-lightbox-play">
                <Play size={48} fill="white" />
                <p>Video demo — chức năng phát video sẽ được tích hợp</p>
              </div>
            </div>
            <div className="hv-lightbox-info">
              <span className="hv-badge">{activeVideo.badge}</span>
              <h3>{activeVideo.title}</h3>
              <div className="hv-meta"><Eye size={13} /><span>{activeVideo.views} lượt xem</span></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
