import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    try {
      const redis = redisClient.isAlive();
      const db = dbClient.isAlive();

      return response.status(200).json({ redis, db });
    } catch (error) {
      return response.status(500).json({ error });
    }
  }

  static async getStats(request, response) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();

      return response.status(200).json({ users, files });
    } catch (error) {
      return response.status(500).json({ error });
    }
  }
}

export default AppController;
