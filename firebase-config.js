// Ganti nilai di bawah dengan konfigurasi aplikasi web Firebase milik tim.
// Firebase Console > Project settings > Your apps > SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_STORAGE_BUCKET",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith("ISI_"));
