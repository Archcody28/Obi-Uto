import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProfileStore, } from "../store/profileStore";
export const saveProgress = async (mediaId, time) => {
  try {
    const profile = 
    useProfileStore.getState()
    .activeProfile;
    const data = {
      mediaId,
      time,
      profileId: profile?.id,
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      `watch_${mediaId}`,
      JSON.stringify(data)
    );
  } catch (err) {
    console.log("Error saving progress", err);
  }
};

export const getProgress = async (mediaId) => {
  try {
    const data = await AsyncStorage.getItem(`watch_${mediaId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};