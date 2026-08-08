import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, ChevronRight, X, RotateCcw, AlertCircle, Search, Globe, Building2, PackageCheck, Leaf, Sparkles, PackageX, BadgePercent } from 'lucide-react';
import { ProductCard } from '../components/ProductSection';
import * as api from '../services/api';
import './CategoryListView.css';

const supplierNames = {
  1: 'Dược phẩm Traphaco',
  2: 'Dược phẩm OPC',
  3: 'Bách Thảo Dược',
  4: 'Sâm KGC Hàn Quốc',
  5: 'Dược phẩm Thái Minh',
  6: 'Dược Hậu Giang (DHG)',
  7: 'Pharmacity'
};

const PAGE_SIZE = 12;

// Chuẩn hoá dữ liệu thuốc từ API sang props mà ProductCard cần — giống mapProduct ở App.jsx,
// tách riêng vì CategoryListView giờ tự fetch thay vì nhận sẵn products qua prop.
const mapProduct = (p) => {
  const sid = p.supplierId !== undefined ? p.supplierId : (p.supplier_id !== undefined ? p.supplier_id : 1);
  return {
    id: p.id,
    name: p.name,
    image: p.image_url || p.imageUrl,
    price: parseFloat(p.price ?? 0),
    oldPrice: p.old_price ? parseFloat(p.old_price) : (p.oldPrice ? parseFloat(p.oldPrice) : null),
    unit: p.unit || 'Hộp',
    discount: p.Discount ?? p.discount,
    origin: p.origin || p.Origin || 'Việt Nam',
    packaging: p.packaging || 'Hộp',
    description: p.description || p.Description,
    supplierId: sid,
    supplier_id: sid,
    requiresPrescription: p.requiresPrescription,
    stockQuantity: p.stockQuantity ?? 99,
    rating: p.rating !== undefined ? p.rating : p.Rating,
  };
};

const priceRangeToMinMax = (range) => {
  switch (range) {
    case 'under100': return { minPrice: undefined, maxPrice: 100000 };
    case '100to300': return { minPrice: 100000, maxPrice: 300000 };
    case '300to500': return { minPrice: 300000, maxPrice: 500000 };
    case 'over500': return { minPrice: 500000, maxPrice: undefined };
    default: return { minPrice: undefined, maxPrice: undefined };
  }
};

