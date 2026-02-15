import CryptoJS from 'crypto-js';

export const generateKey = (): string => {
  // Generate a random 16-character string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  const randomValues = new Uint32Array(16);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 16; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
};

export const encryptMessage = (message: string, key: string): string => {
  return CryptoJS.AES.encrypt(message, key).toString();
};

export const decryptMessage = (ciphertext: string, key: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || null;
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};