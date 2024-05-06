const cors = require("cors");

class Cors {
  constructor(app) {
    this.app = app;
    this.app.use(cors(this.corsOptions));
  }

  corsOptions = {
    origin: function (origin, callback) {
      if ( ["http://localhost:3000"].includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  };
}

module.exports = Cors