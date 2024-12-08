import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
      const redis = redisClient.isAlive();
      const db = dbClient.isAlive();

      response.status(200).json({ redis, db });
  }

  static async getStats(request, response) {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();

      response.status(200).json({ users, files });
  }
}

export default AppController;
