/******************** Imports ********************/
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

/******************** Tab Item ********************/
function NavItem({ label, icon, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={styles.tabSlot}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <FontAwesome6
        name={icon}
        size={22}
        color={isActive ? "#1E7F5C" : "#9CA3AF"}
      />
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/******************** Component ********************/
// in each screen, active prop is passed the route name e.g. Home etc.
export default function BottomNav({ navigation, active }) {
  return (
    <View style={styles.container}>
      <Svg
        style={styles.background}
        width="100%"
        height="97"
        viewBox="0 0 402 97"
        preserveAspectRatio="none"
        fill="none"
      >
        <Path
          d="M144.322 0.5C153.74 0.50008 161.813 7.23135 163.505 16.4961L164.11 19.8115C171.602 60.8277 230.398 60.8277 237.89 19.8115L238.495 16.4961C240.187 7.23134 248.26 0.500073 257.678 0.5H401.5V72.415C401.5 85.3936 390.979 95.915 378 95.915H24C11.0214 95.915 0.500107 85.3936 0.5 72.415V0.5H144.322Z"
          fill="#FFFFFF"
          stroke="#D1D5D3"
        />
      </Svg>

      {/* Row consists of: Home | History | spacer | Analytics | Profile */}
      <View style={styles.row}>
        <NavItem
          label="Home"
          icon="house"
          isActive={active === "Home"}
          onPress={() => navigation.navigate("Home")}
        />
        <NavItem
          label="History"
          icon="clock-rotate-left"
          isActive={active === "CommuteList"}
          onPress={() => navigation.navigate("CommuteList")}
        />

        <View style={styles.centerSpacer} />

        <NavItem
          label="Analytics"
          icon="chart-line"
          isActive={active === "Analytics"}
          onPress={() => navigation.navigate("Analytics")}
        />
        <NavItem
          label="Profile"
          icon="user"
          isActive={active === "Profile"}
          onPress={() => navigation.navigate("Profile")}
        />
      </View>

      {/* Center Add Bill Button */}
      <TouchableOpacity
        style={styles.centerButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("AddCommute")}
      >
        <FontAwesome6 name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  container: {
    position: "relative",
    left: 0,
    right: 0,
    bottom: -25,
    height: 97,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  background: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  row: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 4,
  },

  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
  },

  centerSpacer: {
    flex: 4,
  },

  label: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "500",
    color: "#9CA3AF",
  },

  activeLabel: {
    color: "#1E7F5C",
    fontWeight: "600",
  },

  centerButton: {
    position: "absolute",
    left: "50%",
    top: -18,
    transform: [{ translateX: -30 }],
    width: 60,
    height: 60,
    borderRadius: 32,
    backgroundColor: "#1E7F5C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
});
