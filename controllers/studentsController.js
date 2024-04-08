const userModel = require("../models/studentsModel")
require("dotenv").config()
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const cloudinary = require('../utils/cloudinary')
const axios = require('axios')

// const {DateTime} = require('luxon')
const imageModel = require("../models/imageModel")

// get the location api url
const API_KEY = process.env.api_key
const CAGE_API_KEY = process.env.cage_api_key

const ipstack_url = `http://api.ipstack.com/102.89.47.60?access_key=${API_KEY}&format=1`


// Register user function
exports.registerUser = async(req,res)=>{
    try {

        // get the requirement for the registration
        const {email, password}  = req.body

        const emailExist = await userModel.findOne({email})
        if (emailExist) {
            return res.status(400).json({
                error: "email already in use by another user"
            })
        }
        
        // hash both password
        const saltPass = bcrypt.genSaltSync(10)
        const hashPass = bcrypt.hashSync(password,saltPass)
        // register the user
        const newUser = await userModel.create({
            email:email.toLowerCase(),
            password:hashPass,
        })
        // generate a token for the user 
        const token = jwt.sign({
            userId:newUser._id,
            email:newUser.email,
        },process.env.JWT_KEY,{expiresIn:"6000s"})

       
        // throw a failure message
        if(!newUser){
            return res.status(400).json({
                error:"error creating your account"
            })
        }
        // success message
        res.status(200).json({
            message:'ACCOUNT CREATED SUCCESSFULLY',
            data: newUser,
            token
        })

    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
}

exports.signIn = async(req,res)=>{
    try {

        // get the requirement
        const {email,password} = req.body
        // check if the user is existing on the platform
        const userExist = await userModel.findOne({email:email.toLowerCase()})
        if(!userExist){
            return res.status(404).json({
                error:"email does not exist"
            })
        }
    
        // check for password
        const checkPassword = bcrypt.compareSync(password,userExist.password)
        if(!checkPassword){
            return res.status(400).json({
                error:"incorrect password"
            })
        }
        // generate a token for the user 
        const token = jwt.sign({
            userId:userExist._id,
            email:userExist.email,
        },process.env.JWT_KEY,{expiresIn:"20d"})

        // throw a success message
        res.status(200).json({
            message:'successfully logged in',
            data:token
        })

    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
}

exports.createImage = async (req, res) => {
    try {
        const { userId } = req.user;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Get the current date and time
        const date = new Date().toLocaleString('en-NG', {timeZone: 'Africa/Lagos', ...{weekday:'short', day: '2-digit', month: 'short', year:'numeric', }})
        const time = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', ...{ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } })

        const [hour,minute] = time.split(':')
        const status = hour >= 12 ? "PM" : "AM"
        const newTime = `${hour}:${minute} ${status}`

        // punctuallity score
        let marks = 0;
        if (newTime <= '09:45:00 AM') {
            marks = 20;
        } else if (newTime <= '09:59:00 AM') {
            marks = 10;
        }

        // get the student loc
        const studentLoc = await axios.get(ipstack_url).then((loc)=>{
            return loc.data
        }).catch((error)=>{
            return error.message 
        })

        const longitude = studentLoc.longitude
        const latitude = studentLoc.latitude

        const cage_url = `https://api.opencagedata.com/geocode/v1/json?key=${CAGE_API_KEY}&q=${latitude},${longitude}`

        const convertedloc = await axios.get(cage_url).then((loc)=>{
            if (loc.data && loc.data.results && loc.data.results.length > 0) {
              return loc.data.results[0].formatted;
                
            } else {
                return 'Location not available'
            }
        }).catch((error)=>{
            return error.message 
        })
        // console.log(convertedloc)

        // Upload image to Cloudinary if available
        let profileImage;
        if (req.file) {
            const file = req.file.path;

            // Create watermark text
            const watermarkText = `TIME: ${newTime}\nDATE: ${date}\nLOC: ${convertedloc}`

            // Upload image with watermark to Cloudinary
             const result = await cloudinary.uploader.upload(file, {
            transformation: [ 
                {
                    gravity: "north_east",
                    overlay: {
                        font_family: "arial",
                        font_size: 18,
                        font_weight: "bold",
                        text: watermarkText,
                        background: "sample",
                    },
                    color: "black"
                }
            ]
        });
        profileImage = result.secure_url;
    }

        // Create a new image document with the updated information
        const newImage = await imageModel.create({
            userId,
            profileImage,
            date,
            location:convertedloc,
            mark:marks,
            time:newTime,
        });

        if (!newImage) {
            return res.status(404).json({
                error: 'Failed to create image document'
            });
        }

        res.status(200).json({
            message: 'image uploaded',
            details: newImage
        });
    } catch (error) {
        // console.error('Error creating image document:', error);
        res.status(500).json({
            error: 'Internal server error'+ error.message
        });
    }
}

exports.getStudentImage = async(req,res)=>{
    try {

        // get the user's id from the token
        const {ID} = req.params

        // get all the images associated to the user
        const images = await imageModel.find().where("userId").equals(`${ID}`)
        if(!images || images.length === 0){
            return res.status(404).json({
                error: "No image uploaded yet"
            })
        }

        const imageDetails = images.map(image => {
            const dateString = image.date;
            const date = new Date(dateString);
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weekday = daysOfWeek[date.getDay()]
        
            return {
                image: image.profileImage,
                day: weekday,
                time:image.time,
                mark:image.mark
            }
        })

        // return image if there's any
        res.status(200).json({
            message: `Here are the ${images.length} images for this student`,
            details: imageDetails
        })

    } catch (error) {
        console.error('Error creating image document:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
}

exports.acknowledgeImage = async(req,res)=>{
    try {

        // get the users id
        const  {ID} = req.params

        // find the images of the id
        const images = await imageModel.find({userId:ID})
        // console.log(images)

        // throw a error message if no image found
        if(!images || images.length === 0){
            return res.status(400).json({
                error:"Image already deleted"
            })
        }
        // delete the images from the cloud
        images.map(async image => {
            const oldImage = image.profileImage.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(oldImage);
        });

        // delete all images for that week
        const deleteImage = await imageModel.deleteMany().where("userId").equals(`${ID}`)

        // throw a success reponse
        res.status(200).json({
            message:"image deleted successfully"
        })

    } catch (error) {
        console.error('Error creating image document:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
}