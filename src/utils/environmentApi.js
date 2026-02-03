async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function avgFromStationData(arr) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]?.value;
    if (typeof v === "number") {
      sum += v;
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
}

function maxFromStationData(arr) {
  let max = null;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]?.value;
    if (typeof v === "number") {
      if (max === null || v > max) max = v;
    }
  }
  return max;
}

function pickPsiRegion(psiObj, preferredRegion) {
  const key = String(preferredRegion || "central").toLowerCase();
  const v = psiObj?.[key];

  if (typeof v === "number") return v;

  for (let k in psiObj || {}) {
    if (typeof psiObj[k] === "number") return psiObj[k];
  }
  return null;
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns:
 * {
 *  tempC, rainMaxMm, psi24, uv, apiTime
 * }
 */
export async function getLiveEnvironmentSnapshot(preferredRegion = "central") {
  // 1) Temperature
  const tJson = await fetchJson(
    "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
  );
  const tBlock = tJson?.data?.readings?.[0];
  const tempC = avgFromStationData(tBlock?.data || []);

  // 2) Rainfall
  const rJson = await fetchJson(
    "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
  );
  const rBlock = rJson?.data?.readings?.[0];
  const rainMaxMm = maxFromStationData(rBlock?.data || []);

  // 3) PSI
  const pJson = await fetchJson(
    "https://api-open.data.gov.sg/v2/real-time/api/psi",
  );
  const psiObj = pJson?.data?.items?.[0]?.readings?.psi_twenty_four_hourly;
  const psi24 = pickPsiRegion(psiObj, preferredRegion);

  // 4) UV
  const uJson = await fetchJson(
    "https://api-open.data.gov.sg/v2/real-time/api/uv",
  );
  const rec = uJson?.data?.records?.[0];
  const uv = rec.index?.[0]?.value ?? null;

  // Timestamp (prefer rainfall/temperature)
  const ts =
    rBlock?.timestamp ||
    tBlock?.timestamp ||
    rec?.updatedTimestamp ||
    rec?.timestamp ||
    "";

  return {
    tempC,
    rainMaxMm,
    psi24,
    uv,
    apiTime: fmtTime(ts),
  };
}
