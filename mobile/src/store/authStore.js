import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../config";

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
      isRestoring: false,
    });
    AsyncStorage.removeItem(STORAGE_KEY);
  },

  restoreAuth: async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      if (token) {
        set({
          token,
        });

        const response =
          await axios.get(
            `${API_BASE_URL}/auth/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const user =
          response.data.user;

        set({
          token,
          user,
          isRestoring: false,
        });
      } else {
        set({
          isRestoring: false,
        });
      }
    } catch (_err) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({
        token: null,
        user: null,
        isRestoring: false,
      });
    }
  },
}));
