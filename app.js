const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const app = express();
require('dotenv/config.js')


const {errorHandler,tokenRefreshHandler} = require('./middleware');
const {authRouter, productRouter, userRouter} = require('./routers');
const { notFoundController } = require('./controllers');
const autJwt = require('./middleware/jwt');

 app.use(bodyParser.json());
 app.use(morgan('tiny'));
app.use(cors());
app.use(autJwt());
app.use(tokenRefreshHandler);


mongoose.connect(process.env.DB_URL).then(()=>{
   console.log('[+] Database Connected.')
}).catch((err)=> {
   console.log(err)
});


 const hostname = process.env.HOST;
 const port = process.env.PORT;


app.use(`${process.env.API_URL}/auth`,authRouter);
app.use(`${process.env.API_URL}/user`,userRouter)
// app.use(`${process.env.API_URL}/products`,productRouter)

//not Found page
app.use(notFoundController);
 //Error Handler
app.use(errorHandler);

 app.listen(port,hostname,()=> {
    console.log(`Server running at http://${hostname}:${port}`)
 })