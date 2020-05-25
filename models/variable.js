const mongoose = require('mongoose')

let VariableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 20
    },
    value: {
        type: String,
        required: true,
        maxlength: 200
    }
})

const Variable = mongoose.model("Variable", VariableSchema)
module.exports = Variable