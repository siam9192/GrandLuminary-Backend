const express = require('express');
const cors = require('cors');
const port = 5000||process.env.PORT;
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const app = express();
const products = require('./products')
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = 'xyz65d66ae37304b'
const store_passwd = 'xyz65d66ae37304b@ssl'
const is_live = false //true for live, false for sandbox

app.use(cors())
app.use(express.json());
app.use(cookieParser());
app.get('/',(req,res)=>{
    res.send(port)
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
    const cartCollection = db.collection('Carts')
    const productsReviewCollection = db.collection('Reviews');
    const orderCollection = db.collection('Orders');

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
    app.get('/api/v1/get/user/:email/profile',async(req,res)=>{
      const email = req.params.email;
   
      const user = await registered_users.findOne({email:email})
      res.send(user);
      
    })
    app.put('/api/v1/update/user/profile',async(req,res)=>{
      const email = req.body.email;
      const data  = req.body.updatedProfile;
     const filter = {
      email
     }

     const update = {
      $set:data
     }
     const result = await registered_users.updateOne(filter,update);
     res.send(result)

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
    const perPage = parseInt(params.perPage);
    const currentPage = parseInt(params.currentPage)
    const sort = params.sort
  
    const filter = {
    };
  
    // variable for sorting data
    const sortValue = params.sort;
    const sortFilter = {
    
    }
    
  if (categories.length) {
    filter['details.category'] = {$in:categories}
  }
  if (brands.length){
    filter['details.brand'] = {$in:brands}
  }
  if(minimumPrice || maximumPrice){
    filter['pricing.discountPrice']  = {}
    // = {
    //   $and:[

    //   ]
    // }
  }
  if(minimumPrice){

    filter['pricing.discountPrice'].$gt = minimumPrice;
  }
  if(maximumPrice){
    filter['pricing.discountPrice'].$lt = maximumPrice;
  }

  if(sort === 'p-l-h'){
    sortFilter['pricing.discountPrice'] = 1
  }
  else if(sort === 'p-h-l'){
    sortFilter['pricing.discountPrice'] = -1
  }
  else if(sort === 's'){
    sortFilter['pricing.details.sold'] = -1
  }
  console.log(sort)
  console.log(
    sortFilter
  )
   const totalProducts = await productCollection.countDocuments(filter);
  
    const result = await productCollection.find(filter).sort(sortFilter).skip((currentPage-1)*perPage).limit(perPage).toArray();
  
    res.send({
      products:result,
      totalProducts
    })
    
  })
 app.get('/api/v1/product/category',async(req,res)=>{
const categories = []
 })
  app.get('/api/v1/get/product/:id',async(req,res)=>{
    const id = req.params.id;

    const filter = {
      _id: new ObjectId(id)
    }
    const product = await productCollection.findOne(filter);
    res.send(product)
  })

  app.get('/api/v1/related/products',async(req,res)=>{
    const category = req.query.category;
    const id = req.query.id
   
    const filter = {_id:{$ne: new ObjectId(id)},'details.category': category}
    const result = await productCollection.find(filter).toArray();
    res.send(result)
  
  })
  app.get('/api/v1/get/flash-sales/products',async(req,res)=>{
    const result = await productCollection.find().limit(8).toArray();
    res.send(result)
    
  })
   app.get('/api/v1/get/suggested/products',async(req,res)=>{
    const bestSelling = await productCollection.find().sort({'details.sold': -1}).limit(3).toArray();
    const recentAdded = await productCollection.find().sort({_id:-1}).limit(3).toArray();
    
    const products = {
      bestSelling,
      recentAdded
    }
   res.send(products)
   })
  

  //   add products on user cart

  app.post('/api/v1/add/product/cart',async(req,res)=>{
    const cart = req.body;
    const id = new ObjectId(cart.product_id);
    cart.product_id = id
   
    const result = await cartCollection.insertOne(cart);
    res.send(result)
    
  })
  
  // get user cart items 
  app.get('/api/v1/get/product/cart/user',async(req,res)=>{
    const email = req.query.email;
   if(!email){
   return res.send([])

   }
    const filter = [
      {
        $lookup:{
          from:'Products',
          localField:'product_id',
          foreignField: "_id",         // Field in the productsCollection
          as: "product_details"
        }
      },
      {
        $match: {
          customer:email
        }
      }
  
    ]
    
    const result = await cartCollection.aggregate(filter).toArray();
    res.send(result)
    
  })
 app.delete(`/api/v1/delete/product/cart/:id/user`,async(req,res)=>{
  const id = req.params.id;
  const filter = {
    _id: new ObjectId(id)
  }
  const result = await cartCollection.findOneAndDelete(filter);
 if(result){
res.send({deleteStatus:true})
 }
 else{
  res.send({deleteStatus:false})
 }
  
  
 })


 app.post('/api/v1/cart/payment', async(req, res) => {

  const body = req.body;
  
  const transitionId = new ObjectId().toString();


  const data = {
      total_amount: body.total,
      currency: 'BDT',
      tran_id: transitionId, // use unique tran_id for each api call
      success_url: `http://localhost:5000/get/success/${transitionId}`,
      fail_url: 'http://localhost:3030/fail',
      cancel_url: 'http://localhost:3030/cancel',
      ipn_url: 'http://localhost:3030/ipn',
      shipping_method: 'Courier',
      product_name: 'Computer.',
      product_category: 'Electronic',
      product_profile: 'general',
      cus_name: 'Customer Name',
      cus_email: 'customer@example.com',
      cus_add1: 'Dhaka',
      cus_add2: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01711111111',
      cus_fax: '01711111111',
      ship_name: 'Customer Name',
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    
     
  };

  const orderTime ={
    date:{
     day: new Date().getDay(),
     month: new Date().getMonth()+1,
     year: new Date().getFullYear()
    },
    time:{
     hours: new Date().getHours(),
     minute: new Date().getMinutes(),
     seconds: new Date().getSeconds()
    }
 }
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
  sslcz.init(data).then(apiResponse => {
      // Redirect the user to payment gateway
      let GatewayPageURL =  apiResponse.GatewayPageURL
      if(GatewayPageURL){
        body.transitionId = transitionId;
        body.orderStatus = 'cancel'
        body.orderTime = orderTime
        orderCollection.insertOne(body)
      }
      res.send({url:GatewayPageURL})
      console.log('Redirecting to: ', GatewayPageURL)
  });

  app.post('/get/success/:id',async(req,res)=>{
      const transitionId = req.params.id;
      const update = {
        $set:{
          orderStatus: 'success'
        }
      }
      const order = await orderCollection.updateOne({transitionId:transitionId},update);
     if(order.modifiedCount){
      const productsId = body.products.map((item)=> new ObjectId(item.cart_id));

     await cartCollection.deleteMany({_id:{
      $in:[...productsId]
     }})
      res.redirect('http://localhost:5173/my-cart')

     }
  })
})

  } finally {
   
  }
}
run().catch(console.dir);
