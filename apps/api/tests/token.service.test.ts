import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { encryptToken, decryptToken, validateEncryptionKey } from '../src/services/token.service.js';

describe('TokenService', () => {
  const originalEnv = process.env.TOKEN_ENCRYPTION_KEY;
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = testKey;
  });
  
  afterAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalEnv;
  });
  
  describe('encryptToken', () => {
    it('should encrypt a token successfully', () => {
      const token = 'ghp_test_token_1234567890';
      const encrypted = encryptToken(token);
      
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(typeof encrypted.encryptedData).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.authTag).toBe('string');
    });
    
    it('should produce different encrypted data for the same input (random IV)', () => {
      const token = 'ghp_test_token_1234567890';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);
      
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
    
    it('should encrypt special characters correctly', () => {
      const token = 'token_with_特殊字符_and_emoji_🔐';
      const encrypted = encryptToken(token);
      
      expect(encrypted.encryptedData).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
    });
    
    it('should throw error if TOKEN_ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      
      expect(() => encryptToken('test_token')).toThrow('TOKEN_ENCRYPTION_KEY environment variable is not set');
      
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    });
    
    it('should throw error if TOKEN_ENCRYPTION_KEY is invalid', () => {
      const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
      process.env.TOKEN_ENCRYPTION_KEY = 'invalid_key';
      
      expect(() => encryptToken('test_token')).toThrow('TOKEN_ENCRYPTION_KEY must be a 64-character hex string');
      
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    });
  });
  
  describe('decryptToken', () => {
    it('should decrypt an encrypted token successfully', () => {
      const originalToken = 'ghp_test_token_1234567890';
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(originalToken);
    });
    
    it('should decrypt tokens with special characters', () => {
      const originalToken = 'token_with_特殊字符_and_emoji_🔐';
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(originalToken);
    });
    
    it('should throw error if encrypted data is tampered with', () => {
      const token = 'ghp_test_token_1234567890';
      const encrypted = encryptToken(token);
      
      // Tamper with encrypted data by flipping first character
      const tamperedData = String.fromCharCode(encrypted.encryptedData.charCodeAt(0) ^ 1) + encrypted.encryptedData.slice(1);
      const tamperedEncrypted = {
        ...encrypted,
        encryptedData: tamperedData,
      };
      
      expect(() => decryptToken(tamperedEncrypted)).toThrow();
    });
    
    it('should throw error if auth tag is tampered with', () => {
      const token = 'ghp_test_token_1234567890';
      const encrypted = encryptToken(token);
      
      // Tamper with auth tag by flipping first character
      const tamperedTag = String.fromCharCode(encrypted.authTag.charCodeAt(0) ^ 1) + encrypted.authTag.slice(1);
      const tamperedEncrypted = {
        ...encrypted,
        authTag: tamperedTag,
      };
      
      expect(() => decryptToken(tamperedEncrypted)).toThrow();
    });
  });
  
  describe('validateEncryptionKey', () => {
    it('should return true for valid encryption key', () => {
      expect(validateEncryptionKey()).toBe(true);
    });
    
    it('should return false if TOKEN_ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      
      expect(validateEncryptionKey()).toBe(false);
      
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    });
    
    it('should return false if TOKEN_ENCRYPTION_KEY is invalid', () => {
      const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
      process.env.TOKEN_ENCRYPTION_KEY = 'invalid_key';
      
      expect(validateEncryptionKey()).toBe(false);
      
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    });
  });
  
  describe('end-to-end encryption/decryption', () => {
    it('should handle multiple encrypt/decrypt cycles', () => {
      const token = 'ghp_test_token_1234567890';
      
      // Encrypt and decrypt multiple times
      const encrypted1 = encryptToken(token);
      const decrypted1 = decryptToken(encrypted1);
      expect(decrypted1).toBe(token);
      
      const encrypted2 = encryptToken(decrypted1);
      const decrypted2 = decryptToken(encrypted2);
      expect(decrypted2).toBe(token);
      
      const encrypted3 = encryptToken(decrypted2);
      const decrypted3 = decryptToken(encrypted3);
      expect(decrypted3).toBe(token);
    });
    
    it('should handle long tokens', () => {
      const longToken = 'ghp_' + 'a'.repeat(1000);
      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(longToken);
    });
    
    it('should handle empty string', () => {
      const token = '';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(token);
    });
  });
});
