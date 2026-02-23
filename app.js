const bodyParser = require('body-parser');
const path = require('path'); 
const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const app = express();
require('dotenv/config.js')


const {errorHandler,tokenRefreshHandler} = require('./middleware');
const {authRouter, productRouter, userRouter, adminRouter, categoryRouter, checkoutRouter, orderRouter,assistantRouter} = require('./routers');
const { notFoundController } = require('./controllers');
const autJwt = require('./middleware/jwt');
const { authorizePostRequests } = require('./middleware/authorization.js');

app.use(bodyParser.json());
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());
app.use(autJwt());
app.use(authorizePostRequests);
app.use(tokenRefreshHandler);

require('./helpers/cron_job.js');


mongoose.connect(process.env.DB_URL).then(()=>{
   console.log('[+] Database Connected.')
}).catch((err)=> {
   console.log(err);
});

const hostname = process.env.HOST;
const port = process.env.PORT;
const baseUrl = process.env.API_URL;


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


 app.listen(port,hostname,()=> {
    console.log(`Server running at http://${hostname}:${port}`)
 })