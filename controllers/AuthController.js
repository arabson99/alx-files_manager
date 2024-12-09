import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authHeader = request.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    // Find the first colon and split accordingly
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) throw new Error('Invalid credentials format');

    const email = credentials.slice(0, colonIndex);
    const password = credentials.slice(colonIndex + 1);

    if (!email || !password) {
      return response.status(401).json(({ error: 'Unauthorized' }));
    }

    const hashedPassword = sha1(password);
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized ' });
    }
    const token = uuidv4();
    const key = `auth_${token}`;

    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    return response.status(200).json({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.header('X-Token');

    if (!token) return response.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(key);
    return response.status(204).send();
  }
}

export default AuthController;
