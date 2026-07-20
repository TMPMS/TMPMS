import React, { useState, useMemo } from 'react';
import { MapPin, Phone, Clock, Search, ChevronRight, Navigation } from 'lucide-react';
import './StoreFinderView.css';

const provinces = [
  { id: 'hn', name: 'Hà Nội' },
  { id: 'hcm', name: 'TP. Hồ Chí Minh' },
  { id: 'dn', name: 'Đà Nẵng' }
];

const districtsMap = {
  hn: [
    { id: 'cg', name: 'Quận Cầu Giấy' },
    { id: 'dd', name: 'Quận Đống Đa' },
    { id: 'hk', name: 'Quận Hoàn Kiếm' }
  ],
  hcm: [
    { id: 'q1', name: 'Quận 1' },
    { id: 'q3', name: 'Quận 3' },
    { id: 'bt', name: 'Quận Bình Thạnh' }
  ],
  dn: [
    { id: 'hc', name: 'Quận Hải Châu' },
    { id: 'tk', name: 'Quận Thanh Khê' }
  ]
};

const storeList = [
  // Hà Nội
  { id: 1, provinceId: 'hn', districtId: 'cg', name: 'Nhà thuốc FPT Long Châu 102 Cầu Giấy', address: '102 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội', phone: '1800 6928', hours: '07:00 - 22:00' },
  { id: 2, provinceId: 'hn', districtId: 'cg', name: 'Nhà thuốc FPT Long Châu 24 Xuân Thủy', address: '24 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', phone: '1800 6928', hours: '07:00 - 22:00' },
  { id: 3, provinceId: 'hn', districtId: 'dd', name: 'Nhà thuốc FPT Long Châu 54 Chùa Bộc', address: '54 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội', phone: '1800 6928', hours: '06:30 - 22:30' },
  { id: 4, provinceId: 'hn', districtId: 'hk', name: 'Nhà thuốc FPT Long Châu 9 Hai Bà Trưng', address: '9 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm, Hà Nội', phone: '1800 6928', hours: '07:00 - 22:00' },
  
  // TP. HCM
  { id: 5, provinceId: 'hcm', districtId: 'q1', name: 'Nhà thuốc FPT Long Châu 12 Nguyễn Huệ', address: '12 Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh', phone: '1800 6928', hours: '24/7 (Mở cả đêm)' },
  { id: 6, provinceId: 'hcm', districtId: 'q1', name: 'Nhà thuốc FPT Long Châu 85 Trần Hưng Đạo', address: '85 Trần Hưng Đạo, Cô Giang, Quận 1, Hồ Chí Minh', phone: '1800 6928', hours: '07:00 - 22:00' },
  { id: 7, provinceId: 'hcm', districtId: 'q3', name: 'Nhà thuốc FPT Long Châu 222 Hai Bà Trưng', address: '222 Hai Bà Trưng, Võ Thị Sáu, Quận 3, Hồ Chí Minh', phone: '1800 6928', hours: '07:00 - 22:00' },
  { id: 8, provinceId: 'hcm', districtId: 'bt', name: 'Nhà thuốc FPT Long Châu 145 Bạch Đằng', address: '145 Bạch Đằng, Phường 15, Bình Thạnh, Hồ Chí Minh', phone: '1800 6928', hours: '07:00 - 22:00' },

  // Đà Nẵng
  { id: 9, provinceId: 'dn', districtId: 'hc', name: 'Nhà thuốc FPT Long Châu 52 Nguyễn Văn Linh', address: '52 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng', phone: '1800 6928', hours: '07:00 - 22:00' },
  { id: 10, provinceId: 'dn', districtId: 'tk', name: 'Nhà thuốc FPT Long Châu 112 Điện Biên Phủ', address: '112 Điện Biên Phủ, Chính Gián, Thanh Khê, Đà Nẵng', phone: '1800 6928', hours: '07:00 - 22:00' }
];

