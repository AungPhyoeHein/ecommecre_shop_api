const generateToken = require('../utils/generateToken');
const Token = require('../models/token'); 
const jwt = require('jsonwebtoken'); 

const tokenRefreshHandler =async (err,req,res,next) =>{
        if(err.name == "UnauthorizedError"){
          if(!err.message.includes('jwt expired')){
            return res.status(err.status).json({status: false,msg: err.message,stack:err.stack});
          }
          try {
            const tokenHeader = req.header('Authorization');
            const accessToken = tokenHeader?.split(' ')[1];
            let token = await Token.findOne({ accessToken, refreshToken: { $exists: true } });
            if(!token){
              return res.status(401).json({status: false,code: 401,msg: 'Token does not exits.'})
            }
    
            const user = jwt.verify(token.refreshToken,process.env.REFRESH_TOKEN_SECRET);

            if(!user){
              return res.status(404).json({status:false,code: 404,msg: 'Invalid user!'});
            }
            const newAccessToken = await generateToken(user,'24h',process.env.ACCESS_TOKEN_SECRET);
            req.headers['authorization'] =  `Bearer ${newAccessToken}`;
            await Token.updateOne({ _id: token._id }, { accessToken: newAccessToken }).exec();
    
            res.set('Authorization',  `Bearer ${newAccessToken}`);
            return next();
          } catch (refreshError) {
            return res.status(401).json({code: 401,status:false,msg: err.message,});
          }
    }
}

module.exports = tokenRefreshHandler;