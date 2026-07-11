import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import QuickLinks from './components/QuickLinks';
import FlashSale from './components/FlashSale';
import PromoBanners from './components/PromoBanners';
import ProductSection from './components/ProductSection';
import FeaturedCategories from './components/FeaturedCategories';
import Brands from './components/Brands';
import HealthNews from './components/HealthNews';
import StorePromoBar from './components/StorePromoBar';
import FloatingActions from './components/FloatingActions';
import Footer from './components/Footer';
import DongYPromoStrip from './components/DongYPromoStrip';
import DongYSection from './components/DongYSection';

// New Views
import HistoryView from './components/HistoryView';
import AdminView from './components/AdminView';
import SuppliersView from './components/SuppliersView';
import SelfDiagnosis from './components/SelfDiagnosis';
import PatientPortal from './components/PatientPortal';
import ProductDetailView from './components/ProductDetailView';
import CategoryListView from './components/CategoryListView';
import StoreFinderView from './components/StoreFinderView';
import VaccineBookingView from './components/VaccineBookingView';
import HealthReels from './components/HealthReels';
import AIChatbot from './components/AIChatbot';
import ProfileView from './components/ProfileView';
import HealthVideoSection from './components/HealthVideoSection';

import { fetchMedicines } from './services/api';

const mapProduct = (p) => ({
  id: p.id,
  name: p.name,
  image: p.image_url || p.imageUrl,
  price: parseFloat(p.price),
  oldPrice: p.old_price ? parseFloat(p.old_price) : (p.oldPrice ? parseFloat(p.oldPrice) : null),
  unit: p.unit || 'Hộp',
  discount: p.discount,
  origin: p.origin || 'Việt Nam',
  packaging: p.packaging || 'Hộp',
  description: p.description,
  requiresPrescription: p.requires_prescription !== undefined ? p.requires_prescription : p.requiresPrescription,
});

const categoryNames = {
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
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'history' | 'admin' | 'suppliers' | 'detail'
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [bestSellers, setBestSellers] = useState([]);
  const [supplements, setSupplements] = useState([]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentPage('detail');
  };
  const [categoryProducts, setCategoryProducts] = useState([]);
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

  // Load Category Products
  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (!selectedCategoryId) return;
      try {
        setLoading(true);
        const catData = await fetchMedicines(selectedCategoryId);
        setCategoryProducts(catData.map(mapProduct));
      } catch (err) {
        console.error('Không thể tải sản phẩm danh mục:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryProducts();
  }, [selectedCategoryId]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      setSelectedCategoryId(null); // Clear category filter when searching
      setCurrentPage('home'); // Switch to home page when searching
      try {
        const data = await fetchMedicines(null, query);
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
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setIsSearching(false);
    setSearchQuery('');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'history':
        return <HistoryView />;
      case 'admin':
        return <AdminView />;
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
      case 'patient-portal':
        return <PatientPortal onBack={() => handleNavigate('home')} />;
      case 'profile':
        return <ProfileView onNavigate={handleNavigate} />;
      case 'detail':
        return <ProductDetailView product={selectedProduct} onBack={() => handleNavigate('home')} />;
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
              products={categoryProducts}
              onProductClick={handleSelectProduct}
              onBackToHome={() => setSelectedCategoryId(null)}
            />
          );
        }

        return (
          <>
            <HeroBanner />
            <DongYPromoStrip />
            <QuickLinks onNavigate={handleNavigate} />
            <FlashSale />
            <PromoBanners />
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '18px', color: 'var(--text-color)' }}>
                Đang tải dữ liệu sản phẩm...
              </div>
            ) : (
              <>
                <ProductSection title="🌿 Thuốc Đông Y Bán Chạy" products={bestSellers} onProductClick={handleSelectProduct} />
                <FeaturedCategories />
                <DongYSection />
                <ProductSection title="🍃 Thảo Dược & Cao Dược Liệu" products={supplements} onProductClick={handleSelectProduct} />
              </>
            )}
            <HealthVideoSection onNavigate={handleNavigate} />
            <Brands />
            <HealthNews />
            <StorePromoBar />
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
