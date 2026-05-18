import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

type ServiceAccount = admin.ServiceAccount & {
  project_id?: string;
  private_key?: string;
  client_email?: string;
};

function readJsonFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readServiceAccountFromBase64(): ServiceAccount | null {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) return null;

  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readLocalFirebaseProjectId(): string | undefined {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return undefined;

  try {
    const config = readJsonFile(configPath);
    return config.projectId;
  } catch (error) {
    console.warn('Failed to read firebase-applet-config.json for Firebase Admin fallback:', error);
    return undefined;
  }
}

function initOnce() {
  if (admin.apps.length > 0) return;

  const base64ServiceAccount = readServiceAccountFromBase64();
  if (base64ServiceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(base64ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || base64ServiceAccount.projectId || base64ServiceAccount.project_id,
    });
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || readLocalFirebaseProjectId();
  if (projectId) {
    admin.initializeApp({ projectId });
    return;
  }

  admin.initializeApp();
}

export async function verifyIdToken(idToken: string) {
  try {
    initOnce();
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
      provider: decoded.firebase?.sign_in_provider ?? 'unknown',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Firebase token verification failed: ${message}`);
  }
}
