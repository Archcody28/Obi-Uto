const plans = [
  {
    id: "basic_video",
    name: "Basic Video",
    type: "base",
    price: 5,
    features: ["hd", "ads_supported"],
  },

  {
    id: "premium_video",
    name: "Premium Video",
    type: "base",
    price: 12,
    features: ["4k", "no_ads", "offline"],
  },

  {
    id: "music_addon",
    name: "Music Add-on",
    type: "addon",
    price: 4,
    features: ["music", "playlists", "lyrics"],
  },

  {
    id: "sports_addon",
    name: "Sports Pack",
    type: "addon",
    price: 6,
    features: ["live_sports", "high_bitrate"],
  },

  {
    id: "ultimate_bundle",
    name: "Ultimate Bundle",
    type: "bundle",
    price: 18,
    features: [
      "4k",
      "no_ads",
      "offline",
      "music",
      "sports",
      "priority_streaming",
    ],
  },
];

module.exports = plans;