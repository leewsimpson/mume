import { createClient } from 'redis';
import type { Logger } from './github.service.js';

/**
 * User object stored in Redis
 */
export interface RedisUser {
  id: string; // User ID (numeric string)
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Encrypted token stored in Redis
 */
export interface RedisToken {
  accessTokenEncrypted: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
  provider: string;
  scope: string;
  tokenType: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for managing user profiles and tokens in Redis
 * 
 * Key patterns:
 * - user:github:{githubId} → Hash with user profile
 * - user:id:{userId} → User ID reference (stores githubId for lookup)
 * - token:{userId} → Hash with encrypted token data
 * - user:id:counter → Counter for generating user IDs
 */
export class RedisUserService {
  private client: ReturnType<typeof createClient>;
  private connected: boolean = false;

  constructor(redisClient: ReturnType<typeof createClient>) {
    this.client = redisClient;
  }

  /**
   * Ensure Redis client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      this.connected = true;
    }
  }

  /**
   * Generate next user ID
   */
  private async getNextUserId(): Promise<string> {
    await this.ensureConnected();
    const id = await this.client.incr('user:id:counter');
    return id.toString();
  }

  /**
   * Save or update user profile
   * If user exists (by githubId), updates the existing user
   * Otherwise creates a new user with auto-generated ID
   */
  async saveUser(
    user: Omit<RedisUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    logger?: Logger
  ): Promise<RedisUser> {
    await this.ensureConnected();

    try {
      // Check if user exists
      const existingUserId = await this.client.hGet(`user:github:${user.githubId}`, 'id');

      const now = new Date().toISOString();
      let userId: string;
      let createdAt: string;

      if (existingUserId) {
        // Update existing user
        userId = existingUserId;
        const existing = await this.getUserById(userId);
        createdAt = existing?.createdAt || now;

        logger?.info('Updating existing user in Redis', {
          operation: 'saveUser',
          userId,
          githubId: user.githubId,
        });
      } else {
        // Create new user
        userId = user.id || (await this.getNextUserId());
        createdAt = now;

        logger?.info('Creating new user in Redis', {
          operation: 'saveUser',
          userId,
          githubId: user.githubId,
        });
      }

      const redisUser: RedisUser = {
        id: userId,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt,
        updatedAt: now,
      };

      // Store user data
      await this.client.hSet(`user:github:${user.githubId}`, {
        id: redisUser.id,
        githubId: redisUser.githubId,
        username: redisUser.username,
        email: redisUser.email || '',
        avatarUrl: redisUser.avatarUrl || '',
        createdAt: redisUser.createdAt,
        updatedAt: redisUser.updatedAt,
      });

      // Store ID lookup reference
      await this.client.set(`user:id:${userId}`, user.githubId);

      logger?.info('User saved successfully to Redis', {
        operation: 'saveUser',
        userId,
        githubId: user.githubId,
      });

      return redisUser;
    } catch (error) {
      logger?.error(
        'Failed to save user to Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'saveUser', githubId: user.githubId }
      );
      throw error;
    }
  }

  /**
   * Get user by GitHub ID
   */
  async getUserByGithubId(githubId: string, logger?: Logger): Promise<RedisUser | null> {
    await this.ensureConnected();

    try {
      const userData = await this.client.hGetAll(`user:github:${githubId}`);

      if (!userData || Object.keys(userData).length === 0) {
        logger?.info('User not found in Redis', {
          operation: 'getUserByGithubId',
          githubId,
        });
        return null;
      }

      return {
        id: userData.id!,
        githubId: userData.githubId!,
        username: userData.username!,
        email: userData.email || null,
        avatarUrl: userData.avatarUrl || null,
        createdAt: userData.createdAt!,
        updatedAt: userData.updatedAt!,
      };
    } catch (error) {
      logger?.error(
        'Failed to get user by GitHub ID from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getUserByGithubId', githubId }
      );
      throw error;
    }
  }

  /**
   * Get user by user ID
   */
  async getUserById(userId: string, logger?: Logger): Promise<RedisUser | null> {
    await this.ensureConnected();

    try {
      // Lookup githubId from user ID
      const githubId = await this.client.get(`user:id:${userId}`);
      
      if (!githubId) {
        logger?.info('User ID not found in Redis', {
          operation: 'getUserById',
          userId,
        });
        return null;
      }

      return this.getUserByGithubId(githubId, logger);
    } catch (error) {
      logger?.error(
        'Failed to get user by ID from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getUserById', userId }
      );
      throw error;
    }
  }

