# Firebase SMS Authentication Setup

## 1. Cấu hình file .env

Tạo file `.env` trong thư mục gốc của dự án với nội dung sau:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

**Lưu ý:** File `.env` sẽ được đọc trực tiếp bởi `process.env` trong config Firebase.

## 2. Cấu trúc file

```
Maintenance/
├── config/
│   └── firebase.ts          # Firebase configuration
├── services/
│   └── firebaseAuth.ts      # Firebase SMS authentication service
├── components/
│   ├── OTPAuth.tsx          # Component xác thực OTP
│   └── LoginExample.tsx     # Example sử dụng
├── app.config.js            # Expo config để đọc .env
└── .env                     # File cấu hình Firebase
```

## 3. Cách sử dụng

### Sử dụng component OTPAuth:

```tsx
import OTPAuth from './components/OTPAuth';

// Trong component của bạn
<OTPAuth 
  onAuthSuccess={(firebaseToken, user) => {
    console.log('Firebase token:', firebaseToken);
    console.log('User:', user);
    // Xử lý đăng nhập thành công
  }}
  onAuthError={(error) => {
    console.error('Auth error:', error);
    // Xử lý lỗi
  }}
/>
```

### Sử dụng service trực tiếp:

```tsx
import firebaseAuthService from './services/firebaseAuth';

// Gửi OTP
const result = await firebaseAuthService.sendOTP('0123456789');

// Xác thực OTP
const verifyResult = await firebaseAuthService.verifyOTP('123456');

// Lấy Firebase token
const token = await firebaseAuthService.getCurrentToken();

// Gửi token về backend (mẫu)
const backendResult = await firebaseAuthService.sendTokenToBackend(token);
```

## 4. Tính năng

- ✅ Gửi OTP qua SMS sử dụng `signInWithPhoneNumber`
- ✅ Xác thực OTP và đăng nhập Firebase
- ✅ Lấy Firebase ID token
- ✅ Hỗ trợ cả web (với Recaptcha) và mobile
- ✅ Xử lý lỗi chi tiết
- ✅ UI/UX thân thiện
- ✅ Mẫu function gửi token về backend

## 5. Lưu ý quan trọng

- **Cấu hình Firebase được lưu trong file .env để bảo mật**
- Firebase token có thể được gửi về backend để xác thực
- Component tự động xử lý Recaptcha cho web
- Hỗ trợ format số điện thoại Việt Nam (+84)
- File .env KHÔNG được commit lên GitHub

## 6. Flow hoạt động

1. User nhập số điện thoại
2. Gọi `signInWithPhoneNumber` để gửi OTP
3. User nhập mã OTP
4. Xác thực OTP với Firebase
5. Nhận Firebase ID token
6. Gửi token về backend (tùy chọn)
7. Backend trả về access token của app

## 7. Backend Integration (Mẫu)

Function `sendTokenToBackend` trong `firebaseAuth.ts` là mẫu để gửi Firebase token về backend:

```typescript
const backendResult = await firebaseAuthService.sendTokenToBackend(firebaseToken);
```

Thay thế URL trong function này bằng endpoint thực tế của bạn.
