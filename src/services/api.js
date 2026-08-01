const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders() {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed && parsed.token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsed.token}`
        };
      }
    }
  } catch (e) {
    console.error('Error reading auth token', e);
  }
  return { 'Content-Type': 'application/json' };
}

export async function createDiagnosis(diagnosisData) {
  const res = await fetch(`${API_URL}/api/Diagnosis`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(diagnosisData)
  });
  if (!res.ok) throw new Error('Không thể lưu hồ sơ chẩn đoán');
  return res.json();
}

export async function fetchPatientDiagnoses(patientId) {
  const res = await fetch(`${API_URL}/api/Diagnosis/patient/${patientId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử chẩn đoán');
  return res.json();
}

export async function fetchDiagnosisQuestions() {
  const res = await fetch(`${API_URL}/api/Diagnosis/questions`);
  if (!res.ok) throw new Error('Không thể tải bộ câu hỏi chẩn đoán');
  return res.json();
}

export async function classifyDiagnosis(answers) {
  const res = await fetch(`${API_URL}/api/Diagnosis/classify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers })
  });
  if (!res.ok) throw new Error('Không thể phân tích chẩn đoán');
  return res.json();
}

export async function fetchInvoiceByOrder(orderId) {
  try {
    const res = await fetch(`${API_URL}/api/Invoice/order/${orderId}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const genRes = await fetch(`${API_URL}/api/Invoice/generate/${orderId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!genRes.ok) throw new Error('Không thể tải hoặc tạo hóa đơn GTGT');
  return genRes.json();
}

export async function fetchReportDashboard() {
  const res = await fetch(`${API_URL}/api/Report/dashboard`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải báo cáo doanh thu & thống kê');
  return res.json();
}

export async function fetchReportTopSelling(from, to, top = 10) {
  const res = await fetch(`${API_URL}/api/Report/top-selling?from=${from}&to=${to}&top=${top}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách bán chạy');
  return res.json();
}

export async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (res.ok) return await res.json();
  } catch (e) {}
  try {
    const res = await fetch(`${API_URL}/api/herbalmedicine`);
    if (res.ok) {
      const data = await res.json();
      return [{ id: 1, name: 'Thuốc Đông Y' }, { id: 2, name: 'Dược Liệu Thảo Dược' }];
    }
  } catch (e) {}
  return [{ id: 1, name: 'Thuốc Đông Y' }, { id: 2, name: 'Dược Liệu Thảo Dược' }];
}

export async function fetchMedicines(categoryId = null, search = '', limit = null, offset = null) {
  let url = `${API_URL}/medicines`;
  const params = [];

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

  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải danh sách dược phẩm');
  const data = await res.json();

  return (Array.isArray(data) ? data : []).map(m => {
    const imgUrl = m.imageUrl || m.image_url || m.ImageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500';
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
      requires_prescription: m.requires_prescription !== undefined ? m.requires_prescription : (m.requiresPrescription !== undefined ? m.requiresPrescription : m.RequiresPrescription),
      requiresPrescription: m.requiresPrescription !== undefined ? m.requiresPrescription : (m.requires_prescription !== undefined ? m.requires_prescription : m.RequiresPrescription)
    };
  });
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: username, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Đăng nhập thất bại');
  }
  const data = await res.json();
  let role_id = 2; // Default to Customer/User
  if (data.roles.includes("Admin")) role_id = 1;
  else if (data.roles.includes("Pharmacy")) role_id = 3;

  return {
    id: data.userId,
    username: data.userName,
    email: data.email,
    role_id: role_id,
    token: data.accessToken,
    refreshToken: data.refreshToken
  };
}

export async function loginUserByOtp(phone, code) {
  const res = await fetch(`${API_URL}/api/auth/otp-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Đăng nhập OTP thất bại');
  }
  const data = await res.json();
  let role_id = 2; // Default to Customer/User
  if (data.roles.includes("Admin")) role_id = 1;
  else if (data.roles.includes("Pharmacy")) role_id = 3;

  return {
    id: data.userId,
    username: data.userName,
    email: data.email,
    role_id: role_id,
    token: data.accessToken,
    refreshToken: data.refreshToken
  };
}

export async function sendOtp(phone) {
  const res = await fetch(`${API_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Không thể gửi mã OTP');
  }
  return true;
}

export async function registerUser(username, email, password, phone) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: username,
      email: email,
      password: password,
      confirmPassword: password,
      roleName: 'User',
      phone
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Đăng ký thất bại');
  }
  const data = await res.json();
  let role_id = 2; // Default to Customer/User
  if (data.roles.includes("Admin")) role_id = 1;
  else if (data.roles.includes("Pharmacy")) role_id = 3;

  return {
    id: data.userId,
    username: data.userName,
    email: data.email,
    role_id: role_id,
    token: data.accessToken,
    refreshToken: data.refreshToken
  };
}

