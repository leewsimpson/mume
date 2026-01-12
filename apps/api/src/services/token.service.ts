import crypto from 'crypto';

/**
 * Token encryption service using AES-256-GCM
 * Encrypts and decrypts OAuth tokens for secure storage in the database
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * Encrypted token structure returned after encryption
 */
export interface EncryptedToken {
  encryptedData: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  authTag: string; // Base64-encoded authentication tag
}

/**
 * Get encryption key from environment variable
 * @throws Error if TOKEN_ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  
  if (!keyHex) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Validate key format (should be 64 hex characters = 32 bytes)
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a token using AES-256-GCM
 * @param token - Plain text token to encrypt
 * @returns Encrypted token with IV and auth tag
 */
export function encryptToken(token: string): EncryptedToken {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encryptedData = cipher.update(token, 'utf8', 'base64');
  encryptedData += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts a token using AES-256-GCM
 * @param encryptedToken - Encrypted token structure with IV and auth tag
 * @returns Decrypted plain text token
 * @throws Error if decryption fails (invalid auth tag or corrupted data)
 */
export function decryptToken(encryptedToken: EncryptedToken): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedToken.iv, 'base64');
  const authTag = Buffer.from(encryptedToken.authTag, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decryptedData = decipher.update(encryptedToken.encryptedData, 'base64', 'utf8');
  decryptedData += decipher.final('utf8');
  
  return decryptedData;
}

/**
 * Validates that the encryption key is properly configured
 * @returns true if key is valid, false otherwise
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
