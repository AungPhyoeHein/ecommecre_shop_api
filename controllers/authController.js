const {validationResult} = require('express-validator');
const hashPassword = require('../utils/hashPassword');
const { User } = require('../models');
const comparePassword = require('../utils/comparePassword');
const generateToken = require('../utils/generateToken');
const Token = require('../models/token');
const sendMail = require('../helpers/email_send');
const jwt = require('jsonwebtoken');


const signUp = async (req, res, next) => {
  const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map((error)=>({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({errors: errorMessage});
    }
  try {
    
    const { name, email,phone, password } = req.body;
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(400).json({
      "errors": [
        {
          "field": "email",
          "message": "User with that email already exists."
        },
      ]
    })
    } else {
      const hashedPassword = await hashPassword(password);
      let user =  new User({ name, email, password: hashedPassword,phone });
      user = await user.save();
      if(!user){
        throw new Error("Could not create user.");
      }
      res
        .status(201)
        .json({ code: 201, status: true, msg: "Register Successful." });
    }
  } catch (err) {
    next(err);
  }
};


const login = async function (req,res,next) {
  const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map((error)=>({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({errors: errorMessage});
    }
  try {
    const {email,password} = req.body;
    const user = await User.findOne({email}).select('+password');
    if(!user){
      res.code = 400;
      throw new Error("User not found.Check you email and try again");      
    }
    const isMatch = await comparePassword(password,user.password);
    if(!isMatch){
      res.code = 400;
      throw new Error("Incorrect password");
    }

    const accessToken = generateToken(user,'24h',process.env.ACCESS_TOKEN_SECRET);
    const refreshToken = generateToken(user,'60d',process.env.REFRESH_TOKEN_SECRET);
    const token = await Token.findOne({userId: user._id});
    if(token) await token.deleteOne();
    await new Token({
      userId: user._id,
      accessToken,
      refreshToken
    }).save();
    user.password = undefined;
    return res.status(200).json({...user._doc,accessToken});
    
  } catch (err) {
    next(err);
  }
}

const verifyToken = async (req,res,next)=>{
  try {
    let accessToken = req.headers.authorization;
    if(!accessToken) {
      res.code = 400;
      throw new Error("Login required");
    }
    accessToken = accessToken.replace('Bearer', '').trim();

    const token = await Token.findOne({accessToken});
    if(!token){
      res.code = 400;
      throw new Error('Login required');
    }

    const tokenData = jwt.decode(token.refreshToken);
        const isValid = jwt.verify(token.refreshToken, process.env.REFRESH_TOKEN_SECRET);

    if(!isValid){
      res.code = 400;
      throw new Error("Invalid Token");
    }
    
    const user = await User.findById(tokenData._id);

    if(!user){
      res.code = 400;
      throw new Error("User not found");
    }


    return res.json(true)

  } catch (err) {
    next(err);
  }
}

const forgotPassword = async(req,res,next)=>{
  const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map((error)=>({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({errors: errorMessage});
    }
  try {
    const {email} =  req.body;
    const user = await User.findOne({email});
    if(!user){
      res.code = 404;
      throw new Error("User with that email does not exits.");
    }
    const otp = Math.floor(1000 + Math.random()* 9000);
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 600000;
    await user.save();
    const result = await sendMail(email, `Password Reset OTP`,`Your otp for password reset is :${otp}`);
    if(!result){
       throw new Error("Error sending email.");
    }
    res.status(200).json({ code: 200, status: true, msg: 'Password reset OTP sent to your email.'})
  } catch (err) {
    next(err);
  }
}

const verifyResetOTP = async (req,res,next)=> {
  const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map((error)=>({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({errors: errorMessage});
    }
  try {
    const {email,otp} = req.body;
    const user = await User.findOne({email}).select('resetPasswordOtp resetPasswordOtpExpires');
    if(!user){
      res.code = 404;
      throw new Error("User with that email does not exits.");
    }

    if(user.resetPasswordOtp  !== otp || Date.now() > user.resetPasswordOtpExpires.getTime()){
      res.code = 401;
      throw new Error('Invalid or expired OTP.');
    }
    user.resetPasswordOtp = 1;
    user.resetPasswordOtpExpires= undefined;
    await user.save();
    res.status(200).json({ code: 201, status: true, msg: 'Password Reset OTP confirmed Successfully.'})
    } catch (err) {
      next(err)
    }
}

const resetPassword = async (req,res,next) => {
  const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessage = errors.array().map((error)=>({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({errors: errorMessage});
    }
  try {
    const {email,newPassword} = req.body
    const user = await User.findOne({email}).select('resetPasswordOtp resetPasswordOtpExpires');
    
    if(!user){
      res.code = 404;
      throw new Error("User with that email does not exits.");
    }
    if(user.resetPasswordOtp !== 1){
      res.code = 401;
      throw new Error("Confirm OTP before resting password");
    }

    const password =await  hashPassword(newPassword);
    user.password = password;
    user.resetPasswordOtp = undefined;
    await user.save();

    return res.status(200).json({code:200,status:true,msg:"Password reset successfully."})
  } catch (err) {
    next(err)
  }
}

module.exports = {login,signUp,verifyToken,forgotPassword,verifyResetOTP,resetPassword};