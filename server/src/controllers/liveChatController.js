const LiveChat =
  require("../models/LiveChat");

exports.getMessages =
  async (req, res) => {
    try {
      const messages =
        await LiveChat.find({
          streamId:
            req.params.streamId,
        })
          .sort({
            createdAt: 1,
          })
          .limit(100);

      res.json(messages);
    } catch (err) {
      res.status(500).json({
        message:
          "Failed to load chat",
      });
    }
  };