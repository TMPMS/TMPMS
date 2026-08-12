import { API_URL, apiFetch, getAuthHeaders, requestWithAuth, formatImageUrl } from './core';

export async function fetchCategories() {
  try {
    const res = await apiFetch(`${API_URL}/categories`);
    if (res.ok) return await res.json();
  } catch (e) {}
  // /categories không truy cập được — trả về danh mục mặc định để UI vẫn hiển thị được thay vì trống trơn.
  return [{ id: 1, name: 'Thuốc Đông Y' }, { id: 2, name: 'Dược Liệu Thảo Dược' }];
}


function normalizeMedicine(m) {
  const rawUrl = m.imageUrl || m.image_url || m.ImageUrl || '';
  const imgUrl = formatImageUrl(rawUrl);
  return {
    ...m,
    id: m.id || m.Id,
    name: m.name || m.Name,
    price: m.price !== undefined ? m.price : (m.Price !== undefined ? m.Price : 0),
    old_price: m.old_price !== undefined ? m.old_price : m.OldPrice,
    oldPrice: m.oldPrice !== undefined ? m.oldPrice : (m.old_price !== undefined ? m.old_price : m.OldPrice),
    stock_quantity: m.stock_quantity !== undefined ? m.stock_quantity : (m.stockQuantity !== undefined ? m.stockQuantity : (m.StockQuantity || 0)),
    stockQuantity: m.stockQuantity !== undefined ? m.stockQuantity : (m.stock_quantity !== undefined ? m.stock_quantity : (m.StockQuantity || 0)),
    image_url: imgUrl,
    imageUrl: imgUrl,
    image: imgUrl,
    packaging: m.packaging || m.Packaging,
    unit: m.unit || m.Unit,
    barcode: m.barcode || m.Barcode || '',
    requires_prescription: m.requires_prescription !== undefined ? m.requires_prescription : (m.requiresPrescription !== undefined ? m.requiresPrescription : m.RequiresPrescription),
    requiresPrescription: m.requiresPrescription !== undefined ? m.requiresPrescription : (m.requires_prescription !== undefined ? m.requires_prescription : m.RequiresPrescription),
    rating: m.rating !== undefined ? m.rating : m.Rating
  };
}


export async function fetchMedicines(categoryId = null, search = '', limit = null, offset = null, includeRx = false) {
  let url = `${API_URL}/medicines`;
  const params = [];

  if (includeRx) {
    params.push('include_rx=true');
  }
  if (categoryId) {
    params.push(`category_id=eq.${categoryId}`);
  }
  if (search) {
    params.push(`name=ilike.*${encodeURIComponent(search)}*`);
  }
  if (limit !== null) {
    params.push(`limit=${limit}`);
  }
  if (offset !== null) {
    params.push(`offset=${offset}`);
  }

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Không thể tải danh sách dược phẩm');
  const data = await res.json();

  return (Array.isArray(data) ? data : []).map(normalizeMedicine);
}

// Gửi ảnh vỏ/hộp thuốc do khách hàng dán hoặc chọn ở ô tìm kiếm bằng hình ảnh để AI (Gemini Vision)
// đọc tên sản phẩm, dùng làm từ khoá tìm kiếm. Timeout 20s vì gọi AI có thể chậm hơn API thường.

