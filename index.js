const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
var jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Middleware
app.use(cors());
app.use(express.json())


const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jryyhrc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


async function run() {
  try {
    // await client.connect()
    
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewsCollection = client.db('bistroDb').collection('reviews');
    const cartsCollection = client.db('bistroDb').collection('cart');
    const usersCollection = client.db('bistroDb').collection('users');


    // JWT
    app.post('/jwt', async(req, res)=> {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'});
      res.send({token})
    })


    // Verify TOKEN Middleware
    const verifyToken = (req, res, next) => {
      // console.log(req.headers.authorization);
      if (!req.headers.authorization){
        return res.status(401).send({message: 'Forbidden Access'})
      } 
      const token = req.headers.authorization.split(' ')[1];
      if(!token) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=> {
        if(error){
          return res.status(401).send({ message: "Forbidden Access" });
        } else {
          req.decoded = decoded;
          next();
        }
      })
    }


    const verifyAdmin = async (req, res, next)=> {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if(!isAdmin) {
        return res.status(403).send({message: "Forbidden Access"})
      }
      next()
    }


    // User
    app.post('/users', async(req, res)=> {
      const user = req.body;
      
      // insert email if user doesn't exist
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      if(existingUser) {
        return res.send({message: 'User Already Exist', insertedId: null})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users', verifyToken, verifyAdmin, async(req, res)=> {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })



    app.get('/user/admin/:email', verifyToken, async(req, res)=> {
      const email = req.params.email;
      if(email !== req.decoded.email) {
        return res.status(403).send({message: "Un-Authorized Access"})
      }
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      let admin = false;
      if(user) {
        admin = user?.role === 'admin'
      }
      res.send({admin})
    })

    



    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set : {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result)
    })



    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })



    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });


    app.get('/carts', async(req, res)=> {
      const email = req.query.email;
      const query = {email: email}
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })




    // carts collection

    app.post('/carts', async(req, res)=> {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result)
    })



    // delete

    app.delete('/carts/:id', async(req, res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })

   



    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    
    
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Bistro boss is running");
});

app.listen(port, ()=> {
    console.log("Bistro Boss is running in port", port)
})