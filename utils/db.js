import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const uri = `mongodb://${host}:${port}/${database}`;

    // create MongoDB client
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.client = client;
    this.client.connect();
    this.db = this.client.db(database);
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    try {
      const usersCollection = this.db.collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (err) {
      console.error(err);
      throw (err);
    }
  }

  async nbFiles() {
    try {
      const filesCollection = this.db.collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (err) {
      console.log(err);
      throw (err);
    }
  }
}


const dbClient = new DBClient();
export default dbClient;
