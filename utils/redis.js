import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.isConnected = true;

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.log('Redis error', err);
      this.isConnected = false;
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async get(key) {
    return this.getAsync(key);
  }

  async set(key, value, duration) {
    await this.setAsync(key, duration, value);
  }

  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
