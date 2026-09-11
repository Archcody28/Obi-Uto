import client
  from "./client";

export const createCheckout =
  (data) =>
    client
      .post(
        "/payments/checkout",
        data
      )
      .then(
        (res) =>
          res.data
      );

export const purchaseCoins =
  (data) =>
    client
      .post(
        "/payments/coins",
        data
      )
      .then(
        (res) =>
          res.data
      );

export const verifyPayment =
  (reference) =>
    client
      .get(
        `/payments/verify/${reference}`
      )
      .then(
        (res) =>
          res.data
      );