const { User } = require("../models")

const getUsers = async (req,res,next) =>{
    try {
        const users = await User.find({}).select('name email _id isAdmin');
        if(!users){
            res.code = 404;
            throw new Error("User not Found");
        }
        return res.json(users);
    } catch (err) {
        next(err);
    }
}

const getUserById = async (req,res,next)=> {
   try {
        const user = await User.findById(req.params.id).select('-password -resetPasswordOtp -resetPasswordOtpExpires');
        if(!user){
            res.code = 404;
            throw new Error("User not Found");
        }
        return res.json(user);
    } catch (err) {
        next(err);
        
    }
}

const updateUser = async (req,res,next) =>{
    try {
        
    } catch (err) {
        next(err);
    }
}

module.exports = {getUsers,getUserById,updateUser}