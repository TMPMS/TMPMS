import { API_URL, apiFetch, getAuthHeaders, requestWithAuth, formatImageUrl } from './core';

export async function fetchInvoiceByOrder(orderId) {
  try {
    const res = await requestWithAuth(`${API_URL}/Invoice/order/${orderId}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const genRes = await requestWithAuth(`${API_URL}/Invoice/generate/${orderId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!genRes.ok) throw new Error('Không thể tải hoặc tạo hóa đơn GTGT');
  return genRes.json();
}


export async function syncCart(userId, items) {
  const payload = items.map(item => ({
    medicine_id: item.medicineId || item.id, // Support different formats
    quantity: item.quantity,
  }));

  const res = await apiFetch(`${API_URL}/rpc/sync_cart_items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      p_user_id: userId,
      p_items: payload,
    }),
  });
  if (!res.ok) throw new Error('Không thể đồng bộ giỏ hàng');
}


export async function fetchCarts(userId) {
  const res = await apiFetch(`${API_URL}/carts?user_id=eq.${userId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải danh sách giỏ hàng');
  return res.json();
}


export async function createCart(userId) {
  const res = await apiFetch(`${API_URL}/carts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Không thể tạo giỏ hàng mới');
  return res.json();
}


export async function fetchCartItems(cartId) {
  const res = await apiFetch(`${API_URL}/cart_items?cart_id=eq.${cartId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải vật phẩm giỏ hàng');
  return res.json();
}


export async function addCartItem(cartId, medicineId, quantity) {
  const res = await apiFetch(`${API_URL}/cart_items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      cart_id: cartId,
      medicine_id: medicineId,
      quantity: quantity,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.error || 'Không thể thêm vào giỏ hàng');
    err.responseStatus = res.status;
    throw err;
  }
  return res.json();
}


export async function updateCartItem(itemId, quantity) {
  const res = await apiFetch(`${API_URL}/cart_items?id=eq.${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const err = new Error('Không thể cập nhật số lượng');
    err.responseStatus = res.status;
    throw err;
  }
  return res.json();
}


export async function deleteCartItem(itemId) {
  const res = await apiFetch(`${API_URL}/cart_items?id=eq.${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = new Error('Không thể xóa vật phẩm');
    err.responseStatus = res.status;
    throw err;
  }
  return res.json();
}


export async function createOrder(orderData) {
  const res = await requestWithAuth(`${API_URL}/orders`, {
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
  const res = await requestWithAuth(`${API_URL}/payos/payment-link`, {
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
  const res = await requestWithAuth(`${API_URL}/payos/verify/${orderId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể kiểm tra trạng thái thanh toán PayOS');
  }
  return res.json();
}


export async function demoPayOSPayment(orderId) {
  const res = await requestWithAuth(`${API_URL}/payos/demo-pay/${orderId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể thực hiện giả lập thanh toán PayOS');
  }
  return res.json();
}


export async function calculateShipping(address, deliveryMethod) {
  const res = await apiFetch(`${API_URL}/shipping/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, deliveryMethod }),
  });
  if (!res.ok) throw new Error('Không thể tính phí vận chuyển');
  return res.json();
}


export async function fetchUserOrders(userId) {
  const res = await requestWithAuth(`${API_URL}/user-orders/${userId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử đơn hàng');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeOrder);
}


export async function fetchAdminOrders() {
  const res = await requestWithAuth(`${API_URL}/admin/orders`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng admin');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeOrder);
}


function normalizeOrder(o) {
  const items = (o.items || o.Items || []).map(it => ({
    id: it.id || it.Id,
    orderId: it.orderId || it.OrderId,
    medicineId: it.medicineId || it.MedicineId,
    quantity: it.quantity || it.Quantity,
    price: it.price !== undefined ? it.price : (it.Price !== undefined ? it.Price : null),
    medicine_name: it.medicineName || it.MedicineName,
    medicineName: it.medicineName || it.MedicineName,
    image_url: formatImageUrl(it.imageUrl || it.ImageUrl),
    imageUrl: formatImageUrl(it.imageUrl || it.ImageUrl)
  }));
  return {
    id: o.id || o.Id,
    userId: o.userId || o.UserId,
    username: o.username || o.Username || "",
    email: o.email || o.Email || "",
    total_amount: o.total_amount !== undefined ? o.total_amount : (o.totalAmount !== undefined ? o.totalAmount : o.TotalAmount),
    totalAmount: o.total_amount !== undefined ? o.total_amount : (o.totalAmount !== undefined ? o.totalAmount : o.TotalAmount),
    status: o.status || o.Status || "Pending",
    payment_status: o.payment_status || o.paymentStatus || o.PaymentStatus || "Unpaid",
    paymentStatus: o.payment_status || o.paymentStatus || o.PaymentStatus || "Unpaid",
    paymentId: o.paymentId !== undefined ? o.paymentId : (o.PaymentId !== undefined ? o.PaymentId : null),
    paymentMethod: o.paymentMethod || o.PaymentMethod || "",
    paymentStatusDetail: o.paymentStatusDetail || o.PaymentStatusDetail || "",
    shippingAddress: o.shippingAddress || o.ShippingAddress || "",
    deliveryMethod: o.deliveryMethod || o.DeliveryMethod || "",
    shippingFee: o.shippingFee !== undefined ? o.shippingFee : o.ShippingFee,
    created_at: o.created_at || o.createdAt || o.CreatedAt,
    createdAt: o.created_at || o.createdAt || o.CreatedAt,
    returnReason: o.returnReason || o.ReturnReason || "",
    items: items
  };
}


export async function updateOrderStatus(orderId, statusData) {
  const mappedData = {};
  if (statusData.status !== undefined) mappedData.status = statusData.status;
  if (statusData.payment_status !== undefined) mappedData.paymentStatus = statusData.payment_status;
  if (statusData.paymentStatus !== undefined) mappedData.paymentStatus = statusData.paymentStatus;

  const res = await requestWithAuth(`${API_URL}/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(mappedData),
  });
  if (!res.ok) {
    const err = new Error(res.status === 403 ? 'Tài khoản không có quyền cập nhật trạng thái đơn hàng.' : 'Không thể cập nhật trạng thái đơn hàng');
    err.responseStatus = res.status;
    throw err;
  }
  return res.json();
}


export async function cancelOrder(orderId) {
  const res = await requestWithAuth(`${API_URL}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Không thể hủy đơn hàng');
  }
  return res.json();
}


export async function requestOrderReturn(orderId, reason) {
  const res = await requestWithAuth(`${API_URL}/orders/${orderId}/return-request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Không thể gửi yêu cầu trả hàng');
  }
  return res.json();
}


export async function updatePaymentStatus(paymentId, status, transactionCode = '') {
  const res = await requestWithAuth(`${API_URL}/Payment/${paymentId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, transactionCode }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Không thể cập nhật trạng thái thanh toán');
  }
  return res.json();
}

// ============ VOUCHER APIs ============

export async function fetchVouchers() {
  const res = await apiFetch(`${API_URL}/vouchers`);
  if (!res.ok) throw new Error('Không thể tải voucher');
  return res.json();
}


export async function fetchAdminVouchers() {
  const res = await requestWithAuth(`${API_URL}/admin/vouchers`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải danh sách voucher');
  return res.json();
}


export async function createVoucher(data) {
  const res = await requestWithAuth(`${API_URL}/admin/vouchers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không thể tạo voucher');
  return res.json();
}


export async function updateVoucher(id, data) {
  const res = await requestWithAuth(`${API_URL}/admin/vouchers/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không thể cập nhật voucher');
  return res.json();
}


export async function deleteVoucher(id) {
  const res = await requestWithAuth(`${API_URL}/admin/vouchers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa voucher');
  return res.json();
}


export async function fetchMyVouchers() {
  const res = await requestWithAuth(`${API_URL}/vouchers/mine`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải voucher của tôi');
  return res.json();
}

// type: 'product' | 'shipping'. shippingFee chỉ cần khi type === 'shipping' (để cap giảm giá không vượt phí ship).

export async function validateVoucher(code, orderTotal, type = 'product', shippingFee = 0) {
  const res = await requestWithAuth(`${API_URL}/vouchers/validate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ code, order_total: orderTotal, type, shippingFee }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Voucher không hợp lệ');
  return data;
}

// ============ VÒNG QUAY MAY MẮN APIs ============


export async function fetchWheelPrizes() {
  const res = await apiFetch(`${API_URL}/vouchers/wheel/prizes`);
  if (!res.ok) throw new Error('Không thể tải danh sách phần thưởng');
  return res.json();
}


export async function fetchWheelStatus() {
  const res = await requestWithAuth(`${API_URL}/vouchers/wheel/status`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Không thể tải trạng thái vòng quay');
  return res.json();
}


export async function spinWheel() {
  const res = await requestWithAuth(`${API_URL}/vouchers/wheel/spin`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Không thể quay lúc này');
  return data;
}


