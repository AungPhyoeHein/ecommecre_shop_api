const bodyParser = require('body-parser');
const path = require('path'); 
const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const app = express();
require('dotenv').config()


const {errorHandler,tokenRefreshHandler} = require('./middleware');
const {authRouter, productRouter, userRouter, adminRouter, categoryRouter, checkoutRouter, orderRouter,assistantRouter} = require('./routers');
const { notFoundController } = require('./controllers');
const autJwt = require('./middleware/jwt');
const { authorizePostRequests } = require('./middleware/authorization.js');

// Global mongoose configuration
mongoose.set('bufferCommands', false); // Disable buffering globally

// Database connection management
let connectionPromise = null;

const connectToDatabase = async () => {
    // 1 = connected, 2 = connecting
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (mongoose.connection.readyState === 2) {
        if (connectionPromise) {
            await connectionPromise;
        }
        return;
    }

    if (!process.env.DB_URL) {
        console.error('[-] DB_URL is not defined in environment variables.');
        return;
    }

    try {
        console.log('[*] Connecting to Database...');
        connectionPromise = mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        await connectionPromise;
        console.log('[+] Database Connected.');
    } catch (err) {
        console.error('[-] Database Connection Error:', err.message);
        connectionPromise = null; // Reset promise on failure
    }
};

// Middleware to ensure DB is connected before processing requests
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database connection is not established. Please try again later.'
            });
        }
        next();
    } catch (error) {
        next(error);
    }
});

app.use(bodyParser.json());
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());
app.use(autJwt());
app.use(authorizePostRequests);
app.use(tokenRefreshHandler);

// require('./helpers/cron_job.js'); // Optional: Cron jobs might not work as expected in serverless environment

const hostname = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 8080;
const baseUrl = process.env.API_URL || '/api/v1';


app.use(`${baseUrl}/auth`,authRouter);
app.use(`${baseUrl}/admin`,adminRouter);
app.use(`${baseUrl}/users`,userRouter);
app.use(`${baseUrl}/categories`,categoryRouter);
app.use(`${baseUrl}/products`,productRouter);
app.use(`${baseUrl}/checkout`,checkoutRouter);
app.use(`${baseUrl}/orders`,orderRouter);
app.use(`${baseUrl}/assistant`,assistantRouter);


app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.use(`${baseUrl}/public`,express.static(__dirname,'/public'));


//not Found page
app.use(notFoundController);
 //Error Handler
app.use(errorHandler);


if (process.env.NODE_ENV !== 'production') {
    app.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}`);
    });
}

module.exports = app;