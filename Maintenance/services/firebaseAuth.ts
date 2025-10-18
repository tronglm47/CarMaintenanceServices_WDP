import { 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  signInWithCredential,
  ConfirmationResult,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface SMSAuthResult {
  success: boolean;
  message: string;
  confirmationResult?: ConfirmationResult;
  user?: User;
  token?: string;
}

class FirebaseAuthService {
  private confirmationResult: ConfirmationResult | null = null;

  /**
   * Gửi OTP đến số điện thoại
   */
  async sendOTP(phoneNumber: string, recaptchaVerifier?: any): Promise<SMSAuthResult> {
    try {
      // Thêm country code nếu chưa có
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+84${phoneNumber.replace(/^0/, '')}`;

      console.log('Sending OTP to:', formattedPhoneNumber);

      // Gửi OTP sử dụng signInWithPhoneNumber
      this.confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        recaptchaVerifier || window // Cho web sử dụng window, cho mobile sẽ khác
      );

      return {
        success: true,
        message: 'OTP đã được gửi đến số điện thoại của bạn',
        confirmationResult: this.confirmationResult
      };
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      let errorMessage = 'Có lỗi xảy ra khi gửi OTP';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Số điện thoại không hợp lệ';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'Đã vượt quá giới hạn SMS. Vui lòng thử lại sau';
          break;
        case 'auth/missing-phone-number':
          errorMessage = 'Vui lòng nhập số điện thoại';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Xác thực OTP và đăng nhập
   */
  async verifyOTP(otpCode: string): Promise<SMSAuthResult> {
    try {
      if (!this.confirmationResult) {
        return {
          success: false,
          message: 'Vui lòng gửi OTP trước khi xác thực'
        };
      }

      console.log('Verifying OTP:', otpCode);

      // Xác thực OTP
      const result = await this.confirmationResult.confirm(otpCode);
      
      if (result.user) {
        // Lấy ID token để gửi về backend
        const idToken = await result.user.getIdToken();
        
        console.log('OTP verification successful for user:', result.user.uid);
        
        return {
          success: true,
          message: 'Xác thực thành công',
          user: result.user,
          token: idToken
        };
      } else {
        return {
          success: false,
          message: 'Xác thực thất bại'
        };
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      let errorMessage = 'Mã OTP không đúng';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Mã OTP không đúng';
          break;
        case 'auth/code-expired':
          errorMessage = 'Mã OTP đã hết hạn. Vui lòng gửi lại';
          break;
        case 'auth/credential-already-in-use':
          errorMessage = 'Tài khoản này đã được sử dụng';
          break;
        case 'auth/invalid-verification-id':
          errorMessage = 'Phiên xác thực đã hết hạn. Vui lòng gửi lại OTP';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Gửi token Firebase về backend để lấy access token (MẪU)
   */
  async sendTokenToBackend(firebaseToken: string): Promise<any> {
    try {
      console.log('Sending Firebase token to backend...');
      
      // MẪU: Gửi token về backend
      // Thay thế URL này bằng endpoint thực tế của bạn
      const response = await fetch('https://your-backend-api.com/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseToken: firebaseToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend response:', data);
      
      return {
        success: true,
        accessToken: data.accessToken,
        user: data.user,
        message: 'Đăng nhập thành công'
      };
    } catch (error: any) {
      console.error('Error sending token to backend:', error);
      
      // Trong trường hợp backend chưa sẵn sàng, trả về mẫu
      return {
        success: false,
        message: 'Backend chưa sẵn sàng. Sử dụng Firebase token tạm thời.',
        mockResponse: {
          accessToken: 'mock-access-token-' + Date.now(),
          user: {
            id: 'mock-user-id',
            phoneNumber: 'mock-phone'
          }
        }
      };
    }
  }

  /**
   * Đăng xuất
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
      this.confirmationResult = null;
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Lấy user hiện tại
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Lấy Firebase ID token hiện tại
   */
  async getCurrentToken(): Promise<string | null> {
    try {
      const user = this.getCurrentUser();
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting current token:', error);
      return null;
    }
  }
}

export default new FirebaseAuthService();
