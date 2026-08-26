import { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';
import Header from './components/layout/Header';
import HeroBanner from './components/HeroBanner';
import QuickLinks from './components/QuickLinks';
import FlashSale from './components/FlashSale';
import PromoBanners from './components/PromoBanners';
import ProductSection from './components/ProductSection';
import FeaturedCategories from './components/FeaturedCategories';
import Brands from './components/Brands';
import HealthNews from './components/HealthNews';
import StorePromoBar from './components/StorePromoBar';
import FloatingActions from './components/ui/FloatingActions';
import Footer from './components/layout/Footer';
import DongYPromoStrip from './components/DongYPromoStrip';
import DongYSection from './components/DongYSection';

// New Views — tải theo nhu cầu (code-splitting): các trang này không cần thiết ngay ở lần tải
// đầu (chỉ trang chủ mới cần), gộp chung vào bundle chính sẽ làm nặng lần tải đầu tiên không cần
// thiết. AIChatbot/FeaturedVideosCarousel vẫn import thường vì xuất hiện ngay trên trang chủ.
const HistoryView = lazy(() => import('./pages/HistoryView'));
const AdminView = lazy(() => import('./pages/AdminView'));
const SuppliersView = lazy(() => import('./pages/SuppliersView'));
const SelfDiagnosis = lazy(() => import('./pages/SelfDiagnosis'));
const PatientPortal = lazy(() => import('./pages/PatientPortal'));
const ProductDetailView = lazy(() => import('./pages/ProductDetailView'));
const CategoryListView = lazy(() => import('./pages/CategoryListView'));
const StoreFinderView = lazy(() => import('./pages/StoreFinderView'));
const VaccineBookingView = lazy(() => import('./pages/VaccineBookingView'));
const HealthReels = lazy(() => import('./pages/HealthReels'));
import AIChatbot from './components/ui/AIChatbot';
const ProfileView = lazy(() => import('./pages/ProfileView'));
import FeaturedVideosCarousel from './components/ui/FeaturedVideosCarousel';
const HealthQuizList = lazy(() => import('./pages/HealthQuizList'));
const HealthQuizPlayer = lazy(() => import('./pages/HealthQuizPlayer'));
const PaymentResultView = lazy(() => import('./pages/PaymentResultView'));
const ScanMedicineView = lazy(() => import('./pages/ScanMedicineView'));

import { fetchMedicines, fetchMedicineById, verifyAppointmentPayOS } from './services/api';

// Các trang không cần dữ liệu bổ sung để khôi phục — chỉ cần đổi currentPage là đủ.
// ('detail' và 'health-quiz-player' được xử lý riêng vì cần thêm id/quizCode.)
const SIMPLE_PAGES = new Set([
  'home', 'history', 'admin', 'suppliers', 'store-finder', 'vaccine', 'reels',
  'diagnose', 'health-quiz', 'patient-portal', 'profile', 'scan-medicine',
]);

// Đọc route ban đầu từ URL đồng bộ (lazy useState initializer) thay vì trong 1 effect sau khi
// mount — nếu để trong effect, effect đồng bộ URL (push) có thể chạy trước và ghi đè mất URL
// deep-link/refresh trước khi effect khôi phục kịp đọc nó.
function getInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment')) return { page: 'payment-result' };
  const path = window.location.pathname.replace(/^\//, '') || 'home';
  if (path === 'detail' && params.get('id')) return { page: 'detail', productId: params.get('id') };
  if (path === 'health-quiz-player') return { page: 'health-quiz-player', quizCode: params.get('quiz') };
  if (path === 'home') {
    return {
      page: 'home',
      categoryId: params.get('category'),
      supplierId: params.get('supplier'),
      supplierName: params.get('supplierName'),
    };
  }
  if (SIMPLE_PAGES.has(path)) return { page: path };
  return { page: 'home' };
}

const mapProduct = (p) => {
  const sid = p.supplierId !== undefined ? p.supplierId : (p.supplier_id !== undefined ? p.supplier_id : (p.SupplierId !== undefined ? p.SupplierId : 1));
  return {
    id: p.id || p.Id,
    name: p.name || p.Name,
    image: p.image_url || p.imageUrl || p.ImageUrl,
    price: parseFloat(p.price !== undefined ? p.price : (p.Price !== undefined ? p.Price : 0)),
    oldPrice: p.old_price ? parseFloat(p.old_price) : (p.oldPrice ? parseFloat(p.oldPrice) : (p.OldPrice ? parseFloat(p.OldPrice) : null)),
    unit: p.unit || p.Unit || 'Hộp',
    discount: p.discount,
    origin: p.origin || p.Origin || 'Việt Nam',
    packaging: p.packaging || p.Packaging || 'Hộp',
    description: p.description || p.Description,
    supplierId: sid,
    supplier_id: sid,
    requiresPrescription: p.requires_prescription !== undefined ? p.requires_prescription : (p.requiresPrescription !== undefined ? p.requiresPrescription : p.RequiresPrescription),
    stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : (p.stock_quantity !== undefined ? p.stock_quantity : (p.StockQuantity || 99)),
    rating: p.rating !== undefined ? p.rating : p.Rating,
  };
};

const categoryNames = {
  9: 'Thảo Dược Đông Y',
  1: 'Thực phẩm chức năng',
  2: 'Dược mỹ phẩm',
  3: 'Thuốc',
  4: 'Chăm sóc cá nhân',
  5: 'Thiết bị y tế',
  6: 'Châm cứu',
  7: 'Bệnh & Góc sức khỏe',
  8: 'Hệ thống nhà thuốc'
};

function App() {
  const [initialRoute] = useState(getInitialRoute);
  const [paymentOrderCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') ? params.get('orderCode') : null;
  });
  const [currentPage, setCurrentPage] = useState(() => initialRoute.page);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appointmentResult = params.get('appointmentPayment');
    if (!appointmentResult) return;
    if (appointmentResult === 'cancelled') {
      alert('Thanh toán tiền cọc đã bị hủy. Khung giờ sẽ được mở lại khi thời gian giữ chỗ kết thúc.');
      setCurrentPage('patient-portal');
      return;
    }
    const orderCode = sessionStorage.getItem('appointmentPaymentOrderCode');
    if (!orderCode) { setCurrentPage('patient-portal'); return; }
    verifyAppointmentPayOS(orderCode)
      .then(result => alert(result.intentStatus === 'Paid' ? 'Đặt cọc thành công. Lịch đang chờ nhà thuốc xác nhận.' : 'Giao dịch đang được PayOS xử lý.'))
      .catch(err => alert(err.message))
      .finally(() => { sessionStorage.removeItem('appointmentPaymentOrderCode'); setCurrentPage('patient-portal'); });
  }, []);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => initialRoute.categoryId || null);
  const [selectedSupplier, setSelectedSupplier] = useState(() => // { id, name } — chế độ xem sản phẩm theo nhà cung cấp (Brands)
    initialRoute.supplierId ? { id: initialRoute.supplierId, name: initialRoute.supplierName || '' } : null
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [bestSellers, setBestSellers] = useState([]);
  const [supplements, setSupplements] = useState([]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentPage('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [searchResults, setSearchResults] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Home Products (when no category selected)
  useEffect(() => {
    const loadHomeProducts = async () => {
      try {
        setLoading(true);
        // Category 3: Thuốc (Best Sellers)
        const bestData = await fetchMedicines(3);
        // Category 1: Thực phẩm chức năng (Supplements)
        const suppData = await fetchMedicines(1);

        setBestSellers(bestData.map(mapProduct));
        setSupplements(suppData.map(mapProduct));
      } catch (err) {
        console.error('Không thể tải sản phẩm trang chủ:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!selectedCategoryId) {
      loadHomeProducts();
    }
  }, [selectedCategoryId]);

  // Global event listener for app navigation from AI Chatbot or Floating buttons
  useEffect(() => {
    const handleAppNav = (e) => {
      if (e.detail) {
        setCurrentPage(e.detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('app-navigate', handleAppNav);
    return () => window.removeEventListener('app-navigate', handleAppNav);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      setSelectedCategoryId(null); // Clear category filter when searching
      setCurrentPage('home'); // Switch to home page when searching
      try {
        const data = await fetchMedicines(null, query, null, null, true);
        setSearchResults(data.map(mapProduct));
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsSearching(false);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setSelectedSupplier(null);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleSelectSupplier = (supplierId, supplierName) => {
    setSelectedSupplier({ id: supplierId, name: supplierName });
    setSelectedCategoryId(null);
    setIsSearching(false);
    setSearchQuery('');
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [selectedQuizCode, setSelectedQuizCode] = useState(() => initialRoute.quizCode || null);

  // --- URL sync (không dùng thư viện router) ---
  // currentPage vẫn là nguồn dữ liệu duy nhất cho renderContent(); khối này chỉ phản chiếu nó
  // sang URL/history để nút Back/Forward, tải lại trang, và chia sẻ link đều hoạt động đúng.
  // State ban đầu đã được đọc trực tiếp từ URL (xem getInitialRoute/initialRoute ở trên) nên
  // lần render đầu tiên currentPage/... đã khớp sẵn với URL — effect này chỉ cần bỏ qua lúc
  // trang 'detail' đang chờ fetch sản phẩm xong (chưa có selectedProduct) để không vô tình xoá
  // mất ?id=... trên URL trước khi fetch hoàn tất.
  useEffect(() => {
    if (currentPage === 'payment-result') return; // giữ nguyên ?payment=...&orderCode=... hiện có
    if (currentPage === 'detail' && !selectedProduct) return; // đang chờ fetch theo id từ URL/state
    const params = new URLSearchParams();
    if (currentPage === 'detail' && selectedProduct?.id) {
      params.set('id', selectedProduct.id);
    } else if (currentPage === 'health-quiz-player' && selectedQuizCode) {
      params.set('quiz', selectedQuizCode);
    } else if (currentPage === 'home') {
      if (selectedCategoryId) params.set('category', selectedCategoryId);
      else if (selectedSupplier?.id) {
        params.set('supplier', selectedSupplier.id);
        params.set('supplierName', selectedSupplier.name || '');
      }
    }
    const path = currentPage === 'home' ? '/' : `/${currentPage}`;
    const search = params.toString() ? `?${params}` : '';
    const url = path + search;
    if (url !== window.location.pathname + window.location.search) {
      window.history.pushState({ page: currentPage, productId: selectedProduct?.id, quizCode: selectedQuizCode }, '', url);
    }
  }, [currentPage, selectedProduct, selectedQuizCode, selectedCategoryId, selectedSupplier]);

  // Khôi phục trang khi bấm nút Back/Forward của trình duyệt.
  useEffect(() => {
    const onPopState = (e) => {
      const state = e.state;
      const page = state?.page || (window.location.pathname.replace(/^\//, '') || 'home');
      if (page === 'detail' && state?.productId) {
        setSelectedProduct(null);
        fetchMedicineById(state.productId).then(p => {
          if (p) setSelectedProduct(mapProduct(p));
        });
        setCurrentPage('detail');
      } else {
        if (page === 'health-quiz-player' && state?.quizCode) setSelectedQuizCode(state.quizCode);
        setCurrentPage(SIMPLE_PAGES.has(page) || page === 'detail' || page === 'health-quiz-player' ? page : 'home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Tải sản phẩm khi trang 'detail' được mở thẳng từ URL (deep link) hoặc F5 — currentPage đã
  // được khởi tạo là 'detail' ngay từ đầu (xem initialRoute), effect này chỉ cần lấy dữ liệu
  // sản phẩm tương ứng. Nếu sản phẩm không còn tồn tại, quay về trang chủ thay vì màn hình trống.
  useEffect(() => {
    if (initialRoute.page === 'detail' && initialRoute.productId) {
      fetchMedicineById(initialRoute.productId).then(p => {
        if (p) setSelectedProduct(mapProduct(p));
        else setCurrentPage('home');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialRoute chỉ đọc URL 1 lần lúc mount, cố tình không đưa vào dep để không chạy lại
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'history':
        return <HistoryView />;
      case 'admin':
        return (
          <Suspense fallback={<div style={{ padding: '80px 0', textAlign: 'center', color: '#0d9488', fontWeight: 600 }}>Đang tải bảng quản trị...</div>}>
            <AdminView />
          </Suspense>
        );
      case 'suppliers':
        return <SuppliersView />;
      case 'store-finder':
        return <StoreFinderView onBack={() => handleNavigate('home')} />;
      case 'vaccine':
        return <VaccineBookingView onBack={() => handleNavigate('home')} />;
      case 'reels':
        return <HealthReels onBack={() => handleNavigate('home')} />;
      case 'diagnose':
        return <SelfDiagnosis onBack={() => handleNavigate('home')} />;
      case 'health-quiz':
        return (
          <HealthQuizList 
            onSelectQuiz={(code) => {
              setSelectedQuizCode(code);
              handleNavigate('health-quiz-player');
            }} 
            onBack={() => handleNavigate('home')} 
          />
        );
      case 'health-quiz-player':
        return (
          <HealthQuizPlayer 
            quizCode={selectedQuizCode || 'cardio-risk'} 
            onBack={() => handleNavigate('health-quiz')}
            onNavigateBooking={() => handleNavigate('patient-portal')}
          />
        );
      case 'patient-portal':
        return <PatientPortal onBack={() => handleNavigate('home')} />;
      case 'profile':
        return <ProfileView onNavigate={handleNavigate} />;
      case 'detail':
        return <ProductDetailView product={selectedProduct} onBack={() => handleNavigate('home')} />;
      case 'scan-medicine':
        return <ScanMedicineView onBack={() => handleNavigate('home')} onProductFound={handleSelectProduct} />;
      case 'payment-result':
        return <PaymentResultView orderCode={paymentOrderCode} onNavigate={handleNavigate} />;
      case 'home':
      default:
        if (isSearching) {
          return (
            <div style={{ padding: '24px 0' }}>
              <ProductSection 
                title={`Kết quả tìm kiếm cho: "${searchQuery}" (${searchResults.length} sản phẩm)`} 
                products={searchResults} 
                onProductClick={handleSelectProduct}
              />
            </div>
          );
        }
        
        if (selectedCategoryId) {
          const categoryName = categoryNames[selectedCategoryId] || 'Sản phẩm';
          return (
            <CategoryListView
              categoryId={selectedCategoryId}
              categoryName={categoryName}
              onProductClick={handleSelectProduct}
              onBackToHome={() => setSelectedCategoryId(null)}
            />
          );
        }

        if (selectedSupplier) {
          return (
            <CategoryListView
              supplierId={selectedSupplier.id}
              supplierName={selectedSupplier.name}
              onProductClick={handleSelectProduct}
              onBackToHome={() => setSelectedSupplier(null)}
            />
          );
        }

        return (
          <>
            <HeroBanner onSearch={handleSearch} />
            <DongYPromoStrip />
            <QuickLinks onNavigate={handleNavigate} />
            <FlashSale onProductClick={handleSelectProduct} />
            <PromoBanners onSearch={handleSearch} />
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '18px', color: 'var(--text-color)' }}>
                Đang tải dữ liệu sản phẩm...
              </div>
            ) : (
              <>
                <ProductSection title="🌿 Thuốc Đông Y Bán Chạy" products={bestSellers} onProductClick={handleSelectProduct} />
                <FeaturedCategories onSelectCategory={handleSelectCategory} onNavigate={handleNavigate} />
                <DongYSection onProductClick={handleSelectProduct} onViewAllCategory={handleSelectCategory} />
                <ProductSection title="🍃 Thảo Dược & Cao Dược Liệu" products={supplements} onProductClick={handleSelectProduct} />
              </>
            )}
            <FeaturedVideosCarousel onNavigate={handleNavigate} />
            <Brands onSelectSupplier={handleSelectSupplier} />
            <HealthNews />
            <StorePromoBar onNavigate={handleNavigate} />
          </>
        );
    }
  };

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
      <Header 
        onSearch={handleSearch} 
        onNavigate={handleNavigate}
        onSelectCategory={handleSelectCategory}
        onSelectProduct={handleSelectProduct}
      />

      <main style={{ width: '1200px', maxWidth: '100%', margin: '0 auto', padding: '0 0 32px' }}>
        <Suspense fallback={<div style={{ padding: '80px 0', textAlign: 'center', color: '#0d9488', fontWeight: 600 }}>Đang tải...</div>}>
          {renderContent()}
        </Suspense>
      </main>

      <FloatingActions />
      <AIChatbot />
      <Footer />
    </div>
  );
}

export default App;
