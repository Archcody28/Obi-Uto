import React,
{
  useState,
} from "react";

import {
  View,
  TextInput,
  Button,
} from "react-native";

import {
  createStream,
} from "../api/liveStreamApi";

export default function CreateLiveStreamScreen() {
  const [
    title,
    setTitle,
  ] = useState("");

  const submit =
    async () => {
      await createStream({
        creatorId:
          "CREATOR_ID",

        title,
      });
    };

  return (
    <View>
      <TextInput
        value={title}
        onChangeText={
          setTitle
        }
      />

      <Button
        title="Create Stream"
        onPress={submit}
      />
    </View>
  );
}