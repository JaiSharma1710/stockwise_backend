const NSE = require("../utils/nse");

const nse = new NSE();

async function getCompanyQuotes(req, res) {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      throw new Error("no company symbol found");
    }

    const { data } = await nse.getDataForCompany(symbol);

    const { info, priceInfo, preOpenMarket } = data || {};

    if (!info || !priceInfo || !preOpenMarket) {
      throw new Error(`no data found for ${symbol}`);
    }

    return res.status(200).json({
      status: "success",
      data: {
        symbol: info.symbol,
        companyName: info.companyName,
        industry: info.industry,
        percentageChange: Number(priceInfo.pChange.toFixed(2)),
        change: Number(priceInfo.change.toFixed(2)),
        lastPrice: priceInfo.lastPrice,
        open: priceInfo.lastPrice,
        close: priceInfo.close,
        previousClose: priceInfo.previousClose,
        weekHighLow: priceInfo.weekHighLow,
        intraDayHighLow: priceInfo.intraDayHighLow,
        lastUpdateTime: preOpenMarket.lastUpdateTime,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message || "something went wrong",
    });
  }
}

async function getIntradayData(req, res) {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      throw new Error("no company symbol found");
    }

    const { data } = await nse.getIntradayData(symbol);

    res.status(200).json({ status: "success", data });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message || "something went wrong",
    });
  }
}

module.exports = {
  getCompanyQuotes,
  getIntradayData,
};
