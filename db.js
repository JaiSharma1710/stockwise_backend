const mongoose = require("mongoose");

class Db {
  mongoUri = process.env.MONGO_URI;
  constructor() {
    this.connectDb();
  }

  connectDb() {
    mongoose.connect(this.mongoUri);

    const db = mongoose.connection;

    // Event listeners for connection
    db.on("error", console.error.bind(console, "MongoDB connection error:"));
    db.once("open", () => {
      console.log("Connected to MongoDB");
    });
  }
}

module.exports = new Db();
