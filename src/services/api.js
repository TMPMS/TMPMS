const API_URL = 'http://localhost:3000';

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
  const res = await fetch(`${API_URL}/rpc/login_user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_username: username, p_password: password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Đăng nhập thất bại');
  }
  return res.json();
}

export async function registerUser(username, email, password, phone) {
  const res = await fetch(`${API_URL}/rpc/register_user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_username: username,
      p_email: email,
      p_password: password,
      p_phone: phone,
      p_role_id: 2, // Default to Customer role
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Đăng ký thất bại');
  }
  return res.json();
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error('Không thể tạo đơn hàng');
  return res.json();
}

export async function fetchUserOrders(userId) {
  const res = await fetch(`${API_URL}/user-orders/${userId}`);
  if (!res.ok) throw new Error('Không thể tải lịch sử đơn hàng');
  return res.json();
}

export async function fetchAdminOrders() {
  const res = await fetch(`${API_URL}/admin/orders`);
  if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng admin');
  return res.json();
}

export async function updateOrderStatus(orderId, statusData) {
  const res = await fetch(`${API_URL}/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn hàng');
  return res.json();
}

export async function addMedicine(medicineData) {
  const res = await fetch(`${API_URL}/medicines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medicineData),
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
  const res = await fetch(`${API_URL}/users`);
  if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
  return res.json();
}

export async function updateUserRole(userId, roleId) {
  const res = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật quyền người dùng');
  return res.json();
}

export async function toggleUserStatus(userId, isActive) {
  const res = await fetch(`${API_URL}/users/${userId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${API_URL}/prescriptions`);
  if (!res.ok) throw new Error('Không thể tải danh sách đơn thuốc');
  return res.json();
}

export async function createPrescription(prescriptionData) {
  const res = await fetch(`${API_URL}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData),
  });
  if (!res.ok) throw new Error('Không thể tạo đơn thuốc');
  return res.json();
}

export async function updatePrescriptionStatus(prescriptionId, status) {
  const res = await fetch(`${API_URL}/prescriptions/${prescriptionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn thuốc');
  return res.json();
}


