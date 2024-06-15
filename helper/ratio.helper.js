const mongoose = require("mongoose");
const calculate_dcf = require("./dcf.helper");
const schemaCommon = new mongoose.Schema({}, { strict: false });
const NSE = require("../utils/nse");
const nse = new NSE();

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

const cashflow = mongoose.model("cashflow_data", schemaCommon, "cashflow_data");

const betaValues = mongoose.model("beta_values", schemaCommon, "beta_values");

const basicInfo = mongoose.model("basic_information");

async function getCompanyRatios(symbol) {
  const [
    incomeStatementData,
    balanceSheetDate,
    cashflowData,
    beta,
    basicInfoData,
  ] = await Promise.all([
    incomStatement.findOne({ symbol }),
    balanceSheet.findOne({ symbol }),
    cashflow.findOne({ symbol }),
    betaValues.findOne({ ticker: symbol }, { betas: 1, _id: 0 }),
    basicInfo.findOne({ symbol }),
  ]);

  const PE = await getPE(symbol, incomeStatementData["Basic EPS"]);
  addCagr(PE);
  PE.Weightage = "10%";

  const DCF_data = await calculate_dcf(
    beta,
    balanceSheetDate,
    incomeStatementData,
    symbol,
    cashflowData
  );

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
    balanceSheetDate["Net PPE"]
  );

  const inventoryTurnOverRatio = calculateInventoryTurnOverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Inventory"]
  );

  const workingCapitalTurnOverRatio = calculateWorkingCapitalTurnOverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Working Capital"]
  );

  const totalAssetTurnoverRatio = calculateTotalAssetTurnoverRatio(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Total Assets"]
  );

  const returnOnAsset = calculateReturnOnAsset(
    incomeStatementData["Net Income"],
    balanceSheetDate["Total Assets"]
  );

  const eps = Object.assign({}, incomeStatementData["Basic EPS"]);
  addCagr(eps);
  eps.Weightage = "10%";

  const leverage = calculateLeverage(
    balanceSheetDate["Total Assets"],
    balanceSheetDate["Stockholders Equity"]
  );

  const returnOnEquity = calculateReturnOnEquity(
    incomeStatementData["Net Income Common Stockholders"],
    balanceSheetDate["Stockholders Equity"]
  );

  const ratios = {
    "Production Efficiency": productEffeciency,
    "Operation Efficiency": oprationEffeciency,
    "Total Efficiency": totalEffeciency,
    "Profitability Ratio": profitabilityRatio,
    "Fixed Asset Turnover Ratio": fixedAssetTurnoverRatio,
    "Working Capital Turnover Ratio": workingCapitalTurnOverRatio,
    "Inventory Turnover Ratio": inventoryTurnOverRatio,
    "Total Asset Turnover Ratio": totalAssetTurnoverRatio,
    "Return on Asset": returnOnAsset,
    EPS: eps,
    Leverage: leverage,
    "Return On Equity (ROE)": returnOnEquity,
    "Price To Equity (PE)": PE,
  };

  const balanceSheetRatios = { ...balanceSheetDate }._doc;
  delete balanceSheetRatios.symbol;
  delete balanceSheetRatios._id;

  const incomStatementRatios = { ...incomeStatementData }._doc;
  delete incomStatementRatios.symbol;
  delete incomStatementRatios._id;

  const cashflowDataRatios = { ...cashflowData }._doc;
  delete cashflowDataRatios.symbol;
  delete cashflowDataRatios._id;

  const basicInfoDataRatios = { ...basicInfoData }._doc;
  delete basicInfoDataRatios.symbol;
  delete basicInfoDataRatios._id;

  return {
    ratios,
    balanceSheetRatios,
    incomStatementRatios,
    DCF_data,
    cashflowDataRatios,
    basicInfoDataRatios,
  };
}

