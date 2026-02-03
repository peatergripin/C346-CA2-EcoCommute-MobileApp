/******************** Imports ********************/
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

import HomeScreenTopBar from "../components/HomeScreenTopBar";
import BottomNav from "../components/BottomNav";

import { getAllCommutes } from "../utils/api";
import { compareCommutesDesc, formatPeriod } from "../utils/date";

/******************** Helpers ********************/
function parseDt(dt) {
  const s = String(dt || "");
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

const MODE_META = {
  walk: {
    label: "Walk",
    icon: "person-walking",
    color: "#16A34A",
    bg: "#16A34A1A",
  },
  cycle: { label: "Cycle", icon: "bicycle", color: "#059669", bg: "#0596691A" },
  bus: { label: "Bus", icon: "bus", color: "#2563EB", bg: "#2563EB1A" },
  mrt: {
    label: "MRT",
    icon: "train-subway",
    color: "#1E7F5C",
    bg: "#1E7F5C1A",
  },
  car: { label: "Car", icon: "car", color: "#B42318", bg: "#B423181A" },
  mixed: { label: "Mixed", icon: "shuffle", color: "#7C3AED", bg: "#7C3AED1A" },
  all: { label: "All", icon: "layer-group", color: "#111111", bg: "#11111110" },
};

function prettyTime(dt) {
  const d = parseDt(dt);
  if (!d) return "--";
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

function topModeFrom(items) {
  const counts = {};
  for (let i = 0; i < items.length; i++) {
    const m = items[i]?.mode || "mixed";
    counts[m] = (counts[m] || 0) + 1;
  }
  let best = null;
  let bestN = 0;
  for (let k in counts) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  }
  return best ? { mode: best, count: bestN } : null;
}

/******************** Component ********************/
export default function HomeScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const isLoggedIn = !!currentUser;

  const [todayTrips, setTodayTrips] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);

  const [weekTrips, setWeekTrips] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [weekDistanceKm, setWeekDistanceKm] = useState(0);

  const [topMode, setTopMode] = useState(null);
  const [recentCommutes, setRecentCommutes] = useState([]);

  const [monthLabel, setMonthLabel] = useState("");

  async function loadCommutes() {
    if (!currentUser?.id) {
      computeHomeStats([]);
      return;
    }

    const all = await getAllCommutes(currentUser.id);
    all.sort(compareCommutesDesc);
    computeHomeStats(all);
  }

  function computeHomeStats(all) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Month label from current date
    setMonthLabel(formatPeriod(now.getMonth() + 1, now.getFullYear()));

    let tTrips = 0;
    let tMin = 0;

    let wTrips = 0;
    let wMin = 0;
    let wKm = 0;

    const weekItems = [];
    const recent = all.slice(0, 3);

    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      const d = parseDt(c.startTime);
      if (!d) continue;

      const dur = clampNum(c.durationMin);
      const km = c.distanceKm == null ? null : clampNum(c.distanceKm);

      // Today
      if (isSameDay(d, now)) {
        tTrips += 1;
        tMin += dur;
      }

      const dDay = new Date(d);
      dDay.setHours(0, 0, 0, 0);

      const nowDay = new Date(now);
      nowDay.setHours(0, 0, 0, 0);

      if (dDay >= weekStart && dDay <= nowDay) {
        wTrips += 1;
        wMin += dur;
        if (km != null) wKm += km;
        weekItems.push(c);
      }
    }

    setTodayTrips(tTrips);
    setTodayMinutes(tMin);

    setWeekTrips(wTrips);
    setWeekMinutes(wMin);
    setWeekDistanceKm(wKm);

    setTopMode(topModeFrom(weekItems));
    setRecentCommutes(recent);
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    loadCommutes();
    const unsub = navigation.addListener("focus", loadCommutes);
    return unsub;
  }, [navigation, isLoggedIn, currentUser?.id]);

  function QuickAction({ icon, label, onPress, primary }) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.quickBtn, primary ? styles.quickPrimary : null]}
      >
        <FontAwesome6
          name={icon}
          size={14}
          color={primary ? "#FFFFFF" : "#1E7F5C"}
        />
        <Text
          style={[styles.quickText, primary ? styles.quickTextPrimary : null]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function Card({ title, icon, children, rightNode }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <FontAwesome6 name={icon} size={14} color="#1E7F5C" />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {rightNode ? rightNode : null}
        </View>
        {children}
      </View>
    );
  }

  function RecentRow({ item }) {
    const meta = MODE_META[String(item.mode).toLowerCase()] || MODE_META.mixed;

    const d = parseDt(item.startTime);
    const period = d ? formatPeriod(d.getMonth() + 1, d.getFullYear()) : "--";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.recentRow}
        onPress={() => navigation.navigate("CommuteDetail", { id: item.id })}
      >
        <View style={[styles.modePill, { backgroundColor: meta.bg }]}>
          <FontAwesome6 name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.modePillText, { color: meta.color }]}>
            {meta.label.toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.recentTitle} numberOfLines={1}>
            {item.fromLabel} → {item.toLabel}
          </Text>
          <Text style={styles.recentSub} numberOfLines={1}>
            {period} • {prettyTime(item.startTime)} •{" "}
            {clampNum(item.durationMin)} min
          </Text>
        </View>

        <Text style={styles.recentRight}>
          {item.distanceKm != null
            ? `${clampNum(item.distanceKm).toFixed(1)} km`
            : "--"}
        </Text>
      </TouchableOpacity>
    );
  }

  const topModeMeta = topMode
    ? MODE_META[topMode.mode] || MODE_META.mixed
    : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HomeScreenTopBar
          currentUser={currentUser}
          todayTrips={todayTrips}
          todayMinutes={todayMinutes}
        />

        <View style={styles.content}>
          {/* Quick actions */}
          <View style={styles.quickRow}>
            <QuickAction
              icon="route"
              label="Bus Routes"
              onPress={() => navigation.navigate("BusRoutes")}
            />
            <QuickAction
              icon="bus"
              label="Next Bus"
              onPress={() => navigation.navigate("NextBus")}
            />
            <QuickAction
              icon="train"
              label="Train Alerts"
              onPress={() => navigation.navigate("TrainServiceAlert")}
            />
          </View>

          {isLoggedIn ? (
            <>
              {/* This week */}
              <Card
                title="This Week"
                icon="calendar-week"
                rightNode={<Text style={styles.cardHint}>{monthLabel}</Text>}
              >
                <View style={styles.statRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Trips</Text>
                    <Text style={styles.statValue}>{weekTrips}</Text>
                  </View>

                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Minutes</Text>
                    <Text style={styles.statValue}>{weekMinutes}</Text>
                  </View>

                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Distance</Text>
                    <Text style={styles.statValue}>
                      {weekDistanceKm > 0
                        ? `${weekDistanceKm.toFixed(1)} km`
                        : "--"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.smallMuted}>
                  Summary of your last 7 days (including today).
                </Text>
              </Card>

              {/* Top mode */}
              <Card title="Top Mode (This Week)" icon="ranking-star">
                {topModeMeta ? (
                  <View style={styles.topModeRow}>
                    <View
                      style={[
                        styles.topModeBadge,
                        { backgroundColor: topModeMeta.bg },
                      ]}
                    >
                      <FontAwesome6
                        name={topModeMeta.icon}
                        size={14}
                        color={topModeMeta.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topModeTitle}>
                        {topModeMeta.label}
                      </Text>
                      <Text style={styles.topModeSub}>
                        Used {topMode.count}{" "}
                        {topMode.count === 1 ? "time" : "times"} this week
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.smallMuted}>
                    No commutes this week yet.
                  </Text>
                )}
              </Card>

              {/* Recent */}
              <Card
                title="Recent Commutes"
                icon="clock"
                rightNode={
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("CommuteList")}
                  >
                    <Text style={styles.linkText}>See all</Text>
                  </TouchableOpacity>
                }
              >
                {recentCommutes.length === 0 ? (
                  <Text style={styles.smallMuted}>
                    No commutes yet. Add your first commute to see activity
                    here.
                  </Text>
                ) : (
                  <View style={styles.recentList}>
                    {recentCommutes.map((c) => (
                      <RecentRow key={String(c.id)} item={c} />
                    ))}
                  </View>
                )}
              </Card>
            </>
          ) : (
            <View style={styles.loggedOutBox}>
              <FontAwesome6 name="lock" size={18} color="#64748B" />
              <Text style={styles.loggedOutTitle}>
                Sign in to view your commute insights
              </Text>
              <Text style={styles.loggedOutSub}>
                Track trips, see weekly stats, and analyse your travel patterns.
              </Text>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.loginBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  scrollContent: { paddingBottom: 90 },
  content: { paddingHorizontal: 14, paddingBottom: 24 },

  quickRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 10 },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  quickPrimary: { backgroundColor: "#1E7F5C", borderColor: "#1E7F5C" },
  quickText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },
  quickTextPrimary: { color: "#FFFFFF" },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  cardHint: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  linkText: { fontSize: 12, fontWeight: "900", color: "#1E7F5C" },

  statRow: { flexDirection: "row", gap: 10 },
  statBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 11, fontWeight: "900", color: "#64748B" },
  statValue: { marginTop: 4, fontSize: 16, fontWeight: "900", color: "#111" },

  smallMuted: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  topModeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  topModeBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  topModeTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  topModeSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  recentList: { marginTop: 2 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  modePillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.2 },

  recentTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  recentSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  recentRight: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1E7F5C",
    marginLeft: 10,
  },
  loggedOutBox: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 8,
  },
  loggedOutTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },
  loggedOutSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  loginBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1E7F5C",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
