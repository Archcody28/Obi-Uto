import { create } from "zustand";

import {
  getHomeMedia,
} from "../api/homeApi";

import {
  fetchExternalHome,
} from "../api/mediaApi";

export const useMediaStore =
  create((set) => ({
    movies: [],
    series: [],
    music: [],
    podcasts: [],

    // PHASE 26 — external catalog (Internet Archive). Present ONLY when
    // creator inventory is empty; `externalUnavailable` signals an honest
    // provider-error state (never fake data).
    external: null,
    externalUnavailable: false,
    externalLoading: false,

    loading: false,

    fetchMedia:
      async () => {
        set({
          loading: true,
        });

        try {
          const data =
            await getHomeMedia();

          const creatorTotal =
            (data.movies || []).length +
            (data.series || []).length +
            (data.music || []).length +
            (data.podcasts || []).length;

          // Server already enriches empty homes, but handle both shapes:
          // embedded `external` on /media/home AND standalone fallback.
          let external = data.external || null;
          let externalUnavailable = false;
          if (creatorTotal === 0 && !external) {
            try {
              external = await fetchExternalHome(8);
              externalUnavailable = !!external?.unavailable;
            } catch (extErr) {
              console.log(extErr);
              external = null;
              externalUnavailable = true;
            }
          } else if (external) {
            externalUnavailable = !!external.unavailable;
          }

          set({
            movies:
              data.movies,
            series:
              data.series,
            music:
              data.music,
            podcasts:
              data.podcasts,
            external,
            externalUnavailable,
            loading: false,
          });
        } catch (
          error
        ) {
          console.log(
            error
          );

          // Creator backend unreachable: try external so Home stays useful.
          try {
            const external = await fetchExternalHome(8);
            set({
              external,
              externalUnavailable: !!external?.unavailable,
              loading: false,
            });
          } catch (extErr) {
            console.log(extErr);
            set({
              external: null,
              externalUnavailable: true,
              loading: false,
            });
          }
        }
      },
  }));