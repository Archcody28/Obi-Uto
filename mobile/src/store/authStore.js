import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@auth_token";

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isRestoring: true,

  setUser: (user) =>
    set({
      user,
    }),

  setToken: (token) => {
    set({
      token,
    });
    if (token) {
      AsyncStorage.setItem(STORAGE_KEY, token);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  },

  logout: () => {
    set({
      token: null,
      user: null,
    });
    AsyncStorage.removeItem(STORAGE_KEY);
  },

  restoreAuth: async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      if (token) {
        set({
          token,
          isRestoring: false,
        });
      } else {
        set({
          isRestoring: false,
        });
      }
    } catch (err) {
      set({
        isRestoring: false,
      });
    }
  },
}));