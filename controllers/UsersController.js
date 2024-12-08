import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(request, response) {
    try {
      const { email, password } = request.body;

      if (!email) return response.status(400).json({ error: 'Missing email' });
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
}

export default UsersController;
