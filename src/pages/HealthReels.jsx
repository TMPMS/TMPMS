import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart, Volume2, VolumeX, Play, Pause, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './HealthReels.css';

const REELS_DATA = [
  {
    id: 1,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    author: '@dr_duocsiviet',
    description: 'Bí quyết xua tan cơn đau nhức xương khớp nhạy bén nhờ bộ đôi Thảo dược & Khương Thảo Đan Gold. Đau nhức vai gáy, thoái hóa khớp chớ nên coi thường!',
    likes: 1240,
    comments: 89,
    shares: 45,
    product: {
      id: 601,
      name: 'TPBVSK Khương Thảo Đan Gold',
      price: 170000,
      image: 'https://tmp.vn/storage/media/c03d3ce6-2187-43ca-a3ef-b32c1c3fca93.webp',
      unit: 'Hộp'
    }
  },
  {
    id: 2,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    author: '@longchau_mecafe',
    description: 'Cách tắm cho trẻ sơ sinh bị rôm sảy, hăm đỏ da bằng Nước tắm thảo dược Sachi. Chiết xuất cúc la mã organic bảo vệ da bé nhẹ nhàng lành tính!',
    likes: 3105,
    comments: 245,
    shares: 112,
    product: {
      id: 501,
      name: 'Nước tắm thảo dược Sachi 250ml',
      price: 135000,
      image: 'https://cdn.nhathuoclongchau.com.vn/v1/static/nuoc_tam_thao_duoc_sachi_0_month_250ml_lam_diu_da_giup_phong_ngua-rom-say_00050586_1_33a0e9338c.png',
      unit: 'Chai'
    }
  },
  {
    id: 3,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    author: '@duocsi_longchau_247',
    description: 'Trào ngược dạ dày, ợ chua liên tục làm bạn mất ngủ? Xem ngay 3 thói quen và cách uống Bình Vị Thái Minh để dạ dày êm ru sau 1 tuần nhé.',
    likes: 456,
    comments: 32,
    shares: 18,
    product: {
      id: 611,
      name: 'TPBVSK Bình Vị Thái Minh',
      price: 165000,
      image: 'https://tmp.vn/storage/media/caeb95d2-f674-4b5f-8f83-d5d14dfbb500.webp',
      unit: 'Hộp'
    }
  }
];

const ReelItem = ({ reel, active, isMuted, toggleMute }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const { addToCart } = useCart();

  useEffect(() => {
    if (videoRef.current) {
      if (active) {
        videoRef.current.play().catch(e => console.log("Auto play prevented", e));
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [active]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Play failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  return (
    <div className="reel-slide">
      {/* Video element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        onClick={handlePlayPause}
        className="reel-video"
      />

      {/* Floating controls indicator */}
      {!isPlaying && (
        <div className="reel-play-indicator" onClick={handlePlayPause}>
          <Play size={48} fill="#fff" />
        </div>
      )}

      {/* Mute toggle overlay */}
      <button className="reel-mute-btn" onClick={toggleMute}>
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Right Side Buttons Panel */}
      <div className="reel-sidebar-actions">
        {/* Heart Like */}
        <div className="action-btn-wrap" onClick={handleLike}>
          <div className={`action-icon-circle ${liked ? 'liked' : ''}`}>
            <Heart size={22} fill={liked ? '#ef4444' : 'none'} />
          </div>
          <span>{likeCount}</span>
        </div>

        {/* Comment */}
        <div className="action-btn-wrap">
          <div className="action-icon-circle">
            <MessageCircle size={22} />
          </div>
          <span>{reel.comments}</span>
        </div>

        {/* Share */}
        <div className="action-btn-wrap">
          <div className="action-icon-circle">
            <Share2 size={22} />
          </div>
          <span>{reel.shares}</span>
        </div>
      </div>

      {/* Bottom Information Details */}
      <div className="reel-bottom-info">
        <h4 className="author">{reel.author}</h4>
        <p className="description">{reel.description}</p>
        
        {/* Recommended Product Tag Card */}
        {reel.product && (
          <div className="reel-product-badge animate-slide-up">
            <img src={reel.product.image} alt={reel.product.name} />
            <div className="prod-badge-info">
              <h5>{reel.product.name}</h5>
              <div className="row-price">
                <span className="price">{reel.product.price.toLocaleString('vi-VN')}đ</span>
                <button className="buy-now-btn" onClick={() => addToCart(reel.product)}>
                  <ShoppingCart size={12} />
                  <span>Mua</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const HealthReels = ({ onBack }) => {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef(null);

  const toggleMute = () => setIsMuted(prev => !prev);

  const handleScroll = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / containerHeight);
      if (index !== activeReelIndex && index >= 0 && index < REELS_DATA.length) {
        setActiveReelIndex(index);
      }
    }
  };

  return (
    <div className="reels-view-container">
      {/* Back Header */}
      <div className="reels-top-nav">
        <button className="reels-back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="reels-tabs">
          <span className="tab active">Dành cho bạn</span>
          <span className="tab-divider">|</span>
          <span className="tab">Đang theo dõi</span>
        </div>
      </div>

      {/* Reels Vertical Scroll Container */}
      <div 
        ref={containerRef}
        className="reels-scroller"
        onScroll={handleScroll}
      >
        {REELS_DATA.map((reel, idx) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            active={idx === activeReelIndex}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        ))}
      </div>
    </div>
  );
};

export default HealthReels;
