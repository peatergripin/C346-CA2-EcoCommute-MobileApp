import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

export default function HeaderBar({
  navigation,
  title = "",
  rightIcon,
  onRightPress,
}) {
  return (
    <View style={styles.container}>
      {/* LEFT */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <FontAwesome6 name="chevron-left" size={18} color="#fff" />
      </TouchableOpacity>

      {/* CENTER */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* RIGHT */}
      {rightIcon ? (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRightPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name={rightIcon} size={18} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E7F5C",

    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",

    elevation: 3,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  iconPlaceholder: {
    width: 42,
    height: 42,
  },
});
