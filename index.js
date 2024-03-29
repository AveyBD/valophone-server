const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middlware
app.use(cors());
app.use(express.json());

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@valophone.otugk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ messasge: "Unauthorized Access" });
  } else {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ messasge: "Forbidden Access" });
      }
      req.decoded = decoded;
      return next();
    });
  }
}

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("ValoPhone").collection("products");
    const usersCollection = client.db("ValoPhone").collection("users");
    const ordersCollection = client.db("ValoPhone").collection("orders");
    const reviewsCollection = client.db("ValoPhone").collection("reviews");

    // basic all product api
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
    // basic all reviews api
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    // get single product
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    // get all order
    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // get user order
    app.get("/myorders", verifyJWT, async (req, res) => {
      const user = req.query.mail;
      const decodedMail = req?.decoded?.email;
      if (user === decodedMail) {
        const query = { user: user };
        const cursor = ordersCollection.find(query);
        const orders = await cursor.toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // get single order info
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    // add order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    // make paid
    app.put("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paymentStatus: "paid",
          trxId: "AdminPay",
        },
      };
      const result = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // admin shipment
    app.put("/ship/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const date = new Date().toLocaleString();
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paymentStatus: "W/O Pay",
          trxId: "Shipped W/O Pay",
          orderStatus: "shipped",
          shippingDate: date,
        },
      };
      const result = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      res.send(result);
    });
    // Add Product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    // Add Reviews
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // delete api
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });
    // get all user
    app.get("/users", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // get single user info
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const order = await usersCollection.findOne(query);
      res.send(order);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // insert user into database
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const user = req.body;
      const updatedDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // make admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const reqAccount = await usersCollection.findOne({ email: requester });
      if (reqAccount.role === "admin") {
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // update Profile
    app.put("/profile/:email", async (req, res) => {
      const profile = req.body;
      console.log(profile);
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: profile,
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // make user
    app.put("/user/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const reqAccount = await usersCollection.findOne({ email: requester });
      if (reqAccount.role === "admin") {
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            role: "user",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is UP!");
});

app.listen(port, () => {
  console.log(`Manufacturer App is listening to port: ${port}`);
});
