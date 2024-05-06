const { getCompanyRatios } = require("../helper/ratio.helper");

async function calculateRatios(req, res) {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      throw new Error("no company symbol found");
    }

    const data = await getCompanyRatios(symbol);
    res.status(200).json({ status: "success", data: data });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message || "something went wrong",
    });
  }
}

module.exports = calculateRatios;
