require("dotenv").config();
console.log("Loaded MONGO URI:", process.env.MONGODB_URI);


const express = require("express");
const { JWT_SECRET } = require("./config/authConfig");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const mainRouter = require("./routes/main.router");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { pushRepo } = require("./controllers/push");
const { pullRepo } = require("./controllers/pull");
const { revertRepo } = require("./controllers/revert");
const { copyFileSync } = require("fs");


yargs(hideBin(process.argv))
    .command("start", "Starts a new server",{}, startServer)
    .command("init", "Initialise a new repository",{}, initRepo)
    .command(
        "add <file>", 
        "Add a file to the repository",
        (yargs) => {
            yargs.positional("file", {
                describe: "File to add to the staging area",
                type: "string",
            });
        }, 
        (argv) => {
            addRepo(argv.file);
        }
    )
    .command(
        "commit <message>", 
        "Commit the staged files",
        (yargs) => {
            yargs.positional("message", {
                describe: "Commit message",
                type: "string",
            });
        }, 
        (argv) => {
            commitRepo(argv.message);
        }
    )
    .command("push", "Push commits to S3",{}, pushRepo)
    .command("pull", "Pull commits to S3",{}, pullRepo)
    .command(
        "revert <commitID>", 
        "Revert to a specific commit",
        (yargs) => {
            yargs.positional("commitID", {
                describe: "Commit ID to revert to",
                type: "string",
            });
        }, 
        (argv) => {
            revertRepo(argv.commitID);
        }
    )
    .demandCommand(1, "You need at least one command")
    .help().argv;

function startServer() {
    const app = express();
    const port = process.env.PORT || 3002;
    
    app.use(bodyParser.json());
    app.use(express.json());

    const mongoURL = process.env.MONGODB_URI;
    // console.log("Loaded MONGO URI:", mongoURL);

    // Load models first
    require("./models/userModel");
    require("./models/repoModel");
    require("./models/issueModel");

    mongoose
        .connect(mongoURL, {
            dbName: "githubclone" // Force using githubclone database
        })
        .then(() => console.log("MongoDB connected!"))
        .catch((err) => console.log("Unable to connect : ", err));
    
    app.use(cors({ 
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));

    // Import user router
    const userRouter = require("./routes/user.router");
    
    // Register routers
    app.use("/", mainRouter);
    app.use("/api/users", userRouter);

    let user = "test";

    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        socket.on("joinRoom", (userID) => {
            user = userID;
            console.log("=====");
            console.log(user);
            console.log("=====");
            socket.join(userID);
        });
    });

    const db = mongoose.connection;

    db.once("open", async() => {
        console.log("CRUD operations called");
        //cRUD operations
    });

    httpServer.listen(port, () => {
        console.log(`Server is running on PORT ${port}`);
    }).on('error', (err) => {
        console.error(`Failed to start server on port ${port}:`, err);
        process.exit(1);
    });
}

