/******************** Constants ********************/
export const BASE_URL = "https://c346-ca2-server-za65.onrender.com";

/******************** Commute Helpers (standardise data) ********************/
function commuteToFrontend(row) {
  return {
    id: String(row.id),
    userId: row.user_id != null ? String(row.user_id) : null,

    fromLabel: row.from_label,
    toLabel: row.to_label,
    mode: row.mode,

    startTime: row.start_time,
    endTime: row.end_time,
    durationMin: Number(row.duration_min),

    purpose: row.purpose || "",
    notes: row.notes || "",

    startLat: row.start_lat != null ? Number(row.start_lat) : null,
    startLng: row.start_lng != null ? Number(row.start_lng) : null,
    endLat: row.end_lat != null ? Number(row.end_lat) : null,
    endLng: row.end_lng != null ? Number(row.end_lng) : null,

    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,

    image: row.image || null,
  };
}

function commuteToPayload(commute) {
  return {
    user_id: commute.userId ?? null,

    from_label: commute.fromLabel ?? "",
    to_label: commute.toLabel ?? "",
    mode: commute.mode ?? "mixed",

    start_time: commute.startTime ?? null,
    end_time: commute.endTime ?? null,
    duration_min: commute.durationMin ?? 0,

    purpose: commute.purpose ?? null,
    notes: commute.notes ?? null,

    start_lat: commute.startLat ?? null,
    start_lng: commute.startLng ?? null,
    end_lat: commute.endLat ?? null,
    end_lng: commute.endLng ?? null,

    distance_km: commute.distanceKm ?? null,
  };
}

/******************** User Helpers ********************/
function userToFrontend(row) {
  const img = row.image
    ? String(row.image).startsWith("/uploads/")
      ? String(row.image)
      : "/uploads/" + String(row.image)
    : null;

  return {
    id: String(row.id),
    username: row.username || "",
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    password: "",
    avatar: img,
  };
}

/******************** Commutes API ********************/
function withUserIdQs(url, userId) {
  const uid = userId != null ? String(userId) : "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}user_id=${encodeURIComponent(uid)}`;
}

export function getAllCommutes(userId) {
  return fetch(withUserIdQs(`${BASE_URL}/commutes`, userId))
    .then((response) => response.json())
    .then((myJson) =>
      Array.isArray(myJson) ? myJson.map(commuteToFrontend) : [],
    );
}

export function getCommuteById(id, userId) {
  return fetch(withUserIdQs(`${BASE_URL}/commutes/${id}`, userId))
    .then((response) => response.json())
    .then((rows) => {
      if (!Array.isArray(rows) || rows.length < 1) return null;
      return commuteToFrontend(rows[0]);
    });
}

export function addCommute(commute) {
  return fetch(`${BASE_URL}/commutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commuteToPayload(commute)),
  }).then((response) => response.json());
}

export function updateCommuteById(id, commute, userId) {
  const uid = userId != null ? userId : commute?.userId;

  return fetch(withUserIdQs(`${BASE_URL}/commutes/${id}`, uid), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commuteToPayload(commute)),
  }).then((response) => response.json());
}

export function deleteCommuteById(id, userId) {
  return fetch(withUserIdQs(`${BASE_URL}/commutes/${id}`, userId), {
    method: "DELETE",
  });
}

/******************** Users API ********************/
export function getAllUsers() {
  return fetch(`${BASE_URL}/users`)
    .then((response) => response.json())
    .then((rows) => (Array.isArray(rows) ? rows.map(userToFrontend) : []));
}

export function getUserById(id) {
  return fetch(`${BASE_URL}/users/${id}`)
    .then((response) => response.json())
    .then((rows) => {
      if (!Array.isArray(rows) || rows.length < 1) return null;
      return userToFrontend(rows[0]);
    });
}

export function registerUser(user) {
  return fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }).then((response) => response.json());
}

export function updateUserById(id, user) {
  return fetch(`${BASE_URL}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }).then((response) => response.json());
}

export function login(email, password) {
  return fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((rows) => {
      if (!Array.isArray(rows) || rows.length < 1) return null;
      return userToFrontend(rows[0]);
    });
}

/******************** Upload Helpers ********************/
function toUploadFile(image) {
  if (!image || !image.uri) return null;

  if (image.name && image.type) return image;

  return {
    uri: image.uri,
    name: image.fileName || `photo_${Date.now()}.jpg`,
    type: image.mimeType || "image/jpeg",
  };
}

/******************** Upload API ********************/
export function uploadAvatar(userId, image) {
  const file = toUploadFile(image);
  const form = new FormData();
  form.append("image", file);

  return fetch(`${BASE_URL}/users/${userId}/avatar`, {
    method: "POST",
    body: form,
  }).then((response) => response.json());
}

export function uploadCommuteImage(commuteId, image, userId) {
  const file = toUploadFile(image);
  const form = new FormData();
  form.append("image", file);
  if (userId != null) form.append("user_id", String(userId));

  return fetch(`${BASE_URL}/commutes/${commuteId}/image`, {
    method: "POST",
    body: form,
  }).then((response) => response.json());
}

export function getCommuteImages(commuteId, userId) {
  return fetch(withUserIdQs(`${BASE_URL}/commutes/${commuteId}/image`, userId))
    .then((response) => response.json())
    .then((obj) => {
      if (!obj) return [];
      const path = obj.file_path || obj.filePath || null;
      if (!path) return [];
      return [
        {
          id: "1",
          file_path: path,
          file_name: obj.file_name || obj.fileName || null,
          imageUrl: obj.imageUrl || null,
        },
      ];
    });
}

/******************** URL Helper for Images ********************/
export function resolveUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl);
  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return BASE_URL + s;
  return BASE_URL + "/uploads/" + s;
}
