const {expressjwt : expjwt} = require('express-jwt');
const Token = require('../models/token.js')

function autJwt() {
    const API = process.env.API_URL;
    return expjwt({secret: process.env.ACCESS_TOKEN_SECRET,algorithms: ['HS256'],isRevoked: isRevoked}).unless({path: [`${API}/auth/login`,
        `${API}/auth/login/`,
            `${API}/auth/register`,
            `${API}/auth/forgot-password`,
            `${API}/auth/verify-otp`,
            `${API}/auth/reset-password`]})
}

async function isRevoked(req,jwt) {
    const authHeader = req.header('Authorization');

    if(!authHeader.startsWith('Bearer')) {
        return true;
    }
    const accessToken = authHeader.replace('Bearer','').trim();
    const token = await Token.findOne({accessToken});

    const adminRouteRegex = /^\/api\/v1\/admin\//i;
    const adminFault = !jwt.payload.isAdmin && adminRouteRegex.test(req.originalUrl);
    return adminFault || !token;
}

module.exports = autJwt;