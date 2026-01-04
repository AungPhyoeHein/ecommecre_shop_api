const print = console.log;
const fs = require('fs');


const getErrorType = (err, code) => {
    if (code >= 500) {
        return 'InternalServerError';
    }
    
    switch (err.name) {
        case 'CastError':
            return 'InvalidInputError'; 
        case 'ValidationError':
            return 'ValidationError';
        case 'ReferenceError':
        case 'TypeError':
            return 'ProgrammingError';
        default:
            if (code === 400) return 'BadRequestError';
            if (code === 401) return 'UnauthorizedError';
            if (code === 403) return 'ForbiddenError';
            if (code === 404) return 'NotFoundError';
            return 'ServiceError';
    }
};

const errorHandler = async (err,req,res,next) => {
    const code = res.code?res.code:500;
    let type = getErrorType(err,res.code);

    if (res.headersSent) {
        return next(err); 
    }

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
    .json({ code,type, status: false, message: err.message, stack: err.stack });
}

module.exports = errorHandler;