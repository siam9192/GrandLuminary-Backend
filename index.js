const express = require('express');
const cors = require('cors');
const port = 5000;
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const app = express();
const products = require('./products')

app.use(cors())
app.use(express.json());
app.use(cookieParser());
app.get('/',(req,res)=>{
    res.send('working')
})
app.listen(port)


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.katjfem.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    const db = client.db('Electio');
    const productCollection = db.collection('Products');
    const registered_users = db.collection('Users') 
    const cartCollection = db.collection('Products')
    const productsReviewCollection = db.collection('Reviews');
   

    app.post('/api/v1/user/add',async(req,res)=>{
      const user = req.body;
      const email = user.email;
      const userExistStatus = await registered_users.findOne({email});
    // check user if the user is exist on the database it will send user exist status true and then return other wish user data will added on the database

      if(userExistStatus){
        res.send({
        exist: true
        })
        return;
      }
      const result = await registered_users.insertOne(user);
      res.send(result);
      
    })
      app.get('/api/v1/check_user',async(req,res)=>{
    const email = req.params.email;
    // check the user account status if the user is blocked it will send the account status true;
    const result = await registered_users.findOne({email:email,isBlocked: true});
    if(result){
      res.send({status:true})
    }
    else{
      res.send({status:false})
    }
  })


  // get  products based on search 
  app.get('/api/v1/get/products',async(req,res)=>{
    const params = req.query;
   
    // search variable
    const keyword = params.key;
    const categories = params.categories.split(',').filter(val=>val !== '')|| [];
    const brands = params.brands.split(',').filter(val=>val !== '')||[];
    const minimumPrice = parseInt(params.minPrice)
    const maximumPrice = parseInt(params.maxPrice);
    const stockStatus = parseInt(params.parseInt);
    productCollection.createIndex({
      model:'text',
      description: 'text'
      // 'details.name':'text',
      // 'details.category':'text'
    })

    const filter = {
    };
  
    // variable for sorting data
    const sortValue = params.sort;
    const sort = {
    
    }
    
  if (categories.length) {
    filter['details.category'] = {$in:categories}
  }
  if (brands.length){
    filter['details.brand'] = {$in:brands}
  }
  // if(colors.length){
  //   filter.colors=colors
  // }
 
  // if(minimumPrice){
  //   filter.minimumPrice = minimumPrice;
  // }
  // if(maximumPrice !== '' || maximumPrice !== undefined){
  //   filter.maximumPrice = maximumPrice;
  // }
  // if(stockStatus)
  //   filter.quantity = {$gt:0}

 console.log(filter)
    const result = await productCollection.find(filter).toArray();
    res.send(result)
    // console.log(result)
  })

  app.get('/api/v1/get/product/:id',async(req,res)=>{
    const id = req.params.id;

    const filter = {
      _id: new ObjectId(id)
    }
    const product = await productCollection.findOne(filter);
    res.send(product)
  })
  
 
 
  } finally {
   
  }
}
run().catch(console.dir);
