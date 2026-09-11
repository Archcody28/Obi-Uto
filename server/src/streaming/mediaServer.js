const uploadRecordedVideo =
  require("../utils/uploadRecordedVideo");

const path =
  require("path");
const Media =
  require("../models/Media");
const NodeMediaServer =
  require("node-media-server");

const LiveStream =
  require("../models/LiveStream");

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },

  http: {
    port: 8000,
    mediaroot: "./media",
    allow_origin: "*",
  },

  trans: {
    ffmpeg:
      "C:/ffmpeg/bin/ffmpeg.exe",

   tasks: [
  {
    app: "live",

    hls: true,

    hlsFlags:
      "[hls_time=2:hls_list_size=5:hls_flags=delete_segments]",

    mp4: true,

    mp4Flags:
      "[movflags=faststart]",
  },
],
  },
};

const nms =
  new NodeMediaServer(config);

/*
 Stream Started
*/

nms.on(
  "postPublish",
  async (
    id,
    streamPath
  ) => {
    try {
      const streamKey =
        streamPath.split("/")[2];

      await LiveStream.findOneAndUpdate(
        {
          streamKey,
        },
        {
          isLive: true,

          startedAt:
            new Date(),

          playbackUrl:
            `http://192.168.42.43:8000/live/${streamKey}/index.m3u8`,
        }
      );

      console.log(
        "LIVE:",
        streamKey
      );
    } catch (err) {
      console.log(err);
    }
  }
);

/*
 Stream Ended
*/

nms.on(
  "donePublish",
  async (
    id,
    streamPath
  ) => {
    try {
      const streamKey =
        streamPath.split("/")[2];

      await LiveStream.findOneAndUpdate(
        {
          streamKey,
        },
        {
          isLive: false,

          endedAt:
            new Date(),
        }
      );

      console.log(
        "ENDED:",
        streamKey
      );
      const stream =
  await LiveStream.findOne({
    streamKey,
  });

if (stream) {
  const localFile =
  path.join(
    process.cwd(),
    "media",
    "live",
    `${streamKey}.mp4`
  );

const uploaded =
  await uploadRecordedVideo(
    localFile
  );

await Media.create({
  title:
    stream.title,

  description:
    stream.description,

  thumbnail:
    stream.thumbnail,

  category:
    stream.category,

  creator:
    stream.creatorId,

  type:
    "video",

  source:
    uploaded.secure_url,
});
}
    } catch (err) {
      console.log(err);
    }
  }
  
);


module.exports =
  nms;