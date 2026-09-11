const Wallet =
  require("../models/Wallet");

const Transaction =
  require("../models/Transaction");

async function creditCreator(
  creatorId,
  amount,
  description
) {
  let wallet =
    await Wallet.findOne({
      creatorId,
    });

  if (!wallet) {
    wallet =
      await Wallet.create({
        creatorId,
      });
  }

  wallet.balance += amount;
  wallet.totalEarned += amount;

  await wallet.save();

  await Transaction.create({
    creatorId,
    amount,
    type: "earning",
    description,
  });
}

module.exports = {
  creditCreator,
};