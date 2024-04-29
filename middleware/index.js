//All the middlewares are defined here!!

var Candidate       = require("../models/candidate.js");
var middlewareObj   = {};

middlewareObj.checkIsCompany = function(req, res, next){
    if(req.isAuthenticated())
    {
        if(req.user.isAdmin)
            next();
        else{
            req.flash("error", "Authorization Denied!!");
            console.log('You are not authorized!');
            res.redirect("/studentlogin");
        }
            
    }
    else
    {
        req.flash("error", "You need to log in to do that!");
        res.redirect("/studentLogin");
    }
}

module.exports = middlewareObj;