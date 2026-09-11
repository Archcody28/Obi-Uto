exports.buildMediaPayload =
  ({
    title,
    description,
    type,
    genre,

    thumbnail,
    banner,

    videoUrl,
    audioUrl,
  }) => {
    return {
      title,
      description,
      type,
      genre,

      thumbnail,
      banner,

      videoUrl,
      audioUrl,
    };
  };