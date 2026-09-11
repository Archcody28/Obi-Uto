const SubscriptionPlan =
  require(
    "../models/SubscriptionPlan"
  );

const UserSubscription =
  require(
    "../models/UserSubscription"
  );

exports.getPlans =
  async (req, res) => {
    const plans =
      await SubscriptionPlan.find({
        active: true,
      });

    res.json(plans);
  };