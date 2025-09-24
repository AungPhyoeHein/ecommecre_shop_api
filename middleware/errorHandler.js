const print = console.log;
const fs = require('fs');

const errorHandler = (err,req,res,next) => {
    const code = res.code?res.code:500;
    if(code == 500){
        fs.appendFile('./logs/logs.txt',`Message : ${error.message}\nURL Path: ${req.originalUrl}\nStack : ${error.stack}\n\n\n\n`, (error) => {
        if (error) {
          print("[-] Error when try to write error log.");
        }
      });
    }
    res
    .status(code)
    .json({ code, status: false, msg: err.message, stack: err.stack });
}

module.exports = errorHandler;