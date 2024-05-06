const mongoose = require("mongoose");
const schemaCommon = new mongoose.Schema({}, { strict: false });
const incomStatement = mongoose.model(
  "incomeStatement_data",
  schemaCommon,
  "incomeStatement_data"
);
const balanceSheet = mongoose.model(
  "balanceSheet_data",
  schemaCommon,
  "balanceSheet_data"
);

async function getCompanyRatios(symbol) {
  const [incomeStatementData, balanceSheetDate] = await Promise.all([
    incomStatement.findOne({ symbol }),
    balanceSheet.findOne({ symbol }),
  ]);

  const productEffeciency = calculateProductEffeciency(
    incomeStatementData["Operating Income"],
    incomeStatementData["Total Revenue"]
  );

  const oprationEffeciency = calculateOprationEffeciency(
    incomeStatementData["Pretax Income"],
    incomeStatementData["Operating Income"]
  );

  const totalEffeciency = calculateTotalEffeciency(
    productEffeciency,
    oprationEffeciency
  );

  const profitabilityRatio = calculateProfitabilityRatio(
    incomeStatementData["Net Income"],
    incomeStatementData["Total Revenue"]
  );

  const fixedAssetTurnoverRatio = calculateFixedAssetTurnoverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Total Non Current Assets"]
  );

  const inventoryTurnOverRatio = calculateInventoryTurnOverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Inventory"]
  );

  const totalAssetTurnoverRatio = calculateTotalAssetTurnoverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Total Assets"]
  );

  const returnOnAsset = calculateReturnOnAsset(
    incomeStatementData["Net Income"],
    balanceSheetDate["Total Assets"]
  );

  const eps = incomeStatementData["Basic EPS"];

  return {
    'Production Efficiency': productEffeciency,
    'Operation Efficiency': oprationEffeciency,
    'Total Efficiency': totalEffeciency,
    'Profitability Ratio': profitabilityRatio,
    'Fixed Asset Turnover Ratio': fixedAssetTurnoverRatio,
    'Inventory Turnover Ratio': inventoryTurnOverRatio,
    'Total Asset Turnover Ratio': totalAssetTurnoverRatio,
    'Return on Asset': returnOnAsset,
    'EPS': eps,
  };
}

function calculateProductEffeciency(operatingIncome, totalRevenue) {
  const keys = Object.keys(operatingIncome);

  const result = {};

  keys.forEach((year) => {
    if (!operatingIncome[year] || !totalRevenue[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (operatingIncome[year] / totalRevenue[year]).toFixed(3)
      );
    }
  });

  return result;
}

function calculateOprationEffeciency(pretaxIncome, operatingIncome) {
  const keys = Object.keys(operatingIncome);

  const result = {};

  keys.forEach((year) => {
    if (!pretaxIncome[year] || !operatingIncome[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (pretaxIncome[year] / operatingIncome[year]).toFixed(3)
      );
    }
  });

  return result;
}

function calculateTotalEffeciency(productEffeciency, oprationEffeciency) {
  const keys = Object.keys(productEffeciency);

  const result = {};

  keys.forEach((year) => {
    if (!productEffeciency[year] || !oprationEffeciency[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (productEffeciency[year] * oprationEffeciency[year]).toFixed(3)
      );
    }
  });

  return result;
}

function calculateProfitabilityRatio(netIncome, totalRevenue) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!netIncome[year] || !totalRevenue[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((netIncome[year] / totalRevenue[year]).toFixed(3));
    }
  });

  return result;
}

function calculateFixedAssetTurnoverRatio(totalRevenue, fixedAssets) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue[year] || !fixedAssets[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalRevenue[year] / fixedAssets[year]).toFixed(3)
      );
    }
  });

  return result;
}

function calculateInventoryTurnOverRatio(totalRevenue, inventory) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue[year] || !inventory[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((totalRevenue[year] / inventory[year]).toFixed(3));
    }
  });

  return result;
}

function calculateTotalAssetTurnoverRatio(totalRevenue, totalAssets) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue[year] || !totalAssets[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalRevenue[year] / totalAssets[year]).toFixed(3)
      );
    }
  });

  return result;
}

function calculateReturnOnAsset(netIncome, totalAssets) {
  const keys = Object.keys(netIncome);

  const result = {};

  keys.forEach((year) => {
    if (!netIncome[year] || !totalAssets[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((netIncome[year] / totalAssets[year]).toFixed(3));
    }
  });

  return result;
}

module.exports = {
  getCompanyRatios,
};
