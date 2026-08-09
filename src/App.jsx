import React, { useState, useEffect, Suspense, lazy } from 'react';
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

// New Views
import HistoryView from './pages/HistoryView';
const AdminView = lazy(() => import('./pages/AdminView'));
import SuppliersView from './pages/SuppliersView';
import SelfDiagnosis from './pages/SelfDiagnosis';
import PatientPortal from './pages/PatientPortal';
import ProductDetailView from './pages/ProductDetailView';
import CategoryListView from './pages/CategoryListView';
import StoreFinderView from './pages/StoreFinderView';
import VaccineBookingView from './pages/VaccineBookingView';
import HealthReels from './pages/HealthReels';
import AIChatbot from './components/ui/AIChatbot';
import ProfileView from './pages/ProfileView';
import FeaturedVideosCarousel from './components/ui/FeaturedVideosCarousel';
import HealthQuizList from './pages/HealthQuizList';
import HealthQuizPlayer from './pages/HealthQuizPlayer';
import PaymentResultView from './pages/PaymentResultView';

import { fetchMedicines, verifyAppointmentPayOS } from './services/api';

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
  const [paymentOrderCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') ? params.get('orderCode') : null;
  });
  const [currentPage, setCurrentPage] = useState(paymentOrderCode ? 'payment-result' : 'home');

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
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // { id, name } — chế độ xem sản phẩm theo nhà cung cấp (Brands)
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

  const [selectedQuizCode, setSelectedQuizCode] = useState(null);

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
                <DongYSection onProductClick={handleSelectProduct} />
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
        {renderContent()}
      </main>

      <FloatingActions />
      <AIChatbot />
      <Footer />
    </div>
  );
}

export default App;
