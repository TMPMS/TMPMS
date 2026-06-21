import React from 'react';
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

/* ============ MOCK DATA ============ */
const BEST_SELLERS = [
  { id: 101, name: 'Hoạt Huyết Dưỡng Não Traphaco (Hộp 5 vỉ x 20 viên)', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', price: 95000, oldPrice: 105000, unit: 'Hộp', discount: 10, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Hộp 100 viên' },
  { id: 102, name: 'Trà túi lọc Cà Gai Leo thải độc gan (Hộp 20 túi)', image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200&h=200&fit=crop', price: 45000, unit: 'Hộp', packaging: 'Hộp 20 túi lọc' },
  { id: 103, name: 'Kim Tiền Thảo trị sỏi thận OPC (Hộp 100 viên)', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&h=200&fit=crop', price: 65000, oldPrice: 72000, unit: 'Hộp', discount: 9, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Hộp 100 viên' },
  { id: 104, name: 'Cao Xương Khớp Bách Thảo Dược (Lọ 100g)', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&h=200&fit=crop', price: 180000, unit: 'Lọ', origin: 'Việt Nam', originColor: '#10b981', packaging: 'Lọ 100g' },
  { id: 105, name: 'Mật ong hoa rừng nguyên chất Tây Nguyên (Chai 500ml)', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&h=200&fit=crop', price: 120000, unit: 'Chai', packaging: 'Chai 500ml' },
  { id: 106, name: 'Bột gừng mật ong sấy thăng hoa (Hộp 15 gói)', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&h=200&fit=crop', price: 75000, oldPrice: 85000, unit: 'Hộp', discount: 11, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Hộp 15 gói' },
];

const SUPPLEMENTS = [
  { id: 201, name: 'Đông Trùng Hạ Thảo Militaris sấy (Lọ 10g)', image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=200&fit=crop', price: 290000, oldPrice: 320000, unit: 'Lọ', discount: 9, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Lọ 10g' },
  { id: 202, name: 'Cao Atiso Vân Anh Đà Lạt (Hộp 1kg)', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&h=200&fit=crop', price: 220000, oldPrice: 245000, unit: 'Hộp', discount: 10, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Hộp 1kg' },
  { id: 203, name: 'Nhân sâm lát tẩm mật ong Hàn Quốc (Hộp 10 gói)', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&h=200&fit=crop', price: 350000, oldPrice: 380000, unit: 'Hộp', discount: 8, origin: 'Hàn Quốc', originColor: '#1d4ed8', packaging: 'Hộp 200g' },
  { id: 204, name: 'Tinh chất hồng sâm KGC Everytime (Hộp 30 gói)', image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=200&h=200&fit=crop', price: 1450000, unit: 'Hộp', origin: 'Hàn Quốc', originColor: '#1d4ed8', packaging: 'Hộp 30 gói' },
  { id: 205, name: 'Viên nghệ mật ong sữa chúa Tenchi (Hộp 250g)', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&h=200&fit=crop', price: 160000, oldPrice: 180000, unit: 'Hộp', discount: 11, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Hộp 250g' },
  { id: 206, name: 'Dầu tràm nguyên chất Cung Đình Huế (Chai 50ml)', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&h=200&fit=crop', price: 125000, oldPrice: 140000, unit: 'Chai', discount: 10, origin: 'Việt Nam', originColor: '#10b981', packaging: 'Chai 50ml' },
];

function App() {
  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
      <Header />

      <main style={{ width: '1200px', maxWidth: '100%', margin: '0 auto', padding: '0 0 32px' }}>
        <HeroBanner />
        <QuickLinks />
        <FlashSale />
        <PromoBanners />
        <ProductSection title="Thuốc Đông Y bán chạy" products={BEST_SELLERS} />
        <FeaturedCategories />
        <ProductSection title="Thảo dược & Cao dược liệu" products={SUPPLEMENTS} />
        <Brands />
        <HealthNews />
        <StorePromoBar />
      </main>

      <FloatingActions />
      <Footer />
    </div>
  );
}

export default App;
