import chai from 'chai';
import chaiHttp from 'chai-http';

import MongoClient from 'mongodb';

chai.use(chaiHttp);

describe('GET /stats', () => {
    let testClientDb = null;

    beforeEach(() => {
        const dbInfo = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '27017',
            database: process.env.DB_DATABASE || 'files_manager'
        };
        return new Promise((resolve) => {
            MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, async (err, client) => {
                testClientDb = client.db(dbInfo.database);
            
                await testClientDb.collection('users').deleteMany({})

                // add 2 users
                await testClientDb.collection('users').insertOne({ email: "me@me.com" })
                await testClientDb.collection('users').insertOne({ email: "me2@me.com" })

                // add 3 files
                await testClientDb.collection('files').insertOne({ name: "file 1" })
                await testClientDb.collection('files').insertOne({ name: "file 2" })
                await testClientDb.collection('files').insertOne({ name: "file 3" })
                
                resolve();
            }); 
        });
    });
        
    afterEach(() => {
    });

    it('GET /stats exists', (done) => {
        chai.request('http://localhost:5000')
            .get('/stats')
            .end((err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(200);
                const bodyJson = res.body;
                chai.expect(bodyJson.users).to.equal(2);
                chai.expect(bodyJson.files).to.equal(3);
                done();
            });
    }).timeout(30000);
});