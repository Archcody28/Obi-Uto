import client from "./client";

export const getSubscriptionPlans = () =>
  client
    .get("/subscription-plans/plans")
    .then((res) => res.data);
