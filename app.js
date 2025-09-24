const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
const app = express();
require('dotenv/config.js')


const {errorHandler} = require('./middleware');
const {authRouter, productRouter} = require('./routers');

 app.use(bodyParser.json());
 app.use(morgan('tiny'));
app.use(cors());
// app.options('*',cors())

mongoose.connect(process.env.DB_URL).then(()=>{
   console.log('[+] Database Connected.')
}).catch((err)=> {
   console.log(err)
});


 const hostname = process.env.HOST;
 const port = process.env.PORT;


app.use('/api/v1/auth',authRouter);
app.use('/api/v1/products',productRouter)

 //Error Handler
 app.use(errorHandler);

 app.listen(port,hostname,()=> {
    console.log(`Server running at http://${hostname}:${port}`)
 })