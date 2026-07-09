import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// CẤU HÌNH FIREBASE PROJECT TỰ ĐỘNG THIẾT LẬP
const firebaseConfig = {
  apiKey: "AIzaSyAnCJlD11MYCNcYfX4xYuLWb3CocUccoQI",
  authDomain: "tmpms-longchau.firebaseapp.com",
  projectId: "tmpms-longchau",
  storageBucket: "tmpms-longchau.firebasestorage.app",
  messagingSenderId: "159926690260",
  appId: "1:159926690260:web:ca175fc4f50cad2c7ab641"
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