async function getSectorRatios(symbol) {
  const companiesSector = await basicInfo.findOne(
    { symbol },
    { sector: 1, _id: 0 }
  );

  if (!companiesSector.sector) {
    throw new Error("no sector for selected company");
  }

  const companiesInSector = await basicInfo.find(companiesSector, {
    symbol: 1,
    _id: 0,
  });

  if (!companiesInSector.length) {
    throw new Error("no companies in selected sector");
  }

  const allDataPromise = companiesInSector.map((company) =>
    getCompanyRatios(company.symbol)
  );

  const allData = await Promise.all(allDataPromise);

  const years = await getCompanyYears(symbol);

  if (!years.length) {
    throw new Error("no data for selected company");
  }

  const ratioData = {
    "Production Efficiency": {},
    "Operation Efficiency": {},
    "Total Efficiency": {},
    "Profitability Ratio": {},
    "Fixed Asset Turnover Ratio": {},
    "Inventory Turnover Ratio": {},
    "Total Asset Turnover Ratio": {},
    "Return on Asset": {},
    EPS: {},
  };

  allData.forEach((company) => {
    Object.keys(ratioData).forEach((key) => {
      Object.keys(company[key]).forEach((year) => {
        const currentYear = new Date().getFullYear();
        const dataYear = new Date(year).getFullYear();
        if (currentYear - dataYear < 4) {
          ratioData[key][year] = ratioData[key][year]
            ? +((ratioData[key][year] + company[key][year]) / 2).toFixed(2)
            : +company[key][year].toFixed(2);
        }
      });
    });
  });

  return ratioData;
}

async function getCompanyYears(symbol) {
  const data = await balanceSheet.findOne(
    { symbol },
    { "Ordinary Shares Number": 1, _id: 0 }
  );
  if (data && data?.["Ordinary Shares Number"]) {
    return Object.keys(data["Ordinary Shares Number"]);
  }
  return [];
}

async function getDupointData(symbol) {
  const [incomeStatementData, balanceSheetDate] = await Promise.all([
    incomStatement.findOne({ symbol }),
    balanceSheet.findOne({ symbol }),
  ]);

  const taxEffect = getTaxEffect(
    incomeStatementData["Net Income"],
    incomeStatementData["Pretax Income"]
  );

  const interestEffect = getInterestEffect(
    incomeStatementData["Pretax Income"],
    incomeStatementData["Operating Income"]
  );

  const profitabilityEffect = getProfitabilityEffect(
    incomeStatementData["Operating Income"],
    incomeStatementData["Total Revenue"]
  );

  const assetEffect = getAssetEffect(
    incomeStatementData["Total Revenue"],
    balanceSheetDate["Net PPE"]
  );

  const leverageEffect = getLeverageEffect(
    balanceSheetDate["Net PPE"],
    balanceSheetDate["Stockholders Equity"]
  );

  return {
    "Tax Effect": taxEffect,
    "Interest Income": interestEffect,
    "Profitability Effect": profitabilityEffect,
    "Asset Effect": assetEffect,
    "Leverage Effect": leverageEffect,
  };
}

function calculateProductEffeciency(operatingIncome, totalRevenue) {
  try {
    const keys = Object.keys(operatingIncome);

    const result = {};

    keys.forEach((year) => {
      if (!operatingIncome?.[year] || !totalRevenue?.[year]) {
        result[year] = 0;
      } else {
        result[year] = Number(
          (operatingIncome[year] / totalRevenue[year]).toFixed(3)
        );
      }
    });

    addCagr(result);
    result.Weightage = "5%";

    return result;
  } catch (err) {
    return {
      "2023-03-31T00:00:00+00:00": NaN,
      "2022-03-31T00:00:00+00:00": NaN,
      "2021-03-31T00:00:00+00:00": NaN,
      CAGR: "NAN %",
      Weightage: "5%",
    };
  }
}

function calculateOprationEffeciency(pretaxIncome, operatingIncome) {
  try {
    const keys = Object.keys(operatingIncome);

    const result = {};

    keys.forEach((year) => {
      if (!pretaxIncome?.[year] || !operatingIncome?.[year]) {
        result[year] = 0;
      } else {
        result[year] = Number(
          (pretaxIncome[year] / operatingIncome[year]).toFixed(3)
        );
      }
    });

    addCagr(result);
    result.Weightage = "5%";

    return result;
  } catch (err) {
    return {
      "2023-03-31T00:00:00+00:00": NaN,
      "2022-03-31T00:00:00+00:00": NaN,
      "2021-03-31T00:00:00+00:00": NaN,
      CAGR: "NAN %",
      Weightage: "5%",
    };
  }
}

