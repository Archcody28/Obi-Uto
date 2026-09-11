import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";

export default function AppNavigator() {
  const token = useAuthStore((state) => state.token);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const restoreAuth = useAuthStore((state) => state.restoreAuth);

  useEffect(() => {
    restoreAuth();
  }, []);

  if (isRestoring) {
    return null;
  }

  if (token) {
    return <HomeScreen />;
  }

  return <LoginScreen />;
}