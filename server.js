const express = require("express");

class CreateServer {
  PORT = process.env.PORT;
  constructor() {
    this.application = express();
    this.start();
  }

  app() {
    return this.application;
  }

  start() {
    this.application.listen(this.PORT, () =>
      console.log(`listining on port ${this.PORT}`)
    );
  }
}

module.exports = new CreateServer();
