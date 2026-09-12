import React, {
  useState,
} from "react";

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  createStream,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";

export default function CreateLiveStreamScreen() {
  const [
    title,
    setTitle,
  ] = useState("");
  const [
    loading,
    setLoading,
  ] = useState(false);

  const submit =
    async () => {
      if (!title.trim()) {
        Alert.alert(
          "Title required",
          "Name your live stream before creating it."
        );
        return;
      }

      setLoading(true);
      try {
        await createStream({
          title: title.trim(),
        });

        setTitle("");
        Alert.alert(
          "Live stream created",
          "Your stream key is ready in Creator Studio."
        );
      } catch (err: any) {
        console.log(err);
        Alert.alert(
          "Unable to create stream",
          err?.response?.data?.message ||
            "Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator Studio
      </Text>
      <Text style={styles.title}>
        Create Live Stream
      </Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Stream title"
        placeholderTextColor={
          AppTheme.colors.textSubtle
        }
        style={styles.input}
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading &&
            styles.buttonDisabled,
        ]}
        disabled={loading}
        onPress={submit}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Creating..."
            : "Create Stream"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 20,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 10,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 22,
  },

  input: {
    minHeight: 54,
    backgroundColor: AppTheme.colors.input,
    color: AppTheme.colors.text,
    borderRadius: AppTheme.radius.md,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },
});
