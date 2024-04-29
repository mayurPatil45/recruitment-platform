var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var CandidateSchema = new mongoose.Schema({
    name : String,
    username : String,  //Email actually
    Institute : String,
    LinkedIn : String,
    isAdmin : {type: Boolean, default: false},
    result:[Number],
    submitted:[{
      type : mongoose.Schema.Types.ObjectId,
      ref : "testSchema",
    }],
    yesorno:
    [{
      type: Boolean, default: false
    }],
    isLoggedIn : {type: Boolean, default: false},
    prn : String
});

CandidateSchema.plugin(passportLocalMongoose);

//CandidateSchema.plugin(passportLocalMongoose, { usernameField: 'email', errorMessages : { UserExistsError : 'A user with the given email is already registered.' } });

module.exports = mongoose.model("Candidate" , CandidateSchema);
