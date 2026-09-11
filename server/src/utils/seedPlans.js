require("dotenv").config();

const mongoose =
  require("mongoose");

const SubscriptionPlan =
  require(
    "../models/SubscriptionPlan"
  );

async function seed() {
  await mongoose.connect(
    process.env.MONGO_URI
  );

  await SubscriptionPlan.deleteMany(
    {}
  );

  await SubscriptionPlan.insertMany([
    {
      name: "Free",
      code: "FREE",
      price: 0,
      features: [
        "Ads",
        "Limited Access",
      ],
    },

    {
      name:
        "Music Premium",
      code: "MUSIC",
      price: 2000,
      features: [
        "No Ads",
        "Offline Music",
      ],
    },

    {
      name:
        "Video Premium",
      code: "VIDEO",
      price: 3000,
      features: [
        "Movies",
        "Series",
        "Offline Video",
      ],
    },

    {
      name:
        "Combo Premium",
      code: "COMBO",
      price: 4500,
      features: [
        "Music",
        "Movies",
        "Series",
        "Downloads",
      ],
    },

    {
      name:
        "Family Plan",
      code: "FAMILY",
      price: 7000,
      features: [
        "5 Members",
      ],
    },

    {
      name:
        "Student Plan",
      code: "STUDENT",
      price: 1500,
      features: [
        "Discount Access",
      ],
    },
  ]);

  console.log(
    "Plans Seeded"
  );

  process.exit();
}

seed();