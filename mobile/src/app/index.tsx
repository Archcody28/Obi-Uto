import { useAuthStore } from "../store/authStore";
import LoginScreen from "../screens/LoginScreen";
import { Redirect } from "expo-router";

export default function Page() {
  const token = useAuthStore((state) => state.token);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  if (isRestoring) {
    return null;
  }

  if (token) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <LoginScreen />;
}
