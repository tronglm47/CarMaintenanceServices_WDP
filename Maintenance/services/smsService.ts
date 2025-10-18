import { auth } from '@/config/firebase';
import { PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from 'firebase/auth';

export class SMSService {
  private static instance: SMSService;
  private verificationId: string | null = null;

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Gửi mã OTP đến số điện thoại
   * @param phoneNumber Số điện thoại (format: +84xxxxxxxxx)
   * @returns Promise<string> - Verification ID
   */
  async sendOTP(phoneNumber: string): Promise<string> {
    try {
      // Đảm bảo số điện thoại có format đúng
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Gửi OTP qua Firebase
      const provider = new PhoneAuthProvider(auth);
      
      // Tạo RecaptchaVerifier cho web (nếu cần)
      let recaptchaVerifier = null;
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
      }
      
      const verificationId = await provider.verifyPhoneNumber(formattedPhone, recaptchaVerifier);
      
      this.verificationId = verificationId;
      return verificationId;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // Xử lý các lỗi cụ thể
      if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Số điện thoại không hợp lệ');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau');
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('Đã vượt quá giới hạn SMS. Vui lòng thử lại sau');
      } else {
        throw new Error('Không thể gửi mã OTP. Vui lòng thử lại.');
      }
    }
  }

  /**
   * Xác thực mã OTP
   * @param otp Mã OTP 6 số
   * @returns Promise<boolean> - True nếu xác thực thành công
   */
  async verifyOTP(otp: string): Promise<boolean> {
    try {
      if (!this.verificationId) {
        throw new Error('Không tìm thấy verification ID');
      }

      const credential = PhoneAuthProvider.credential(this.verificationId, otp);
      await signInWithCredential(auth, credential);
      
      return true;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Mã OTP không đúng. Vui lòng thử lại.');
    }
  }

  /**
   * Format số điện thoại Việt Nam
   * @param phoneNumber Số điện thoại input
   * @returns Số điện thoại format chuẩn quốc tế
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Loại bỏ tất cả ký tự không phải số
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Nếu bắt đầu bằng 0, thay thế bằng +84
    if (cleaned.startsWith('0')) {
      return '+84' + cleaned.substring(1);
    }
    
    // Nếu bắt đầu bằng 84, thêm dấu +
    if (cleaned.startsWith('84')) {
      return '+' + cleaned;
    }
    
    // Nếu đã có dấu +, trả về như cũ
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Mặc định thêm +84
    return '+84' + cleaned;
  }

  /**
   * Gửi lại mã OTP
   * @param phoneNumber Số điện thoại
   * @returns Promise<string> - Verification ID mới
   */
  async resendOTP(phoneNumber: string): Promise<string> {
    return this.sendOTP(phoneNumber);
  }

  /**
   * Đăng xuất
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
      this.verificationId = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
    }
  }

  /**
   * Kiểm tra trạng thái đăng nhập
   * @returns Promise<boolean> - True nếu đã đăng nhập
   */
  async isLoggedIn(): Promise<boolean> {
    return auth.currentUser !== null;
  }

  /**
   * Lấy thông tin user hiện tại
   * @returns User object hoặc null
   */
  getCurrentUser() {
    return auth.currentUser;
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();
