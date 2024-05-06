const express = require("express");
const {
  getCompanyQuotes,
  getIntradayData,
} = require("../controller/quotes.controller");

const router = express.Router();

router.route("/current").get(getCompanyQuotes);

router.route("/intraday").get(getIntradayData);

module.exports = router;
