import React, { useRef, useState } from "react";
import Video from "react-native-video";
import { View, Text, TouchableOpacity } from "react-native";
import { saveProgress } from "../services/watchHistory";

const ReactPlayer = ({ source, onProgressUpdate }) => {
  const videoRef = useRef(null);

  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleProgress = (data) => {
    setProgress(data.currentTime);
    saveProgress("media-id-here", data.currentTime); // Replace with actual media ID
    if (onProgressUpdate) {
      onProgressUpdate(data.currentTime);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Video
        ref={videoRef}
        source={{ uri: source }}
        style={{ flex: 1 }}
        controls={false}
        resizeMode="contain"
        paused={paused}
        onProgress={handleProgress}
      />

      {/* OVERLAY CONTROLS LAYER */}
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => setPaused(!paused)}>
          <Text style={{ color: "white", fontSize: 22 }}>
            {paused ? "▶" : "⏸"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReactPlayer;
