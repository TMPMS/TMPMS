import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

function deriveRoleId(roles) {
  if (roles?.includes('Admin')) return 1;
  if (roles?.includes('Pharmacy')) return 3;
  return 2;
}

// Access/refresh token không còn được lưu ở đây — chúng nằm trong httpOnly cookie do backend
// phát ra khi đăng nhập, JS không đọc/ghi được nữa (giảm rủi ro bị đánh cắp qua XSS). Những gì
// lưu ở localStorage chỉ là thông tin hiển thị không nhạy cảm, dùng để tránh nhấp nháy UI khi
// tải lại trang, không phải nguồn xác thực thật.
function persistUser(data) {
  const { token, accessToken, refreshToken, ...safe } = data;
  localStorage.setItem('user', JSON.stringify(safe));
}

function profileToUser(profile) {
  return {
    id: profile.id,
    username: profile.userName,
    email: profile.email,
    roles: profile.roles,
    role_id: deriveRoleId(profile.roles),
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }

    // Nguồn xác thực thật là cookie phiên trên server — xác nhận lại (và đồng bộ role/thông
    // tin mới nhất) thay vì chỉ tin dữ liệu cũ trong localStorage.
    (async () => {
      try {
        const profile = await api.getMyProfile();
        const data = profileToUser(profile);
        setUser(data);
        persistUser(data);
      } catch (e) {
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('user');
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  const login = async (username, password) => {
    const data = await api.loginUser(username, password);
    setUser(data);
    persistUser(data);
    return data;
  };

  const loginWithGoogle = async (idToken) => {
    const data = await api.googleLogin(idToken);
    setUser(data);
    persistUser(data);
    return data;
  };

  const loginWithOtp = async (phone, code) => {
    const data = await api.loginUserByOtp(phone, code);
    setUser(data);
    persistUser(data);
    return data;
  };

  const register = async (username, email, password, phone) => {
    const data = await api.registerUser(username, email, password, phone);
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    api.logoutUser();
  };

  // Cập nhật một phần thông tin user (vd cart_id sau khi tạo giỏ hàng) vào cả state React lẫn
  // localStorage — trước đây CartContext chỉ ghi thẳng vào localStorage, khiến state của
  // AuthContext (mà các trang khác như PatientPortal đọc qua useAuth().user) không đồng bộ.
  const updateUser = (patch) => {
    setUser(prev => {
      if (!prev) return prev;
      // Bỏ qua nếu giá trị không đổi — nếu không, mỗi lần gọi sẽ tạo object user mới (dù nội dung
      // giống hệt), khiến các useEffect phụ thuộc vào `user` (CartContext.loadCart,
      // PatientPortal.loadPatientData, ...) chạy lại vô hạn: loadCart gọi updateUser({cart_id}) mỗi
      // lần chạy -> user đổi reference -> loadCart (phụ thuộc [user]) bị tạo lại -> effect chạy lại
      // -> gọi updateUser lần nữa -> lặp mãi, gây nhấp nháy "Đang liên kết hồ sơ bệnh án...".
      const noChange = Object.keys(patch).every(k => prev[k] === patch[k]);
      if (noChange) return prev;
      const next = { ...prev, ...patch };
      persistUser(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle, loginWithOtp, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
};