const CategoryListView = ({ categoryId, categoryName, supplierId, supplierName, onProductClick, onBackToHome }) => {
  // Filter States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState(supplierId ? String(supplierId) : 'all');
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedPartUsed, setSelectedPartUsed] = useState('all');
  const [selectedEffect, setSelectedEffect] = useState('all');

  // Sort State
  const [sortBy, setSortBy] = useState('popular'); // popular | priceAsc | priceDesc | nameAsc | nameDesc

  // Server-side paginated results
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // Nguồn để tính các facet (xuất xứ / công ty / quy cách) — tải rộng hơn 1 lần cho mỗi category,
  // KHÔNG dùng làm danh sách hiển thị (danh sách hiển thị luôn qua fetchMedicinesFiltered có phân trang).
  const [facetSource, setFacetSource] = useState([]);
  const [herbalOptions, setHerbalOptions] = useState({ partUsed: [], effects: [] });
  const [suppliersMap, setSuppliersMap] = useState(supplierNames);

  // Reset pagination & filters when category (hoặc supplier, ở chế độ xem theo NCC) đổi
  useEffect(() => {
    setSearchKeyword('');
    setSelectedPriceRange('all');
    setSelectedPrescription('all');
    setSelectedSupplier(supplierId ? String(supplierId) : 'all');
    setSelectedOrigin('all');
    setSelectedUnit('all');
    setInStockOnly(false);
    setDiscountOnly(false);
    setSelectedPartUsed('all');
    setSelectedEffect('all');
    setSortBy('popular');
    setPage(1);
  }, [categoryId, supplierId]);

  useEffect(() => {
    api.fetchSuppliers().then(data => {
      if (Array.isArray(data)) {
        const map = { ...supplierNames };
        data.forEach(s => {
          const id = s.id || s.Id;
          const name = s.companyName || s.CompanyName || s.name;
          if (id && name) map[id] = name;
        });
        setSuppliersMap(map);
      }
    }).catch(() => {});
    api.fetchHerbalFilterOptions().then(setHerbalOptions).catch(() => {});
  }, []);

  // Tải nguồn facet (không phân trang, tối đa 500 sp) mỗi khi đổi category/supplier
  useEffect(() => {
    if (!categoryId && !supplierId) return;
    api.fetchMedicinesFiltered({ categoryId, supplierId, includeRx: true, page: 1, pageSize: 500 })
      .then(res => setFacetSource(res.items))
      .catch(() => setFacetSource([]));
  }, [categoryId, supplierId]);

  const availableOrigins = useMemo(() => {
    const map = new Map();
    facetSource.forEach(p => {
      const orig = (p.origin || 'Việt Nam').trim();
      map.set(orig, (map.get(orig) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [facetSource]);

  const availableSuppliers = useMemo(() => {
    const map = new Map();
    facetSource.forEach(p => {
      const sid = p.supplierId !== undefined ? p.supplierId : 1;
      const sname = suppliersMap[sid] || supplierNames[sid] || `Công ty #${sid}`;
      map.set(sid, { id: sid, name: sname, count: (map.get(sid)?.count || 0) + 1 });
    });
    return Array.from(map.values());
  }, [facetSource, suppliersMap]);

  const availableUnits = useMemo(() => {
    const map = new Map();
    facetSource.forEach(p => {
      const u = (p.unit || p.packaging || 'Hộp').trim();
      map.set(u, (map.get(u) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [facetSource]);

  const buildFilters = (pageNum) => {
    const { minPrice, maxPrice } = priceRangeToMinMax(selectedPriceRange);
    return {
      categoryId,
      search: searchKeyword.trim() || undefined,
      minPrice,
      maxPrice,
      origin: selectedOrigin !== 'all' ? selectedOrigin : undefined,
      unit: selectedUnit !== 'all' ? selectedUnit : undefined,
      supplierId: selectedSupplier !== 'all' ? selectedSupplier : undefined,
      includeRx: selectedPrescription !== 'nonprescription',
      inStock: inStockOnly || undefined,
      hasDiscount: discountOnly || undefined,
      partUsed: selectedPartUsed !== 'all' ? selectedPartUsed : undefined,
      effects: selectedEffect !== 'all' ? selectedEffect : undefined,
      sort: sortBy === 'popular' ? undefined : sortBy,
      page: pageNum,
      pageSize: PAGE_SIZE,
    };
  };

  // Fetch trang 1 mỗi khi bộ lọc/sắp xếp/category đổi (debounce 400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingList(true);
      api.fetchMedicinesFiltered(buildFilters(1))
        .then(res => {
          let list = res.items;
          // Lọc "yêu cầu kê đơn" phía client vì backend chỉ hỗ trợ include/exclude toàn bộ Rx
          if (selectedPrescription === 'prescription') list = list.filter(p => p.requiresPrescription === true);
          setItems(list);
          setTotalCount(res.totalCount);
          setPage(1);
        })
        .catch(() => { setItems([]); setTotalCount(0); })
        .finally(() => setLoadingList(false));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, supplierId, searchKeyword, selectedPriceRange, selectedOrigin, selectedUnit, selectedPrescription, selectedSupplier, inStockOnly, discountOnly, selectedPartUsed, selectedEffect, sortBy]);

  const pageTitle = categoryId ? categoryName : (supplierName ? `Sản phẩm từ ${supplierName}` : categoryName);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingList(true);
    try {
      const res = await api.fetchMedicinesFiltered(buildFilters(nextPage));
      let list = res.items;
      if (selectedPrescription === 'prescription') list = list.filter(p => p.requiresPrescription === true);
      setItems(prev => [...prev, ...list]);
      setTotalCount(res.totalCount);
      setPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  };

  const displayedProducts = useMemo(() => items.map(mapProduct), [items]);

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedPriceRange('all');
    setSelectedPrescription('all');
    setSelectedSupplier('all');
    setSelectedOrigin('all');
    setSelectedUnit('all');
    setInStockOnly(false);
    setDiscountOnly(false);
    setSelectedPartUsed('all');
    setSelectedEffect('all');
    setSortBy('popular');
  };

  const hasActiveFilters = searchKeyword || selectedPriceRange !== 'all' || selectedPrescription !== 'all' ||
    selectedSupplier !== 'all' || selectedOrigin !== 'all' || selectedUnit !== 'all' ||
    inStockOnly || discountOnly || selectedPartUsed !== 'all' || selectedEffect !== 'all';

  return (
    <div className="category-list-container">
      {/* Breadcrumbs */}
      <div className="cl-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="cl-breadcrumb-home">Trang chủ</a>
        <ChevronRight size={14} className="cl-breadcrumb-separator" />
        <span className="cl-breadcrumb-current">{pageTitle}</span>
      </div>

      {/* Header Info */}
      <div className="cl-header">
        <h2 className="cl-title">{pageTitle}</h2>
        <span className="cl-count">({totalCount} sản phẩm)</span>
      </div>

      {/* Main Content Layout */}
      <div className="cl-main-layout">
        {/* Sidebar Filters */}
        <aside className="cl-sidebar">
          <div className="cl-filter-card">
            <div className="cl-filter-header">
              <div className="cl-filter-title">
                <Filter size={16} />
                <span>Bộ lọc đa năng</span>
              </div>
              {hasActiveFilters && (
                <button className="cl-reset-btn" onClick={handleResetFilters}>
                  <RotateCcw size={12} />
                  <span>Xóa tất cả</span>
                </button>
              )}
            </div>

            {/* Filter Section: Search input inside sidebar */}
            <div className="cl-filter-section">
              <div className="cl-search-box">
                <Search size={14} className="cl-search-icon" />
                <input
                  type="text"
                  placeholder="Lọc từ khóa sản phẩm..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="cl-search-input"
                />
                {searchKeyword && (
                  <button onClick={() => setSearchKeyword('')} className="cl-clear-search-btn">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Section: Stock & Discount toggles */}
            <div className="cl-filter-section">
              <h4 className="cl-section-title">Tình trạng</h4>
              <div className="cl-toggle-group">
                <label className={`cl-toggle-chip ${inStockOnly ? 'active' : ''}`}>
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                  <PackageX size={13} /> Còn hàng
                </label>
                <label className={`cl-toggle-chip ${discountOnly ? 'active' : ''}`}>
                  <input type="checkbox" checked={discountOnly} onChange={(e) => setDiscountOnly(e.target.checked)} />
                  <BadgePercent size={13} /> Đang giảm giá
                </label>
              </div>
            </div>

            {/* Filter Section: Đông y — Bộ phận dùng */}
            {herbalOptions.partUsed?.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">
                  <Leaf size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Bộ phận dùng
                </h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedPartUsed === 'all' ? 'active' : ''}`}>
                    <input type="radio" name="partUsed" checked={selectedPartUsed === 'all'} onChange={() => setSelectedPartUsed('all')} />
                    <span>Tất cả</span>
                  </label>
                  {herbalOptions.partUsed.map(v => (
                    <label key={v} className={`cl-radio-label ${selectedPartUsed === v ? 'active' : ''}`}>
                      <input type="radio" name="partUsed" checked={selectedPartUsed === v} onChange={() => setSelectedPartUsed(v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section: Đông y — Công dụng */}
            {herbalOptions.effects?.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">
                  <Sparkles size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Công dụng
                </h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedEffect === 'all' ? 'active' : ''}`}>
                    <input type="radio" name="effect" checked={selectedEffect === 'all'} onChange={() => setSelectedEffect('all')} />
                    <span>Tất cả</span>
                  </label>
                  {herbalOptions.effects.map(v => (
                    <label key={v} className={`cl-radio-label ${selectedEffect === v ? 'active' : ''}`}>
                      <input type="radio" name="effect" checked={selectedEffect === v} onChange={() => setSelectedEffect(v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section: Origin (Xuất xứ) */}
            {availableOrigins.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">
                  <Globe size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Xuất xứ sản phẩm
                </h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedOrigin === 'all' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="origin"
                      checked={selectedOrigin === 'all'}
                      onChange={() => setSelectedOrigin('all')}
                    />
                    <span>Tất cả quốc gia</span>
                  </label>
                  {availableOrigins.map(item => (
                    <label key={item.name} className={`cl-radio-label ${selectedOrigin === item.name ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="origin"
                        checked={selectedOrigin === item.name}
                        onChange={() => setSelectedOrigin(item.name)}
                      />
                      <span>{item.name}</span>
                      <span className="cl-badge-count">({item.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section: Suppliers (Công ty / Nhà sản xuất) */}
            {availableSuppliers.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">
                  <Building2 size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Công ty / Nhà sản xuất
                </h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedSupplier === 'all' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="supplier"
                      checked={selectedSupplier === 'all'}
                      onChange={() => setSelectedSupplier('all')}
                    />
                    <span>Tất cả công ty</span>
                  </label>
                  {availableSuppliers.map(sup => (
                    <label key={sup.id} className={`cl-radio-label ${selectedSupplier === String(sup.id) ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="supplier"
                        checked={selectedSupplier === String(sup.id)}
                        onChange={() => setSelectedSupplier(String(sup.id))}
                      />
                      <span>{sup.name}</span>
                      <span className="cl-badge-count">({sup.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section: Price */}
            <div className="cl-filter-section">
              <h4 className="cl-section-title">Khoảng giá sản phẩm</h4>
              <div className="cl-radio-group">
                <label className={`cl-radio-label ${selectedPriceRange === 'all' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === 'all'}
                    onChange={() => setSelectedPriceRange('all')}
                  />
                  <span>Tất cả mức giá</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === 'under100' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === 'under100'}
                    onChange={() => setSelectedPriceRange('under100')}
                  />
                  <span>Dưới 100.000đ</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === '100to300' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === '100to300'}
                    onChange={() => setSelectedPriceRange('100to300')}
                  />
                  <span>100.000đ - 300.000đ</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === '300to500' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === '300to500'}
                    onChange={() => setSelectedPriceRange('300to500')}
                  />
                  <span>300.000đ - 500.000đ</span>
                </label>
                <label className={`cl-radio-label ${selectedPriceRange === 'over500' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === 'over500'}
                    onChange={() => setSelectedPriceRange('over500')}
                  />
                  <span>Trên 500.000đ</span>
                </label>
              </div>
            </div>

            {/* Filter Section: Unit / Packaging */}
            {availableUnits.length > 0 && (
              <div className="cl-filter-section">
                <h4 className="cl-section-title">
                  <PackageCheck size={13} style={{ marginRight: 4, display: 'inline' }} />
                  Đơn vị tính / Đóng gói
                </h4>
                <div className="cl-radio-group">
                  <label className={`cl-radio-label ${selectedUnit === 'all' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="unit"
                      checked={selectedUnit === 'all'}
                      onChange={() => setSelectedUnit('all')}
                    />
                    <span>Tất cả quy cách</span>
                  </label>
                  {availableUnits.map(item => (
                    <label key={item.name} className={`cl-radio-label ${selectedUnit === item.name ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="unit"
                        checked={selectedUnit === item.name}
                        onChange={() => setSelectedUnit(item.name)}
                      />
                      <span>{item.name}</span>
                      <span className="cl-badge-count">({item.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Section: Requires Prescription */}
            <div className="cl-filter-section">
              <h4 className="cl-section-title">Yêu cầu kê đơn</h4>
              <div className="cl-radio-group">
                <label className={`cl-radio-label ${selectedPrescription === 'all' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="prescription"
                    checked={selectedPrescription === 'all'}
                    onChange={() => setSelectedPrescription('all')}
                  />
                  <span>Tất cả sản phẩm</span>
                </label>
                <label className={`cl-radio-label ${selectedPrescription === 'prescription' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="prescription"
                    checked={selectedPrescription === 'prescription'}
                    onChange={() => setSelectedPrescription('prescription')}
                  />
                  <span className="badge-rx">Rx</span>
                  <span>Thuốc kê đơn</span>
                </label>
                <label className={`cl-radio-label ${selectedPrescription === 'nonprescription' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="prescription"
                    checked={selectedPrescription === 'nonprescription'}
                    onChange={() => setSelectedPrescription('nonprescription')}
                  />
                  <span>Không kê đơn</span>
                </label>
              </div>
            </div>

          </div>
        </aside>

        {/* Product Grid & Sort */}
        <main className="cl-content">
          {/* Active Filter Pills Bar */}
          {hasActiveFilters && (
            <div className="cl-active-filters-bar">
              <span className="cl-active-label">Đang lọc:</span>
              <div className="cl-pills-list">
                {searchKeyword && (
                  <span className="cl-pill">
                    Từ khóa: "{searchKeyword}"
                    <button onClick={() => setSearchKeyword('')}><X size={10} /></button>
                  </span>
                )}
                {selectedOrigin !== 'all' && (
                  <span className="cl-pill">
                    Xuất xứ: {selectedOrigin}
                    <button onClick={() => setSelectedOrigin('all')}><X size={10} /></button>
                  </span>
                )}
                {selectedSupplier !== 'all' && (
                  <span className="cl-pill">
                    Công ty: {suppliersMap[selectedSupplier] || supplierNames[selectedSupplier] || `NCC #${selectedSupplier}`}
                    <button onClick={() => setSelectedSupplier('all')}><X size={10} /></button>
                  </span>
                )}
                {selectedPriceRange !== 'all' && (
                  <span className="cl-pill">
                    Giá: {
                      selectedPriceRange === 'under100' ? 'Dưới 100K' :
                      selectedPriceRange === '100to300' ? '100K - 300K' :
                      selectedPriceRange === '300to500' ? '300K - 500K' : 'Trên 500K'
                    }
                    <button onClick={() => setSelectedPriceRange('all')}><X size={10} /></button>
                  </span>
                )}
                {selectedUnit !== 'all' && (
                  <span className="cl-pill">
                    Quy cách: {selectedUnit}
                    <button onClick={() => setSelectedUnit('all')}><X size={10} /></button>
                  </span>
                )}
                {selectedPartUsed !== 'all' && (
                  <span className="cl-pill">
                    Bộ phận dùng: {selectedPartUsed}
                    <button onClick={() => setSelectedPartUsed('all')}><X size={10} /></button>
                  </span>
                )}
                {selectedEffect !== 'all' && (
                  <span className="cl-pill">
                    Công dụng: {selectedEffect}
                    <button onClick={() => setSelectedEffect('all')}><X size={10} /></button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="cl-pill">
                    Còn hàng
                    <button onClick={() => setInStockOnly(false)}><X size={10} /></button>
                  </span>
                )}
                {discountOnly && (
                  <span className="cl-pill">
                    Đang giảm giá
                    <button onClick={() => setDiscountOnly(false)}><X size={10} /></button>
                  </span>
                )}
                {selectedPrescription !== 'all' && (
                  <span className="cl-pill">
                    Phân loại: {selectedPrescription === 'prescription' ? 'Thuốc kê đơn (Rx)' : 'Không kê đơn'}
                    <button onClick={() => setSelectedPrescription('all')}><X size={10} /></button>
                  </span>
                )}
                <button className="cl-clear-all-pill" onClick={handleResetFilters}>Xóa hết</button>
              </div>
            </div>
          )}

          {/* Sorting Toolbar */}
          <div className="cl-toolbar">
            <div className="cl-sort-wrap">
              <SlidersHorizontal size={14} className="cl-sort-icon" />
              <span className="cl-sort-label">Sắp xếp theo:</span>
              <div className="cl-sort-options">
                <button
                  className={`cl-sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
                  onClick={() => setSortBy('popular')}
                >
                  Bán chạy nhất
                </button>
                <button
                  className={`cl-sort-btn ${sortBy === 'priceAsc' ? 'active' : ''}`}
                  onClick={() => setSortBy('priceAsc')}
                >
                  Giá thấp - cao
                </button>
                <button
                  className={`cl-sort-btn ${sortBy === 'priceDesc' ? 'active' : ''}`}
                  onClick={() => setSortBy('priceDesc')}
                >
                  Giá cao - thấp
                </button>
                <button
                  className={`cl-sort-btn ${sortBy === 'nameAsc' ? 'active' : ''}`}
                  onClick={() => setSortBy('nameAsc')}
                >
                  Tên A-Z
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {!loadingList && displayedProducts.length === 0 ? (
            <div className="cl-empty-state">
              <AlertCircle size={48} className="cl-empty-icon" />
              <h3>Không tìm thấy sản phẩm phù hợp</h3>
              <p>Không có sản phẩm nào phù hợp với bộ lọc hiện tại của bạn. Vui lòng điều chỉnh hoặc xóa bộ lọc và thử lại.</p>
              <button className="cl-reset-btn-large" onClick={handleResetFilters}>
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="cl-grid">
                {displayedProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={onProductClick}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {displayedProducts.length < totalCount && (
                <div className="cl-load-more-wrap">
                  <button className="cl-load-more-btn" onClick={handleLoadMore} disabled={loadingList}>
                    {loadingList ? 'Đang tải...' : `Xem thêm ${totalCount - displayedProducts.length} sản phẩm`}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryListView;