function calculateTotalEffeciency(productEffeciency, oprationEffeciency) {
  const keys = Object.keys(productEffeciency);

  const result = {};

  keys.forEach((year) => {
    if (!productEffeciency?.[year] || !oprationEffeciency?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (productEffeciency[year] * oprationEffeciency[year]).toFixed(3)
      );
    }
  });

  const Ratio = Object.assign({}, result);
  delete Ratio.CAGR;
  delete Ratio.Weightage;

  addCagr(Ratio, "total", result);
  result.Weightage = "5%";

  return result;
}

function calculateProfitabilityRatio(netIncome, totalRevenue) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!netIncome?.[year] || !totalRevenue?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((netIncome[year] / totalRevenue[year]).toFixed(3));
    }
  });

  addCagr(result);
  result.Weightage = "10%";

  return result;
}

function calculateFixedAssetTurnoverRatio(totalRevenue, fixedAssets) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue?.[year] || !fixedAssets?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalRevenue[year] / fixedAssets[year]).toFixed(3)
      );
    }
  });

  addCagr(result);
  result.Weightage = "5%";

  return result;
}

function calculateInventoryTurnOverRatio(totalRevenue, inventory) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue?.[year] || !inventory?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((totalRevenue[year] / inventory[year]).toFixed(3));
    }
  });

  addCagr(result);
  result.Weightage = "5%";

  return result;
}

function calculateWorkingCapitalTurnOverRatio(totalRevenue, workingCapital) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue?.[year] || !workingCapital?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalRevenue[year] / workingCapital[year]).toFixed(3)
      );
    }
  });

  addCagr(result);
  result.Weightage = "5%";

  return result;
}

function calculateTotalAssetTurnoverRatio(totalRevenue, totalAssets) {
  const keys = Object.keys(totalRevenue);

  const result = {};

  keys.forEach((year) => {
    if (!totalRevenue?.[year] || !totalAssets?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalRevenue[year] / totalAssets[year]).toFixed(3)
      );
    }
  });

  addCagr(result);
  result.Weightage = "10%";

  return result;
}

function calculateReturnOnAsset(netIncome, totalAssets) {
  const keys = Object.keys(netIncome);

  const result = {};

  keys.forEach((year) => {
    if (!netIncome?.[year] || !totalAssets?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((netIncome[year] / totalAssets[year]).toFixed(3));
    }
  });

  addCagr(result);
  result.Weightage = "10%";

  return result;
}

function calculateLeverage(totalAssets, shareHolderEquity) {
  const keys = Object.keys(totalAssets);

  const result = {};

  keys.forEach((year) => {
    if (!totalAssets?.[year] || !shareHolderEquity?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (totalAssets[year] / shareHolderEquity[year]).toFixed(3)
      );
    }
  });

  addCagr(result);
  result.Weightage = "10%";

  return result;
}

function calculateReturnOnEquity(
  NetIncomeCommonStockholders,
  shareHolderEquity
) {
  const keys = Object.keys(NetIncomeCommonStockholders);

  const result = {};

  keys.forEach((year) => {
    if (!NetIncomeCommonStockholders?.[year] || !shareHolderEquity?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number(
        (NetIncomeCommonStockholders[year] / shareHolderEquity[year]).toFixed(3)
      );
    }
  });

  addCagr(result);
  result.Weightage = "10%";

  return result;
}

function getTaxEffect(pat, pbt) {
  const keys = Object.keys(pat);

  const result = {};

  keys.forEach((year) => {
    if (!pat?.[year] || !pbt?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((pat[year] / pbt[year]).toFixed(3));
    }
  });

  return result;
}

function getInterestEffect(pbt, ebit) {
  const keys = Object.keys(pbt);

  const result = {};

  keys.forEach((year) => {
    if (!pbt?.[year] || !ebit?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((pbt[year] / ebit[year]).toFixed(3));
    }
  });

  return result;
}

