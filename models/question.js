
var mongoose              = require("mongoose");
var testSchema            = require("./test");
const Schema              = mongoose.Schema;
var question;

var questionSchema = new Schema({
    test: {type: Schema.Types.ObjectId, ref: 'testSchema'},
    question: String,
    option1: String,
    option2: String,
    option3: String,
    option4: String,
    answer: String
});


module.exports = question = mongoose.model("Question" , questionSchema);
