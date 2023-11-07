const express = require('express');
const cors = require('cors');
const port = 5000;
const cookieParser = require('cookie-parser');
// const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}))
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
    const db = client.db('Grand-Lumainary');
    const collectionReviews = db.collection('Reviews');
    const roomsCollection = db.collection('Rooms');
    const collectionBooking = db.collection('Bookings');
    
    app.get('/api/v1/rooms',async(req,res)=>{
const result = await roomsCollection.find().toArray();
res.send(result)

    })
    // app.get('/api/v1/room',async(req,res)=>{
    //   const id = req.query.id
    //   const query = {
    //     _id : new ObjectId(id)
    //   }
    //   const result = await roomsCollection.findOne(query);
    //   res.send(result)
    // })
     app.get('/api/v1/room/get',async(req,res)=>{
        const id = req.query.id
      const query = {
        _id : new ObjectId(id)
      }
      const result = await roomsCollection.findOne(query);
      res.send(result)
     })
app.get('/api/v1/bookings',async(req,res)=>{
  const query = req.query;
const result = await collectionBooking.find(query).toArray();
res.send(result)

})
    app.get('/api/v1/reviews',async(req,res)=>{
      const query = req.query;
      const result = await collectionReviews.find(query).toArray();
      res.send(result)
    })
    app.get('/api/v1/find/booking',async(req,res)=>{
      const query = req.query;
      const result = await collectionBooking.find(query).toArray();
      res.send(result);
    })
   
    app.post('/api/v1/rooms/new',async(req,res)=>{
      const room = req.body;
      const result = await roomsCollection.insertOne(room);
      res.send(result)
    })
    app.post('/api/v1/booking/new',async(req,res)=>{
      const booking = req.body;
      // console.log(booking)
      const result = await collectionBooking.insertOne(booking);
      res.send(result)
    })
    app.post('/api/v1/reviews/post',async(req,res)=>{
      const review = req.body;
      const result = await collectionReviews.insertOne(review);
      res.send(result)
    })
    
    app.patch('/api/v1/update-room',async(req,res)=>{
      const query = req.body;
      const filter = {
        _id: new ObjectId(req.query.id)
      }
      const updatedDoc = {
        $set: query
      }
     
      const result = await roomsCollection.updateOne(filter,updatedDoc);
      console.log(result)
      res.send(result)
    })
    app.patch('/api/v1/booking/update',async(req,res)=>{
      const id = req.query.id;
      const query = req.body;
      const filter = {
        _id : new ObjectId(id)
      }
      const updatedDoc = {
        $set: query      }
      const result = await collectionBooking.updateOne(filter,updatedDoc);
      res.send(result)
      
console.log(result)
    })
    app.delete('/api/v1/booking/delete/:id',(req,res)=>{
      const {id} = req.params ;
      const query = {_id: new ObjectId(id)};
      const result = collectionBooking.deleteOne(query);
      res.send(result);
    })
    
  } finally {
   
  }
}
run().catch(console.dir);
