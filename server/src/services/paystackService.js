const axios =
  require("axios");

async function initializePayment(
  email,
  amount,
  metadata = {}
) {
  const response =
    await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,

        amount:
          amount * 100,

        metadata,
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data.data;
}

async function verifyPayment(
  reference
) {
  const response =
    await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

  return response.data.data;
}

module.exports = {
  initializePayment,
  verifyPayment,
};