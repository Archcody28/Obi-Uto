import React, {
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  loginUser,
} from "../api/authApi";

import {
  useAuthStore,
} from "../store/authStore";

export default function LoginScreen() {
  const setToken =
    useAuthStore(
      (state) =>
        state.setToken
    );

  const setUser =
    useAuthStore(
      (state) =>
        state.setUser
    );

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleLogin =
    async () => {
      try {
        setLoading(true);

        const response =
          await loginUser(
            email,
            password
          );

        setToken(
          response.token
        );

        setUser(
          response.user
        );

        router.replace(
          "/(tabs)/home"
        );
      } catch (err) {
        console.log(err);

        Alert.alert(
          "Login Failed",
          err?.response?.data
            ?.message ||
            "Unable to login"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Media App
      </Text>

      <TextInput
        placeholder="Email"
        style={
          styles.input
        }
        value={email}
        onChangeText={
          setEmail
        }
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={
          styles.input
        }
        value={password}
        onChangeText={
          setPassword
        }
      />

      <TouchableOpacity
        style={
          styles.button
        }
        onPress={
          handleLogin
        }
        disabled={loading}
      >
        <Text
          style={
            styles.text
          }
        >
          {loading
            ? "Signing In..."
            : "Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent:
        "center",
      padding: 20,
    },

    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 30,
    },

    input: {
      borderWidth: 1,
      borderColor: "#444",
      marginBottom: 15,
      padding: 12,
      borderRadius: 10,
    },

    button: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      borderRadius: 10,
    },

    text: {
      color: "#fff",
      textAlign:
        "center",
      fontWeight: "700",
    },
  });