/******************** Imports ********************/
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import { FontAwesome6 } from "@expo/vector-icons";
import HeaderBar from "../components/HeaderBar";
import BottomNav from "../components/BottomNav";
import { getAllCommutes } from "../utils/api";

/******************** Constants ********************/
const MODES = [
  { key: "mrt", label: "MRT", color: "#1E7F5C" },
  { key: "bus", label: "Bus", color: "#2E7D32" },
  { key: "walk", label: "Walk", color: "#EF6C00" },
  { key: "cycle", label: "Cycle", color: "#6A1B9A" },
  { key: "car", label: "Car", color: "#C62828" },
  { key: "mixed", label: "Mixed", color: "#00838F" },
];

const LINE_WIDTH = 320;
const LINE_HEIGHT = 190;

const PIE_SIZE = 220;

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(13, 71, 161, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
  propsForBackgroundLines: { stroke: "#EFEFEF" },
};

/******************** Component ********************/
export default function AnalyticsScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const isLoggedIn = !!currentUser;
  const userId = currentUser?.id;
  const [commutes, setCommutes] = useState([]);
  const [activeChart, setActiveChart] = useState("trend"); // "trend" | "modes"
  const [showDetails, setShowDetails] = useState(false);

  async function loadCommutes() {
    const all = await getAllCommutes(userId);

    all.sort((a, b) => {
      const ta = parseTime(a.startTime)?.getTime() ?? 0;
      const tb = parseTime(b.startTime)?.getTime() ?? 0;
      return tb - ta;
    });

    setCommutes(all);
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    loadCommutes();
    const unsub = navigation.addListener("focus", loadCommutes);
    return unsub;
  }, [navigation, isLoggedIn]);

  /******************** Helpers ********************/
  function parseTime(value) {
    if (!value) return null;
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  function startOfWeekMonday(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
    x.setDate(x.getDate() - day);
    return x;
  }

  function fmtWeekLabel(d) {
    const m = d.toLocaleString("en-SG", { month: "short" });
    const dd = String(d.getDate()).padStart(2, "0");
    return `${m} ${dd}`;
  }

  function formatLongest(item) {
    if (!item) return "--";
    return `${item.durationMin} min (${item.fromLabel} → ${item.toLabel})`;
  }

  /******************** Stats ********************/
  function calcOverview(list) {
    const total = list.length;
    if (total === 0)
      return { total: 0, carbon_saved_per_km: 0, number_of_trees_saved: null };

    // let totalMin = 0;
    // for (let i = 0; i < list.length; i++) {
    //   const m = Number(list[i].durationMin);
    //   if (Number.isFinite(m)) totalMin += m;
    // }

    // Carbon saved per km
    let total_commute_km = 0;

    // only add if walk cycle bus or mrt
    for (const commute of list) {
      if (["walk", "cycle", "bus", "mrt"].includes(commute.mode)) {
        total_commute_km += commute.distanceKm;
      }
    }
    let carbon_saved_per_km = total_commute_km * 0.103;
    let number_of_trees_saved = (carbon_saved_per_km / 21).toFixed();
    return { total, carbon_saved_per_km, number_of_trees_saved };
  }

  function calcByMode(list, mode) {
    let count = 0;
    let sum = 0;
    let longest = null;

    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.mode !== mode) continue;

      count += 1;

      const m = Number(c.durationMin);
      if (Number.isFinite(m)) sum += m;

      if (!longest) longest = c;
      else if (Number(c.durationMin) > Number(longest.durationMin)) longest = c;
    }

    return { count, avgMin: count === 0 ? null : sum / count, longest };
  }

  function buildWeeklyMinutesData(list, weeksBack = 6) {
    const now = new Date();
    const thisWeek = startOfWeekMonday(now);

    const weeks = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(thisWeek);
      d.setDate(d.getDate() - i * 7);
      weeks.push(d);
    }

    const map = {};
    for (let i = 0; i < weeks.length; i++) {
      map[weeks[i].toISOString().slice(0, 10)] = 0;
    }

    for (let i = 0; i < list.length; i++) {
      const t = parseTime(list[i].startTime);
      if (!t) continue;

      const wk = startOfWeekMonday(t);
      const key = wk.toISOString().slice(0, 10);
      if (map[key] == null) continue;

      const m = Number(list[i].durationMin);
      if (Number.isFinite(m)) map[key] += m;
    }

    return {
      labels: weeks.map((d) => fmtWeekLabel(d)),
      datasets: [
        { data: weeks.map((d) => map[d.toISOString().slice(0, 10)] || 0) },
      ],
    };
  }

  function buildModePieData(list) {
    const parts = [];

    for (let i = 0; i < MODES.length; i++) {
      const m = MODES[i];
      const count = calcByMode(list, m.key).count;
      if (count <= 0) continue;

      parts.push({
        name: m.label,
        population: count,
        color: m.color,
        legendFontColor: "#111",
        legendFontSize: 12,
      });
    }

    return parts;
  }

  /******************** Derived ********************/
  const overview = calcOverview(commutes);
  const weeklyMinutesData = buildWeeklyMinutesData(commutes, 6);
  const pieData = buildModePieData(commutes);
  const pieTotal = pieData.reduce((s, p) => s + (p.population || 0), 0);

  const perMode = {};
  for (let i = 0; i < MODES.length; i++) {
    perMode[MODES[i].key] = calcByMode(commutes, MODES[i].key);
  }

  /******************** UI  ********************/
  function ChartCard({ title, subtitle, children }) {
    return (
      <View style={[styles.card, styles.chartCard]}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.smallMuted}>{subtitle}</Text> : null}
        <View style={styles.chartInner}>{children}</View>
      </View>
    );
  }

  function InsightCard({ title, stats }) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.line}>Entries: {stats.count}</Text>
        <Text style={styles.line}>
          Avg: {stats.avgMin == null ? "--" : `${stats.avgMin.toFixed(1)} min`}
        </Text>
        <Text style={styles.smallMuted}>
          Longest: {formatLongest(stats.longest)}
        </Text>
      </View>
    );
  }

  function Segmented() {
    return (
      <View style={styles.segmented}>
        <TouchableOpacity
          onPress={() => setActiveChart("trend")}
          style={[
            styles.segBtn,
            activeChart === "trend" ? styles.segBtnActive : null,
          ]}
        >
          <Text
            style={[
              styles.segText,
              activeChart === "trend" ? styles.segTextActive : null,
            ]}
          >
            Trend
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveChart("modes")}
          style={[
            styles.segBtn,
            activeChart === "modes" ? styles.segBtnActive : null,
          ]}
        >
          <Text
            style={[
              styles.segText,
              activeChart === "modes" ? styles.segTextActive : null,
            ]}
          >
            Modes
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function LegendItem({ color, label, count, pct }) {
    return (
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendName} numberOfLines={1}>
          {label} ({count})
        </Text>
        <Text style={styles.legendPct}>{pct}%</Text>
      </View>
    );
  }

  /******************** Render ********************/
  return (
    <View style={styles.screen}>
      <HeaderBar navigation={navigation} title="Analytics" />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoggedIn ? (
          <>
            <Text style={styles.sectionTitle}>Commute Insights</Text>
            <Text style={styles.sectionSubtitle}>Analyse your commutes</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total</Text>
                <Text style={styles.kpiValue}>{overview.total}</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>🌏 CO₂</Text>
                <Text style={styles.kpiValue}>
                  {overview.carbon_saved_per_km.toFixed(1)} kg
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>🌳 Trees Planted</Text>
                <Text style={styles.kpiValue}>
                  {overview.number_of_trees_saved}
                </Text>
              </View>
            </View>
            <Segmented />
            {activeChart === "trend" ? (
              <ChartCard title="Weekly Minutes" subtitle="Last 6 weeks">
                {commutes.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No data yet - log a commute.
                  </Text>
                ) : (
                  <LineChart
                    data={weeklyMinutesData}
                    width={LINE_WIDTH}
                    height={LINE_HEIGHT}
                    chartConfig={chartConfig}
                    bezier
                    withInnerLines={false}
                    style={styles.chart}
                  />
                )}
              </ChartCard>
            ) : (
              <ChartCard
                title="Mode Breakdown"
                subtitle="Count of commutes by mode"
              >
                {pieData.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No data yet - log a commute.
                  </Text>
                ) : (
                  <>
                    <View style={styles.pieStage}>
                      <PieChart
                        data={pieData}
                        width={PIE_SIZE}
                        height={PIE_SIZE}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                        hasLegend={false}
                        center={[50, 0]}
                      />
                    </View>

                    <View style={styles.legendGrid}>
                      {pieData.map((p) => {
                        const pct =
                          pieTotal > 0
                            ? Math.round((p.population / pieTotal) * 100)
                            : 0;

                        return (
                          <LegendItem
                            key={p.name}
                            color={p.color}
                            label={p.name}
                            count={p.population}
                            pct={pct}
                          />
                        );
                      })}
                    </View>
                  </>
                )}
              </ChartCard>
            )}
            <TouchableOpacity
              onPress={() => setShowDetails((v) => !v)}
              style={styles.detailsToggle}
              activeOpacity={0.85}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? "Hide details" : "Show details"}
              </Text>
            </TouchableOpacity>
            {showDetails ? (
              <>
                {MODES.map((m) => (
                  <InsightCard
                    key={m.key}
                    title={m.label}
                    stats={perMode[m.key]}
                  />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.loggedOutBox}>
            <FontAwesome6 name="lock" size={18} color="#64748B" />
            <Text style={styles.loggedOutTitle}>Sign in to view analytics</Text>
            <Text style={styles.loggedOutSub}>
              Charts and insights are available once your commutes are saved.
            </Text>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Stylesheet ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 24 },

  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111" },

  line: { fontSize: 13, color: "#111", marginTop: 8 },
  smallMuted: { fontSize: 12, color: "#666", marginTop: 6 },

  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  kpiLabel: { fontSize: 12, color: "#666", fontWeight: "700" },
  kpiValue: { fontSize: 18, color: "#111", fontWeight: "900", marginTop: 4 },

  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: { backgroundColor: "rgba(13,71,161,0.10)" },
  segText: { fontSize: 13, color: "#444", fontWeight: "800" },
  segTextActive: { color: "#1E7F5C" },

  chartCard: { paddingBottom: 10 },
  chartInner: { marginTop: 10, alignItems: "center" },
  chart: { borderRadius: 12 },

  emptyText: {
    fontSize: 12,
    color: "#666",
    paddingVertical: 12,
    textAlign: "center",
  },

  pieStage: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },

  legendGrid: {
    width: "100%",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  legendItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 10,
  },

  legendDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },

  legendName: {
    flex: 1,
    fontSize: 13,
    color: "#111",
    fontWeight: "800",
  },

  legendPct: {
    width: 44,
    textAlign: "right",
    fontSize: 12,
    color: "#111",
    fontWeight: "900",
  },

  detailsToggle: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  detailsToggleText: { fontSize: 13, fontWeight: "900", color: "#1E7F5C" },
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
