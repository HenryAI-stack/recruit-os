// src/lib/auth.js
// Google SSO via Firebase Authentication (free tier, identity only – no Firebase DB used).

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
const provider = new GoogleAuthProvider()

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function logout() {
  await signOut(auth)
}

/**
 * Subscribe to auth state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 */
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback)
}
