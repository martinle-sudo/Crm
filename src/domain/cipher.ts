// AES-GCM 256 + PBKDF2-SHA256 (250k iterations) password-based encryption.
// Output is a JSON envelope safe to store as plain text or in a file.

const SALT_BYTES = 16;
const IV_BYTES = 12;
const ITERATIONS = 250_000;
const ENVELOPE_VERSION = 1 as const;
const APP_TAG = 'cashflow' as const;

export interface CipherEnvelope {
  v: typeof ENVELOPE_VERSION;
  app: typeof APP_TAG;
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
  exportedAt: string;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJSON(
  payload: unknown,
  password: string,
): Promise<string> {
  if (!password) throw new Error('Mot de passe requis');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  );
  const envelope: CipherEnvelope = {
    v: ENVELOPE_VERSION,
    app: APP_TAG,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(ct),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(envelope, null, 2);
}

export async function decryptJSON(
  envelopeJson: string,
  password: string,
): Promise<unknown> {
  if (!password) throw new Error('Mot de passe requis');
  let envelope: CipherEnvelope;
  try {
    envelope = JSON.parse(envelopeJson);
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide");
  }
  if (envelope.v !== ENVELOPE_VERSION || envelope.app !== APP_TAG) {
    throw new Error("Ce fichier ne provient pas de Cashflow");
  }
  if (envelope.alg !== 'AES-GCM' || envelope.kdf !== 'PBKDF2-SHA256') {
    throw new Error('Algorithme inconnu');
  }
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ct = base64ToBytes(envelope.ct);
  const key = await deriveKey(password, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
  } catch {
    throw new Error('Mot de passe incorrect ou fichier corrompu');
  }
  try {
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('Données déchiffrées illisibles');
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
