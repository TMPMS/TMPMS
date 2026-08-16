import { API_URL, apiFetch, getAuthHeaders, requestWithAuth } from './core';

export async function loginUser(username, password) {
  const res = await apiFetch(`${API_URL}/auth/login`, {
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
  const res = await apiFetch(`${API_URL}/auth/otp-login`, {
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


export async function googleLogin(idToken) {
  const res = await apiFetch(`${API_URL}/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Đăng nhập Google thất bại');
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

// Xác nhận phiên đăng nhập hiện tại (dựa trên httpOnly cookie) và lấy thông tin hồ sơ mới nhất.

export async function getMyProfile() {
  const res = await requestWithAuth(`${API_URL}/auth/me`);
  if (!res.ok) throw new Error('Chưa đăng nhập hoặc phiên đã hết hạn');
  return res.json();
}

// Thu hồi refresh token phía server và xoá cookie access_token/refresh_token.

export async function logoutUser() {
  try {
    await apiFetch(`${API_URL}/auth/revoke-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    // Đăng xuất ở client vẫn tiếp tục dù request tới server thất bại (mất mạng, v.v.)
  }
}


export async function sendOtp(phone) {
  const res = await apiFetch(`${API_URL}/auth/send-otp`, {
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


export async function requestPasswordReset(email) {
  const res = await apiFetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(body || 'Không thể gửi mã xác nhận');
  return body ? JSON.parse(body) : {};
}


export async function resetPassword(email, code, newPassword, confirmPassword) {
  const res = await apiFetch(`${API_URL}/auth/reset-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword, confirmPassword }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(body || 'Không thể đặt lại mật khẩu');
  return body ? JSON.parse(body) : {};
}


export async function changePassword(currentPassword, newPassword) {
  const res = await requestWithAuth(`${API_URL}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(body || 'Không thể đổi mật khẩu');
  return body ? JSON.parse(body) : {};
}


export async function registerUser(username, email, password, phone) {
  const res = await apiFetch(`${API_URL}/auth/register`, {
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

// User & Role Management APIs

export async function fetchUsers() {
  const res = await requestWithAuth(`${API_URL}/users/list`, {
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


export async function updateUserRole(userId, roleInput) {
  let roleName = roleInput;
  if (typeof roleInput === 'number') {
    const roleMap = { 1: "Admin", 2: "User", 3: "Pharmacy", 4: "Staff", 5: "Doctor", 6: "Accountant", 7: "Warehouse" };
    roleName = roleMap[roleInput] || "User";
  }

  const res = await requestWithAuth(`${API_URL}/users/assign-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: userId, roleName: roleName }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật quyền người dùng');
  return res.json();
}


export async function toggleUserStatus(userId, isActive) {
  const endpoint = isActive ? `/users/unlock/${userId}` : `/users/lock/${userId}`;
  const res = await requestWithAuth(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái người dùng');
  return res.json();
}

export async function deleteUser(userId) {
  const res = await requestWithAuth(`${API_URL}/users/delete/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let message = 'Không thể xóa người dùng';
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch (e) {
      // response không có JSON body hợp lệ, dùng message mặc định
    }
    throw new Error(message);
  }
  return res.json();
}

// ============ PROFILE APIs ============

function getUserIdHeader() {
  // Identity comes from the JWT (ClaimTypes.NameIdentifier); no client-supplied header is trusted.
  return getAuthHeaders();
}


export async function fetchMyProfile() {
  const res = await requestWithAuth(`${API_URL}/profile/me`, { headers: getUserIdHeader() });
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

  const res = await requestWithAuth(`${API_URL}/profile/me`, {
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


