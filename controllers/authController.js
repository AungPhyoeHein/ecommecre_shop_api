const login = (req,res,next) => {
    try {
        const {email,password} = res;
        res.statue(200).json({'email': email,'password': password})
    } catch (err) {
        res.code = 400;
        throw new Error("Email or Password Required.");
        
    }
}
const signUp = (req,res,next) => {
    try {
        
    } catch (err) {
        
    }
}

module.exports = {login,signUp};