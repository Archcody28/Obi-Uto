import client
  from "./client";

export const getReferralCode =
  () =>
    client
      .get(
        "/referrals/code"
      )
      .then(
        (res) =>
          res.data
      );

export const applyReferral =
  (code) =>
    client
      .post(
        "/referrals/apply",
        { code }
      )
      .then(
        (res) =>
          res.data
      );