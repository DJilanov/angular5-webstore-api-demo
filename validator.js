/**
 * @validator Used to validate the data from the login form in the admin panel
 */
(function() {
    const cache = require('./cache');
    /**
     * @validate it returns boolean for is the request sended by the admin user
     * @userData {Object} The user login information from the front-end
     */
    function validate(userData) {
        let users = cache.getUsers();
        // just for development time
        return users.find((user) => {
            return user.username == userData.username && user.password == userData.password && user.admin;
        });
    }

    module.exports = {
        validate: validate
    };
}());
