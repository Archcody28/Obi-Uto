const Gift =
  require("../models/Gift");

module.exports =
  async function seedGifts() {
    const count =
      await Gift.countDocuments();

    if (count > 0) {
      return;
    }

    await Gift.insertMany([
      {
        name: "Rose",
        icon: "🌹",
        coinCost: 1,
        creatorValue: 0.5,
      },

      {
        name: "Coffee",
        icon: "☕",
        coinCost: 10,
        creatorValue: 5,
      },

      {
        name: "Diamond",
        icon: "💎",
        coinCost: 100,
        creatorValue: 50,
      },

      {
        name: "Rocket",
        icon: "🚀",
        coinCost: 500,
        creatorValue: 250,
      },

      {
        name: "Castle",
        icon: "🏰",
        coinCost: 1000,
        creatorValue: 500,
      },
    ]);

    console.log(
      "Gift catalog seeded"
    );
  };