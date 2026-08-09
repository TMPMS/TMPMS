import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Cấu hình Firebase project — không phải bí mật (Firebase web API key được thiết kế để
// public, giới hạn quyền truy cập qua Firebase Security Rules/domain restriction chứ
// không phải qua việc giữ kín key), nhưng đưa vào biến môi trường cho nhất quán với
// phần còn lại của app và dễ đổi project khác.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyAnCJlD11MYCNcYfX4xYuLWb3CocUccoQI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "tmpms-longchau.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "tmpms-longchau",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "tmpms-longchau.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "159926690260",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:159926690260:web:ca175fc4f50cad2c7ab641"
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