  /**
   * Save or update encrypted token for a user
   */
  async saveToken(userId: string, token: Omit<RedisToken, 'createdAt' | 'updatedAt'>, logger?: Logger): Promise<void> {
    await this.ensureConnected();

    try {
      const now = new Date().toISOString();
      
      // Check if token exists
      const existingToken = await this.client.hGet(`token:${userId}`, 'createdAt');
      const createdAt = existingToken || now;

      const redisToken: RedisToken = {
        ...token,
        createdAt,
        updatedAt: now,
      };

      await this.client.hSet(`token:${userId}`, {
        accessTokenEncrypted: redisToken.accessTokenEncrypted,
        accessTokenIv: redisToken.accessTokenIv,
        accessTokenAuthTag: redisToken.accessTokenAuthTag,
        provider: redisToken.provider,
        scope: redisToken.scope,
        tokenType: redisToken.tokenType,
        expiresAt: redisToken.expiresAt || '',
        createdAt: redisToken.createdAt,
        updatedAt: redisToken.updatedAt,
      });

      logger?.info('Token saved successfully to Redis', {
        operation: 'saveToken',
        userId,
        provider: token.provider,
      });
    } catch (error) {
      logger?.error(
        'Failed to save token to Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'saveToken', userId }
      );
      throw error;
    }
  }

  /**
   * Get encrypted token for a user
   */
  async getToken(userId: string, logger?: Logger): Promise<RedisToken | null> {
    await this.ensureConnected();

    try {
      const tokenData = await this.client.hGetAll(`token:${userId}`);

      if (!tokenData || Object.keys(tokenData).length === 0) {
        logger?.info('Token not found in Redis', {
          operation: 'getToken',
          userId,
        });
        return null;
      }

      return {
        accessTokenEncrypted: tokenData.accessTokenEncrypted!,
        accessTokenIv: tokenData.accessTokenIv!,
        accessTokenAuthTag: tokenData.accessTokenAuthTag!,
        provider: tokenData.provider!,
        scope: tokenData.scope!,
        tokenType: tokenData.tokenType!,
        expiresAt: tokenData.expiresAt || null,
        createdAt: tokenData.createdAt!,
        updatedAt: tokenData.updatedAt!,
      };
    } catch (error) {
      logger?.error(
        'Failed to get token from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'getToken', userId }
      );
      throw error;
    }
  }

  /**
   * Delete token for a user
   */
  async deleteToken(userId: string, logger?: Logger): Promise<void> {
    await this.ensureConnected();

    try {
      await this.client.del(`token:${userId}`);

      logger?.info('Token deleted from Redis', {
        operation: 'deleteToken',
        userId,
      });
    } catch (error) {
      logger?.error(
        'Failed to delete token from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'deleteToken', userId }
      );
      throw error;
    }
  }

  /**
   * Delete user and associated data
   */
  async deleteUser(userId: string, logger?: Logger): Promise<void> {
    await this.ensureConnected();

    try {
      // Get githubId first
      const githubId = await this.client.get(`user:id:${userId}`);
      
      if (githubId) {
        // Delete user data
        await this.client.del(`user:github:${githubId}`);
      }

      // Delete references
      await this.client.del(`user:id:${userId}`);
      await this.client.del(`token:${userId}`);

      logger?.info('User deleted from Redis', {
        operation: 'deleteUser',
        userId,
        githubId,
      });
    } catch (error) {
      logger?.error(
        'Failed to delete user from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'deleteUser', userId }
      );
      throw error;
    }
  }

  /**
   * Clear all user and token data (for testing)
   */
  async clearAll(logger?: Logger): Promise<void> {
    await this.ensureConnected();

    try {
      const keys = await this.client.keys('user:*');
      const tokenKeys = await this.client.keys('token:*');
      
      const allKeys = [...keys, ...tokenKeys];
      
      if (allKeys.length > 0) {
        await this.client.del(allKeys);
      }

      logger?.info('Cleared all user and token data from Redis', {
        operation: 'clearAll',
        keysDeleted: allKeys.length,
      });
    } catch (error) {
      logger?.error(
        'Failed to clear all data from Redis',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'clearAll' }
      );
      throw error;
    }
  }
}
