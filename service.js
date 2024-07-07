const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://bincu100503:x6x46CrFKUVejKZX@cluster0.bdkejgi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

class DatabaseService {
  constructor() {
    this.client = new MongoClient(uri);
    this.db = this.client.db('customers');
  }
  
  async connect() {
    try {
      await this.client.connect();
      await this.db.command({ ping: 1 });
      console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } catch (error) {
      console.log('Try connect to MongoDB');
    }
  }

  get customerDB() {
    return this.db.collection('user-password');
  }

  get transactionSent(){
    return this.db.collection('transaction_sent');
  }
  
  get transactionUnsent(){
    return this.db.collection('transaction_unsent');
  }
}

exports.databaseService =new DatabaseService;
