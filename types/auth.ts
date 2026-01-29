export type AuthProvider = 'phone' | 'google';

export interface AuthUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: AuthProvider;
}

export interface PhoneAuthCredential {
  verificationId: string;
  code: string;
}
