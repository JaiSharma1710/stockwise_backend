const express = require("express");
const basicInfoRouter = require("./basicInformation");
const quoteRouter = require("./quotes");
const ratioRouter = require("./ratio");

const router = express.Router();

router.use("/basic-info", basicInfoRouter);
router.use("/quote", quoteRouter);
router.use("/ratio", ratioRouter);

module.exports = router;
