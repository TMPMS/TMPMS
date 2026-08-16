import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchProductReviews, checkReviewEligibility, submitProductReview, fetchHerbalMedicineInfo } from '../services/api';
import { formatDateVN } from '../utils/dateUtils';
import { getMeridianInfoForMedicine, MERIDIANS_CATALOG } from '../data/meridianData';
import { getStarRating } from '../components/ui/ProductCard';
import './ProductDetailView.css';

// three.js chỉ được tải khi người dùng thực sự mở modal 3D, tránh phình bundle chính.
const Meridian3DModal = lazy(() => import('../components/ui/Meridian3DModal'));

const ProductDetailView = ({ product, onBack }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [isEligible, setIsEligible] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showMeridianModal, setShowMeridianModal] = useState(false);
  const [herbalInfo, setHerbalInfo] = useState(null);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const userId = user?.user?.id || user?.id;

  useEffect(() => {
    if (!product) return;
    // Load reviews
    const loadReviews = async () => {
      try {
        setLoadingReviews(true);
        const data = await fetchProductReviews(product.id);
        setReviews(data);
      } catch (err) {
        console.error('Lỗi tải đánh giá:', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    // Check review eligibility
    const checkEligibility = async () => {
      if (!userId) {
        setIsEligible(false);
        return;
      }
      try {
        const eligible = await checkReviewEligibility(product.id, userId);
        setIsEligible(eligible);
      } catch (err) {
        console.error('Lỗi kiểm tra điều kiện đánh giá:', err);
        setIsEligible(false);
      }
    };

    // Dữ liệu Tính vị/Công dụng thật từ backend (nếu dược sĩ/admin đã nhập), ưu tiên hơn
    // chuỗi tĩnh trong meridianData.js để nội dung trên trang và trong modal 3D luôn khớp nhau.
    const loadHerbalInfo = async () => {
      const info = await fetchHerbalMedicineInfo(product.id);
      setHerbalInfo(info);
    };

    loadReviews();
    checkEligibility();
    loadHerbalInfo();
  }, [product?.id, userId]);

  if (!product) {
    return (
      <div className="pd-container">
        <p style={{ textAlign: 'center', padding: '40px 0', fontSize: '18px' }}>Không tìm thấy thông tin chi tiết sản phẩm.</p>
        <div style={{ textAlign: 'center' }}>
          <button onClick={onBack} style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Quay lại trang chủ</button>
        </div>
      </div>
    );
  }

  const displayPrice = product.price ? (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0) : 0;
  const displayOldPrice = product.oldPrice ? (typeof product.oldPrice === 'number' ? product.oldPrice : parseFloat(product.oldPrice) || 0) : null;

  const handleAddToCart = async () => {
    let successCount = 0;
    for (let i = 0; i < quantity; i++) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await addToCart(product);
      if (!ok) break; // Dừng lại nếu bị chặn (ví dụ: cần đơn thuốc) để tránh gọi API thất bại nhiều lần
      successCount++;
    }
    if (successCount === quantity) {
      alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
    } else if (successCount > 0) {
      alert(`Đã thêm ${successCount}/${quantity} sản phẩm vào giỏ hàng.`);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá.');
      return;
    }
    try {
      setSubmitLoading(true);
      setErrorMsg('');
      const newReview = await submitProductReview(rating, comment, product.id, userId);
      setReviews(prev => [newReview, ...prev]);
      setComment('');
      setRating(5);
      setSuccessMsg('Gửi đánh giá của bạn thành công! Cảm ơn bạn đã đóng góp ý kiến.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const cardRating = getStarRating(product?.id);
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : cardRating;

  return (
    <div className="pd-container">
      {/* Breadcrumbs */}
      <div className="pd-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Trang chủ</a>
        <span>&gt;</span>
        <span className="current">{product.name}</span>
      </div>

      {/* Main product details card */}
      <div className="pd-card">
        <div className="pd-left">
          <div className="pd-image-wrapper">
            <img src={product.image} alt={product.name} />
          </div>
        </div>

        <div className="pd-right">
          {product.requiresPrescription && (
            <span className="prescription-badge">💊 Thuốc kê đơn</span>
          )}
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-sku">Mã sản phẩm: SP-{product.id}</p>

          <div className="pd-price-card">
            {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
              <div className="pd-price-row">
                <span className="pd-price" style={{ color: '#d97706', fontSize: '20px' }}>📞 Liên hệ Dược sĩ để nhận báo giá</span>
              </div>
            ) : (
              <>
                <div className="pd-price-row">
                  <span className="pd-price">{(displayPrice || 0).toLocaleString('vi-VN')}đ</span>
                  <span className="pd-unit">/ {product.unit}</span>
                </div>
                {displayOldPrice && displayOldPrice > displayPrice && (
                  <div className="pd-old-price-row">
                    <span className="pd-old-price">{displayOldPrice.toLocaleString('vi-VN')}đ</span>
                    <span className="pd-discount">-{Math.round((1 - displayPrice / displayOldPrice) * 100)}%</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pd-meta-grid">
            <div className="pd-meta-item">
              <span className="meta-label">Xuất xứ</span>
              <span className="meta-value">{product.origin || 'Việt Nam'}</span>
            </div>
            <div className="pd-meta-item">
              <span className="meta-label">Quy cách</span>
              <span className="meta-value">{product.packaging || product.unit || 'Túi/Kg'}</span>
            </div>
          </div>

          <div style={{ margin: '15px 0', padding: '10px 15px', background: product.stockQuantity <= 0 ? '#fdf2f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${product.stockQuantity <= 0 ? '#fde8e8' : '#dcfce7'}`, display: 'inline-block' }}>
            <span style={{ fontWeight: '600', color: product.stockQuantity <= 0 ? '#9b1c1c' : '#166534' }}>
              Trạng thái: {product.stockQuantity <= 0 ? 'Tạm hết hàng' : `Còn hàng (Tồn kho: ${product.stockQuantity})`}
            </span>
          </div>

          {/* Eastern Medicine Properties Card & Meridian 3D Trigger */}
          {(() => {
            const mData = getMeridianInfoForMedicine(product.name);
            const activeMeridians = (mData?.meridians || []).map(k => MERIDIANS_CATALOG[k]).filter(Boolean);
            // Ưu tiên dữ liệu thật từ backend (dược sĩ/admin nhập qua HerbalMedicineController),
            // chỉ dùng chuỗi tĩnh trong meridianData.js làm dự phòng khi chưa có bản ghi HerbalMedicineInfo.
            const natureText = herbalInfo?.properties || mData?.nature;
            const functionsText = herbalInfo?.effects || mData?.functions;

            return (
              <div className="eastern-medicine-card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px 16px', margin: '12px 0 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '8px' }}>
                    🌿 TÍNH VỊ Y HỌC CỔ TRUYỀN
                  </span>
                  <button
                    onClick={() => setShowMeridianModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    🌐 Xem Sơ Đồ Quy Kinh & Huyệt Vị 3D
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                  {natureText && <p style={{ margin: '3px 0' }}><strong>Tính vị:</strong> {natureText}</p>}
                  {activeMeridians.length > 0 ? (
                    <p style={{ margin: '3px 0' }}>
                      <strong>Quy kinh:</strong> {activeMeridians.map(m => m.name).join(', ')}
                    </p>
                  ) : (
                    <p style={{ margin: '3px 0', color: '#64748b' }}>
                      Nhấn "Xem Sơ Đồ Quy Kinh & Huyệt Vị 3D" để phân tích quy kinh bằng AI cho sản phẩm này.
                    </p>
                  )}
                  {functionsText && <p style={{ margin: '3px 0' }}><strong>Công năng:</strong> {functionsText}</p>}
                </div>
              </div>
            );
          })()}

          <div className="pd-action-row">
            {product.priceStatus === 'contact' || product.price === null || product.price === undefined ? (
              <button
                className="add-to-cart-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-pharmacy-chat-widget', {
                    detail: { initialMessage: `Tôi muốn hỏi giá và mua vị thuốc: ${product.name}` }
                  }));
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                💬 Liên hệ Dược sĩ
              </button>
            ) : product.stockQuantity <= 0 ? (
              <button 
                className="add-to-cart-btn" 
                disabled 
                style={{ background: '#cccccc', color: '#666666', cursor: 'not-allowed', width: '100%', maxWidth: '250px' }}
              >
                Hết hàng trong kho
              </button>
            ) : (
              <>
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</button>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.min(product.stockQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <button onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))} disabled={quantity >= product.stockQuantity}>+</button>
                </div>
                <button className="add-to-cart-btn" onClick={handleAddToCart}>
                  Chọn mua
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description & Technical details */}
      <div className="pd-section mt-6">
        <h2 className="section-title">Mô tả sản phẩm</h2>
        <div className="pd-description">
          {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
        </div>
      </div>

      {/* Reviews & Ratings Section */}
      <div className="pd-section mt-6">
        <h2 className="section-title">Khách hàng nhận xét</h2>
        
        <div className="reviews-summary-row">
          <div className="summary-left">
            <div className="avg-rating">{averageRating || '5.0'}</div>
            <div className="avg-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span 
                  key={i} 
                  className={`star-icon ${i < Math.round(averageRating || 5) ? 'filled' : ''}`}
                >★</span>
              ))}
            </div>
            <p className="total-reviews">{reviews.length} đánh giá</p>
          </div>

          <div className="summary-right">
            {/* Eligibility Banner */}
            {!userId ? (
              <div className="eligibility-banner info">
                🔒 Vui lòng <strong>đăng nhập</strong> để đánh giá sản phẩm này.
              </div>
            ) : !isEligible ? (
              <div className="eligibility-banner warning">
                ⚠️ Bạn chỉ có thể đánh giá sản phẩm này sau khi **đã mua và thanh toán thành công** đơn hàng chứa sản phẩm này.
              </div>
            ) : (
              <div className="eligibility-banner success">
                ✅ Bạn đã mua sản phẩm này! Hãy để lại cảm nhận của mình bên dưới nhé.
              </div>
            )}
          </div>
        </div>

        {/* Review Form - Display only if eligible */}
        {userId && isEligible && (
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>Viết nhận xét của bạn</h3>
            
            <div className="form-group">
              <label>Đánh giá sao:</label>
              <div className="rating-select">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`star-select ${i < rating ? 'active' : ''}`}
                    onClick={() => setRating(i + 1)}
                  >★</span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="comment">Nhận xét chi tiết:</label>
              <textarea
                id="comment"
                rows="4"
                placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm của bạn tại đây..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {errorMsg && <div className="error-alert">{errorMsg}</div>}
            {successMsg && <div className="success-alert">{successMsg}</div>}

            <button type="submit" className="submit-review-btn" disabled={submitLoading}>
              {submitLoading ? 'Đang gửi...' : 'Gửi nhận xét'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        <div className="reviews-list">
          <h3>Nhận xét từ khách hàng ({reviews.length})</h3>
          
          {loadingReviews ? (
            <p className="reviews-loading">Đang tải các đánh giá...</p>
          ) : reviews.length === 0 ? (
            <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này.</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="review-item">
                <div className="review-header">
                  <span className="reviewer-name">{r.username}</span>
                  <span className="review-date">{formatDateVN(r.createdAt)}</span>
                </div>
                <div className="review-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span 
                      key={i} 
                      className={`star-icon ${i < r.rating ? 'filled' : ''}`}
                    >★</span>
                  ))}
                </div>
                <p className="review-comment">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3D Interactive Meridian/Acupoint Modal (Three.js) — chỉ tải khi mở, không vào bundle chính */}
      {showMeridianModal && (
        <Suspense fallback={
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#e2e8f0', fontSize: '15px' }}>Đang tải mô hình 3D…</div>
          </div>
        }>
          <Meridian3DModal
            product={product}
            curatedData={getMeridianInfoForMedicine(product.name)}
            onClose={() => setShowMeridianModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ProductDetailView;
