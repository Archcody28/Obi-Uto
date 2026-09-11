const LiveStream =
  require("../models/LiveStream");

const generateStreamKey =
  require(
    "../utils/generateStreamKey"
  );

exports.createStream =
  async (req, res) => {
    try {
      const stream =
        await LiveStream.create(
          {
            creatorId:
              req.body.creatorId,

            title:
              req.body.title,

            description:
              req.body.description,

            category:
              req.body.category,

            thumbnail:
              req.body.thumbnail,

            streamKey:
              generateStreamKey(),
          }
        );

      res.json(stream);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

exports.getLiveStreams =
  async (req, res) => {
    const streams =
      await LiveStream.find({
        isLive: true,
      })
        .populate(
          "creatorId"
        );

    res.json(streams);
  };

  exports.startStream =
  async (req, res) => {
    const stream =
      await LiveStream.findByIdAndUpdate(
        req.params.id,
        {
          isLive: true,

          startedAt:
            new Date(),
        },
        {
          new: true,
        }
      );

    res.json(stream);
  };

  exports.endStream =
  async (req, res) => {
    const stream =
      await LiveStream.findByIdAndUpdate(
        req.params.id,
        {
          isLive: false,

          endedAt:
            new Date(),
        },
        {
          new: true,
        }
      );

    res.json(stream);
  };
  exports.scheduleStream =
  async (req, res) => {
    try {

      const stream =
        await LiveStream.create({

          creatorId:
            req.body.creatorId,

          title:
            req.body.title,

          description:
            req.body.description,

          thumbnail:
            req.body.thumbnail,

          category:
            req.body.category,

          scheduledFor:
            req.body.scheduledFor,

          isScheduled:
            true,

          streamKey:
            generateStreamKey(),
        });

      res.json(stream);

    } catch (err) {

      res.status(500).json({
        error:
          err.message,
      });

    }
  };

  exports.getDiscovery =
async (req,res)=>{

const now=new Date();

const live=
await LiveStream.find({
isLive:true
})
.sort({
viewers:-1
})
.limit(10);

const upcoming=
await LiveStream.find({
isScheduled:true,
scheduledFor:{
$gt:now
}
})
.sort({
scheduledFor:1
})
.limit(10);

res.json({

live,

upcoming,

});

};
