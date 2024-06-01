const NSE = require("../utils/nse");
const nse = new NSE();

const calculate_dcf = async (
  beta,
  balanceSheetData,
  incomeStatementData,
  symbol,
  cashflowData
) => {
  const [company, exchange] = symbol.split(".");
  const { data } = await nse.getDataForCompany(company);
  const { betas } = beta || {};
  const leveredBeta = betas["Daily 1 Year"];

  const sharedIssued = balanceSheetData["Common Stock Equity"];
  const totalDebt = balanceSheetData["Total Debt"];
  const interestExpense = incomeStatementData["Interest Expense"];
  const ebit = incomeStatementData["EBIT"];
  const dilutedEPS = incomeStatementData["Diluted EPS"];
  const depreciation = incomeStatementData["Reconciled Depreciation"];
  const dilutedAverageShares = incomeStatementData["Diluted Average Shares"];
  const beginningCashPosition = cashflowData["Beginning Cash Position"];
  const changesInCash = cashflowData["Changes In Cash"];
  const shareholdersEquity = balanceSheetData["Stockholders Equity"];
  const cashAndCashEquivalents = balanceSheetData["Cash And Cash Equivalents"];
  const investedCapital = balanceSheetData["Invested Capital"];
  const minorityInterest = balanceSheetData["Minority Interest"];

  const equity = getLatestPrice(sharedIssued);
  const latestTotalDebt = getLatestPrice(totalDebt);
  const latestInterestExpense = getLatestPrice(interestExpense);
  const latestEbit = getLatestPrice(ebit);
  const latestDepreciation = getLatestPrice(depreciation);
  const latestBeginningCashPosition = getLatestPrice(beginningCashPosition);
  const latestChangesInCash = getLatestPrice(changesInCash);
  const latestShareholdersEquity = getLatestPrice(shareholdersEquity);
  const latestcashAndCashEquivalents = getLatestPrice(cashAndCashEquivalents);
  const latestinvestedCapital = getLatestPrice(investedCapital);
  const latestMinorityInterest = getLatestPrice(minorityInterest);
  const latestDilutedAverageShares = getLatestPrice(dilutedAverageShares);

  const CAPEX = calculateCapex(balanceSheetData, latestDepreciation);
  const changeInWorkingCapital = calculateDiff(
    balanceSheetData["Working Capital"]
  );
  const tax = calculateTax(incomeStatementData);
  const unleveredBeta =
    (leveredBeta * equity) / (equity + latestTotalDebt * (1 - tax));

  const releveredBeta =
    (unleveredBeta * (equity + latestTotalDebt * (1 - tax))) / equity;

  const costOfDebt_kd = latestInterestExpense / latestTotalDebt;

  const costOfDebt_netOfTaxes = costOfDebt_kd * (1 - tax);

  const rf = 7.095;

  const ERP = 12 - rf;

  const costOfEquity = releveredBeta * ERP + rf;

  const weightOfDebt = latestTotalDebt / (latestTotalDebt + equity);

  const weightOfEquity = equity / (latestTotalDebt + equity);

  const WACC =
    weightOfDebt * costOfDebt_netOfTaxes + weightOfEquity * costOfEquity;

  const FCFF =
    latestEbit * (1 - tax) +
    latestDepreciation -
    CAPEX -
    changeInWorkingCapital;

  const FCFE =
    FCFF -
    latestInterestExpense * (1 - tax) +
    (latestBeginningCashPosition + latestChangesInCash);

  const reinvestmentRate =
    (CAPEX - latestDepreciation + changeInWorkingCapital) /
    (latestEbit * (1 - tax));

  const ROC =
    (latestEbit * (1 - tax)) /
    (latestShareholdersEquity + latestTotalDebt - latestcashAndCashEquivalents);

  const ROE =
    ROC +
    (latestTotalDebt / latestShareholdersEquity) *
      (ROC - costOfDebt_kd * (1 - tax));

  const grownInNetIncome = reinvestmentRate * ROE;

  const epsGrowth = calculateGrowth(dilutedEPS);

  let lt_grownRate = 0;

  if (epsGrowth > 0 && grownInNetIncome > 0) {
    lt_grownRate = epsGrowth < grownInNetIncome ? epsGrowth : grownInNetIncome;
  } else if (epsGrowth < 0 && grownInNetIncome < 0) {
    lt_grownRate = epsGrowth > grownInNetIncome ? epsGrowth : grownInNetIncome;
  } else {
    lt_grownRate = epsGrowth > grownInNetIncome ? epsGrowth : grownInNetIncome;
  }

  const _1_year_projection = FCFE * (1 + lt_grownRate);
  const _2_year_projection = _1_year_projection * (1 + lt_grownRate);
  const _3_year_projection = _2_year_projection * (1 + lt_grownRate);
  const _4_year_projection = _3_year_projection * (1 + lt_grownRate);
  const _5_year_projection = _4_year_projection * (1 + lt_grownRate);
  const _6_year_projection = _5_year_projection * (1 + lt_grownRate);

  const _1_discounting_factor = 1 / Math.pow(1 + WACC / 100, 1);
  const _2_discounting_factor = 1 / Math.pow(1 + WACC / 100, 2);
  const _3_discounting_factor = 1 / Math.pow(1 + WACC / 100, 3);
  const _4_discounting_factor = 1 / Math.pow(1 + WACC / 100, 4);
  const _5_discounting_factor = 1 / Math.pow(1 + WACC / 100, 5);
  const _6_discounting_factor = 1 / Math.pow(1 + WACC / 100, 6);

  const PV_of_fcfe_5_yr =
    _1_year_projection * _1_discounting_factor +
    _2_year_projection * _2_discounting_factor +
    _3_year_projection * _3_discounting_factor +
    _4_year_projection * _4_discounting_factor +
    _5_year_projection * _5_discounting_factor;

  const terminalValue = _6_year_projection / (WACC / 100 - lt_grownRate);

  const presentValue = _6_discounting_factor * terminalValue;

  const DCF_value_Equity = PV_of_fcfe_5_yr + presentValue;

  const DCF_value_common_equity = Math.abs(
    DCF_value_Equity +
      latestinvestedCapital -
      latestTotalDebt +
      latestcashAndCashEquivalents -
      latestMinorityInterest
  );

  return {
    WACC,
    equity,
    latestTotalDebt,
    latestInterestExpense,
    latestEbit,
    latestDepreciation,
    latestBeginningCashPosition,
    latestChangesInCash,
    latestShareholdersEquity,
    latestcashAndCashEquivalents,
    latestinvestedCapital,
    latestMinorityInterest,
    latestDilutedAverageShares,
    CAPEX,
    changeInWorkingCapital,
    tax,
    unleveredBeta,
    releveredBeta,
    costOfDebt_kd,
    costOfDebt_netOfTaxes,
    rf,
    ERP,
    costOfEquity,
    weightOfDebt,
    weightOfEquity,
    FCFF,
    FCFE,
    reinvestmentRate,
    ROC,
    ROE,
    grownInNetIncome,
    epsGrowth,
    lt_grownRate,
    _1_year_projection,
    _2_year_projection,
    _3_year_projection,
    _4_year_projection,
    _5_year_projection,
    _6_year_projection,
    _1_discounting_factor,
    _2_discounting_factor,
    _3_discounting_factor,
    _4_discounting_factor,
    _5_discounting_factor,
    _6_discounting_factor,
    PV_of_fcfe_5_yr,
    terminalValue,
    presentValue,
    DCF_value_Equity,
    DCF_value_common_equity,
  };
};

function getLatestPrice(obj) {
  if (!obj) {
    return 0;
  }

  const years = Object.keys(obj);
  return obj[years[0]];
}

function calculateDiff(obj) {
  const years = Object.keys(obj);
  return obj[years[0]] - obj[years[1]];
}

function calculateTax(incomStatement) {
  const preTaxIncome = incomStatement["Pretax Income"];
  const netIncome = incomStatement["Net Income"];
  const latestPretaxIncome = getLatestPrice(preTaxIncome);
  const latestNetIncome = getLatestPrice(netIncome);

  return (latestPretaxIncome - latestNetIncome) / latestPretaxIncome;
}

function calculateCapex(balanceSheet, depreciation) {
  const ppe = balanceSheet["Net PPE"];
  const years = Object.keys(ppe);
  const current = ppe[years[0]];
  const last = ppe[years[1]];

  return current - last + depreciation;
}

function calculateGrowth(data) {
  const values = Object.values(data);

  const latest = values[0];
  const oldest = values[values.length - 1];

  const base = latest / oldest;
  const expo = 1 / (values.length - 1);
  let result = Math.pow(base, expo) - 1;
  return result;
}

module.exports = calculate_dcf;
