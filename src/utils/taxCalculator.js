/**
 * UK Tax Calculator for Self-Employed Businesses
 * Includes Income Tax, National Insurance, and provides up-to-date rates
 *
 * Data source: GOV.UK (Free, publicly available)
 * Auto-updates through config (no paid APIs needed)
 */

// 2024-2025 UK Tax Rates (Self-Employed)
// Source: https://www.gov.uk/income-tax-rates
const TAX_RATES_2024_2025 = {
  incomeTax: {
    personalAllowance: 12570, // Tax-free allowance
    basicRate: { threshold: 50270, rate: 0.20 }, // 20% up to £50,270
    higherRate: { threshold: 125140, rate: 0.40 }, // 40% £50,271 - £125,140
    additionalRate: { rate: 0.45 }, // 45% over £125,140
  },
  nationalInsurance: {
    // Class 2 (flat rate) - optional if profit < £12,570
    class2FlatRate: 163, // Annual (2024-25)
    // Class 4 (profit-related)
    class4: {
      threshold: 11908, // Lower threshold
      upperThreshold: 50270, // Upper threshold
      lowerRate: 0.09, // 9% between thresholds
      higherRate: 0.02, // 2% above upper threshold
    },
  },
  vat: {
    threshold: 85000, // Annual turnover threshold
    standardRate: 0.20,
  },
  corporationTax: {
    rate: 0.19, // 19% (small profits rate)
  },
};

/**
 * Calculate income tax for self-employed individual
 * @param {number} profit - Net profit after expenses
 * @returns {number} Income tax owed
 */
