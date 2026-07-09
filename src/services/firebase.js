import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// CẤU HÌNH FIREBASE PROJECT CỦA BẠN
// Đăng ký miễn phí tại: https://console.firebase.google.com/
// Tạo một Web App và sao chép cấu hình Firebase Config dán vào đây:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Kiểm tra xem người dùng đã cấu hình Firebase thực tế chưa
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "";

let app;
let auth;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.error("Lỗi khởi tạo Firebase:", error);
  }
}

export { auth };
