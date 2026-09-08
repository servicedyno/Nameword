const WebRouter = require('express').Router();

WebRouter.use('/auth',require('./auth.js'));

module.exports = WebRouter;