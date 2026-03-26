// Temporary mock OTP — bypasses Firebase, uses static OTP "1234"
// To re-enable Firebase: replace imports of this file back to firebase config

const STATIC_OTP = '123456';

export function sendMockOtp(phone) {
  console.log(`📱 Mock OTP sent to ${phone}: ${STATIC_OTP}`);
  return Promise.resolve({
    confirm: (code) => {
      if (code === STATIC_OTP) return Promise.resolve({ user: { uid: phone } });
      return Promise.reject({ code: 'auth/invalid-verification-code' });
    }
  });
}
