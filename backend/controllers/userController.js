require("dotenv").config();
const { MongoClient, ReturnDocument } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
var ObjectId = require("mongodb").ObjectId;

let client;

async function connectClient() {
    const uri = process.env.MONGODB_URI; 
    // console.log("MongoDB_URI:", uri);
    if (!client) {
        client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
        console.log("MongoDB Client connected");
    }
    return client;
}

async function signup(req, res) {
    const { username, password, email } = req.body;
    try {
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({username});
        if(user) {
            return res.status(400).json({message:"User already exists!"}); 
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = {
            username,
            password:hashedPassword,
            email,
            repositories: [],
            followedUsers: [],
            starRepos: []
        }

        const result = await usersCollection.insertOne(newUser);

        const token = jwt.sign({ id: result.insertedId }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });

    } catch (err) {
        console.error("Error during signup :", err.message);
        res.status(500).send("Server error");
    }
}

async function login (req, res) {
    const { email, password } = req.body;
    try {
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({email});
        if(!user) {
            return res.status(400).json({message:"Invalid Credentials"}); 
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(400).json({message:"Invalid Credentials"}); 
        }

        const token = jwt.sign({id:user._id}, process.env.JWT_SECRET_KEY, {expiresIn: "1h"});
        res.json({token, userId:user._id});
    } catch(err) {
        console.error("Error during login: ", err.message);
        res.status(500).send("Server error!");
    }
};

async function getAllUsers (req, res) {
    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch(err) {
        console.error("Error during fetching :", err.message);
        res.status(500).send("Server error!");
    }
};

async function getUserProfile (req, res) {
    const currentID = req.params.id;
    try {
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
            _id: new ObjectId(currentID),
        });

        if (!user) {
            // Change to a 404 status for "not found" scenarios
            return res.status(404).json({ message: "User not found!" });
        }
        
    res.status(200).json(user);  // Returning the user data
    } catch (err) {
        console.error("Error during fetching:", err.message);
        res.status(500).send("Server error!");
    }
}

async function updateUserProfile (req, res) {
    const currentID = req.params.id;
    const { email, password } = req.body;

    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        let updateFields = {email};
        if(password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateFields.password = hashedPassword;
        }

        const result = await usersCollection.findOneAndUpdate(
            {
                _id: new ObjectId(currentID),
            }, 
            {$set: updateFields},
            {ReturnDocument: "after"}
        );
        if(!result.value) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.send(result.value);

    } catch (err) {
        console.error("Error during updating:", err.message);
        res.status(500).send("Server error!");
    }
};

async function deleteUserProfile (req, res) {
    const currentID = req.params.id;

    try{
        await connectClient();
        const db = client.db("githubclone");
        const usersCollection = db.collection("users");

        const result = await usersCollection.deleteOne({
            _id: new ObjectId(currentID),
        });

        if(result.deleteCount==0) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({message: "User profile deleted:"})

    } catch (err) {
        console.error("Error during deleting:", err.message);
        res.status(500).send("Server error!");
    }
};

module.exports = {
    getAllUsers,
    signup,
    login,
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
};