const StoreFinderView = ({ onBack }) => {
  const [selectedProvince, setSelectedProvince] = useState('hn');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedStoreId, setSelectedStoreId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle province switch - automatically set first district or 'all'
  const handleProvinceChange = (e) => {
    setSelectedProvince(e.target.value);
    setSelectedDistrict('all');
  };

  // Get active districts
  const districts = districtsMap[selectedProvince] || [];

  // Filter stores
  const filteredStores = useMemo(() => {
    return storeList.filter(store => {
      const matchProv = store.provinceId === selectedProvince;
      const matchDist = selectedDistrict === 'all' || store.districtId === selectedDistrict;
      const matchQuery = !searchQuery || 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        store.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchProv && matchDist && matchQuery;
    });
  }, [selectedProvince, selectedDistrict, searchQuery]);

  // Selected store details
  const activeStore = useMemo(() => {
    return storeList.find(s => s.id === selectedStoreId) || filteredStores[0] || storeList[0];
  }, [selectedStoreId, filteredStores]);

  // Set first store in filtered list as active if current active is no longer in filtered
  React.useEffect(() => {
    if (filteredStores.length > 0 && !filteredStores.some(s => s.id === selectedStoreId)) {
      setSelectedStoreId(filteredStores[0].id);
    }
  }, [filteredStores, selectedStoreId]);

  return (
    <div className="sf-container">
      {/* Breadcrumbs */}
      <div className="sf-breadcrumbs">
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="sf-bc-home">Trang chủ</a>
        <ChevronRight size={14} className="sf-bc-sep" />
        <span className="sf-bc-current">Tìm nhà thuốc</span>
      </div>

      <div className="sf-header">
        <MapPin size={28} className="sf-header-icon" />
        <div>
          <h2>Hệ Thống Cửa Hàng Nhà Thuốc</h2>
          <p>Tìm kiếm địa chỉ nhà thuốc gần bạn nhất để nhận tư vấn trực tiếp và mua thuốc chính hãng</p>
        </div>
      </div>

      <div className="sf-layout">
        {/* Left Side: Controls & Store List */}
        <div className="sf-sidebar-panel">
          <div className="sf-filters-box">
            {/* Search Input */}
            <div className="sf-search-input-wrap">
              <Search size={16} className="sf-search-icon" />
              <input 
                type="text" 
                placeholder="Nhập tên đường, quận huyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Select Dropdowns */}
            <div className="sf-select-row">
              <div className="sf-select-group">
                <label>Tỉnh / Thành phố</label>
                <select value={selectedProvince} onChange={handleProvinceChange}>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="sf-select-group">
                <label>Quận / Huyện</label>
                <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                  <option value="all">Tất cả quận/huyện</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Store List */}
          <div className="sf-store-list">
            <h4 className="sf-list-title">Kết quả tìm kiếm ({filteredStores.length} cửa hàng)</h4>
            {filteredStores.length === 0 ? (
              <div className="sf-empty-stores">
                <p>Không tìm thấy nhà thuốc nào phù hợp với bộ lọc hiện tại.</p>
              </div>
            ) : (
              filteredStores.map(store => (
                <div 
                  key={store.id} 
                  className={`sf-store-card ${activeStore.id === store.id ? 'active' : ''}`}
                  onClick={() => setSelectedStoreId(store.id)}
                >
                  <div className="sf-card-icon-wrap">
                    <MapPin size={18} />
                  </div>
                  <div className="sf-card-body">
                    <h5>{store.name}</h5>
                    <p className="address">{store.address}</p>
                    <div className="meta-row">
                      <span className="hours">⏰ {store.hours}</span>
                      <span className="phone">📞 {store.phone}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Map & Selected Store Info */}
        <div className="sf-map-panel">
          {activeStore && (
            <>
              {/* Active store info overlay */}
              <div className="sf-active-info">
                <h3>{activeStore.name}</h3>
                <div className="info-detail">
                  <MapPin size={16} className="text-teal" />
                  <span>{activeStore.address}</span>
                </div>
                <div className="info-meta-row">
                  <div className="info-detail">
                    <Clock size={16} className="text-teal" />
                    <span>Giờ mở cửa: {activeStore.hours}</span>
                  </div>
                  <div className="info-detail">
                    <Phone size={16} className="text-teal" />
                    <span>Liên hệ: {activeStore.phone}</span>
                  </div>
                </div>
              </div>

              {/* Embedded Interactive Map */}
              <div className="sf-map-iframe-wrap">
                <iframe 
                  title="Bản đồ nhà thuốc"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(activeStore.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  style={{ border: 0 }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreFinderView;
