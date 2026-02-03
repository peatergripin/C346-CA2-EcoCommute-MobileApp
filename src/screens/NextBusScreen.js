import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

import HeaderBar from "../components/HeaderBar";
import BottomNav from "../components/BottomNav";

/******************** Helper Funct ********************/
function minsTo(iso) {
  if (!iso) return "--";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "--";

  const diff = Math.floor((t - Date.now()) / 60000);
  if (diff <= 0) return "Arr";
  return `${diff} min`;
}

function shortTime(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

function loadTag(load) {
  const x = String(load || "").toUpperCase();
  if (x === "SEA") return { text: "SEA", bg: "#16A34A1A", color: "#16A34A" };
  if (x === "SDA") return { text: "SDA", bg: "#F973161A", color: "#F97316" };
  if (x === "LSD") return { text: "LSD", bg: "#B423181A", color: "#B42318" };
  return { text: "--", bg: "#11111110", color: "#111" };
}

function cleanStopCode(s) {
  return String(s || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 5);
}

/******************** Component ********************/
export default function NextBusScreen({ navigation, route }) {
  const initialStop = route?.params?.busStopCode || "83139";

  const [busStopCode, setBusStopCode] = useState(initialStop);
  const [inputCode, setInputCode] = useState(initialStop);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const BASE_URL =
    "https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival";

  async function loadBusArrival(showFullLoading = false) {
    try {
      setError("");

      if (showFullLoading) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`${BASE_URL}?BusStopCode=${busStopCode}`);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Request failed");
      }

      const json = await res.json();
      setServices(json?.Services || []);
      setUpdatedAt(new Date());
    } catch (err) {
      console.log(err);
      setServices([]);
      setUpdatedAt(new Date());
      setError("No bus data right now. Try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Load + auto-refresh
  useEffect(() => {
    loadBusArrival(true);
    const t = setInterval(() => loadBusArrival(), 20000);
    return () => clearInterval(t);
  }, [busStopCode]);

  function onApplyStop() {
    const fixed = cleanStopCode(inputCode);
    if (!fixed) return;
    setBusStopCode(fixed);
    setInputCode(fixed);
  }

  return (
    <View style={styles.screen}>
      <HeaderBar navigation={navigation} title="Next Bus" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBusArrival()}
          />
        }
      >
        {/* Top Card */}
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              <Text style={styles.topTitle}>Bus Stop Code</Text>
              <Text style={styles.topSub}>
                {updatedAt
                  ? `Updated: ${updatedAt.toLocaleTimeString("en-SG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Updated: --"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => loadBusArrival()}
              activeOpacity={0.9}
            >
              <FontAwesome6 name="rotate" size={14} color="#1E7F5C" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stopInputRow}>
            <View style={styles.stopInputWrap}>
              <TextInput
                value={inputCode}
                onChangeText={(t) => setInputCode(cleanStopCode(t))}
                placeholder="e.g. 83139"
                keyboardType="number-pad"
                style={styles.stopInput}
              />
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onApplyStop}
              activeOpacity={0.9}
            >
              <Text style={styles.applyText}>Go</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tip}>
            Tip: Pull down to refresh. LTA updates roughly every ~20 seconds.
          </Text>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading bus arrivals...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <FontAwesome6 name="circle-info" size={16} color="#64748B" />
            <Text style={styles.muted}>{error}</Text>
            <Text style={styles.smallMuted}>
              If it's late night, some services may not be running.
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.muted}>
              No services returned for this stop.
            </Text>
            <Text style={styles.smallMuted}>
              Try another bus stop code, or test during service hours.
            </Text>
          </View>
        ) : (
          services.map((s) => {
            const nb1 = s?.NextBus || {};
            const nb2 = s?.NextBus2 || {};
            const nb3 = s?.NextBus3 || {};

            const t1 = minsTo(nb1.EstimatedArrival);
            const t2 = minsTo(nb2.EstimatedArrival);
            const t3 = minsTo(nb3.EstimatedArrival);

            const hasAny = t1 !== "--" || t2 !== "--" || t3 !== "--";

            const tag = loadTag(nb1.Load);
            const wab = nb1.Feature === "WAB";

            return (
              <View key={s.ServiceNo} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.serviceNo}>{s.ServiceNo}</Text>

                  <View style={styles.badges}>
                    <View style={[styles.badge, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.badgeText, { color: tag.color }]}>
                        {tag.text}
                      </Text>
                    </View>

                    {wab ? (
                      <View style={[styles.badge, styles.wabBadge]}>
                        <FontAwesome6
                          name="wheelchair"
                          size={12}
                          color="#1E7F5C"
                        />
                        <Text style={styles.wabText}>WAB</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {!hasAny ? (
                  <Text style={styles.noBusText}>Not in service right now</Text>
                ) : (
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipTop}>Next</Text>
                      <Text style={styles.chipMain}>{t1}</Text>
                      <Text style={styles.chipSub}>
                        {shortTime(nb1.EstimatedArrival)}
                      </Text>
                    </View>

                    <View style={styles.chip}>
                      <Text style={styles.chipTop}>2nd</Text>
                      <Text style={styles.chipMain}>{t2}</Text>
                      <Text style={styles.chipSub}>
                        {shortTime(nb2.EstimatedArrival)}
                      </Text>
                    </View>

                    <View style={styles.chip}>
                      <Text style={styles.chipTop}>3rd</Text>
                      <Text style={styles.chipMain}>{t3}</Text>
                      <Text style={styles.chipSub}>
                        {shortTime(nb3.EstimatedArrival)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 30 },

  topCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topLeft: { flex: 1, paddingRight: 10 },
  topTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  topSub: { marginTop: 4, fontSize: 12, fontWeight: "800", color: "#64748B" },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
  },
  refreshText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },

  stopInputRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  stopInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  stopInput: { fontSize: 16, fontWeight: "900", color: "#111" },

  applyBtn: {
    width: 72,
    borderRadius: 12,
    backgroundColor: "#1E7F5C",
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { color: "#FFF", fontWeight: "900" },

  tip: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  centerBox: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
    padding: 18,
  },
  muted: {
    fontSize: 13,
    color: "#666",
    fontWeight: "800",
    textAlign: "center",
  },
  smallMuted: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceNo: { fontSize: 18, fontWeight: "900", color: "#1E7F5C" },

  badges: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFF",
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  wabBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2F7FF",
    borderColor: "#D6E6FF",
  },
  wabText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },

  noBusText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },

  chipsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
  },
  chipTop: { fontSize: 11, fontWeight: "900", color: "#64748B" },
  chipMain: { marginTop: 6, fontSize: 16, fontWeight: "900", color: "#111" },
  chipSub: { marginTop: 4, fontSize: 12, fontWeight: "800", color: "#6B7280" },
});
