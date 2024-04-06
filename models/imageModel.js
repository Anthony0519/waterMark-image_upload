const mongoose = require("mongoose")

const createImageSchema = new mongoose.Schema({
    userId:{
            type: mongoose.SchemaTypes.ObjectId,
            ref: "user"
    },      
    profileImage:{
        type:String,
    },       
    location:{
        type:String,
    },       
    mark:{
        type:Number,
    },       
    date:{
        type:String,
    },       
    time:{
        type:String,
        }
})

const createImageModel = mongoose.model("createImage",createImageSchema)

module.exports = createImageModel