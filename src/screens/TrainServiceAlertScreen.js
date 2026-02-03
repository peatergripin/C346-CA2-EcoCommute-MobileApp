/******************** Imports ********************/
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

import BottomNav from "../components/BottomNav";
import HeaderBar from "../components/HeaderBar";

/******************** Helpers ********************/
const ENDPOINT =
  "https://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts";

const LINE_NAME = {
  EWL: "East West Line (EWL)",
  NSL: "North South Line (NSL)",
  NEL: "North East Line (NEL)",
  CCL: "Circle Line (CCL)",
  DTL: "Downtown Line (DTL)",
  TEL: "Thomso-East Coast Line (TEL)",
  BPL: "Bukit Panjang LRT (BPL)",
  STL: "Sengkang LRT (STL)",
  PTL: "Punggol LRT (PTL)",
};

function lineFullName(code) {
  const c = String(code || "").toUpperCase();
  return LINE_NAME[c] || c || "Unknown line";
}

function statusMeta(status) {
  const disrupted = Number(status) === 2;
  return disrupted
    ? {
        title: "Disrupted / Major delays",
        sub: "Service disruption reported",
        color: "#B42318",
        bg: "#B4231814",
        icon: "triangle-exclamation",
      }
    : {
        title: "Normal / Minor delays",
        sub: "No major disruption reported",
        color: "#16A34A",
        bg: "#16A34A14",
        icon: "circle-check",
      };
}

function pickMessage(item) {
  const msg = item?.Message || item?.message || null;
  if (!msg) return { content: "", created: "" };

  const content =
    msg.Content || msg.content || (typeof msg === "string" ? msg : "");
  const created = msg.CreatedDate || msg.createdDate || msg.Created || "";

  return { content: String(content || ""), created: String(created || "") };
}

function safeStr(v) {
  const s = String(v || "").trim();
  return s ? s : "--";
}

/******************** Component ********************/
export default function TrainServiceAlertScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const LTA_ACCOUNT_KEY = process.env.EXPO_PUBLIC_LTA_ACCOUNT_KEY;

  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchAlerts({ silent } = { silent: false }) {
    if (!LTA_ACCOUNT_KEY) {
      if (!silent) {
        Alert.alert(
          "Missing API key",
          "Set EXPO_PUBLIC_LTA_ACCOUNT_KEY in your .env file.",
        );
      }
      setClusters([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);

      const res = await fetch(ENDPOINT, {
        headers: {
          AccountKey: LTA_ACCOUNT_KEY,
          accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`LTA error ${res.status}: ${text || "Request failed"}`);
      }

      const json = await res.json();
      const list = Array.isArray(json?.value) ? json.value : [];

      setClusters(list);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) {
        Alert.alert("Error", err?.message || "Failed to load train alerts.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(() => fetchAlerts({ silent: true }), 60000);
    return () => clearInterval(t);
  }, []);

  // Overall status: if ANY cluster is status=2 => disrupted
  const anyDisrupted = clusters.some((c) => Number(c?.Status) === 2);
  const hero = statusMeta(anyDisrupted ? 2 : 1);

  return (
    <View style={styles.screen}>
      <HeaderBar navigation={navigation} title="Train Service Alerts" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { borderColor: hero.bg }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: hero.bg }]}>
            <FontAwesome6 name={hero.icon} size={16} color={hero.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            <Text style={styles.heroSub}>{hero.sub}</Text>

            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMetaText}>
                {lastUpdated
                  ? `Last checked: ${lastUpdated.toLocaleTimeString("en-SG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Last checked: --"}
              </Text>

              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => fetchAlerts()}
                activeOpacity={0.85}
              >
                <FontAwesome6 name="rotate" size={12} color="#1E7F5C" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Loading */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading alerts...</Text>
          </View>
        ) : null}

        {/* Empty */}
        {!loading && clusters.length === 0 ? (
          <View style={styles.emptyBox}>
            <FontAwesome6 name="train-subway" size={18} color="#64748B" />
            <Text style={styles.emptyTitle}>No active alerts right now</Text>
            <Text style={styles.emptySub}>
              When there's a disruption, this screen will show affected lines,
              stations, and LTA advisory messages.
            </Text>
          </View>
        ) : null}

        {/* Cards */}
        {!loading &&
          clusters.map((c, idx) => {
            const st = Number(c?.Status);
            const meta = statusMeta(st);
            const line = lineFullName(c?.Line);
            const direction = safeStr(c?.Direction);
            const stations = safeStr(c?.Stations);
            const freeBus = safeStr(c?.FreePublicBus);
            const shuttle = safeStr(c?.FreeMRTShuttle);
            const shuttleDir = safeStr(c?.MRTShuttleDirection);

            const msg = pickMessage(c);

            return (
              <View key={idx} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                    <View
                      style={[styles.pillDot, { backgroundColor: meta.color }]}
                    />
                    <Text style={[styles.pillText, { color: meta.color }]}>
                      {st === 2 ? "DISRUPTED" : "NORMAL"}
                    </Text>
                  </View>

                  <Text style={styles.lineText} numberOfLines={1}>
                    {line}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <InfoRow icon="compass" label="Direction" value={direction} />
                  <InfoRow
                    icon="location-dot"
                    label="Stations"
                    value={stations}
                  />

                  <View style={styles.divider} />

                  <InfoRow icon="bus" label="Free public bus" value={freeBus} />
                  <InfoRow
                    icon="van-shuttle"
                    label="MRT shuttle"
                    value={shuttle}
                  />
                  <InfoRow
                    icon="arrow-right-arrow-left"
                    label="Shuttle direction"
                    value={shuttleDir}
                  />

                  {msg.content ? (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.msgTitle}>LTA Advisory</Text>
                      {msg.created ? (
                        <Text style={styles.msgDate}>{msg.created}</Text>
                      ) : null}
                      <Text style={styles.msgText}>{msg.content}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Small UI component ********************/
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={styles.infoIcon}>
          <FontAwesome6 name={icon} size={13} color="#1E7F5C" />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

/******************** Stylesheet ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 30 },

  hero: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  heroTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  heroSub: { marginTop: 3, fontSize: 12, fontWeight: "800", color: "#64748B" },
  heroMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroMetaText: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
  },
  refreshText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },

  centerBox: { marginTop: 14, alignItems: "center", gap: 8 },
  muted: { fontSize: 12, color: "#666", fontWeight: "700" },

  emptyBox: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  emptySub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },

  card: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    overflow: "hidden",
  },
  cardTop: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillDot: { width: 8, height: 8, borderRadius: 99 },
  pillText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },
  lineText: { fontSize: 14, fontWeight: "900", color: "#111" },

  cardBody: { paddingHorizontal: 14, paddingVertical: 10 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 13, fontWeight: "900", color: "#111" },
  infoValue: {
    fontSize: 13,
    color: "#666",
    fontWeight: "800",
    maxWidth: "55%",
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10,
  },

  msgTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  msgDate: { marginTop: 4, fontSize: 11, fontWeight: "800", color: "#6B7280" },
  msgText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 16,
  },
});
