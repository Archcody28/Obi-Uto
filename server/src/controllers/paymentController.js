const Payment =
  require("../models/Payment");

const UserSubscription =
  require("../models/UserSubscription");

const SubscriptionPlan =
  require("../models/SubscriptionPlan");

const UserCoinWallet =
  require("../models/UserCoinWallet");

const User =
  require("../models/User");

const {
  initializePayment,
  verifyPayment,
} = require(
  "../services/paystackService"
);

/*
 Coin Packages
*/

const COIN_PACKAGES = {
  100: 1000,
  250: 2000,
  700: 5000,
  1500: 10000,
  4000: 25000,
};

/*
 SUBSCRIPTIONS
*/

exports.createCheckout =
  async (req, res) => {
    try {
      const {
        email,
        planId,
      } = req.body;

      // userId from authenticated context - never trust client
      const userId = req.user.id;

      // Validate plan server-side
      const plan =
        await SubscriptionPlan.findById(
          planId
        );

      if (!plan || !plan.active) {
        return res
          .status(400)
          .json({
            message:
              "Invalid subscription plan",
          });
      }

      // Server determines the amount - never trust client
      const amount = plan.price;

      const payment =
        await initializePayment(
          email,
          amount,
          {
            paymentType:
              "subscription",

            userId,

            planId,
          }
        );

      await Payment.create({
        userId,

        subscriptionId:
          planId,

        amount,

        reference:
          payment.reference,

        paymentType:
          "subscription",

        metadata: {
          planId,
        },
      });

      res.json(payment);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

/*
 COIN PURCHASE
*/

exports.purchaseCoins =
  async (req, res) => {
    try {
      const {
        email,
        coins,
      } = req.body;

      // userId from authenticated context - never trust client
      const userId = req.user.id;

      // Server determines the amount from package - never trust client
      const amount =
        COIN_PACKAGES[
          coins
        ];

      if (!amount) {
        return res
          .status(400)
          .json({
            message:
              "Invalid package",
          });
      }

      const payment =
        await initializePayment(
          email,
          amount,
          {
            paymentType:
              "coins",

            userId,

            coins,
          }
        );

      await Payment.create({
        userId,

        amount,

        reference:
          payment.reference,

        paymentType:
          "coins",

        coinsPurchased:
          coins,

        metadata: {
          coins,
        },
      });

      res.json(payment);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

/*
 VERIFY
*/

exports.verifyCheckout =
  async (req, res) => {
    try {
      const {
        reference,
      } = req.params;

      const payment =
        await Payment.findOne({
          reference,
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            message:
              "Payment not found",
          });
      }

      /*
       Prevent duplicates
      */

      if (
        payment.status ===
        "success"
      ) {
        return res.json({
          message:
            "Already verified",
        });
      }

      const data =
        await verifyPayment(
          reference
        );

      if (
        data.status !==
        "success"
      ) {
        payment.status = "failed";
        await payment.save();

        return res
          .status(400)
          .json({
            message:
              "Payment not successful",
          });
      }

      // Verify the amount matches what we expect
      // Paystack returns amount in kobo (amount * 100)
      const paystackAmount = data.amount;
      if (paystackAmount !== payment.amount * 100) {
        payment.status = "failed";
        await payment.save();

        return res
          .status(400)
          .json({
            message:
              "Payment amount mismatch",
          });
      }

      payment.status =
        "success";

      await payment.save();

      /*
       SUBSCRIPTIONS
      */

      if (
        payment.paymentType ===
        "subscription"
      ) {
        const plan =
          await SubscriptionPlan.findById(
            payment.subscriptionId
          );

        if (plan) {
          // Create UserSubscription record
          await UserSubscription.create(
            {
              userId:
                payment.userId,

              planId:
                payment.subscriptionId,

              startDate:
                new Date(),

              endDate:
                new Date(
                  Date.now() +
                    plan.durationDays *
                      86400000
                ),

              status: "active",
            }
          );

          // Update user's subscription state to premium
          await User.findByIdAndUpdate(
            payment.userId,
            {
              subscription: "premium",
            }
          );
        }

        return res.json({
          message:
            "Payment verified - premium activated",
        });
      }

      /*
       COINS
      */

      if (
        payment.paymentType ===
        "coins"
      ) {
        const wallet =
          await UserCoinWallet.findOneAndUpdate(
            {
              userId:
                payment.userId,
            },
            {
              $inc: {
                coins:
                  payment.coinsPurchased,

                totalPurchased:
                  payment.coinsPurchased,
              },
            },
            {
              new: true,

              upsert: true,
            }
          );

        return res.json({
          message:
            "Coins credited",

          wallet,
        });
      }

      res.json({
        message:
          "Payment verified",
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };
/*
 PAYSTACK WEBHOOK
*/

exports.handleWebhook =
  async (req, res) => {
    try {
      // Verify webhook signature
      const signature =
        req.headers[
          "x-paystack-signature"
        ];

      if (!signature) {
        return res
          .status(400)
          .json({
            error:
              "Missing signature",
          });
      }

      const hash =
        require("crypto")
          .createHmac(
            "sha512",
            process.env.PAYSTACK_SECRET_KEY
          )
          .update(
            JSON.stringify(req.body)
          )
          .digest("hex");

      if (hash !== signature) {
        return res
          .status(400)
          .json({
            error:
              "Invalid signature",
          });
      }

      const event = req.body;

      // Only process successful charge events
      if (
        event.event !==
        "charge.success"
      ) {
        return res
          .status(200)
          .json({
            received: true,
          });
      }

      const {
        reference,
        status,
        amount,
      } = event.data;

      if (
        status !== "success" ||
        !reference
      ) {
        return res
          .status(200)
          .json({
            received: true,
          });
      }

      // Find the payment record
      const payment =
        await Payment.findOne({
          reference,
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            error:
              "Payment not found",
          });
      }

      // Idempotency: already processed
      if (
        payment.status ===
        "success"
      ) {
        return res
          .status(200)
          .json({
            received: true,
          });
      }

      // Verify amount matches
      // Paystack returns amount in kobo
      if (
        amount !==
        payment.amount * 100
      ) {
        payment.status = "failed";
        await payment.save();

        return res
          .status(200)
          .json({
            received: true,
          });
      }

      // Mark payment as successful
      payment.status = "success";
      payment.gateway =
        "paystack-webhook";

      await payment.save();

      /*
       SUBSCRIPTIONS
      */

      if (
        payment.paymentType ===
        "subscription"
      ) {
        const plan =
          await SubscriptionPlan.findById(
            payment.subscriptionId
          );

        if (plan) {
          // Create UserSubscription record
          await UserSubscription.create(
            {
              userId:
                payment.userId,

              planId:
                payment.subscriptionId,

              startDate:
                new Date(),

              endDate:
                new Date(
                  Date.now() +
                    plan.durationDays *
                      86400000
                ),

              status: "active",
            }
          );

          // Update user's subscription state to premium
          await User.findByIdAndUpdate(
            payment.userId,
            {
              subscription:
                "premium",
            }
          );
        }
      }

      /*
       COINS
      */

      if (
        payment.paymentType ===
        "coins"
      ) {
        await UserCoinWallet.findOneAndUpdate(
          {
            userId:
              payment.userId,
          },
          {
            $inc: {
              coins:
                payment.coinsPurchased,

              totalPurchased:
                payment.coinsPurchased,
            },
          },
          {
            new: true,

            upsert: true,
          }
        );
      }

      res
        .status(200)
        .json({
          received: true,
        });
    } catch (err) {
      console.log(
        "Webhook error:",
        err.message
      );

      res.status(200).json({
        received: true,
      });
    }
  };
