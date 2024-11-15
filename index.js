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
    const Trainers = database.collection("Trainers");
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

    app.get("/user/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const user = await Users.findOne({ Email: email }); // Query by the 'Email' field
        if (user) {
          res.send(user); // Successfully found user
        } else {
          res.status(404).send({ message: "User not found" }); // If no user found
        }
      } catch (error) {
        console.error("Error fetching user by email:", error);
        res.status(500).send({ message: "Failed to fetch user." });
      }
    });

    app.delete("/users/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id; // Get the id from the request parameters
        const query = { _id: new ObjectId(id) }; // Convert id to ObjectId
        const result = await Users.deleteOne(query); // Delete the user by id

        if (result.deletedCount === 1) {
          res.send({ message: "User deleted successfully", id });
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ message: "Failed to delete user" });
      }
    });

    app.patch("/user/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { Status, Role } = req.body;

      try {
        if (Status === "Pending") {
          const result = await Users.updateOne(
            { _id: new ObjectId(id) },
            { $set: { Status: "Pending" } }
          );
        } else if (Status === "Accepted") {
          const result = await Users.updateOne(
            { _id: new ObjectId(id), Status: "Pending" },
            { $set: { Status: "Accepted", Role: "Trainer" } } // Update status and role to "Accepted" and "Trainer"
          );

          if (result.modifiedCount > 0) {
            res.send({
              message: "Trainer status and role updated successfully.",
            });
          } else {
            res
              .status(404)
              .send({ message: "Trainer not found or no changes made." });
          }
        } else {
          res.status(400).send({ message: "Invalid status." });
        }
      } catch (error) {
        console.error("Error updating trainer:", error);
        res.status(500).send({ message: "Failed to update trainer." });
      }
    });

    app.patch("/trainer/:id", async (req, res) => {
      const { id } = req.params;
      const { Salary } = req.body;
      console.log(Salary);
      try {
        await Users.updateOne(
          { _id: new ObjectId(id) },
          { $set: { Salary: Salary } }
        );

        res.send({ message: "Trainer salary updated successfully." });
      } catch (error) {
        res.status(500).send({ message: "Failed to update trainer salary." });
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
