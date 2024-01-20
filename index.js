const express = require('express');
const cors = require('cors');
const port = 5000;
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const app = express();

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
    const db = client.db('Ego-Ecommerce');
    const productCollection = db.collection('Products');
    const registered_users = db.collection('Users') 
    const cartCollection = db.collection('Carts')
    const productsReviewCollection = db.collection('Reviews')

    app.get('/products',async(req,res)=>{
      const query = req.query;
      const filter = { 
       }
      const category = query.category.split('--');
      const brands  = query.brands.split('--');
      const minPrice = parseInt(query.minPrice);
      const maxPrice = parseInt(query.maxPrice);

      const perPage = parseInt(query.perPage);
      const currentPage = parseInt(query.currentPage)
      console.log(currentPage)
      category.shift();
      brands.shift();
    if(category.length){
      filter.category={$in:category}
    }
    if(brands.length){
      filter.brand = {$in:brands}
    }
    if(minPrice){
      filter.pricing = {}
      filter.pricing.price = {}
     filter.pricing.price.$gt = minPrice
    }
    if(maxPrice){
      if(filter.pricing){
      filter.pricing.price.$lt = maxPrice
      }
      else{
        filter.pricing = {}
        filter.pricing.price.$lt = maxPrice
      }
     }

 
      const result = await productCollection.find(filter).skip((currentPage-1)*perPage).limit(perPage).toArray();
      res.send(result);
      
    })
    app.get('/products/document-count',async(req,res)=>{
      const query = req.query;
      const filter = {  }
      const category = query.category.split('--');
      const brands  = query.brands.split('--');
      const minPrice = parseInt(query.minPrice);
      const maxPrice = parseInt(query.maxPrice);
      category.shift();
      brands.shift();
    if(category.length){
      filter.category={$in:category}
    }
    if(brands.length){
      filter.brand = {$in:brands}
    }
    if(minPrice){
      filter.pricing = {}
      filter.pricing.price = {}
     filter.pricing.price.$gt = minPrice
    }
    if(maxPrice){
      if(filter.pricing){
      filter.pricing.price.$lt = maxPrice
      }
      else{
        filter.pricing = {}
        filter.pricing.price.$lt = maxPrice
      }
     }
   const result = await productCollection.countDocuments(filter);
   res.send({document:result})
  

    })

    app.get('/product/get-details/:id',async(req,res)=>{
      const query = {
        _id:new ObjectId(req.params.id)
      }
      const result = await productCollection.findOne(query);
      res.send(result)
    })
    app.get('/products-all/new-arrivals',async(req,res)=>{
      const category = req.query.category;
      const filter = {
        category
      }
      const result = await productCollection.find(filter).toArray();
      res.send(result)
    
    })
     app.post('/product/post',async(req,res)=>{
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result)
     })

     app.get('/products/deal-of-the-day',async(req,res)=>{
      const query = {
        currentStatus:'Deal of the day'
      }
      const result = await productCollection.find(query).toArray();
      res.send(result)
     })
     app.get('/products/best-selling',async(req,res)=>{
      const query = {
        currentStatus:'Best Selling'
      }
      const result = await productCollection.find(query).toArray();
      res.send(result)
     })
     app.get('/products/recomended',async(req,res)=>{
      const query = {
        'pricing.discount': {
          $gt: 0
        }
      }
      const result = await productCollection.find(query).toArray();
      res.send(result)
     })
   
  // Add to cart
app.post('/add-to-cart',async(req,res)=>{
const cart = req.body;
const result = await cartCollection.insertOne(cart);
res.send(result)
})

  // users Cart
  app.get('/user/cart/:email',async(req,res)=>{
    const email = req.params.email;
    const query = {email};
    const result = await cartCollection.find(query).toArray();
    res.send(result)
  })
  app.delete('/user/cart/delete',async(req,res)=>{
    const id = req.query.id;
    const filter = {
      _id: new ObjectId(id)
    }
  
    const result = await cartCollection.deleteOne(filter);
    res.send(result)
    console.log(result)
   
  })

  // stripe payment 
  app.post('/create-checkout-session',async(req,res)=>{
    const {products} = req.body;
    // const metaData = {
    //   userEmail:
    // }
    const getPercentageValue = (mainNumber,percent)=>{
      const result = (percent/100)*mainNumber;
      return parseInt(result);
    }
    
    const lineItems = products.map((product)=>({
      price_data :{
        currency:'USD',
        product_data:{
          name:product.name,
          images:[product.image]
        },
        unit_amount:Math.round(product.price * 100),
      },
      quantity:product.quantity

    }))
 
    const session = await stripe.checkout.sessions.create({
      payment_method_types:['card'],
      line_items:lineItems,
      mode:'payment',
      metadata:
        {
          customer:JSON.stringify(products.map(cart=>cart.email)),
          cartsId:JSON.stringify(products.map(cart=> cart._id))
        }
      ,
      success_url:'http://localhost:5173/ego/my-cart',
      cancel_url:'http://localhost:5173/ego/my-cart'
    })
    res.json({id:session.id})
  })

        
app.post('/webhook',bodyParser.raw({type: 'application/json'}),async(req, res) => {
  const sig = req.headers['stripe-signature'];
  const payload = req.body;
  const payloadString = JSON.stringify(payload, null, 2);
  const secret = "whsec_22f77f73c6ecf54cf254a3e62b3dd223d18e7a3cc8833cb153c54e9f2473d57f";
  const header = stripe.webhooks.generateTestHeaderString({
          payload: payloadString,
          secret,
  });
  
   let event;
   try {
        event = stripe.webhooks.constructEvent(payloadString, header, secret);
  
   } catch (err) {
          console.log(`Webhook Error: ${err.message}`)
          return res.status(400).send(`Webhook Error: ${err.message}`);
   }
   console.log(event.data.object.metadata.customer)
  //  console.log(JSON.parse(event.data.object.metadata))

  // Handle the event
  // switch (event.type) {
  //   case 'payment_intent.succeeded':
  //     const paymentIntentSucceeded = event.data.object;
  //     console.log(paymentIntentSucceeded)
  //     // Then define and call a function to handle the event payment_intent.succeeded
  //     break;
  //   // ... handle other event types
  //   default:
  //     console.log(`Unhandled event type ${event.type}`);
  // }
  // if(eventType === 'checkout.session.completed'){
  // stripe.customers.retrieve(data.metadata).then((metaData)=>{
  //   console.log(custom_fields)
  // }).catch(err=> console.log(err.message))
  // }
  // Return a 200 response to acknowledge receipt of the event
  res.send();

});
 

  // registration 
  app.post('/users/registration',async(req,res)=>{
    const user = req.body;
  const result = await registered_users.insertOne(user);
  res.send(result)
  })

  app.post('/product/review/post',async(req,res)=>{
    const review = req.body;
    const result = await productsReviewCollection.insertOne(review);
    res.send(result);
  })
  app.get('/product/get-reviews',async(req,res)=>{
    const id = req.query.id;
    const filter = {
      productId:id
    }
   
    const result = await productsReviewCollection.find(filter).toArray();
    res.send(result)
  })
  
  } finally {
   
  }
}
run().catch(console.dir);