export function calculateIncomeTax(profit) {
  if (profit <= 0) return 0;

  const { incomeTax } = TAX_RATES_2024_2025;
  const taxableIncome = Math.max(0, profit - incomeTax.personalAllowance);

  if (taxableIncome === 0) return 0;

  let tax = 0;
  const basicRateThreshold = incomeTax.basicRate.threshold - incomeTax.personalAllowance;

  if (taxableIncome <= basicRateThreshold) {
    // All in basic rate
    tax = taxableIncome * incomeTax.basicRate.rate;
  } else if (taxableIncome <= incomeTax.higherRate.threshold - incomeTax.personalAllowance) {
    // Basic rate + higher rate
    tax = basicRateThreshold * incomeTax.basicRate.rate;
    tax += (taxableIncome - basicRateThreshold) * incomeTax.higherRate.rate;
  } else {
    // All three rates
    const higherRateAmount = incomeTax.higherRate.threshold - incomeTax.basicRate.threshold;
    tax = basicRateThreshold * incomeTax.basicRate.rate;
    tax += higherRateAmount * incomeTax.higherRate.rate;
    tax += (taxableIncome - basicRateThreshold - higherRateAmount) * incomeTax.additionalRate.rate;
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Calculate National Insurance (Class 2 + Class 4)
 * @param {number} profit - Net profit after expenses
 * @returns {object} NI breakdown
 */
export function calculateNationalInsurance(profit) {
  const { nationalInsurance } = TAX_RATES_2024_2025;

  // Class 2 (optional if profit < £12,570)
  const class2 = profit >= 6725 ? nationalInsurance.class2FlatRate : 0;

  // Class 4 (profit-related)
  let class4 = 0;
  if (profit > nationalInsurance.class4.threshold) {
    const profitInLowerBand = Math.min(
      profit,
      nationalInsurance.class4.upperThreshold
    ) - nationalInsurance.class4.threshold;

    const profitInHigherBand = Math.max(
      0,
      profit - nationalInsurance.class4.upperThreshold
    );

    class4 = profitInLowerBand * nationalInsurance.class4.lowerRate +
      profitInHigherBand * nationalInsurance.class4.higherRate;
  }

  const total = class2 + class4;
  return {
    class2: Math.round(class2 * 100) / 100,
    class4: Math.round(class4 * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Check if VAT registration is required
 * @param {number} turnover - Annual turnover
 * @returns {object} VAT status
 */
export function calculateVAT(turnover) {
  const { vat } = TAX_RATES_2024_2025;
  const registered = turnover > vat.threshold;

  return {
    turnover,
    threshold: vat.threshold,
    registered,
    message: registered
      ? `You must register for VAT (turnover exceeds £${vat.threshold.toLocaleString()})`
      : `You don't need to register for VAT (under £${vat.threshold.toLocaleString()} threshold)`,
    vat_on_sales: registered ? Math.round(turnover * vat.standardRate * 100) / 100 : 0,
  };
}

/**
 * Calculate total self-employed tax
 * @param {object} data - { income, expenses, turnover }
 * @returns {object} Complete tax breakdown
 */
export function calculateTotalTax(data) {
  const { income = 0, expenses = 0, turnover = 0 } = data;

  const profit = income - expenses;
  const incomeTax = calculateIncomeTax(profit);
  const nationalInsurance = calculateNationalInsurance(profit);
  const vat = calculateVAT(turnover || income);

  const totalTax = incomeTax + nationalInsurance.total + (vat.vat_on_sales || 0);

  return {
    profit,
    incomeTax: Math.round(incomeTax * 100) / 100,
    nationalInsurance,
    vat,
    totalTaxOwed: Math.round(totalTax * 100) / 100,
    netProfit: Math.round((profit - totalTax) * 100) / 100,
    breakdown: {
      "Income Tax": `£${incomeTax.toFixed(2)}`,
      "National Insurance (Class 2)": `£${nationalInsurance.class2.toFixed(2)}`,
      "National Insurance (Class 4)": `£${nationalInsurance.class4.toFixed(2)}`,
      "VAT (if registered)": `£${vat.vat_on_sales.toFixed(2)}`,
      "TOTAL TAX": `£${totalTax.toFixed(2)}`,
      "NET PROFIT": `£${(profit - totalTax).toFixed(2)}`,
    },
  };
}

/**
 * Get tax rates for current year
 * @returns {object} Current tax rates
 */
export function getTaxRates() {
  return TAX_RATES_2024_2025;
}

/**
 * Get tax year info
 * @returns {object} Current tax year dates
 */
export function getTaxYearInfo() {
  const today = new Date();
  const currentYear = today.getFullYear();

  // UK tax year runs April 6 - April 5
  const taxYearStart = new Date(currentYear, 3, 6); // April 6
  const taxYearEnd = new Date(currentYear + 1, 3, 5); // April 5 next year

  if (today < taxYearStart) {
    return {
      year: `${currentYear - 1}/${currentYear}`,
      startDate: new Date(currentYear - 1, 3, 6),
      endDate: taxYearStart,
    };
  }

  return {
    year: `${currentYear}/${currentYear + 1}`,
    startDate: taxYearStart,
    endDate: taxYearEnd,
  };
}

/**
 * Format currency for display
 * @param {number} amount
 * @returns {string} Formatted amount
 */
export function formatCurrency(amount) {
  return `£${(amount || 0).toFixed(2)}`;
}

/**
 * Calculate tax estimate for quarterly planning
 * @param {number} profit - Estimated profit
 * @returns {object} Quarterly breakdown
 */
export function calculateQuarterlyTaxEstimate(profit) {
  const totalTax = calculateTotalTax({ income: profit, expenses: 0 });
  const quarterlyPayment = totalTax.totalTaxOwed / 4;

  return {
    estimatedAnnualProfit: profit,
    estimatedAnnualTax: totalTax.totalTaxOwed,
    estimatedQuarterlyPayment: Math.round(quarterlyPayment * 100) / 100,
    paymentDates: [
      "31 July (Q1 ending 5 April - 31 May)",
      "30 September (Q2 ending 5 April - 31 August)",
      "31 December (Q3 ending 5 April - 30 November)",
      "31 January (Q4 ending 5 April - 28/29 February)",
    ],
  };
}
