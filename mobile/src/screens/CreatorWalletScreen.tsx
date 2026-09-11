import React,
{
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import {
  getWallet,
  requestWithdrawal,
} from "../api/walletApi";

export default function CreatorWalletScreen() {
  const [wallet,
    setWallet] =
    useState(null);

  const creatorId =
    "CREATOR_ID";

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet =
    async () => {
      const data =
        await getWallet(
          creatorId
        );

      setWallet(data);
    };

  const withdraw =
    async () => {
      await requestWithdrawal(
        creatorId,
        1000
      );

      alert(
        "Withdrawal Requested"
      );

      loadWallet();
    };

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          "center",
        alignItems:
          "center",
      }}
    >
      <Text>
        Balance:
        ₦
        {wallet?.balance}
      </Text>

      <Text>
        Total Earned:
        ₦
        {wallet?.totalEarned}
      </Text>

      <TouchableOpacity
        onPress={
          withdraw
        }
      >
        <Text>
          Withdraw ₦1000
        </Text>
      </TouchableOpacity>
    </View>
  );
}