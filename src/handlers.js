'use strict';

module.exports = {
    
    hello: function(req, res) {
        res.send('hello dolly');
    },

    imageUpload: function(req, res) {
        console.log(JSON.stringify(req.files));
        res.sendStatus(200);
    }
};