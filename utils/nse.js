const axios = require("axios");
const UserAgent = require("user-agents");

class NSE {
  baseUrl = "https://www.nseindia.com";
  cookies = "";
  userAgent = "";
  cookieUsedCount = 0;
  cookieMaxAge = 60; // should be in seconds
  cookieExpiry = new Date().getTime() + this.cookieMaxAge * 1000;
  noOfConnections = 0;
  baseHeaders = {
    Authority: "www.nseindia.com",
    Referer: "https://www.nseindia.com/",
    Accept: "*/*",
    Origin: this.baseUrl,
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Sec-Ch-Ua":
      '" Not A;Brand";v="99", "Chromium";v="109", "Google Chrome";v="109"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };

  async getNseCookies() {
    if (
      this.cookies === "" ||
      this.cookieUsedCount > 10 ||
      this.cookieExpiry <= new Date().getTime()
    ) {
      this.userAgent = new UserAgent().toString();
      const response = await axios.get(this.baseUrl, {
        headers: { ...this.baseHeaders, "User-Agent": this.userAgent },
      });
      const setCookies = response.headers["set-cookie"];
      const cookies = [];
      setCookies.forEach((cookie) => {
        const requiredCookies = [
          "nsit",
          "nseappid",
          "ak_bmsc",
          "AKA_A2",
          "bm_mi",
          "bm_sv",
        ];
        const cookieKeyValue = cookie.split(";")[0];
        const cookieEntry = cookieKeyValue.split("=");
        /* istanbul ignore else */
        if (requiredCookies.includes(cookieEntry[0])) {
          cookies.push(cookieKeyValue);
        }
      });
      this.cookies = cookies.join("; ");
      this.cookieUsedCount = 0;
      this.cookieExpiry = new Date().getTime() + this.cookieMaxAge * 1000;
    }
    this.cookieUsedCount++;
    return this.cookies;
  }

  async getData(url) {
    return axios.get(url, {
      headers: {
        ...this.baseHeaders,
        Cookie: await this.getNseCookies(),
        "User-Agent": this.userAgent,
      },
    });
  }

  async getDataForCompany(symbol) {
    const url = `${this.baseUrl}/api/quote-equity?symbol=${encodeURIComponent(
      symbol.toUpperCase()
    )}`;
    return this.getData(url);
  }

  async getIntradayData(symbol) {
    const { data } = await this.getDataForCompany(symbol);
    const identifier = data.info.identifier;
    let url = `${this.baseUrl}/api/chart-databyindex?index=${identifier}`;
    return this.getData(url);
  }
}

module.exports = NSE;
