/**
 * @dbFinder Used to search in the db
 */
(function () {
  const mongoose = require('mongoose');
  const config = require('./config').getConfig();
  let cache = null;

  function setCache(cacheModule) {
    cache = cacheModule;
  }

  function getMongoose() {
    return mongoose;
  }
  /**
   * @connectDb Used to make the connection to the Database
   */
  function connectDb() {
    // we cache the product list when we open the back-end for faster working speed
    mongoose.connection.on('connected', () => {
      console.log('[dbConnector]Mongoose default connection open');
      mongoose.connection.db.collection('products', (err, collection) => {
        collection.find().toArray((err, products) => {
          cache.setProducts(products);
        });
      });
      mongoose.connection.db.collection('categories', (err, collection) => {
        collection.find().toArray((err, categories) => {
          cache.setCategories(categories);
        });
      });
      mongoose.connection.db.collection('messages', (err, collection) => {
        collection.find().toArray((err, messages) => {
          cache.setMessages(messages);
        });
      });
      mongoose.connection.db.collection('orders', (err, collection) => {
        collection.find().toArray((err, orders) => {
          cache.setOrders(orders);
        });
      });
      mongoose.connection.db.collection('users', (err, collection) => {
        collection.find().toArray((err, users) => {
          cache.setUsers(users);
        });
      });
      mongoose.connection.db.collection('warranties', (err, collection) => {
        collection.find().toArray((err, warranties) => {
          cache.setWarranties(warranties);
        });
      });
    });

    // If the connection throws an error
    mongoose.connection.on('error', function (err) {
      console.log('[dbConnector]Mongoose default connection error: ' + err);
      mongoose.disconnect();
    });

    // When the connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('[dbConnector]Mongoose default connection disconnected');
      mongoose.connect(config.dbAddress, { server: { auto_reconnect: true } });
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', () => {
      mongoose.connection.close(() => {
        console.log('[dbConnector]Mongoose default connection disconnected through app termination');
        process.exit(0);
      });
    });
    // get database
    mongoose.connect(config.dbAddress, { server: { auto_reconnect: true } });
  }

  module.exports = {
    getMongoose: getMongoose,
    connectDb: connectDb,
    setCache: setCache
  };
}());