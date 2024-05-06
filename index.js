require("dotenv").config();

const routes = require("./routes");
const server = require("./server");
const Cors = require("./cors");
require("./db");

const app = server.app();
new Cors(app);

app.use("/v1", routes);

app.get("/server-status", async (req, res) => {
  res.status(200).json({
    status: "success",
    message: `the server is up and running on ${process.env.PORT}`,
  });
});
