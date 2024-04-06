const cloudinary = require("cloudinary").v2
const dotenv = require("dotenv")
dotenv.config()         

cloudinary.config({ 
  cloud_name: process.env.cloud_name,
  api_key: process.env.cloud_key,
  api_secret:  process.env.cloud_secret,
});


module.exports = cloudinary