export async function searchMedicineByImage(file) {
  const body = new FormData();
  body.append('file', file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await apiFetch(`${API_URL}/medicines/search-by-image`, {
      method: 'POST',
      body,
      signal: controller.signal
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Không thể nhận diện ảnh sản phẩm');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Quá thời gian nhận diện ảnh, vui lòng thử lại');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Tìm kiếm/lọc thuốc với đầy đủ tiêu chí (giá, xuất xứ, đơn vị, tồn kho, khuyến mãi,
// bộ phận dùng/công dụng Đông y) + phân trang/sort THẬT phía server.

export async function fetchMedicinesFiltered(filters = {}) {
  const {
    categoryId, search, minPrice, maxPrice, origin, unit, supplierId,
    inStock, hasDiscount, partUsed, effects, herbalOnly,
    includeRx = false, sort, page = 1, pageSize = 12,
  } = filters;

  const params = new URLSearchParams();
  if (includeRx) params.set('include_rx', 'true');
  if (categoryId) params.set('category_id', String(categoryId));
  if (supplierId) params.set('supplier_id', String(supplierId));
  if (search) params.set('name', search);
  if (origin) params.set('origin', origin);
  if (unit) params.set('unit', unit);
  if (minPrice != null) params.set('min_price', String(minPrice));
  if (maxPrice != null) params.set('max_price', String(maxPrice));
  if (inStock) params.set('in_stock', 'true');
  if (hasDiscount) params.set('has_discount', 'true');
  if (partUsed) params.set('part_used', partUsed);
  if (effects) params.set('effects', effects);
  if (herbalOnly) params.set('herbal_only', 'true');
  if (sort) params.set('sort', sort);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const res = await apiFetch(`${API_URL}/medicines?${params.toString()}`);
  if (!res.ok) throw new Error('Không thể tải danh sách dược phẩm');
  const data = await res.json();

  const items = Array.isArray(data) ? data : (data.items || []);
  return {
    items: items.map(normalizeMedicine),
    totalCount: Array.isArray(data) ? items.length : (data.totalCount ?? items.length),
  };
}


export async function fetchHerbalMedicineInfo(medicineId) {
  try {
    const res = await apiFetch(`${API_URL}/HerbalMedicine/${medicineId}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Phân tích AI (Gemini) quy kinh/huyệt vị — chỉ gọi khi sản phẩm không có dữ liệu tĩnh đã kiểm duyệt.
// Kết quả được backend cache theo medicineId nên gọi lại nhiều lần không tốn quota.

export async function fetchMeridianAnalysis(medicineId) {
  const res = await apiFetch(`${API_URL}/MeridianAnalysis/${medicineId}`);
  if (!res.ok) throw new Error('Không thể phân tích quy kinh bằng AI.');
  try {
    return await res.json();
  } catch {
    throw new Error('Không thể phân tích quy kinh bằng AI. Vui lòng thử lại sau.');
  }
}


export async function fetchHerbalFilterOptions() {
  try {
    const res = await apiFetch(`${API_URL}/medicines/herbal-filter-options`);
    if (!res.ok) return { partUsed: [], effects: [] };
    return await res.json();
  } catch {
    return { partUsed: [], effects: [] };
  }
}


export async function verifyMedicineImage(payload) {
  const res = await requestWithAuth(`${API_URL}/Medicines/verify-image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể thẩm định ảnh bằng AI');
  }
  return res.json();
}


export async function addMedicine(medicineData) {
  const mappedData = {
    name: medicineData.name,
    description: medicineData.description,
    price: parseFloat(medicineData.price),
    unit: medicineData.unit,
    origin: medicineData.origin,
    packaging: medicineData.packaging,
    barcode: medicineData.barcode || null,
    imageUrl: medicineData.image_url || medicineData.imageUrl,
    requiresPrescription: medicineData.requires_prescription !== undefined ? medicineData.requires_prescription : medicineData.requiresPrescription,
    categoryId: medicineData.category_id || medicineData.categoryId,
    supplierId: medicineData.supplier_id || medicineData.supplierId,
  };

  const res = await requestWithAuth(`${API_URL}/medicines`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể thêm thuốc mới');
  }
  return res.json();
}


export async function updateMedicine(medicineId, medicineData) {
  const mappedData = {
    name: medicineData.name,
    description: medicineData.description,
    price: parseFloat(medicineData.price),
    oldPrice: medicineData.old_price !== undefined ? parseFloat(medicineData.old_price) : (medicineData.oldPrice !== undefined ? parseFloat(medicineData.oldPrice) : null),
    unit: medicineData.unit,
    origin: medicineData.origin,
    packaging: medicineData.packaging,
    barcode: medicineData.barcode ?? null,
    imageUrl: medicineData.image_url || medicineData.imageUrl,
    requiresPrescription: medicineData.requires_prescription !== undefined ? medicineData.requires_prescription : medicineData.requiresPrescription,
    categoryId: parseInt(medicineData.category_id || medicineData.categoryId),
    supplierId: parseInt(medicineData.supplier_id || medicineData.supplierId)
  };

  const res = await requestWithAuth(`${API_URL}/medicines/${medicineId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể cập nhật thông tin thuốc');
  }
  return res.json();
}


// Tra cứu sản phẩm bằng mã vạch — dùng cho máy quét ở POS/kiểm kê. Trả về null nếu không tìm thấy
// (thay vì throw) để nơi gọi (form quét) tự quyết định hiển thị "không tìm thấy" ra sao.
export async function fetchMedicineByBarcode(barcode) {
  const res = await apiFetch(`${API_URL}/medicines/by-barcode/${encodeURIComponent(barcode)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Không thể tra cứu sản phẩm theo mã vạch');
  return normalizeMedicine(await res.json());
}


export async function deleteMedicine(medicineId) {
  const res = await requestWithAuth(`${API_URL}/medicines/${medicineId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể xóa thuốc');
  }
  return res.json();
}




