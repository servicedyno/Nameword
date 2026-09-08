const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');

let mongod;

beforeAll(async()=>{
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
});

beforeEach(async()=>{
    const collections = await mongoose.connection.db.collections();
    for(let collection of collections){
        await collection.deleteMany({});
    }
});

 afterAll(async()=>{
    if(mongod){
        await mongod.stop();
    }
    await mongoose.connection.close();
 });


