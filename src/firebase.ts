import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import localFirebaseConfig from '../firebase-applet-config.json';

type EchoTrackFirebaseConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function readEnvConfig(): EchoTrackFirebaseConfig | null {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    return null;
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined,
  };
}

function readLocalFallbackConfig(): EchoTrackFirebaseConfig | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const config = localFirebaseConfig as EchoTrackFirebaseConfig;
  const missing = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
    .filter((key) => !config[key as keyof EchoTrackFirebaseConfig]);

  return missing.length === 0 ? config : null;
}

function getFirebaseConfig(): EchoTrackFirebaseConfig {
  const envConfig = readEnvConfig();
  if (envConfig) return envConfig;

  const localConfig = readLocalFallbackConfig();
  if (localConfig) return localConfig;

  const missing = REQUIRED_ENV_KEYS.filter((key) => !import.meta.env[key]);
  throw new Error(
    `Missing Firebase frontend configuration. Set these Vite environment variables: ${missing.join(', ')}. ` +
      'For local AI Studio development only, firebase-applet-config.json may be used as a fallback.',
  );
}

const firebaseConfig = getFirebaseConfig();
const { firestoreDatabaseId, ...appConfig } = firebaseConfig;

const app = initializeApp(appConfig);
export const auth = getAuth(app);
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export async function signInWith(providerName: 'google' | 'microsoft' | 'apple') {
  const provider =
    providerName === 'google' ? googleProvider :
    providerName === 'microsoft' ? microsoftProvider :
    appleProvider;
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      idToken,
      email: result.user.email,
      name: result.user.displayName,
      photoURL: result.user.photoURL,
      provider: providerName,
    };
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      throw new Error(`${providerName} sign-in is not enabled. Use Google or email/password.`);
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in window closed.');
    }
    throw err;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
