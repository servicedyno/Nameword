module.exports = (app)=>{

    //api
    app.use('/api/v1', require('./api'));
    //web

    app.use('/',require('./web'));
};
