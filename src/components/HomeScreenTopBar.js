import { FontAwesome6 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { getLiveEnvironmentSnapshot } from "../utils/environmentApi";
import { BASE_URL } from "../utils/api";

/******************** Avatar helper ********************/
function resolveAvatarUri(avatar) {
  if (!avatar) return null;

  const s = String(avatar);

  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("file://") ||
    s.startsWith("content://")
  ) {
    return s;
  }

  // relative path from server e.g. "/uploads/abc123"
  if (s.startsWith("/")) return BASE_URL + s;

  // filename only e.g. "abc123"
  return `${BASE_URL}/uploads/${s}`;
}

export default function HomeScreenTopBar({
  currentUser = null,
  preferredRegion = "central",
  todayTrips = 0,
  todayMinutes = 0,
}) {
  const displayName = currentUser?.name || currentUser?.username || "Guest";

  const TOP_PAD = StatusBar.currentHeight || 24;

  const avatarUri = resolveAvatarUri(currentUser?.avatar);

  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => {
    setAvatarBroken(false); // reset whenever user/avatar changes
  }, [avatarUri]);

  const showAvatar = !!avatarUri && !avatarBroken;

  const [loadingLive, setLoadingLive] = useState(true);
  const [liveErr, setLiveErr] = useState("");

  const [tempC, setTempC] = useState(null);
  const [rainMaxMm, setRainMaxMm] = useState(null);
  const [psi24, setPsi24] = useState(null);
  const [uv, setUv] = useState(null);
  const [apiTime, setApiTime] = useState("");

  async function loadLive() {
    setLoadingLive(true);
    setLiveErr("");

    try {
      const snap = await getLiveEnvironmentSnapshot(preferredRegion);
      setTempC(snap.tempC);
      setRainMaxMm(snap.rainMaxMm);
      setPsi24(snap.psi24);
      setUv(snap.uv);
      setApiTime(snap.apiTime);
    } catch (e) {
      setLiveErr("Live data unavailable");
      setTempC(null);
      setRainMaxMm(null);
      setPsi24(null);
      setUv(null);
      setApiTime("");
    } finally {
      setLoadingLive(false);
    }
  }

  useEffect(() => {
    loadLive();
  }, []);

  const statusText = loadingLive
    ? "Updating…"
    : liveErr
      ? "Offline"
      : apiTime
        ? `Updated ${apiTime}`
        : "Live";

  const statusDotStyle = [
    styles.statusDot,
    loadingLive
      ? { backgroundColor: "#F59E0B" }
      : liveErr
        ? { backgroundColor: "#EF4444" }
        : null,
  ];

  return (
    <View style={styles.container}>
      {/* Top Blue Header */}
      <View style={[styles.header, { paddingTop: TOP_PAD }]}>
        <View>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>

        <View style={styles.rightIcons}>
          {showAvatar ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <FontAwesome6 name="user" size={28} color="#64748B" />
            </View>
          )}
        </View>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Commutes</Text>

          <View style={styles.status}>
            <View style={statusDotStyle} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <Text style={styles.totalBill}>
          {todayTrips} {todayTrips === 1 ? "trip" : "trips"}
        </Text>
        <Text style={styles.estimate}>
          {todayMinutes} min total • Logged from your History
        </Text>

        {/* Mini live strip */}
        <View style={styles.liveRow}>
          {loadingLive ? (
            <View style={styles.liveLoading}>
              <ActivityIndicator />
              <Text style={styles.liveMuted}> Fetching environment…</Text>
            </View>
          ) : (
            <>
              <View style={styles.livePill}>
                <Text style={styles.liveLabel}>Temp</Text>
                <Text style={styles.liveValue}>
                  {tempC == null ? "--" : `${tempC.toFixed(1)}°C`}
                </Text>
              </View>

              <View style={styles.livePill}>
                <Text style={styles.liveLabel}>Rain</Text>
                <Text style={styles.liveValue}>
                  {rainMaxMm == null ? "--" : `${rainMaxMm.toFixed(1)} mm`}
                </Text>
              </View>

              <View style={styles.livePill}>
                <Text style={styles.liveLabel}>PSI</Text>
                <Text style={styles.liveValue}>
                  {psi24 == null ? "--" : psi24}
                </Text>
              </View>

              <View style={styles.livePill}>
                <Text style={styles.liveLabel}>UV</Text>
                <Text style={styles.liveValue}>{uv == null ? "--" : uv}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.locationRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={loadLive}>
            <FontAwesome6 name="rotate" size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  container: { backgroundColor: "#FAFAFA", paddingBottom: 16 },

  header: {
    backgroundColor: "#1E7F5C",
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  welcome: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  name: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", marginTop: 4 },

  rightIcons: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 73,
    height: 73,
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
  },

  avatarPlaceholder: {
    width: 73,
    height: 73,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginHorizontal: 20,
    marginTop: -36,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5D3",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: { fontSize: 16, fontWeight: "700", color: "#475569" },

  status: { flexDirection: "row", alignItems: "center", gap: 6 },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },

  statusText: { fontSize: 12, fontWeight: "700", color: "#64748B" },

  totalBill: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0A367A",
    marginTop: 8,
  },

  estimate: { fontSize: 13, color: "#64748B", marginTop: 2 },

  liveRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "space-evenly",
  },

  livePill: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  liveLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
    textAlign: "center",
  },

  liveValue: {
    marginTop: 2,
    fontSize: 14,
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
  },

  liveLoading: { flexDirection: "row", alignItems: "center" },
  liveMuted: { color: "#64748B", fontWeight: "700" },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
  },
});
