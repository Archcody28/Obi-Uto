const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Media = require("../models/Media");

async function seed() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    await Media.deleteMany({});

    await Media.insertMany([
      {
        title: "Interstellar",
        type: "movie",
        genre: "Sci-Fi",
        rating: 9,
        releaseYear: 2014,
        thumbnail:
          "https://picsum.photos/300/400",
        streamUrl:
          "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      },

      {
        title: "Breaking Bad",
        type: "series",
        genre: "Drama",
        rating: 10,
        releaseYear: 2008,
        thumbnail:
          "https://picsum.photos/301/400",
        streamUrl:
          "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      },

      {
        title: "Top Hits",
        type: "music",
        genre: "Pop",
        rating: 8,
        releaseYear: 2025,
        thumbnail:
          "https://picsum.photos/302/400",
        streamUrl:
          "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      },
    ]);

    console.log("Media Seeded");

    process.exit();
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

seed();