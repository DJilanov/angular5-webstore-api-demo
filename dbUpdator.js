/**
 * @dbFinder Used to search in the db
 */
(function () {
  // we use it for creation of new object ids
  const ObjectId = require('mongodb').ObjectID;
  const crypto = require('crypto');
  const config = require('./config').getConfig();
  const mongooseService = require('./mongoose');
  const nodemailer = require('nodemailer');
  const fs = require('fs');
  const Jimp = require('jimp');
  const schedule = require('node-schedule');
  let contactTemplate = null;
  let orderTemplate = null;
  let cache = null;
  let numberOfOrder = 1;

  schedule.scheduleJob('0 0 * * *', () => { 
    numberOfOrder = 1;
  }) // run everyday at midnight

  fs.readFile(__dirname + '/email-templates/order-builded.html', function (err, html) {
    orderTemplate = html.toString();
  });

  fs.readFile(__dirname + '/email-templates/message-builded.html', function (err, html) {
    contactTemplate = html.toString();
  });

  /**
   * @setCache set the cache as local variable
   * @cacheModule {Object} The cache module
   */
  function setCache(cacheModule) {
    cache = cacheModule;
  }
  // USE SCHEMA!!!
  // creates the message query that we are going to send to the back-end
  function getMessageQuery(body) {
    return {
      'name': body.name,
      'email': body.email,
      'phone': body.phone,
      'message': body.message,
      'date': new Date()
    };
  }
  // USE SCHEMA!!!
  // creates the orders query that we are going to send to the back-end
  function getOrderQuery(body, res) {
    return {
      'products': body.products,
      'name': body.name,
      'email': body.email,
      'phone': body.phone,
      'message': body.message,
      'moreinfo': body.moreinfo,
      'orderId': getOrderNumber(),
      'date': new Date()
    };
  }

  function getCategoryQuery(body) {
    return {
      'link': body.link,
      'name': body.name,
      'products': body.products,
      'shownOnNav': body.shownOnNav,
      'title': body.title,
      'zIndex': body.zIndex
    };
  }

  function getProductQuery(product) {
    return {
      carousel: product.isOnCarousel,
      category: product.category,
      count: product.count,
      daily_offer: product.isDailyOffer,
      description: product.description,
      is_new: product.isNew,
      link: product.link,
      main_image: product.mainImage,
      make: product.make,
      more_details: product.moreDetails,
      more_info: product.moreInfo,
      new_price: product.newPrice,
      old_price: product.oldPrice,
      other_images: product.otherImages,
      params: product.params,
      rating: product.rating,
      shown: product.isShown,
      title: product.title,
      typeahed: product.typeahed,
      zIndex: product.zIndex
    };
  }
  /**
   * @sendOrderEmail Used to send email to our company email using our no reply one
   * @response <order> Contains the order object and sends it to the gmail
   */
  function sendOrderEmail(response) {
    var transporter = nodemailer.createTransport('smtps://' + config.emailUser + '%40gmail.com:' + config.emailPassword + '@smtp.gmail.com');
    var orders = '';
    for (let productCounter = 0; productCounter < response.products.length; productCounter++) {
      orders += '<div><span>' + response.products[productCounter].title + '</span><span> с цена ' + response.products[productCounter].price + '</span></div>';
    }
    var template = orderTemplate.replace('{{email}}', response.email).replace('{{date}}', response.date).replace('{{name}}', response.name).replace('{{phone}}', response.phone).replace('{{message}}', response.message).replace('{{order}}', orders);
    var mailOptions = {
      from: '"Jilanov EOOD 👥" <noreplyjilanov@gmail.com>', // sender address
      to: config.email, // list of receivers
      subject: 'New order recieved ✔', // Subject line
      text: template, // plaintext body
      html: template // html body
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log('Message sent: ' + info.response);
    });
  }
  /**
   * @sendContactEmail Used to send email to our company email using our no reply one
   * @response <Message> Contains the message object and sends it to the gmail
   */
  function sendContactEmail(response) {
    var transporter = nodemailer.createTransport('smtps://' + config.emailUser + '%40gmail.com:' + config.emailPassword + '@smtp.gmail.com');
    var template = contactTemplate.replace('{{email}}', response.email).replace('{{date}}', response.date).replace('{{name}}', response.name).replace('{{phone}}', response.phone).replace('{{message}}', response.message);
    var mailOptions = {
      from: '"Jilanov EOOD 👥" <noreplyjilanov@gmail.com>', // sender address
      to: config.email, // list of receivers
      subject: 'New message recieved ✔', // Subject line
      text: template, // plaintext body
      html: template // html body
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log('Message sent: ' + info.response);
    });
  }
  /**
   * @saveOrder Used to save the order to the database
   */
  function saveOrder(req, res) {
    var query = getOrderQuery(req.body, res);
    mongooseService.getMongoose().connection.db.collection('orders', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.insertOne(query, function (err, docs) {
        var response = Object.assign({
          id: docs.insertedId.toHexString(),
          'date': new Date()
        }, req.body);
        if (!err) {
          sendOrderEmail(response);
          cache.addOrder(response);
          returnSuccess(res, {
            orderId: getOrderNumber()
          });
          numberOfOrder++;
        } else {
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @deleteOrder Used to delete the order from the database
   * @order: order object that is going to be deleted
   */
  function deleteOrder(order, res) {
    order = JSON.parse(order);
    var query = getQuery(order);
    mongooseService.getMongoose().connection.db.collection('orders', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.remove(query, function (err, docs) {
        if (!err) {
          cache.removeOrder(order);
          returnSuccess(res, message);
        } else {
          returnProblem(err, res);
        }
      });
    });
  }

  /**
   * @createMessage Used to save the message to the database
   */
  function createMessage(message, res) {
    var query = getMessageQuery(message);
    mongooseService.getMongoose().connection.db.collection('messages', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.insertOne(query, function (err, docs) {
        var response = Object.assign({
          _id: docs.insertedId.toHexString(),
          'date': new Date()
        }, message);
        if (!err) {
          sendContactEmail(response);
          cache.addMessage(response);
          returnSuccess(res);
        } else {
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @deleteMessage Used to delete the message from the database
   * @message: message object that is going to be deleted
   */
  function deleteMessage(message, res) {
    var query = getQuery(message);
    mongooseService.getMongoose().connection.db.collection('messages', (err, collection) => {
      if (!collection) {
        return;
      }
      collection.remove(query, (err, docs) => {
        if (!err) {
          cache.removeMessage(message);
          returnSuccess(res, message);
        } else {
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @deleteCategory Used to delete the category from the database
   * @category: category object that is going to be deleted
   */
  function deleteCategory(category, res) {
    category = JSON.parse(category);
    var query = getQuery(category);
    mongooseService.getMongoose().connection.db.collection('categories', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.remove(query, function (err, docs) {
        if (!err) {
          cache.removeCategory(category);
          returnSuccess(res, category);
        } else {
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @createCategory Used to create the category to the database
   * @category: category object that is going to be created
   */
  function createCategory(category, res) {
    var query = getQuery(category);
    delete category.new;
    mongooseService.getMongoose().connection.db.collection('categories', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.insertOne(category, function (err, docs) {
        if (!err) {
          category._id = docs.insertedId.toHexString();
          cache.addCategory(category);
          returnSuccess(res, category);
        } else {
          // todo: handle the case when 1 gets broken but the other are correctly set
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @updateCategories Used to update the categories to the database
   * @categoriesArray: category array that is going to be updated
   */
  function updateCategories(categoriesArray, res) {
    mongooseService.getMongoose().connection.db.collection('categories', function (err, collection) {
      for (let counter = 0; counter < categoriesArray.length; counter++) {
        let query = getQuery(categoriesArray[counter]);
        let update = getCategoryQuery(categoriesArray[counter]);
        if (!collection) {
          return;
        }
        collection.update(query, update, function (err, docs) {
          if (!err) {
            cache.updateCategories(categoriesArray[counter]);
            // we return when all are sended and finished
            if (counter == categoriesArray.length - 1) {
              returnSuccess(res, categoriesArray);
            }
          } else {
            // todo: handle the case when 1 gets broken but the other are correctly set
            returnProblem(err, res);
          }
        });
      }
    });
  }
  /**
   * @updateProduct Used to update the product to the database
   * @product: product that is going to be updated
   */
  function updateProduct(product, files, res) {
    var query = getQuery(product);
    if (files.mainImage.length) {
      let uniqueRandomImageName = 'image-' + randomString();
      product.mainImage = saveImageToFS(files.mainImage, __dirname + config.serverImageFolderPath, uniqueRandomImageName);
    }
    if (files.otherImages.length) {
      files.otherImages.map((image) => {
        let uniqueRandomImageName = 'image-' + randomString();
        product.otherImages[product.otherImages.length] = saveImageToFS(image, __dirname + config.serverImageFolderPath, uniqueRandomImageName);
      });
    }
    let update = getProductQuery(product);
    mongooseService.getMongoose().connection.db.collection('products', (err, collection) => {
      if (!collection || err) {
        return;
      }
      collection.update(query, update, (err, docs) => {
        if (!err) {
          update._id = product.id;
          cache.updateProduct(update);
          returnSuccess(res, product);
        } else {
          // todo: handle the case when 1 gets broken but the other are correctly set
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @createProduct Used to create product to the database
   * @product: product that will be created
   */
  function createProduct(product, files, res) {
    if (files.mainImage.length) {
      let uniqueRandomImageName = 'image-' + randomString();
      product.mainImage = saveImageToFS(files.mainImage, __dirname + config.serverImageFolderPath, uniqueRandomImageName);
    }
    if (files.otherImages.length) {
      files.otherImages.map((image) => {
        let uniqueRandomImageName = 'image-' + randomString();
        product.otherImages[product.otherImages.length] = saveImageToFS(image, __dirname + config.serverImageFolderPath, uniqueRandomImageName);
      });
      product.otherImages = product.otherImages.filter((image) => {
        return image.length;
      });
    }
    let update = getProductQuery(product);
    mongooseService.getMongoose().connection.db.collection('products', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.insertOne(update, function (err, docs) {
        if (!err) {
          update._id = docs.insertedId.toHexString();
          product.id = docs.insertedId.toHexString();
          cache.addProduct(update);
          returnSuccess(res, product);
        } else {
          // todo: handle the case when 1 gets broken but the other are correctly set
          returnProblem(err, res);
        }
      });
    });
  }
  /**
   * @deleteProduct Used to delete the prodtuc from the database
   * @product: product object that is going to be deleted
   */
  function deleteProduct(product, res) {
    var query = getQuery(product);
    let update = getProductQuery(product);
    mongooseService.getMongoose().connection.db.collection('products', function (err, collection) {
      if (!collection) {
        return;
      }
      collection.remove(query, function (err, docs) {
        if (!err) {
          update._id = product.id;
          cache.removeProduct(update);
          deleteImages(product);
          returnSuccess(res, product);
        } else {
          returnProblem(err, res);
        }
      });
    });
  }

  function randomString() {
    return crypto.createHash('sha1').update(crypto.randomBytes(20)).digest('hex');
  }

  // Decoding base-64 image
  // Source: http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
  function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var response = {};

    if (matches.length !== 3) {
      return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    return response;
  }

  function saveImageToFS(base64Data, location, filename) {
    // Save base64 image to disk
    try {

      // Regular expression for image type:
      // This regular image extracts the "jpeg" from "image/jpeg"
      var imageTypeRegularExpression = /\/(.*?)$/;


      var imageBuffer = decodeBase64Image(base64Data);
      var userUploadedFeedMessagesLocation = location;

      // This variable is actually an array which has 5 values,
      // The [1] value is the real image extension
      var imageTypeDetected = imageBuffer
        .type
        .match(imageTypeRegularExpression);

      var userUploadedImagePath = userUploadedFeedMessagesLocation +
        filename +
        '.' +
        imageTypeDetected[1];

      var imageName = filename + '.' + imageTypeDetected[1]

      // Save decoded binary image to disk
      try {
        fs.writeFile(userUploadedImagePath, imageBuffer.data, () => {
          Jimp.read(userUploadedImagePath, function (err, image) {
            if (err) throw err;
            image.write(__dirname + config.serverProdImageFolderPath + imageName);
            image.scaleToFit(256, Jimp.AUTO)         // resize
              .quality(60)                 // set JPEG quality
              .write(__dirname + config.serverImageFolderPathSmall + imageName) // save
              .write(__dirname + config.serverProdImageFolderPathSmall + imageName); // save
          });
        });
      }
      catch (error) {
        console.log('ERROR:', error);
      }
      return filename + '.' + imageTypeDetected[1];

    }
    catch (error) {
      console.log('ERROR:', error);
    }
  }

  function addImagesToProduct(product, images) {

  }

  function deleteImages(product) {

  }

  /**
   * @deleteProductImage Used to delete the product from the database
   * @product: product object witch image is going to be deleted
   * @image: image that is going to be deleted from the product and if no one else is using it from the server
   */
  function deleteProductImage(product, image, res) {
    // image = image;
    // product = JSON.parse(product);
    // let query = getQuery(product);
    // mongoose.connection.db.collection('categories', function(err, collection) {
    //     if(!collection) {
    //         return;
    //     }
    //     let products = cache.getProductsByImage(image);
    //     if(products.length > 1) {
    //         // we just delete the image from the product
    //         removeImage(product, image);
    //         updateProduct(product, {}, res);
    //     } else if(products.length == 1) {
    //         // we delete the image from the product and we delete the image
    //         removeImage(product, image);
    //         // TODO: delete the image from the FS
    //         updateProduct(product, {}, res);
    //     } else {
    //         // TODO: Move that message to error message enum. Its place is not here!!!
    //         returnProblem('The image is not in the back-end', res);
    //     }

    // });
  }

  function removeImage(product, image) {
    if (product.main_image == image) {
      product.main_image = '';
    }
    if (product.other_images.indexOf(image) !== -1) {
      var x = [];
      x.filter
      product.other_images.filter(function (other_image) {
        if (other_image !== image) {
          return other_image;
        }
      });
    }
  }

  function getOrderNumber() {
    let length = (numberOfOrder + '').length;
    let number = '0'.repeat(4 - length) + numberOfOrder;
    let date = (new Date()).toISOString().split('T')[0].split('-').join('');
    return date + number;
  }

  function getQuery(el) {
    return {
      _id: ObjectId(el.id)
    };
  }

  /**
   * @returnSuccess returns success data to the front-end
   * @res {Object} The res to the front-end
   * @response {Object} The response from the database
   */
  function returnSuccess(res, response) {
    res.json(200, {
      done: true,
      reason: null,
      response: response
    });
  }

  /**
   * @returnProblem Returns the error to the front-end ( when delete non existing user or there is some problem )
   * @err {Object} Error object from the database
   * @res {Object} The res to the front-end
   * @info There were 2 options: return 4** with error body or return 200 with reason. I chouse 200 becouse there is no problem
   *          with the back-end... there is problem with your call.. 4** must be returned if there is problem with the API
   */
  function returnProblem(err, res) {
    res.json(400, {
      done: false,
      reason: err
    });
  }

  module.exports = {
    setCache: setCache,
    // copyImages: copyImages,
    updateProduct: updateProduct,
    createProduct: createProduct,
    deleteProduct: deleteProduct,
    deleteProductImage: deleteProductImage,
    saveOrder: saveOrder,
    deleteOrder: deleteOrder,
    createMessage: createMessage,
    deleteMessage: deleteMessage,
    createCategory: createCategory,
    deleteCategory: deleteCategory,
    updateCategories: updateCategories,
  };
}());
