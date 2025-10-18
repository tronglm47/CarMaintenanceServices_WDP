// Mock SMS Service để test trước khi cấu hình Firebase
export class MockSMSService {
  private static instance: MockSMSService;
  private verificationId: string | null = null;

  public static getInstance(): MockSMSService {
    if (!MockSMSService.instance) {
      MockSMSService.instance = new MockSMSService();
    }
    return MockSMSService.instance;
  }

  /**
   * Mock gửi mã OTP đến số điện thoại
   * @param phoneNumber Số điện thoại (format: +84xxxxxxxxx)
   * @returns Promise<string> - Verification ID
   */
  async sendOTP(phoneNumber: string): Promise<string> {
    try {
      // Đảm bảo số điện thoại có format đúng
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      console.log('Mock: Sending OTP to', formattedPhone);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock verification ID
      const verificationId = 'mock_verification_' + Date.now();
      this.verificationId = verificationId;
      
      console.log('Mock: OTP sent successfully, verification ID:', verificationId);
      
      // Show mock OTP in console for testing
      const mockOTP = '123456';
      console.log('🔐 MOCK OTP CODE:', mockOTP, '(for testing only)');
      
      return verificationId;
    } catch (error: any) {
      console.error('Mock: Error sending OTP:', error);
      throw new Error('Không thể gửi mã OTP. Vui lòng thử lại.');
    }
  }

  /**
   * Mock xác thực mã OTP
   * @param otp Mã OTP 6 số
   * @returns Promise<boolean> - True nếu xác thực thành công
   */
  async verifyOTP(otp: string): Promise<boolean> {
    try {
      if (!this.verificationId) {
        throw new Error('Không tìm thấy verification ID');
      }

      console.log('Mock: Verifying OTP:', otp);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification - accept any 6-digit code
      if (otp.length === 6 && /^\d{6}$/.test(otp)) {
        console.log('Mock: OTP verified successfully');
        return true;
      } else {
        throw new Error('Mã OTP không đúng. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.error('Mock: Error verifying OTP:', error);
      throw new Error(error.message || 'Mã OTP không đúng. Vui lòng thử lại.');
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
   * Mock gửi lại mã OTP
   * @param phoneNumber Số điện thoại
   * @returns Promise<string> - Verification ID mới
   */
  async resendOTP(phoneNumber: string): Promise<string> {
    return this.sendOTP(phoneNumber);
  }

  /**
   * Mock đăng xuất
   */
  async signOut(): Promise<void> {
    try {
      console.log('Mock: Signing out');
      this.verificationId = null;
    } catch (error) {
      console.error('Mock: Error signing out:', error);
      throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
    }
  }

  /**
   * Mock kiểm tra trạng thái đăng nhập
   * @returns Promise<boolean> - True nếu đã đăng nhập
   */
  async isLoggedIn(): Promise<boolean> {
    // Mock: luôn trả về false để test login flow
    return false;
  }

  /**
   * Mock lấy thông tin user hiện tại
   * @returns User object hoặc null
   */
  getCurrentUser() {
    return null;
  }
}

// Export singleton instance
export const smsService = MockSMSService.getInstance();
