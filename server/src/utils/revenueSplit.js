function splitRevenue(
  amount
) {
  return {
    creator:
      amount * 0.6,

    platform:
      amount * 0.4,
  };
}

module.exports = {
  splitRevenue,
};