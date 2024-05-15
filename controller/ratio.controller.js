const {
  getCompanyRatios,
  getSectorRatios,
  addGrowth,
} = require('../helper/ratio.helper');

async function calculateRatios(req, res) {
  try {
    const { symbol } = req.query;

    if (!symbol) {
      throw new Error('no company symbol found');
    }

    const companyData = await getCompanyRatios(symbol);

    // const sectorData = await getSectorRatios(symbol);

    const Growth = addGrowth(companyData);

    res.status(200).json({
      status: 'success',
      data: {
        companyData,
        Growth,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      message: error.message || 'something went wrong',
    });
  }
}

module.exports = calculateRatios;
