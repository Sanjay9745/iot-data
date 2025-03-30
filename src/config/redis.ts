import { createClient, RedisClientType } from 'redis';

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });
  }

  /**
   * Get the singleton instance of RedisService
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Connect to Redis server
   */
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Redis Connection Error:', error);
        throw error;
      }
    }
  }

  /**
   * Get the Redis client instance
   */
  public getClient(): RedisClientType {
    return this.client;
  }

  /**
   * Disconnect from Redis server
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }
}

// Export a redisClient singleton instance for backwards compatibility
const redisClient = RedisService.getInstance().getClient();
export default redisClient;

// Export connect function for backwards compatibility
export const connectRedis = async (): Promise<void> => {
  try {
    await RedisService.getInstance().connect();
  } catch (error) {
    console.error('Redis Connection Error:', error);
    process.exit(1);
  }
};