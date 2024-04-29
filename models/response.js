var mongoose              = require("mongoose");
var questionsSchema       = require("./question");
const Schema = mongoose.Schema;


var responseSchema = new Schema({
    answer: String,
    question: {type: Schema.Types.ObjectId, ref: 'questionSchema'}
});


module.exports = mongoose.model("Response" , responseSchema);
