const print = console.log;
const fs = require('fs');

const errorHandler = async (err,req,res,next) => {
    const code = res.code?res.code:500;


     if (code === 500) {
        const logMessage = `Time: ${new Date().toISOString()}
        Message: ${err.message}
        URL Path: ${req.originalUrl}
        Method: ${req.method}
        Stack: ${err.stack}\n\n`;
        
        fs.appendFile('./logs/logs.txt', logMessage, (error) => {
            if (error) {
                print("[-] Error when trying to write error log:", error);
            }
        });
    }
    res
    .status(code)
    .json({ code, status: false, msg: err.message, stack: err.stack });
}

module.exports = errorHandler;