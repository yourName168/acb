const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://hieule1235:ovg7jmW1eixZdIXT@cluster0.csyi41q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

  get transactionSent(){
    return this.db.collection('transaction_sent');
  }
  
  get transactionUnsent(){
    return this.db.collection('transaction_unsent');
  }
}

exports.databaseService =new DatabaseService;
