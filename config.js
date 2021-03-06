// used as container for the main constants of the back-end
(function() {
    var config = {
        // official db
        dbAddress: 'mongodb://admin:toniadmin@ds029207.mlab.com:29207/toni-website-new',
        // used for the back-end
        dbUser: 'admin',
        dbPassword: 'toniadmin',
        // used for emails
        emailUser: 'noreplyjilanov',
        emailPassword: 'Toniwebsite',
        email: 'jilanovltd@gmail.com',
        // email: 'djilanov@gmail.com',
        serverImageFolderPath: '/../training_seo/src/assets/product-images/',
        serverImageFolderPathSmall: '/../training_seo/src/assets/product-images/small/',
        serverProdImageFolderPath: '/../training_seo/dist/assets/product-images/',
        serverProdImageFolderPathSmall: '/../training_seo/dist/assets/product-images/small/',
    };
    // exporting function of the config object
    function getConfig() {
        return config;
    }

    module.exports = {
        getConfig: getConfig
    };
}());
