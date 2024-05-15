const mongoose = require('mongoose');
const schemaCommon = new mongoose.Schema({}, { strict: false });

const incomStatement = mongoose.model(
  'incomeStatement_data',
  schemaCommon,
  'incomeStatement_data'
);
const balanceSheet = mongoose.model(
  'balanceSheet_data',
  schemaCommon,
  'balanceSheet_data'
);

const basicInfo = mongoose.model('basic_information');

async function getCompanyRatios(symbol) {
  const [incomeStatementData, balanceSheetDate] = await Promise.all([
    incomStatement.findOne({ symbol }),
    balanceSheet.findOne({ symbol }),
  ]);

  const productEffeciency = calculateProductEffeciency(
    incomeStatementData['Operating Income'],
    incomeStatementData['Total Revenue']
  );

  const oprationEffeciency = calculateOprationEffeciency(
    incomeStatementData['Pretax Income'],
    incomeStatementData['Operating Income']
  );

  const totalEffeciency = calculateTotalEffeciency(
    productEffeciency,
    oprationEffeciency
  );

  const profitabilityRatio = calculateProfitabilityRatio(
    incomeStatementData['Net Income'],
    incomeStatementData['Total Revenue']
  );

  const fixedAssetTurnoverRatio = calculateFixedAssetTurnoverRatio(
    incomeStatementData['Total Revenue'],
    balanceSheetDate['Net PPE']
  );

  const inventoryTurnOverRatio = calculateInventoryTurnOverRatio(
    incomeStatementData['Total Revenue'],
    balanceSheetDate['Inventory']
  );

  const totalAssetTurnoverRatio = calculateTotalAssetTurnoverRatio(
    incomeStatementData['Total Revenue'],
    balanceSheetDate['Total Assets']
  );

  const returnOnAsset = calculateReturnOnAsset(
    incomeStatementData['Net Income'],
    balanceSheetDate['Total Assets']
  );

  const eps = incomeStatementData['Basic EPS'];
  addCagr(eps);
  eps.Weightage = '10%';

  const leverage = calculateLeverage(
    balanceSheetDate['Total Assets'],
    balanceSheetDate['Stockholders Equity']
  );

  const returnOnEquity = calculateReturnOnEquity(
    incomeStatementData['Net Income Common Stockholders'],
    balanceSheetDate['Stockholders Equity']
  );

  return {
    'Production Efficiency': productEffeciency,
    'Operation Efficiency': oprationEffeciency,
    'Total Efficiency': totalEffeciency,
    'Profitability Ratio': profitabilityRatio,
    'Fixed Asset Turnover Ratio': fixedAssetTurnoverRatio,
    'Inventory Turnover Ratio': inventoryTurnOverRatio,
    'Total Asset Turnover Ratio': totalAssetTurnoverRatio,
    'Return on Asset': returnOnAsset,
    EPS: eps,
    Leverage: leverage,
    'Return On Equity (ROE)': returnOnEquity,
  };
}

async function getSectorRatios(symbol) {
  const companiesSector = await basicInfo.findOne(
    { symbol },
    { sector: 1, _id: 0 }
  );

  if (!companiesSector.sector) {
    throw new Error('no sector for selected company');
  }

  const companiesInSector = await basicInfo.find(companiesSector, {
    symbol: 1,
    _id: 0,
  });

  if (!companiesInSector.length) {
    throw new Error('no companies in selected sector');
  }

  const allDataPromise = companiesInSector.map((company) =>
    getCompanyRatios(company.symbol)
  );

  const allData = await Promise.all(allDataPromise);

  const years = await getCompanyYears(symbol);

  if (!years.length) {
    throw new Error('no data for selected company');
  }

  const ratioData = {
    'Production Efficiency': {},
    'Operation Efficiency': {},
    'Total Efficiency': {},
    'Profitability Ratio': {},
    'Fixed Asset Turnover Ratio': {},
    'Inventory Turnover Ratio': {},
    'Total Asset Turnover Ratio': {},
    'Return on Asset': {},
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
    { 'Ordinary Shares Number': 1, _id: 0 }
  );
  if (data && data?.['Ordinary Shares Number']) {
    return Object.keys(data['Ordinary Shares Number']);
  }
  return [];
}

function calculateProductEffeciency(operatingIncome, totalRevenue) {
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
  result.Weightage = '5%';

  return result;
}

function calculateOprationEffeciency(pretaxIncome, operatingIncome) {
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
  result.Weightage = '5%';

  return result;
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

  addCagr(result);
  result.Weightage = '5%';

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
  result.Weightage = '10%';

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
  result.Weightage = '5%';

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
  result.Weightage = '5%';

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
  result.Weightage = '10%';

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
  result.Weightage = '10%';

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
  result.Weightage = '10%';

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
  result.Weightage = '5%';

  return result;
}

function addCagr(ratio) {
  const keys = Object.keys(ratio);
  const years = keys.sort((a, b) => a - b);

  const latestYear = years[0];
  const firstYear = years.at(-1);
  const numberOfYears = years.length;

  ratio.CAGR = `${+(
    ((ratio[latestYear] / ratio[firstYear]) ** (1 / (numberOfYears - 1)) - 1) *
    100
  ).toFixed(3)}%`;
}

function addGrowth(result) {
  const ratios = Object.keys(result);
  let Growth = 0;
  ratios.forEach((ratio) => {
    const { CAGR, Weightage } = result[ratio];
    const CARG_Value = +CAGR.split('%')[0];
    const Weightage_Value = +Weightage.split('%')[0];
    if (!!CARG_Value && !!Weightage) {
      Growth += (CARG_Value / 100) * (Weightage_Value / 100);
    }
  });
  return Growth * 100;
}

module.exports = {
  getCompanyRatios,
  addGrowth,
  getSectorRatios,
};
