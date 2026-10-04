// Rules and calculations shown on the About page, one collapsible item each.
export const METHODS = [
  {
    title: "Limits",
    body: [
      "EIA publishes electricity and gas prices two to three months late, so the latest months are missing.",
      "Rate cases cover only California, Colorado, New York and Oregon. Heating surveys cover four Northeast states, October to March.",
      "Rate cases and surveys are read from web pages and can contain extraction errors. Check the linked source before relying on one.",
    ],
  },
  {
    title: "Electricity prices and bills",
    body: [
      "The 12-month price is total revenue over total kWh sold, so high-use months count more. Monthly prices mostly show the weather.",
      "The average bill is revenue over customers, EIA's own method. When EIA withholds a month's sales, we compute them from revenue and price.",
    ],
  },
  {
    title: "Change since 2019",
    body: "Compares the latest 12-month price with the 2019 average. Inflation is the change in the CPI-U all-items index over the same periods.",
  },
  {
    title: "Utilities",
    body: "Utility figures come from EIA-861M and cover utilities with 10,000 or more homes. In retail-choice states such as Texas, Massachusetts and Ohio, they cover only a fraction of homes.",
  },
  {
    title: "Rate cases",
    body: "Requested is the increase a utility filed for. Approved is the first year's increase, where the regulator states it. A figure is shown only where the commission's page prints it.",
  },
];
