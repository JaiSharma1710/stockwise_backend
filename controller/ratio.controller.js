const {
  getCompanyRatios,
  getSectorRatios,
  addGrowth,
  getDupointData,
} = require("../helper/ratio.helper");

async function calculateRatios(req, res) {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      throw new Error("no company symbol found");
    }

    const {
      ratios,
      balanceSheetRatios,
      incomStatementRatios,
      DCF_data,
      cashflowDataRatios,
      basicInfoDataRatios,
    } = await getCompanyRatios(symbol);

    // const sectorData = await getSectorRatios(symbol);

    const growth = addGrowth(ratios);

    const dupointData = await getDupointData(symbol);

    res.status(200).json({
      status: "success",
      data: {
        companyData: ratios,
        growth,
        dupointData,
        balanceSheetRatios,
        incomStatementRatios,
        DCF_data,
        cashflowDataRatios,
        basicInfoDataRatios
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "failed",
      message: error.message || "something went wrong",
    });
  }
}

module.exports = calculateRatios;
