import { create } from "zustand";

import {
  getHomeMedia,
} from "../api/homeApi";

export const useMediaStore =
  create((set) => ({
    movies: [],
    series: [],
    music: [],
    podcasts: [],

    loading: false,

    fetchMedia:
      async () => {
        set({
          loading: true,
        });

        try {
          const data =
            await getHomeMedia();

          set({
            movies:
              data.movies,
            series:
              data.series,
            music:
              data.music,
            podcasts:
              data.podcasts,
            loading: false,
          });
        } catch (
          error
        ) {
          console.log(
            error
          );

          set({
            loading: false,
          });
        }
      },
  }));