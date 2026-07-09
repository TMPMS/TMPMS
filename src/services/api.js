const API_URL = 'http://localhost:3000';

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

export async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories`);
  if (!res.ok) throw new Error('Không thể tải danh mục');
  return res.json();
}

export async function fetchMedicines(categoryId = null, search = '') {
  let url = `${API_URL}/medicines`;
  const params = [];

  if (categoryId) {
    params.push(`category_id=eq.${categoryId}`);
  }
  if (search) {
    params.push(`name=ilike.*${encodeURIComponent(search)}*`);
  }

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải danh sách thuốc');
  return res.json();
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password: password }),
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
      phone: phone
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
  if (!res.ok) throw new Error('Không thể tạo đơn hàng');
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

export async function fetchSuppliers() {
  const res = await fetch(`${API_URL}/suppliers`);
  if (!res.ok) throw new Error('Không thể tải danh sách nhà cung cấp');
  return res.json();
}

export async function fetchWarehouses() {
  const res = await fetch(`${API_URL}/warehouses-info`);
  if (!res.ok) throw new Error('Không thể tải danh sách nhà kho');
  return res.json();
}

// User & Role Management APIs
export async function fetchUsers() {
  const res = await fetch(`${API_URL}/api/profile/users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
  const data = await res.json();
  return data.map(u => {
    let role_id = 2;
    if (u.role === "Admin") role_id = 1;
    else if (u.role === "Pharmacy") role_id = 3;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      roleName: u.role,
      role_id: role_id,
      is_active: u.isActive,
      created_at: u.createdAt
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
  const res = await fetch(`${API_URL}/api/profile/users/${userId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái người dùng');
  return res.json();
}

// Patient Management APIs
export async function fetchPatients() {
  const res = await fetch(`${API_URL}/patients`);
  if (!res.ok) throw new Error('Không thể tải danh sách bệnh nhân');
  return res.json();
}

export async function createPatient(patientData) {
  const res = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) throw new Error('Không thể thêm bệnh nhân');
  return res.json();
}

export async function updatePatient(patientId, patientData) {
  const res = await fetch(`${API_URL}/patients/${patientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) throw new Error('Không thể cập nhật thông tin bệnh nhân');
  return res.json();
}

export async function deletePatient(patientId) {
  const res = await fetch(`${API_URL}/patients/${patientId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Không thể xóa bệnh nhân');
  return res.json();
}

// Appointment Management APIs
export async function fetchAppointments() {
  const res = await fetch(`${API_URL}/appointments`);
  if (!res.ok) throw new Error('Không thể tải danh sách lịch hẹn');
  return res.json();
}

export async function createAppointment(appointmentData) {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData),
  });
  if (!res.ok) throw new Error('Không thể tạo lịch hẹn');
  return res.json();
}

export async function updateAppointment(appointmentId, appointmentData) {
  const res = await fetch(`${API_URL}/appointments/${appointmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData),
  });
  if (!res.ok) throw new Error('Không thể cập nhật lịch hẹn');
  return res.json();
}

export async function deleteAppointment(appointmentId) {
  const res = await fetch(`${API_URL}/appointments/${appointmentId}`, {
    method: 'DELETE',
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


