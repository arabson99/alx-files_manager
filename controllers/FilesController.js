import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    if (!token) return response.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, data, parentId, isPublic,
    } = request.body;
    const acceptedType = ['folder', 'file', 'image'];

    if (!name) return response.status(400).json({ error: 'Missing name' });
    if (!type || !acceptedType.includes(type)) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Parent is not a folder' });
    }
    if (parentId) {
      const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId), userId });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      } if (file && file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId ? ObjectId(parentId) : 0,
    };
    if (type === 'folder') {
      const newFile = await dbClient.db.collection('files').insertOne({ ...fileData });
      return response.status(201).json({ id: newFile.insertedId, ...fileData });
    }

    const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(relativePath)) {
      fs.mkdirSync(relativePath);
    }
    const identity = uuidv4();
    const localPath = `${relativePath}/${identity}`;
    fs.writeFile(localPath, data, 'base64', (err) => {
      if (err) console.log(err);
    });
    const newFile = await dbClient.db.collection('files').insertOne({ ...fileData, localPath });

    return response.status(201).json({ id: newFile.insertedId, ...fileData });
  }
}

export default FilesController;
