export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
} from './firebase';
export {
  signInWithGoogleIdToken,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOut,
  onAuthStateChanged,
  getAuthProvider,
} from './firebase/auth';
export {
  getUserDoc,
  createUserProfile,
  updateUserProfile,
  updateUserLastLogin,
  mapUserDocToAppUser,
} from './firebase/firestore';
export {
  requestPhoneOtp,
  verifyPhoneOtp,
  signInWithCustomToken,
  getRecaptchaVerifier,
} from './firebase/phone';