function getProfitabilityEffect(ebit, netSales) {
  try {
    const keys = Object.keys(ebit);

    const result = {};

    keys.forEach((year) => {
      if (!ebit?.[year] || !netSales?.[year]) {
        result[year] = 0;
      } else {
        result[year] = Number((ebit[year] / netSales[year]).toFixed(3));
      }
    });

    return result;
  } catch (error) {
    return {
      "2023-03-31T00:00:00+00:00": NaN,
      "2022-03-31T00:00:00+00:00": NaN,
      "2021-03-31T00:00:00+00:00": NaN,
    };
  }
}

function getAssetEffect(netSales, totalAssets) {
  const keys = Object.keys(netSales);

  const result = {};

  keys.forEach((year) => {
    if (!netSales?.[year] || !totalAssets?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((netSales[year] / totalAssets[year]).toFixed(3));
    }
  });

  return result;
}

function getLeverageEffect(totalAssets, netWorth) {
  const keys = Object.keys(totalAssets);

  const result = {};

  keys.forEach((year) => {
    if (!totalAssets?.[year] || !netWorth?.[year]) {
      result[year] = 0;
    } else {
      result[year] = Number((totalAssets[year] / netWorth[year]).toFixed(3));
    }
  });

  return result;
}

function addCagr(ratio, name = "", alt) {
  const keys = Object.keys(ratio);
  const years = keys.sort((a, b) => a - b);

  const latestYear = years[0];
  const firstYear = years.at(-1);
  const numberOfYears = years.length;

  if (!!name) {
    alt.CAGR = `${+(
      ((ratio[latestYear] / ratio[firstYear]) ** (1 / (numberOfYears - 1)) -
        1) *
      100
    ).toFixed(3)}%`;
  } else {
    ratio.CAGR = `${+(
      ((ratio[latestYear] / ratio[firstYear]) ** (1 / (numberOfYears - 1)) -
        1) *
      100
    ).toFixed(3)}%`;
  }
}

function addGrowth(result) {
  const ratios = Object.keys(result);
  let Growth = 0;
  ratios.forEach((ratio) => {
    const { CAGR, Weightage } = result[ratio] || {};
    const CARG_Value = +CAGR?.split("%")[0];
    const Weightage_Value = +Weightage?.split("%")[0];
    if (!!CARG_Value && !!Weightage) {
      Growth += (CARG_Value / 100) * (Weightage_Value / 100);
    }
  });
  return Growth * 100;
}

async function getPE(symbol, eps) {
  const [sy, _] = symbol.split(".");

  const range_2024 = {
    start: new Date("2024-03-28"),
    end: new Date("2024-03-28"),
  };

  const range_2023 = {
    start: new Date("2023-03-28"),
    end: new Date("2023-03-28"),
  };

  const range_2022 = {
    start: new Date("2022-03-28"),
    end: new Date("2022-03-28"),
  };

  const range_2021 = {
    start: new Date("2021-03-31"),
    end: new Date("2021-03-31"),
  };

  const [
    [{ data: data_2024 }],
    [{ data: data_2023 }],
    [{ data: data_2022 }],
    [{ data: data_2021 }],
  ] = await Promise.all([
    nse.getEquityHistoricalData(sy, range_2024),
    nse.getEquityHistoricalData(sy, range_2023),
    nse.getEquityHistoricalData(sy, range_2022),
    nse.getEquityHistoricalData(sy, range_2021),
  ]);

  const price_2024 = data_2024?.data?.[0]?.CH_CLOSING_PRICE;
  const price_2023 = data_2023?.data?.[0]?.CH_CLOSING_PRICE;
  const price_2022 = data_2022?.data?.[0]?.CH_CLOSING_PRICE;
  const price_2021 = data_2021?.data?.[0]?.CH_CLOSING_PRICE;

  const PE = {};

  const keys = Object.keys(eps);

  keys.forEach((year) => {
    if (year.includes("2024")) {
      PE[year] = +(price_2024 / eps[year])?.toFixed(2);
    } else if (year.includes("2023")) {
      PE[year] = +(price_2023 / eps[year])?.toFixed(2);
    } else if (year.includes("2022")) {
      PE[year] = +(price_2022 / eps[year])?.toFixed(2);
    } else if (year.includes("2021")) {
      PE[year] = +(price_2021 / eps[year])?.toFixed(2);
    }
  });

  return PE;
}

module.exports = {
  getCompanyRatios,
  addGrowth,
  getSectorRatios,
  getDupointData,
};