export async function syncCart(userId, items) {
  const payload = items.map(item => ({
    medicine_id: item.medicineId || item.id, // Support different formats
    quantity: item.quantity,
  }));

  const res = await fetch(`${API_URL}/rpc/sync_cart_items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_user_id: userId,
      p_items: payload,
    }),
  });
  if (!res.ok) throw new Error('Không thể đồng bộ giỏ hàng');
}

export async function fetchCarts(userId) {
  const res = await fetch(`${API_URL}/carts?user_id=eq.${userId}`);
  if (!res.ok) throw new Error('Không thể tải danh sách giỏ hàng');
  return res.json();
}

export async function createCart(userId) {
  const res = await fetch(`${API_URL}/carts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Không thể tạo giỏ hàng mới');
  return res.json();
}

export async function fetchCartItems(cartId) {
  const res = await fetch(`${API_URL}/cart_items?cart_id=eq.${cartId}`);
  if (!res.ok) throw new Error('Không thể tải vật phẩm giỏ hàng');
  return res.json();
}

export async function addCartItem(cartId, medicineId, quantity) {
  const res = await fetch(`${API_URL}/cart_items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart_id: cartId,
      medicine_id: medicineId,
      quantity: quantity,
    }),
  });
  if (!res.ok) throw new Error('Không thể thêm vào giỏ hàng');
  return res.json();
}

export async function updateCartItem(itemId, quantity) {
  const res = await fetch(`${API_URL}/cart_items?id=eq.${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật số lượng');
  return res.json();
}

export async function deleteCartItem(itemId) {
  const res = await fetch(`${API_URL}/cart_items?id=eq.${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Không thể xóa vật phẩm');
  return res.json();
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.error || errorData.message || 'Không thể tạo đơn hàng');
    } catch (e) {
      throw new Error(e.message || 'Không thể tạo đơn hàng');
    }
  }
  return res.json();
}

export async function createPayOSPaymentLink(orderId, returnUrl, cancelUrl) {
  const res = await fetch(`${API_URL}/api/payos/payment-link`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId, returnUrl, cancelUrl }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể tạo link thanh toán PayOS');
  }
  return res.json();
}

export async function verifyPayOSPayment(orderId) {
  const res = await fetch(`${API_URL}/api/payos/verify/${orderId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể kiểm tra trạng thái thanh toán PayOS');
  }
  return res.json();
}

export async function calculateShipping(address, deliveryMethod) {
  const res = await fetch(`${API_URL}/api/shipping/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, deliveryMethod }),
  });
  if (!res.ok) throw new Error('Không thể tính phí vận chuyển');
  return res.json();
}

export async function fetchUserOrders(userId) {
  const res = await fetch(`${API_URL}/user-orders/${userId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử đơn hàng');
  return res.json();
}

export async function fetchAdminOrders() {
  const res = await fetch(`${API_URL}/admin/orders`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng admin');
  return res.json();
}

export async function updateOrderStatus(orderId, statusData) {
  const mappedData = {};
  if (statusData.status !== undefined) mappedData.status = statusData.status;
  if (statusData.payment_status !== undefined) mappedData.paymentStatus = statusData.payment_status;
  if (statusData.paymentStatus !== undefined) mappedData.paymentStatus = statusData.paymentStatus;

  const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn hàng');
  return res.json();
}

export async function addMedicine(medicineData) {
  const mappedData = {
    name: medicineData.name,
    description: medicineData.description,
    price: parseFloat(medicineData.price),
    stockQuantity: medicineData.stock_quantity !== undefined ? parseInt(medicineData.stock_quantity) : parseInt(medicineData.stockQuantity),
    unit: medicineData.unit,
    origin: medicineData.origin,
    packaging: medicineData.packaging,
    imageUrl: medicineData.image_url || medicineData.imageUrl,
    requiresPrescription: medicineData.requires_prescription !== undefined ? medicineData.requires_prescription : medicineData.requiresPrescription,
    categoryId: medicineData.category_id || medicineData.categoryId,
    supplierId: medicineData.supplier_id || medicineData.supplierId,
    manufactureDate: medicineData.manufacture_date || medicineData.manufactureDate,
    expiryDate: medicineData.expiry_date || medicineData.expiryDate,
  };

  const res = await fetch(`${API_URL}/medicines`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) throw new Error('Không thể thêm thuốc mới');
  return res.json();
}

export async function updateMedicine(medicineId, medicineData) {
  const mappedData = {
    name: medicineData.name,
    description: medicineData.description,
    price: parseFloat(medicineData.price),
    stock_quantity: parseInt(medicineData.stock_quantity || medicineData.stockQuantity),
    unit: medicineData.unit,
    origin: medicineData.origin,
    packaging: medicineData.packaging,
    image_url: medicineData.image_url || medicineData.imageUrl,
    requires_prescription: medicineData.requires_prescription !== undefined ? medicineData.requires_prescription : medicineData.requiresPrescription,
    category_id: medicineData.category_id || medicineData.categoryId,
    supplier_id: medicineData.supplier_id || medicineData.supplierId
  };

  const res = await fetch(`${API_URL}/medicines?id=eq.${medicineId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) throw new Error('Không thể cập nhật thông tin thuốc');
  return res.json();
}

export async function deleteMedicine(medicineId) {
  const res = await fetch(`${API_URL}/medicines?id=eq.${medicineId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xóa thuốc');
  return res.json();
}


export async function fetchSuppliers() {
  const res = await fetch(`${API_URL}/suppliers`);
  if (!res.ok) throw new Error('Không thể tải danh sách nhà cung cấp');
  return res.json();
}

export async function fetchWarehouses() {
  const res = await fetch(`${API_URL}/api/Warehouse`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách nhà kho');
  return res.json();
}

// User & Role Management APIs
export async function fetchUsers() {
  const res = await fetch(`${API_URL}/api/users/list`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(u => {
    let role_id = 2;
    const rName = u.roleName || u.RoleName || u.role || "User";
    if (rName === "Admin") role_id = 1;
    else if (rName === "Pharmacy") role_id = 3;
    return {
      id: u.id || u.Id,
      username: u.username || u.Username,
      email: u.email || u.Email,
      phone: u.phone || u.Phone,
      roleName: rName,
      role_id: role_id,
      is_active: u.isActive !== undefined ? u.isActive : u.IsActive,
      created_at: u.createdAt || u.CreatedAt
    };
  });
}

export async function updateUserRole(userId, roleId) {
  let roleName = "User";
  if (roleId === 1) roleName = "Admin";
  else if (roleId === 3) roleName = "Pharmacy";

  const res = await fetch(`${API_URL}/api/auth/assign-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: userId, roleName: roleName }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật quyền người dùng');
  return res.json();
}

export async function toggleUserStatus(userId, isActive) {
  const endpoint = isActive ? `/api/users/unlock/${userId}` : `/api/users/lock/${userId}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái người dùng');
  return res.json();
}

// Patient Management APIs
export async function fetchPatients() {
  const res = await fetch(`${API_URL}/api/patients`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách bệnh nhân');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id || p.Id,
    name: p.name || p.Name || p.username || p.Username || "Bệnh nhân",
    username: p.username || p.Username || "",
    email: p.email || p.Email || "",
    phone: p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || "",
    phoneNumber: p.phoneNumber || p.PhoneNumber || p.phone || p.Phone || "",
    gender: p.gender || p.Gender || "Nam",
    date_of_birth: p.dateOfBirth || p.DateOfBirth || null,
    dateOfBirth: p.dateOfBirth || p.DateOfBirth || null,
    address: p.address || p.Address || "",
    is_active: p.isActive !== undefined ? p.isActive : p.IsActive,
    created_at: p.createdAt || p.CreatedAt
  }));
}

export async function createPatient(patientData) {
  const payload = {
    name: patientData.name || patientData.Name,
    username: patientData.username || patientData.Username,
    email: patientData.email || patientData.Email,
    phone: patientData.phone || patientData.phoneNumber || patientData.Phone,
    phoneNumber: patientData.phone || patientData.phoneNumber || patientData.Phone,
    gender: patientData.gender || patientData.Gender || 'Nam',
    dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth,
    address: patientData.address || patientData.Address
  };
  const res = await fetch(`${API_URL}/api/patients`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể thêm bệnh nhân');
  return res.json();
}

export async function updatePatient(patientId, patientData) {
  const payload = {
    name: patientData.name || patientData.Name,
    username: patientData.username || patientData.Username,
    email: patientData.email || patientData.Email,
    phone: patientData.phone || patientData.phoneNumber || patientData.Phone,
    phoneNumber: patientData.phone || patientData.phoneNumber || patientData.Phone,
    gender: patientData.gender || patientData.Gender,
    dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth,
    address: patientData.address || patientData.Address,
    isActive: patientData.is_active !== undefined ? patientData.is_active : patientData.isActive
  };
  const res = await fetch(`${API_URL}/api/patients/${patientId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể cập nhật thông tin bệnh nhân');
  return res.json();
}

export async function deletePatient(patientId) {
  const res = await fetch(`${API_URL}/api/patients/${patientId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xóa bệnh nhân');
  return res.json();
}

// Appointment Management APIs
export async function fetchAppointments() {
  const res = await fetch(`${API_URL}/api/Appointment/all`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách lịch hẹn');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(a => ({
    id: a.id || a.Id,
    patientId: a.patientId || a.PatientId,
    patientName: a.patientName || a.PatientName || "Bệnh nhân",
    patientPhone: a.patientPhone || a.PatientPhone || "",
    doctorId: a.doctorId || a.DoctorId || 10,
    doctorName: a.doctorName || a.DoctorName || "Bác sĩ phụ trách",
    appointmentDate: a.appointmentDate || a.AppointmentDate,
    reason: a.reason || a.Reason || "",
    status: a.status || a.Status || "Scheduled",
    notes: a.notes || a.Notes || a.note || a.Note || "",
    created_at: a.createdAt || a.CreatedAt
  }));
}

export async function createAppointment(appointmentData) {
  const payload = {
    patientId: appointmentData.patientId || appointmentData.PatientId,
    staffId: appointmentData.doctorId || appointmentData.DoctorId || appointmentData.staffId,
    doctorId: appointmentData.doctorId || appointmentData.DoctorId || appointmentData.staffId,
    appointmentDate: appointmentData.appointmentDate || appointmentData.AppointmentDate,
    reason: appointmentData.reason || appointmentData.Reason || "",
    note: appointmentData.notes || appointmentData.Notes || appointmentData.note,
    notes: appointmentData.notes || appointmentData.Notes || appointmentData.note,
    status: appointmentData.status || appointmentData.Status || "Scheduled"
  };
  const res = await fetch(`${API_URL}/api/Appointment/book`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể tạo lịch hẹn');
  return res.json();
}

export async function updateAppointment(appointmentId, appointmentData) {
  const payload = {
    appointmentDate: appointmentData.appointmentDate || appointmentData.AppointmentDate,
    reason: appointmentData.reason || appointmentData.Reason || "",
    note: appointmentData.notes || appointmentData.Notes || appointmentData.note
  };
  const res = await fetch(`${API_URL}/api/Appointment/${appointmentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể cập nhật lịch hẹn');
  return res.json();
}

export async function deleteAppointment(appointmentId) {
  const res = await fetch(`${API_URL}/api/Appointment/${appointmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể xóa lịch hẹn');
  return res.json();
}

// Diagnosis & Prescription APIs
export async function fetchPrescriptions() {
  const res = await fetch(`${API_URL}/api/prescription`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách đơn thuốc');
  return res.json();
}

export async function createPrescription(prescriptionData) {
  const res = await fetch(`${API_URL}/api/prescription`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(prescriptionData),
  });
  if (!res.ok) throw new Error('Không thể tạo đơn thuốc');
  return res.json();
}

export async function updatePrescriptionStatus(prescriptionId, status) {
  const res = await fetch(`${API_URL}/api/prescription/${prescriptionId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn thuốc');
  return res.json();
}

// Product Review & Rating APIs
export async function fetchProductReviews(productId) {
  const res = await fetch(`${API_URL}/api/reviews/medicine/${productId}`);
  if (!res.ok) throw new Error('Không thể tải đánh giá sản phẩm');
  return res.json();
}

export async function checkReviewEligibility(productId, userId) {
  const res = await fetch(`${API_URL}/api/reviews/check-eligibility?medicineId=${productId}&userId=${userId}`);
  if (!res.ok) throw new Error('Không thể kiểm tra điều kiện đánh giá');
  const data = await res.json();
  return data.eligible;
}

export async function submitProductReview(rating, comment, productId, userId) {
  const res = await fetch(`${API_URL}/api/reviews`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      userId: userId,
      medicineId: productId,
      rating: rating,
      comment: comment
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Không thể gửi đánh giá');
  }
  return res.json();
}

// ============ VOUCHER APIs ============

export async function fetchVouchers() {
  const res = await fetch(`${API_URL}/vouchers`);
  if (!res.ok) throw new Error('Không thể tải voucher');
  return res.json();
}

export async function fetchAdminVouchers() {
  const res = await fetch(`${API_URL}/admin/vouchers`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải danh sách voucher');
  return res.json();
}

export async function createVoucher(data) {
  const res = await fetch(`${API_URL}/admin/vouchers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không thể tạo voucher');
  return res.json();
}

export async function updateVoucher(id, data) {
  const res = await fetch(`${API_URL}/admin/vouchers/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không thể cập nhật voucher');
  return res.json();
}

export async function deleteVoucher(id) {
  const res = await fetch(`${API_URL}/admin/vouchers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa voucher');
  return res.json();
}

export async function validateVoucher(code, orderTotal) {
  const res = await fetch(`${API_URL}/vouchers/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, order_total: orderTotal }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Voucher không hợp lệ');
  return data;
}

// ============ PROFILE APIs ============

function getUserIdHeader() {
  try {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      const headers = getAuthHeaders();
      // Wait, let's see: in user object in localStorage, it could have id or userId
      const uId = parsed.id || parsed.userId;
      if (uId) headers['X-User-Id'] = uId;
      return headers;
    }
  } catch {
    return getAuthHeaders();
  }
  return getAuthHeaders();
}

export async function fetchMyProfile() {
  const res = await fetch(`${API_URL}/api/profile/me`, { headers: getUserIdHeader() });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể tải hồ sơ');
  }
  return res.json();
}

export async function updateMyProfile(data) {
  const payload = {
    username: data.username,
    email: data.email,
    phone: data.phone || '',
    address: data.address || '',
    fullName: data.fullName || null,
    avatarUrl: data.avatarUrl || null,
    dateOfBirth: data.dateOfBirth || null,
    gender: data.gender || null,
  };

  const res = await fetch(`${API_URL}/api/profile/me`, {
    method: 'PATCH',
    headers: getUserIdHeader(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể cập nhật hồ sơ');
  }
  return res.json();
}

export async function askAiChatbot(messageText) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: messageText }),
  });
  if (!res.ok) throw new Error('Không thể kết nối trợ lý AI');
  return res.json();
}

// Customer-facing Patient APIs
export async function fetchUserAppointments() {
  const res = await fetch(`${API_URL}/api/Appointment/my-appointments`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch hẹn cá nhân');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(a => ({
    id: a.id || a.Id,
    patientName: a.patientName || a.PatientName || "Bệnh nhân",
    doctorName: a.staffName || a.StaffName || a.doctorName || "Bác sĩ phụ trách",
    appointmentDate: a.appointmentDate || a.AppointmentDate,
    reason: a.reason || a.Reason || "",
    status: a.status || a.Status || "Scheduled",
    notes: a.note || a.Note || ""
  }));
}

export async function fetchUserPrescriptions(userId) {
  const endpoint = userId ? `${API_URL}/api/prescription/user/${userId}` : `${API_URL}/api/prescription`;
  const res = await fetch(endpoint, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(p => ({
    id: p.id || p.Id,
    userId: p.userId || p.UserId,
    userName: p.userName || p.UserName || "",
    doctorName: p.doctorName || p.DoctorName || "Thầy thuốc Đông Y",
    hospital: p.hospital || p.Hospital || "Phòng khám Đông Y",
    prescriptionDate: p.prescriptionDate || p.PrescriptionDate,
    status: p.status || p.Status || "Active",
    items: p.items || p.Items || []
  }));
}
