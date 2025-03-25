// @next
import dynamic from 'next/dynamic';

// @project
const AuthOtpVerification = dynamic(() => import('@/views/auth/otp-verification'));

/***************************  AUTH - OTP VERIFICATION  ***************************/

export default function OtpVerification() {
  return <AuthOtpVerification />;
}
