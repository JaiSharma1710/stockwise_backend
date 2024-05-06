const mongoose = require("mongoose");
const schemaCommon = new mongoose.Schema({}, { strict: false });
const basicInfo = mongoose.model(
  "basic_information",
  schemaCommon,
  "basic_information"
);

async function searchCompanies(req, res) {
  try {
    const { searchTerm } = req.query;

    if (!searchTerm) {
      throw new Error("no search term found");
    }

    const regexPattern = new RegExp(`^${searchTerm}`, "i");

    const db_response = await basicInfo.find(
      { longName: { $regex: regexPattern } },
      { longName: 1, sector: 1, _id: 0, symbol: 1 }
    );

    return res.status(200).json({
      status: "success",
      data: db_response,
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message || "something went wrong",
    });
  }
}

module.exports = {
  searchCompanies,
};
