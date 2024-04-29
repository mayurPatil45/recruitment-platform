const mongoose              = require("mongoose");
const testSchema            = require("./test");
const Schema                = mongoose.Schema;
var codingproblem;

const codingproblemSchema = new Schema({
    test: {type: Schema.Types.ObjectId, ref: 'testSchema'},
    question: String,
    input: String,
    output: String,
    constraints: String,
    sample: String,
});


module.exports = codingproblem = mongoose.model("Codingproblem" , codingproblemSchema);
