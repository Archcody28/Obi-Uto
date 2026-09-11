import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useProfileStore = create((set) => ({
  profiles: [],

  activeProfile: null,

  loadProfiles: async () => {
    const saved =
      await AsyncStorage.getItem(
        "profiles"
      );

    const profiles =
      saved
        ? JSON.parse(saved)
        : [];

    const active =
      await AsyncStorage.getItem(
        "activeProfile"
      );

    set({
      profiles,
      activeProfile: active
        ? JSON.parse(active)
        : null,
    });
  },

  addProfile: async (profile) => {
    set((state) => {
      const updated = [
        ...state.profiles,
        profile,
      ];

      AsyncStorage.setItem(
        "profiles",
        JSON.stringify(updated)
      );

      return {
        profiles: updated,
      };
    });
  },

  setActiveProfile:
    async (profile) => {
      await AsyncStorage.setItem(
        "activeProfile",
        JSON.stringify(profile)
      );

      set({
        activeProfile: profile,
      });
    }
}));