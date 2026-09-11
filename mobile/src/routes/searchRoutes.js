import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const q = req.query.q;

  res.json({
    results: [
      {
        _id: "1",
        title: `${q} Movie`,
      },
      {
        _id: "2",
        title: `${q} Music`,
      },
    ],
  });
});

export default router;