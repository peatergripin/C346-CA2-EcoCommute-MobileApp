/******************** Imports ********************/
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import HeaderBar from "../components/HeaderBar";
import {
  deleteCommuteById,
  getCommuteById,
  resolveUploadUrl,
} from "../utils/api";

/******************** Helpers ********************/
function prettyDateTime(dt) {
  if (!dt) return "--";
  return new Date(String(dt).replace(" ", "T")).toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modeMeta(mode) {
  const m = String(mode || "").toLowerCase();
  if (m === "walk")
    return {
      label: "WALK",
      icon: "person-walking",
      color: "#16A34A",
      bg: "#16A34A1A",
    };
  if (m === "cycle")
    return {
      label: "CYCLE",
      icon: "bicycle",
      color: "#059669",
      bg: "#0596691A",
    };
  if (m === "bus")
    return { label: "BUS", icon: "bus", color: "#2563EB", bg: "#2563EB1A" };
  if (m === "mrt")
    return {
      label: "MRT",
      icon: "train-subway",
      color: "#1E7F5C",
      bg: "#1E7F5C1A",
    };
  if (m === "car")
    return {
      label: "CAR",
      icon: "car-side",
      color: "#B42318",
      bg: "#B423181A",
    };
  if (m === "mixed")
    return {
      label: "MIXED",
      icon: "shuffle",
      color: "#7C3AED",
      bg: "#7C3AED1A",
    };
  return { label: "COMMUTE", icon: "route", color: "#111111", bg: "#11111110" };
}

function MetricTile({
  icon,
  label,
  value,
  sub,
  color = "#111",
  bg = "#F5F5F5",
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIconWrap, { backgroundColor: "#FFFFFF" }]}>
          <FontAwesome6 name={icon} size={14} color={color} />
        </View>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <FontAwesome6 name={icon} size={14} color="#1E7F5C" />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <FontAwesome6 name={icon} size={14} color="#111" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/******************** Component ********************/
export default function CommuteDetailScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const id = route?.params?.commuteId ?? route?.params?.id;
  const userId = currentUser?.id;

  const [commute, setCommute] = useState(null);
  const [loadingCommute, setLoadingCommute] = useState(false);

  async function loadCommute() {
    // if not logged in, don't call the API
    if (!userId || !id) {
      setCommute(null);
      return;
    }

    setLoadingCommute(true);
    try {
      const found = await getCommuteById(id, userId);
      setCommute(found);
    } finally {
      setLoadingCommute(false);
    }
  }

  useEffect(() => {
    loadCommute();
    const unsub = navigation.addListener("focus", () => {
      loadCommute();
    });
    return unsub;
  }, [navigation, id, userId]);

  async function onDelete() {
    if (!commute || !userId) return;

    Alert.alert("Delete commute?", "This cannot be undone.", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCommuteById(commute.id, userId);
          navigation.replace("CommuteList");
        },
      },
    ]);
  }

  const meta = modeMeta(commute?.mode);

  const dist =
    commute?.distanceKm != null ? `${commute.distanceKm.toFixed(1)} km` : "--";

  const dur =
    commute?.durationMin != null ? `${commute.durationMin} min` : "--";

  const startText = prettyDateTime(commute?.startTime);
  const endText = prettyDateTime(commute?.endTime);

  const photoUri = commute?.image ? resolveUploadUrl(commute.image) : null;

  if (!commute) {
    return (
      <View style={styles.screen}>
        <HeaderBar navigation={navigation} title="Commute Details" />
        <View style={styles.centerBox}>
          {loadingCommute ? (
            <View style={styles.imgLoadingRow}>
              <ActivityIndicator />
              <Text style={styles.imgMuted}> Loading…</Text>
            </View>
          ) : (
            <Text style={styles.muted}>
              {userId
                ? "Commute not found."
                : "Please sign in to view this commute."}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        navigation={navigation}
        title="Commute Details"
        rightIcon="pen"
        onRightPress={() =>
          navigation.navigate("EditCommute", { id: commute.id })
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.modePill, { backgroundColor: meta.bg }]}>
              <View style={[styles.modeDot, { backgroundColor: meta.color }]} />
              <FontAwesome6 name={meta.icon} size={12} color={meta.color} />
              <Text style={[styles.modePillText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("EditCommute", { id: commute.id })
              }
              activeOpacity={0.85}
              style={styles.editQuick}
            >
              <FontAwesome6 name="pen" size={14} color="#1E7F5C" />
              <Text style={styles.editQuickText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.routeTitle} numberOfLines={2}>
            {commute.fromLabel} <Text style={styles.routeArrow}>→</Text>{" "}
            {commute.toLabel}
          </Text>

          <Text style={styles.routeSub}>
            {dur} • {dist}
          </Text>

          {/* Metric tiles */}
          <View style={styles.tilesRow}>
            <MetricTile icon="clock" label="Start" value={startText} />
            <MetricTile icon="flag-checkered" label="End" value={endText} />
          </View>
        </View>

        {/* Photos */}
        <Section title="Photos" icon="image">
          {!photoUri ? (
            <Text style={styles.imgMuted}>
              No photo added for this commute.
            </Text>
          ) : (
            <View style={styles.singleImgCard}>
              <Image
                source={{ uri: photoUri }}
                style={styles.singleImg}
                resizeMode="cover"
              />
              <Text style={styles.imgCaption} numberOfLines={1}>
                Photo
              </Text>
            </View>
          )}

          <View style={styles.imgFooterRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={loadCommute}
              style={styles.imgRefresh}
            >
              <FontAwesome6 name="rotate" size={14} color="#1E7F5C" />
              <Text style={styles.imgRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* Details */}
        <Section title="Trip details" icon="route">
          <Row
            icon="location-dot"
            label="From"
            value={commute.fromLabel || "--"}
          />
          <Row
            icon="location-crosshairs"
            label="To"
            value={commute.toLabel || "--"}
          />
          <Row icon="stopwatch" label="Duration" value={dur} />
          <Row icon="road" label="Distance" value={dist} />

          {commute.purpose ? (
            <Row icon="bullseye" label="Purpose" value={commute.purpose} />
          ) : null}
          {commute.notes ? (
            <Row icon="note-sticky" label="Notes" value={commute.notes} />
          ) : null}
        </Section>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate("EditCommute", { id: commute.id })
            }
            activeOpacity={0.9}
          >
            <FontAwesome6 name="pen" size={14} color="#1E7F5C" />
            <Text style={styles.secondaryBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={onDelete}
            activeOpacity={0.9}
          >
            <FontAwesome6 name="trash" size={14} color="#FFFFFF" />
            <Text style={styles.dangerBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Stylesheet ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 30 },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  muted: { fontSize: 13, color: "#666" },

  hero: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  modeDot: { width: 8, height: 8, borderRadius: 99 },
  modePillText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },

  editQuick: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
  },
  editQuickText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },

  routeTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    lineHeight: 24,
  },
  routeArrow: { color: "#1E7F5C" },
  routeSub: { marginTop: 6, fontSize: 13, fontWeight: "800", color: "#64748B" },

  tilesRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },

  tile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  tileTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  tileIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  tileLabel: { fontSize: 11, fontWeight: "900", color: "#6B7280" },
  tileValue: { marginTop: 8, fontSize: 13, fontWeight: "900", color: "#111" },
  tileSub: { marginTop: 4, fontSize: 11, fontWeight: "800", color: "#6B7280" },

  section: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  sectionBody: { paddingHorizontal: 14, paddingVertical: 10 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 13, fontWeight: "900", color: "#111" },
  rowValue: {
    fontSize: 13,
    color: "#666",
    fontWeight: "800",
    maxWidth: "55%",
    textAlign: "right",
  },

  actions: { marginTop: 14, flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1E7F5C",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: { color: "#1E7F5C", fontWeight: "900", fontSize: 15 },
  dangerBtn: {
    flex: 1,
    backgroundColor: "#B42318",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },

  imgLoadingRow: { flexDirection: "row", alignItems: "center" },
  imgMuted: { fontSize: 12, color: "#64748B", fontWeight: "800" },

  singleImgCard: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EDEDED",
    backgroundColor: "#FFFFFF",
  },
  singleImg: { width: "100%", height: 180, backgroundColor: "#F1F5F9" },

  imgCaption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
  },

  imgFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  imgRefresh: {
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
  imgRefreshText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },
});
