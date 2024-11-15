const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z3gfp8c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

async function run() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const database = client.db("GymWeb");
    const Users = database.collection("Users");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(403).send({ message: "No token provided" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Invalid token" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Post User
    app.post("/user", async (req, res) => {
      try {
        const user = req.body;
        const result = await Users.insertOne(user);
        res.send({
          message: "User added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add user." });
      }
    });
    // Get user
    app.get("/users", verifyToken, async (req, res) => {
      try {
        const users = await Users.find().toArray();
        res.send(users);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch users." });
      }
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.error);
