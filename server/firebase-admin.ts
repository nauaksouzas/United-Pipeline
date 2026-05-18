import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let initialized = false;

function initOnce() {
  if (initialized) return;
  initialized = true;

  const saPath = path.join(process.cwd(), 'server', 'firebase-service-account.json');
  if (fs.existsSync(saPath)) {
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    // Dynamically load project ID from config
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      admin.initializeApp({ projectId: config.projectId });
    } catch (e) {
      console.error("Failed to load firebase-applet-config.json in admin init", e);
      admin.initializeApp();
    }
  }
}

export async function verifyIdToken(idToken: string) {
  initOnce();
  const decoded = await admin.auth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: decoded.name ?? null,
    picture: decoded.picture ?? null,
    provider: decoded.firebase?.sign_in_provider ?? 'unknown',
  };
}
