const Payment =
  require("../models/Payment");

exports.getRevenue =
  async (req, res) => {
    try {
      const payments =
        await Payment.find({
          status:
            "success",
        });

      const revenue =
        payments.reduce(
          (
            total,
            payment
          ) =>
            total +
            payment.amount,
          0
        );

      res.json({
        totalRevenue:
          revenue,

        payments:
          payments.length,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };