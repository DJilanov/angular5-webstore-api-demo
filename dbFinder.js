/**
 * @dbFinder Used to search in the db
 */
(function () {
  // we use it for creation of new object ids
  const ObjectId = require('mongodb').ObjectID;
  const config = require('./config').getConfig();
  const mongooseService = require('./mongoose');
  var cache = null;

  /**
   * @setCache set the cache as local variable
   * @cache {Object} The cache object
   */
  function setCache(cacheModule) {
    cache = cacheModule;
  }
  /**
   * @fetchAllProductsAndCategories it returns all the categories and products
   * @req {Object} The query from the front-end
   * @res {Object} The res to the front-end
   */
  function fetchAllProductsAndCategories(req, res) {
    var response = {
      products: cache.getProducts(),
      categories: cache.getCategories()
    }
    res.json(response);
  }

  function fetchAllData(req, res) {
    let products = cache.getProducts().map(product => {
      return {
        id: product._id,
        category: product.category,
        isShownMainPage: product.daily_offer || product.is_new,
        title: product.title,
        description: product.description,
        moreInfo: product.more_info,
        moreDetails: product.more_details,
        params: product.params,
        newPrice: product.new_price,
        oldPrice: product.old_price,
        isDailyOffer: product.daily_offer,
        zIndex: product.zIndex,
        isShown: product.shown,
        count: product.count,
        rating: product.rating,
        isNew: product.is_new,
        isOnCarousel: product.carousel,
        link: product.link,
        make: product.make,
        mainImage: product.main_image,
        otherImages: product.other_images
      }
    });
    let categories = cache.getCategories().map(category => {
      return {
        id: category._id,
        title: category.title,
        name: category.name,
        zIndex: category.zIndex,
        shownOnNav: category.shownOnNav,
        link: category.link,
        products: category.products
      }
    });
    let messages = cache.getMessages().map(message => {
      return {
        id: message._id,
        name: message.name,
        email: message.email,
        phone: message.phone,
        message: message.message,
        date: message.date,
      }
    });
    res.status(200).json({
      products: products,
      messages: messages,
      categories: categories
    });
  }
  /**
   * @fetchAllProducts It fetch all the products from the back-end
   * @req {Object} The query from the front-end
   * @res {Object} The res to the front-end
   */
  function fetchAllProducts(req, res) {
    let products = cache.getProducts().map(product => {
      return {
        id: product._id,
        category: product.category,
        isShownMainPage: product.daily_offer || product.is_new,
        title: product.title,
        description: product.description,
        moreInfo: product.more_info,
        moreDetails: product.more_details,
        params: product.params,
        newPrice: product.new_price,
        oldPrice: product.old_price,
        isDailyOffer: product.daily_offer,
        zIndex: product.zIndex,
        isShown: product.shown,
        count: product.count,
        rating: product.rating,
        isNew: product.is_new,
        isOnCarousel: product.carousel,
        link: product.link,
        make: product.make,
        mainImage: product.main_image,
        otherImages: product.other_images
      }
    });
    res.json(products);
  }
  /**
   * @fetchAllCategories It fetch all the categories from the back-end
   * @req {Object} The query from the front-end
   * @res {Object} The res to the front-end
   */
  function fetchAllCategories(req, res) {
    let categories = cache.getCategories().map(category => {
      return {
        id: category._id,
        title: category.title,
        name: category.name,
        zIndex: category.zIndex,
        shownOnNav: category.shownOnNav,
        link: category.link,
        products: category.products
      }
    });
    res.json(categories);
  }
  /**
   * @fetchAllMessages It fetch all the messages from the back-end
   * @req {Object} The query from the front-end
   * @res {Object} The res to the front-end
   */
  function fetchAllMessages(req, res) {
    let messages = cache.getMessages().map(message => {
      return {
        id: message._id,
        name: message.name,
        email: message.email,
        phone: message.phone,
        message: message.message,
        date: message.date,
      }
    });
    res.json(messages);
  }
  /**
   * @find It searches in the back-end by query
   * @req {Object} The query from the front-end
   * @res {Object} The res to the front-end
   */
  function find(req, res) {
    // we build the search query
    var parameter = buildSearchParam(req.query);
    console.log('[dbFinder:find] Searching for ' + JSON.stringify(parameter));
    mongooseService.getMongoose().connection.db.collection('worklogs', function (err, collection) {
      collection.find(parameter).toArray(function (err, docs) {
        buildResponse(docs, res);
      });
    });
  }
  /**
   * @buildSearchParam It builds the searching query
   * @req {Object} The query from the front-end
   * @parameter {Object} The query for the db
   */
  function buildSearchParam(parameters) {
    var query = {};
    // TODO: REMOVE THE PARSE INT
    // date started
    var from_date = new Date(parseInt(parameters['worklog_started']));
    from_date.setHours(0, 0, 0, 000);
    from_date = +from_date;
    // date end
    var to_date = new Date(parseInt(parameters['logged_untill']));
    to_date.setHours(23, 59, 59, 999);
    to_date = +to_date;
    // the query we will send
    query['$and'] = [];
    if (parameters.fullName.length > 1) {
      query['$and'].push({
        "fullName": parameters.fullName
      })
    }
    if (parameters.issue_name.length > 1) {
      query['$and'].push({
        $or: [
          { "issue_name": parameters.issue_name },
          { "issue_parent": parameters.issue_name },
          { "issue_epic": parameters.issue_name }
        ]
      })
    }
    if (parameters.worklog_started.length > 1) {
      query['$and'].push({
        "worklog_started": {
          $gte: parseInt(from_date)
        }
      })
      query['$and'].push({
        "worklog_started": {
          $lte: parseInt(to_date)
        }
      })
    }
    console.log('Builded query for the db: ' + JSON.stringify(query));
    return query;
  }
  /**
   * @buildResponse We gather the data and build the response structure that is expected in the front-end
   * @docs {Object} The results from the db
   * @resource {Object} The response object
   */
  function buildResponse(docs, resource) {
    var result = buildResponseStructure(docs);
    resource.json(result);
  }
  /**
   * @buildResponseStructure Build the response structure that is expected in the front-end
   * @results {Object} The results from the db
   */
  function buildResponseStructure(results) {

    return response;
  }

  module.exports = {
    find: find,
    setCache: setCache,
    fetchAllData: fetchAllData,
    fetchAllMessages: fetchAllMessages,
    fetchAllProducts: fetchAllProducts,
    fetchAllCategories: fetchAllCategories,
    fetchAllProductsAndCategories: fetchAllProductsAndCategories
  };
}());
