const LiveStream =
  require("../models/LiveStream");

/*
Schedule Stream
*/
exports.scheduleStream =
  async (req, res) => {
    try {
      const stream =
        await LiveStream.create({
          creatorId:
            req.user.id,

          title:
            req.body.title,

          description:
            req.body.description,

          thumbnail:
            req.body.thumbnail,

          scheduledFor:
            req.body.scheduledFor,
        });

      res.status(201).json(
        stream
      );
    } catch (err) {
      res.status(500).json({
        message:
          "Failed to schedule stream",
      });
    }
  };

/*
Start Stream
*/
exports.startStream =
  async (req, res) => {
    try {
      const stream =
        await LiveStream.findByIdAndUpdate(
          req.params.id,
          {
            status: "live",

            startedAt:
              new Date(),
          },
          {
            new: true,
          }
        );

      res.json(stream);
    } catch (err) {
      res.status(500).json({
        message:
          "Failed to start stream",
      });
    }
  };

/*
End Stream
*/
exports.endStream =
  async (req, res) => {
    try {
      const stream =
        await LiveStream.findByIdAndUpdate(
          req.params.id,
          {
            status: "ended",

            endedAt:
              new Date(),
          },
          {
            new: true,
          }
        );

      res.json(stream);
    } catch (err) {
      res.status(500).json({
        message:
          "Failed to end stream",
      });
    }
  };

/*
Upcoming Streams
*/
exports.getUpcomingStreams =
  async (req, res) => {
    const streams =
      await LiveStream.find({
        status:
          "scheduled",
      })
        .populate(
          "creatorId",
          "displayName"
        )
        .sort({
          scheduledFor: 1,
        });

    res.json(streams);
  };

/*
Live Streams
*/
exports.getLiveStreams =
  async (req, res) => {
    const streams =
      await LiveStream.find({
        status: "live",
      })
        .populate(
          "creatorId",
          "displayName"
        )
        .sort({
          startedAt: -1,
        });

    res.json(streams);
  };