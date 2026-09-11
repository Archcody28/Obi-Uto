const history = [];

export const saveWatchHistory =
  (item) => {
    history.unshift(item);
  };

export const getWatchHistory =
  () => history;