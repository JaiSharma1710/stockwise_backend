const express = require("express");

const { searchCompanies } = require("../controller/info.controller");

const router = express.Router();

router.route("/search").get(searchCompanies);

module.exports = router;
