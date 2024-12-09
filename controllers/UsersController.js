import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    try {
      const { email, password } = request.body;

      if (!email) {
        return response.status(400).json({ error: 'Missing email' });
      }
      if (!password) return response.status(400).json({ error: 'Missing password' });

      const existingUser = await dbClient.db.collection('users').findOne({ email });
      if (existingUser) {
        return response.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);

      const { insertedId } = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
      const user = { id: insertedId, email };

      return response.status(201).json(user);
    } catch (err) {
      console.log(err);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    return response.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default UsersController;
