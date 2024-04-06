const userModel = require("../models/studentsModel");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        // Get the token and split it from the bearer
        const token = req.headers.authorization.split(" ")[1];
        if (!token) {
            return res.status(404).json({
                error: "Authorization failed: token not found"
            });
        }
        // Check the validity of the token
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        
        // Find user by ID in userModel
        let user = await userModel.findById(decodedToken.userId);
        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        // Check if the token is blacklisted
        if (user.blackList.includes(token)) {
            return res.status(400).json({
                error: "Unable to perform this action: User is logged out"
            });
        }

        // Store the user object in the request object
        req.user = {
            userId: user._id
        };
        
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(400).json({
                error: "Session Timeout"
            });
        }
        res.status(500).json({
            error: error.message
        });
    }
};


module.exports = { authenticate };