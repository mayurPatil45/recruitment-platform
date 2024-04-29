var mongoose = require("mongoose");
const Schema = mongoose.Schema;
var test;

var testSchema = new Schema({
    name: String,
    duration:Number,  //Added these extra things to make the timer
    date:Date,
    candidates : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Candidate"
        }
    ]
});

module.exports = test = mongoose.model("Test" , testSchema);
