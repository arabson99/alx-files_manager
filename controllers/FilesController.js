import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
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
      return response.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Parent is not a folder' });
    }
    if (parentId) {
      const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId), userId: ObjectId(userId) });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      } if (file && file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId: ObjectId(userId),
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

  static async getShow(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const fileId = request.params.id;
      if (!fileId) return response.status(401).json({ error: 'Unauthorized' });
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });
      if (file) return response.status(200).json(file);
      return response.status(404).json({ error: 'Not found' });
    } catch (err) {
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIndex(request, response) {
    const token = request.header('X-Token');

    if (!token) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId } = request.query;
    const page = parseInt(request.query.page, 10) || 0;
    let filter;

    if (parentId) {
      filter = { parentId: ObjectId(parentId), userId: ObjectId(userId) };
    } else {
      filter = { userId: ObjectId(userId) };
    }

    const fileCollection = await dbClient.db.collection('files');
    const result = fileCollection.aggregate([
      { $match: filter },
      { $skip: page * 20 },
      { $limit: 20 },
    ]);
    const resultArray = await result.toArray();
    return response.status(200).json(resultArray);
  }

  static async putPublish(request, response) {
    const token = request.header('X-Token');
    if (!token) return response.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const fileCollection = await dbClient.db.collection('files');
    const fileId = request.params.id;
    if (!fileId) return response.status(401).json({ error: 'Unauthorized' });
    const file = await fileCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) return response.status(404).json({ error: 'Not found' });

    const query = { _id: ObjectId(fileId), userId: ObjectId(userId) };
    const update = { $set: { isPublic: true } };
    const options = { projection: { _id: 0, localPath: 0 } };
    await fileCollection.updateOne(query, update);
    const updatedFile = await fileCollection.findOne(query, options);

    return response.status(200).json({ id: updatedFile._id, ...updatedFile });
  }

  static async putUnpublish(request, response) {
    const token = request.header('X-Token');
    if (!token) return response.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return response.status(401).json({ error: 'Unauthorized' });

    const fileCollection = await dbClient.db.collection('files');
    const fileId = request.params.id;
    if (!fileId) return response.status(401).json({ error: 'Unauthorized' });
    const file = await fileCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) return response.status(404).json({ error: 'Not found' });

    const query = { _id: ObjectId(fileId), userId: ObjectId(userId) };
    const update = { $set: { isPublic: false } };
    const options = { projection: { _id: 0, localPath: 0 } };
    await fileCollection.updateOne(query, update);
    const updatedFile = await fileCollection.findOne(query, options);

    return response.status(200).json({ id: updatedFile._id, ...updatedFile });
  }

  static async getFile(request, response) {
    const fileId = request.params.id;
    const fileCollection = await dbClient.db.collection('files');
    const file = await fileCollection.findOne({ _id: ObjectId(fileId) });
    if (!file) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    if (!file.isPublic) {
      if (!token) return response.status(404).json({ error: 'Not found' });

      const userId = await redisClient.get(key);
      if (!userId) return response.status(401).json({ error: 'Unauthorized' });
      const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user || userId !== file.userId.toString()) {
        return response.status(404).json({ error: 'Not found' });
      }
    }
    const fileLocalPath = file.localPath;
    if (!fs.existsSync(fileLocalPath)) return response.status(404).json({ error: 'Not found' });
    const data = await fs.promises.readFile(fileLocalPath);
    const headerContentType = mime.contentType(file.name);
    return response.header('Content-Type', headerContentType).status(200).send(data);
  }
}

export default FilesController;
