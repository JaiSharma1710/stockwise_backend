const calculateRatios = require("../controller/ratio.controller");

const express = require("express");

const router = express.Router();

router.route("/").get(calculateRatios);

module.exports = router;
