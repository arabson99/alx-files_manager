import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
    static async postUpload(request, response) {
        const token = request.header('X-Token');

        if (!token) return response.status(401).json({ error: 'Unauthorized' });
        
        const key = `auth_${token}`;

    }
}