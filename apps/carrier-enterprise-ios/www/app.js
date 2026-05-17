const CARRIER_API_BASE_CANDIDATES = (() => {
  const candidates = [];
  const configuredApiBase = String(window.NAAVAL_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const normalizedHost = String(window.location.hostname || "")
    .trim()
    .toLowerCase();
  const isLocal = ["localhost", "127.0.0.1", "192.168.1.156"].includes(normalizedHost);
  const allowOriginFallback = !configuredApiBase || isLocal;

  if (configuredApiBase) {
    candidates.push(configuredApiBase);
  }

  if (allowOriginFallback && window.location.protocol.startsWith("http")) {
    candidates.push(window.location.origin);
  }

  if (!configuredApiBase || isLocal) {
    candidates.push("http://localhost:3001");
  }
  return [...new Set(candidates)];
})();

const CARRIER_SESSION_KEY = "naaval.carrier.session";
const CARRIER_OFFLINE_SNAPSHOT_KEY = "naaval.carrier.offline.snapshot";
const CARRIER_OFFLINE_QUEUE_KEY = "naaval.carrier.offline.queue";
const ACCOUNT_TAGS = [
  { id: "ev", label: "EV" },
  { id: "cold_chain", label: "Frigo" },
  { id: "bioeta", label: "BioEta" },
  { id: "bike", label: "2 Roues" },
  { id: "fragile", label: "Fragile" }
];

const carrierState = {
  apiBaseUrl: "",
  driver: null,
  routeViews: [],
  carrierCompanies: [],
  messages: [],
  session: null,
  activeTab: "missions",
  selectedRouteId: null,
  selectedCalendarDateKey: null,
  calendarCursor: (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  })(),
  accountSkillDraft: [],
  proofContext: null,
  proofLocation: null,
  toastTimer: null,
  notificationTimer: null,
  hasInboxSnapshot: false,
  lastNotifiedMessageId: null,
  isOffline: false,
  lastSyncAt: null,
  offlineSnapshotAt: null,
  offlineQueue: [],
  queueSyncing: false
};

let googleRetryTimer = null;
let signaturePadBoundCanvasId = null;
let signaturePadDirty = false;
let carrierRefreshTimer = null;
let carrierHeartbeatTimer = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return "Pending";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date).replace(":", "h");
  }

  return String(value).replace(":", "h");
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "Pending";
  }

  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "Pending";
  }

  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function initials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function joinName(firstName, lastName) {
  return [firstName, lastName].map((value) => String(value ?? "").trim()).filter(Boolean).join(" ");
}

function labelForRouteStatus(status) {
  const labels = {
    ready: "Ready",
    dispatched: "Dispatched",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Issue"
  };

  return labels[status] ?? String(status ?? "Pending").replaceAll("_", " ");
}

function labelForStopStatus(status) {
  const labels = {
    pending: "Pending",
    arrived: "Arrived",
    served: "Done",
    failed: "Failed",
    skipped: "Skipped",
    pickup_handed_over_to_tsp: "Handed Over to TSP",
    pickup_failed: "Failed Pickup",
    pickup_refused_by_tsp: "Refused by TSP",
    delivery_order_delivered: "Order Delivered",
    delivery_failed: "Failed",
    delivery_refused_by_customer: "Refused by Customer"
  };

  return labels[status] ?? String(status ?? "Pending");
}

function toneForExecutionStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (["delivery_order_delivered", "completed", "served"].includes(value)) {
    return "completed";
  }
  if (["delivery_failed", "delivery_refused_by_customer", "pickup_failed", "pickup_refused_by_tsp", "failed", "skipped"].includes(value)) {
    return "failed";
  }
  if (value === "pickup_handed_over_to_tsp") {
    return "completed";
  }
  if (["arrived", "in_progress", "en_route_pickup"].includes(value)) {
    return "in_progress";
  }
  if (["ready", "dispatched", "pending"].includes(value)) {
    return value === "pending" ? "ready" : value;
  }
  return value || "pending";
}

function getProofOutcomeOptions(kind) {
  if (kind === "pickup") {
    return [
      { value: "pickup_handed_over_to_tsp", label: "Handed over to TSP" },
      { value: "pickup_failed", label: "Failed pickup" },
      { value: "pickup_refused_by_tsp", label: "Refused by TSP" }
    ];
  }

  return [
    { value: "delivery_order_delivered", label: "Order Delivered" },
    { value: "delivery_failed", label: "Failed" },
    { value: "delivery_refused_by_customer", label: "Refused by Customer" }
  ];
}

function getProofReasonOptions(kind) {
  if (kind === "pickup") {
    return [
      { value: "", label: "No issue" },
      { value: "tsp_absent", label: "TSP unavailable" },
      { value: "tsp_refusal", label: "TSP refusal" },
      { value: "site_closed", label: "Site closed" },
      { value: "access_issue", label: "Access issue" },
      { value: "other", label: "Other" }
    ];
  }

  return [
    { value: "", label: "No issue" },
    { value: "customer_absent", label: "Customer absent" },
    { value: "customer_refusal", label: "Customer refusal" },
    { value: "wrong_address", label: "Wrong address" },
    { value: "access_issue", label: "Access issue" },
    { value: "damaged", label: "Damaged goods" },
    { value: "other", label: "Other" }
  ];
}

function isProofSuccess(outcomeCode) {
  return ["pickup_handed_over_to_tsp", "delivery_order_delivered"].includes(outcomeCode);
}

function isProofRefused(outcomeCode) {
  return ["pickup_refused_by_tsp", "delivery_refused_by_customer"].includes(outcomeCode);
}

function labelForVehicleType(value) {
  const labels = {
    bike: "Bike",
    scooter: "Scooter",
    car: "Car",
    van_3m3: "3m3",
    van_5m3: "5m3",
    van_10m3: "10m3",
    van_15m3: "15m3",
    van_20m3: "20m3"
  };
  return labels[value] ?? value ?? "Vehicle";
}

function toAddressLabel(address) {
  if (!address) {
    return "Address pending";
  }

  return [
    address.label,
    address.street1,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.countryCode
  ]
    .filter(Boolean)
    .join(", ");
}

function getConfigValue(key) {
  return window[key];
}

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch (_error) {
    return null;
  }
}

function showToast(message, type = "info") {
  const toast = document.querySelector("#carrier-toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden", "toast--error");
  if (type === "error") {
    toast.classList.add("toast--error");
  }

  window.clearTimeout(carrierState.toastTimer);
  carrierState.toastTimer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 3800);
}

function setCarrierLoginStatus(message = "", tone = "info") {
  const node = document.querySelector("#carrier-login-status");
  if (!node) {
    return;
  }

  if (!message) {
    node.textContent = "";
    node.className = "login-status hidden";
    return;
  }

  node.textContent = message;
  node.className = `login-status login-status--${tone}`;
}

function getMessageStableId(message) {
  return String(message?.id || `${message?.senderType || "unknown"}-${message?.threadId || "thread"}-${message?.createdAt || ""}-${message?.body || ""}`);
}

function hideCarrierNotification() {
  const banner = document.querySelector("#carrier-notification");
  if (!banner) {
    return;
  }

  banner.classList.add("hidden");
}

function showCarrierNotification(title, body) {
  const banner = document.querySelector("#carrier-notification");
  const titleNode = document.querySelector("#carrier-notification-title");
  const bodyNode = document.querySelector("#carrier-notification-body");

  if (!banner || !titleNode || !bodyNode) {
    return;
  }

  titleNode.textContent = title;
  bodyNode.textContent = body;
  banner.classList.remove("hidden");

  window.clearTimeout(carrierState.notificationTimer);
  carrierState.notificationTimer = window.setTimeout(() => {
    banner.classList.add("hidden");
  }, 5200);
}

async function showSystemNotification(title, body) {
  if (!window.isSecureContext || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      icon: "./assets/naaval-carrier-icon-192.png"
    });
  } catch (_error) {
    // Keep the in-app banner as the reliable fallback.
  }
}

async function requestSystemNotificationPermission() {
  if (!window.isSecureContext || !("Notification" in window) || Notification.permission !== "default") {
    return;
  }

  try {
    await Notification.requestPermission();
  } catch (_error) {
    // Ignore unsupported browsers.
  }
}

function openCarrierInboxFromNotification() {
  hideCarrierNotification();
  carrierState.activeTab = "inbox";
  render();
}

async function notifyIncomingOpsMessages(previousMessages, nextMessages) {
  const nextOpsMessages = nextMessages.filter((message) => message.senderType === "ops");
  if (!carrierState.hasInboxSnapshot) {
    carrierState.hasInboxSnapshot = true;
    carrierState.lastNotifiedMessageId = nextOpsMessages.at(-1) ? getMessageStableId(nextOpsMessages.at(-1)) : null;
    return;
  }

  const previousIds = new Set(previousMessages.filter((message) => message.senderType === "ops").map(getMessageStableId));
  const incoming = nextOpsMessages.filter((message) => !previousIds.has(getMessageStableId(message)));
  const latestMessage = incoming.at(-1);

  if (!latestMessage) {
    return;
  }

  const latestId = getMessageStableId(latestMessage);
  if (carrierState.lastNotifiedMessageId === latestId) {
    return;
  }

  carrierState.lastNotifiedMessageId = latestId;
  showCarrierNotification(latestMessage.author || "Naaval Ops", latestMessage.body || "New message received.");
  if ("vibrate" in navigator) {
    navigator.vibrate([120, 80, 120]);
  }
  await showSystemNotification(latestMessage.author || "Naaval Ops", latestMessage.body || "New message received.");
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    }

    return (await response.text()) || `HTTP ${response.status}`;
  } catch (_error) {
    return `HTTP ${response.status}`;
  }
}

function deepCopy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function readStorageJson(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeStorageJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Keep working memory-only if storage quota is exceeded.
  }
}

function removeStorageKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage errors.
  }
}

function isLikelyNetworkError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("the internet connection appears to be offline") ||
    message.includes("fetch failed")
  );
}

function saveOfflineQueue() {
  writeStorageJson(CARRIER_OFFLINE_QUEUE_KEY, carrierState.offlineQueue);
}

function restoreOfflineQueue() {
  return readStorageJson(CARRIER_OFFLINE_QUEUE_KEY, []) ?? [];
}

function buildOfflineSnapshot() {
  return {
    driverId: carrierState.driver?.id ?? null,
    driver: deepCopy(carrierState.driver),
    routeViews: deepCopy(carrierState.routeViews),
    carrierCompanies: deepCopy(carrierState.carrierCompanies),
    messages: deepCopy(carrierState.messages),
    selectedRouteId: carrierState.selectedRouteId,
    savedAt: new Date().toISOString()
  };
}

function saveOfflineSnapshot() {
  if (!carrierState.driver) {
    return;
  }

  const snapshot = buildOfflineSnapshot();
  carrierState.offlineSnapshotAt = snapshot.savedAt;
  writeStorageJson(CARRIER_OFFLINE_SNAPSHOT_KEY, snapshot);
}

function restoreOfflineSnapshot() {
  return readStorageJson(CARRIER_OFFLINE_SNAPSHOT_KEY, null);
}

function clearOfflinePersistence() {
  removeStorageKey(CARRIER_OFFLINE_SNAPSHOT_KEY);
  removeStorageKey(CARRIER_OFFLINE_QUEUE_KEY);
}

function hydrateCarrierFromSnapshot(snapshot) {
  if (!snapshot) {
    return false;
  }

  carrierState.driver = snapshot.driver ?? carrierState.driver;
  carrierState.routeViews = snapshot.routeViews ?? [];
  carrierState.carrierCompanies = snapshot.carrierCompanies ?? [];
  carrierState.messages = snapshot.messages ?? [];
  carrierState.selectedRouteId = snapshot.selectedRouteId ?? carrierState.selectedRouteId;
  carrierState.offlineSnapshotAt = snapshot.savedAt ?? null;
  carrierState.accountSkillDraft = [...(carrierState.driver?.skills ?? carrierState.accountSkillDraft ?? [])];
  return true;
}

function updateConnectivityState(isOnline) {
  carrierState.isOffline = !isOnline;
  if (isOnline) {
    carrierState.lastSyncAt = new Date().toISOString();
  }
}

function buildOfflineAction(method, path, payload, options = {}) {
  return {
    id: `offline_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    method,
    path,
    payload: deepCopy(payload),
    kind: options.kind || "generic",
    dedupeKey: options.dedupeKey || null,
    createdAt: new Date().toISOString()
  };
}

function enqueueOfflineAction(method, path, payload, options = {}) {
  const action = buildOfflineAction(method, path, payload, options);
  if (action.dedupeKey) {
    carrierState.offlineQueue = carrierState.offlineQueue.filter((item) => item.dedupeKey !== action.dedupeKey);
  }
  carrierState.offlineQueue = [...carrierState.offlineQueue, action];
  saveOfflineQueue();
  saveOfflineSnapshot();
  updateConnectivityState(false);
  return action;
}

function recalculateRouteView(routeView) {
  const stops = routeView?.route?.stops ?? [];
  const completedStatuses = new Set([
    "served",
    "skipped",
    "failed",
    "delivery_order_delivered",
    "delivery_failed",
    "delivery_refused_by_customer",
    "pickup_handed_over_to_tsp",
    "pickup_failed",
    "pickup_refused_by_tsp"
  ]);
  const pendingStops = stops.filter((stop) => !completedStatuses.has(stop.proofOutcomeCode ?? stop.status)).length;
  const completedStops = stops.length - pendingStops;
  const nextStop = stops.find((stop) => !completedStatuses.has(stop.proofOutcomeCode ?? stop.status)) ?? null;

  return {
    ...routeView,
    pendingStops,
    completedStops,
    totalStops: stops.length,
    nextStop
  };
}

function updateRouteViewState(routeId, updater) {
  carrierState.routeViews = carrierState.routeViews.map((routeView) => {
    if (routeView.route?.id !== routeId) {
      return routeView;
    }

    return recalculateRouteView(updater(deepCopy(routeView)));
  });
  saveOfflineSnapshot();
}

async function executeJsonRequest(method, path, payload) {
  const candidates = carrierState.apiBaseUrl
    ? [carrierState.apiBaseUrl, ...CARRIER_API_BASE_CANDIDATES.filter((url) => url !== carrierState.apiBaseUrl)]
    : CARRIER_API_BASE_CANDIDATES;
  const errors = [];

  for (const baseUrl of candidates) {
    try {
      const headers = payload ? { "Content-Type": "application/json" } : {};
      if (carrierState.session?.token) {
        headers.Authorization = `Bearer ${carrierState.session.token}`;
      }

      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: Object.keys(headers).length ? headers : undefined,
        body: payload ? JSON.stringify(payload) : undefined
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      carrierState.apiBaseUrl = baseUrl;
      updateConnectivityState(true);
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }

  updateConnectivityState(false);
  throw new Error(errors.join(" | "));
}

async function fetchJson(path) {
  return await executeJsonRequest("GET", path);
}

async function postJson(path, payload) {
  return await executeJsonRequest("POST", path, payload);
}

async function patchJson(path, payload) {
  return await executeJsonRequest("PATCH", path, payload);
}

function saveSession() {
  if (!carrierState.session) {
    return;
  }

  writeStorageJson(CARRIER_SESSION_KEY, carrierState.session);
}

function restoreSession() {
  return readStorageJson(CARRIER_SESSION_KEY, null);
}

function clearSession() {
  removeStorageKey(CARRIER_SESSION_KEY);
}

async function loadDrivers() {
  const response = await fetchJson("/fleet/drivers");
  return response.items ?? [];
}

function loginDriver(driver, provider = "password") {
  carrierState.driver = driver;
  carrierState.session = {
    driverId: driver.id,
    email: driver.email,
    token: driver.token || null,
    provider
  };
  carrierState.accountSkillDraft = [...(driver.skills ?? [])];
  carrierState.offlineQueue = restoreOfflineQueue();
  setCarrierLoginStatus("");
  saveSession();
}

function logoutDriver() {
  if (carrierRefreshTimer) {
    window.clearInterval(carrierRefreshTimer);
    carrierRefreshTimer = null;
  }
  if (carrierHeartbeatTimer) {
    window.clearInterval(carrierHeartbeatTimer);
    carrierHeartbeatTimer = null;
  }
  carrierState.driver = null;
  carrierState.session = null;
  carrierState.routeViews = [];
  carrierState.messages = [];
  carrierState.selectedRouteId = null;
  carrierState.proofContext = null;
  carrierState.hasInboxSnapshot = false;
  carrierState.lastNotifiedMessageId = null;
  carrierState.offlineQueue = [];
  carrierState.isOffline = false;
  carrierState.lastSyncAt = null;
  carrierState.offlineSnapshotAt = null;
  window.clearTimeout(carrierState.notificationTimer);
  hideCarrierNotification();
  clearSession();
  clearOfflinePersistence();
  window.google?.accounts?.id?.disableAutoSelect?.();
  setCarrierLoginStatus("");
  render();
}

async function restoreDriverFromSession() {
  const session = restoreSession();
  if (!session?.driverId) {
    return false;
  }

  try {
    carrierState.session = session;
    const sessionPayload = await fetchJson("/auth/me");
    const driver = sessionPayload?.actor
      ? {
          ...sessionPayload.actor,
          id: sessionPayload.driverId || sessionPayload.actor?.id,
          email: sessionPayload.email || sessionPayload.actor?.email,
          token: sessionPayload.token || session.token
        }
      : null;

    if (!driver) {
      clearSession();
      carrierState.session = null;
      return false;
    }

    loginDriver(driver, session.provider ?? "password");
    return true;
  } catch (error) {
    carrierState.session = null;
    const snapshot = restoreOfflineSnapshot();
    if (!snapshot?.driver || (snapshot.driver.id !== session.driverId && snapshot.driver.email !== session.email)) {
      clearSession();
      return false;
    }

    loginDriver(snapshot.driver, session.provider ?? "password");
    hydrateCarrierFromSnapshot(snapshot);
    updateConnectivityState(false);
    return true;
  }
}

function getSortedRouteViews() {
  const priority = {
    in_progress: 0,
    dispatched: 1,
    ready: 2,
    completed: 3,
    cancelled: 4
  };

  return [...carrierState.routeViews].sort((left, right) => {
    const leftPriority = priority[left.route?.status] ?? 99;
    const rightPriority = priority[right.route?.status] ?? 99;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftTime = new Date(left.route?.stops?.[0]?.plannedArrivalAt ?? left.shift?.startAt ?? 0).getTime();
    const rightTime = new Date(right.route?.stops?.[0]?.plannedArrivalAt ?? right.shift?.startAt ?? 0).getTime();
    return leftTime - rightTime;
  });
}

function getSelectedRouteView() {
  return getSortedRouteViews().find((routeView) => routeView.route?.id === carrierState.selectedRouteId) ?? getSortedRouteViews()[0] ?? null;
}

function getRouteDisplayName(routeView) {
  const sorted = getSortedRouteViews();
  const index = sorted.findIndex((candidate) => candidate.route?.id === routeView.route?.id);
  return `Route ${index >= 0 ? index + 1 : "?"}`;
}

function getRouteDateKey(routeView) {
  return createDateKey(routeView.route?.stops?.[0]?.plannedArrivalAt ?? routeView.shift?.startAt);
}

function getRouteStopsByStatus(routeView, statuses) {
  return (routeView?.route?.stops ?? []).filter((stop) => statuses.includes(stop.status));
}

function getRouteCounts() {
  const liveRoutes = carrierState.routeViews.filter((routeView) => ["ready", "dispatched", "in_progress"].includes(routeView.route?.status)).length;
  const pendingStops = carrierState.routeViews.reduce((total, routeView) => total + (routeView.pendingStops ?? 0), 0);
  const completedStops = carrierState.routeViews.reduce((total, routeView) => total + (routeView.completedStops ?? 0), 0);
  const inboxCount = carrierState.messages.filter((message) => message.senderType === "ops").length;
  const queuedSync = carrierState.offlineQueue.length;

  return {
    liveRoutes,
    pendingStops,
    completedStops,
    inboxCount,
    queuedSync
  };
}

async function flushOfflineQueue() {
  if (!carrierState.driver || carrierState.queueSyncing || carrierState.offlineQueue.length === 0) {
    return 0;
  }

  carrierState.queueSyncing = true;
  render();
  let syncedCount = 0;
  const remaining = [];

  for (const action of carrierState.offlineQueue) {
    try {
      await executeJsonRequest(action.method, action.path, action.payload);
      syncedCount += 1;
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        remaining.push(action, ...carrierState.offlineQueue.slice(carrierState.offlineQueue.indexOf(action) + 1));
        break;
      }

      // Drop invalid queued actions so they do not block the whole queue forever.
      console.warn("Dropping offline action after sync failure", action, error);
    }
  }

  carrierState.offlineQueue = remaining;
  carrierState.queueSyncing = false;
  saveOfflineQueue();
  render();
  return syncedCount;
}

async function refreshCarrier(showMessage = false) {
  if (!carrierState.driver) {
    return;
  }

  const driverId = carrierState.driver.id;
  const previousMessages = [...carrierState.messages];
  try {
    const [routesResponse, driversResponse, carrierCompaniesResponse, messagesResponse] = await Promise.all([
      fetchJson(`/carrier/routes?driverId=${encodeURIComponent(driverId)}`),
      fetchJson("/fleet/drivers"),
      fetchJson("/fleet/carrier-companies"),
      fetchJson(`/inbox/messages?audience=drivers&threadId=${encodeURIComponent(driverId)}`)
    ]);

    carrierState.routeViews = routesResponse.items ?? [];
    const updatedDriver = (driversResponse.items ?? []).find((candidate) => candidate.id === driverId) ?? carrierState.driver;
    carrierState.driver = updatedDriver;
    carrierState.carrierCompanies = carrierCompaniesResponse.items ?? [];
    const nextMessages = (messagesResponse.items ?? []).sort((left, right) => String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")));
    carrierState.messages = nextMessages;
    carrierState.accountSkillDraft = [...(carrierState.accountSkillDraft.length > 0 ? carrierState.accountSkillDraft : updatedDriver.skills ?? [])];

    if (!carrierState.selectedRouteId || !carrierState.routeViews.some((routeView) => routeView.route?.id === carrierState.selectedRouteId)) {
      carrierState.selectedRouteId = getSortedRouteViews()[0]?.route?.id ?? null;
    }

    if (carrierState.proofContext && !carrierState.routeViews.some((routeView) => routeView.route?.id === carrierState.proofContext.routeId)) {
      carrierState.proofContext = null;
    }

    saveOfflineSnapshot();
    const syncedActions = await flushOfflineQueue();
    if (syncedActions > 0) {
      return await refreshCarrier(showMessage);
    }

    await notifyIncomingOpsMessages(previousMessages, nextMessages);
    syncCarrierRealtimeLoops();
    render();
    if (showMessage) {
      showToast("Carrier data refreshed.");
    }
  } catch (error) {
    const snapshot = restoreOfflineSnapshot();
    if (snapshot?.driver && (snapshot.driver.id === driverId || snapshot.driver.email === carrierState.driver?.email)) {
      hydrateCarrierFromSnapshot(snapshot);
      updateConnectivityState(false);
      syncCarrierRealtimeLoops();
      render();
      if (showMessage) {
        showToast("Offline mode active. Cached missions are available.");
      }
      return;
    }

    throw error;
  }
}

function getPrimaryLiveRouteView() {
  return (
    getSortedRouteViews().find((routeView) => ["in_progress", "dispatched"].includes(routeView.route?.status)) ??
    getSortedRouteViews().find((routeView) => routeView.route?.status === "ready") ??
    null
  );
}

function syncCarrierRealtimeLoops() {
  if (carrierRefreshTimer) {
    window.clearInterval(carrierRefreshTimer);
    carrierRefreshTimer = null;
  }
  if (carrierHeartbeatTimer) {
    window.clearInterval(carrierHeartbeatTimer);
    carrierHeartbeatTimer = null;
  }

  if (!carrierState.driver) {
    return;
  }

  carrierRefreshTimer = window.setInterval(() => {
    if (!carrierState.driver) {
      return;
    }
    void refreshCarrier(false);
  }, 15000);

  carrierHeartbeatTimer = window.setInterval(() => {
    const routeView = getPrimaryLiveRouteView();
    if (!carrierState.driver || !routeView?.route?.id) {
      return;
    }
    void sendCheckIn(routeView.route.id, routeView.nextStop ?? routeView.route?.stops?.[0] ?? null).catch(() => null);
  }, 20000);
}

function getMapPoint(address) {
  const coordinates = address?.coordinates;
  if (Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lon)) {
    return `${coordinates.lat},${coordinates.lon}`;
  }

  return [address?.label, address?.street1, address?.postalCode, address?.city, address?.countryCode].filter(Boolean).join(", ");
}

function buildMapEmbed(addresses, title = "Route map") {
  const mapQueries = addresses.map(getMapPoint).filter(Boolean);
  const points = addresses.map((address) => address?.coordinates).filter((coordinates) => Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lon));
  const googleKey = String(getConfigValue("NAAVAL_GOOGLE_MAPS_EMBED_KEY") || "").trim();

  if (mapQueries.length === 0) {
    return `<div class="route-map"><div class="empty-state"><p>No coordinates available yet for this route.</p></div></div>`;
  }

  if (googleKey) {
    if (mapQueries.length >= 2) {
      const params = new URLSearchParams({
        key: googleKey,
        origin: mapQueries[0],
        destination: mapQueries.at(-1),
        mode: "driving"
      });
      const waypoints = mapQueries.slice(1, -1).join("|");
      if (waypoints) {
        params.set("waypoints", waypoints);
      }
      return `<div class="route-map"><iframe title="${escapeHtml(title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps/embed/v1/directions?${params.toString()}"></iframe></div>`;
    }

    const params = new URLSearchParams({
      key: googleKey,
      q: mapQueries[0]
    });
    return `<div class="route-map"><iframe title="${escapeHtml(title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps/embed/v1/place?${params.toString()}"></iframe></div>`;
  }

  if (points.length === 0) {
    return `<div class="route-map"><div class="empty-state"><p>Google Maps key not configured and no coordinates available.</p></div></div>`;
  }

  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const padding = 0.02;
  const bbox = [
    Math.min(...lons) - padding,
    Math.min(...lats) - padding,
    Math.max(...lons) + padding,
    Math.max(...lats) + padding
  ].join(",");
  const marker = `${points.at(-1).lat},${points.at(-1).lon}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
  return `<div class="route-map"><iframe title="${escapeHtml(title)}" loading="lazy" src="${src}"></iframe></div>`;
}

function buildWazeUrl(address) {
  const coordinates = address?.coordinates;
  if (Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lon)) {
    return `https://www.waze.com/ul?ll=${coordinates.lat},${coordinates.lon}&navigate=yes`;
  }

  const query = encodeURIComponent(toAddressLabel(address));
  return `https://www.waze.com/ul?q=${query}&navigate=yes`;
}

function findStopOrder(routeView, stop) {
  return (routeView.orders ?? []).find((order) => order.id === stop.orderId) ?? null;
}

function renderMetrics() {
  const counts = getRouteCounts();
  return `
    <article class="metric-card">
      <span class="metric-card__label">Live Routes</span>
      <strong class="metric-card__value">${counts.liveRoutes}</strong>
    </article>
    <article class="metric-card">
      <span class="metric-card__label">Pending Stops</span>
      <strong class="metric-card__value">${counts.pendingStops}</strong>
    </article>
    <article class="metric-card">
      <span class="metric-card__label">Completed Stops</span>
      <strong class="metric-card__value">${counts.completedStops}</strong>
    </article>
    <article class="metric-card">
      <span class="metric-card__label">Ops Messages</span>
      <strong class="metric-card__value">${counts.inboxCount}</strong>
    </article>
    <article class="metric-card">
      <span class="metric-card__label">Queued Sync</span>
      <strong class="metric-card__value">${counts.queuedSync}</strong>
    </article>
  `;
}

function renderSyncBar() {
  if (!carrierState.driver) {
    return "";
  }

  if (carrierState.isOffline) {
    return `
      <strong>Offline mode active</strong>
      <p>${carrierState.offlineQueue.length} action(s) are stored on this iPhone and will sync automatically when the network comes back.</p>
    `;
  }

  if (carrierState.queueSyncing) {
    return `
      <strong>Syncing pending actions</strong>
      <p>Naaval is sending your offline updates back to ops right now.</p>
    `;
  }

  if (carrierState.offlineQueue.length > 0) {
    return `
      <strong>Pending sync queue</strong>
      <p>${carrierState.offlineQueue.length} offline action(s) are waiting for the next successful sync.</p>
    `;
  }

  if (!carrierState.lastSyncAt) {
    return "";
  }

  return `
    <strong>Everything is synced</strong>
    <p>Last successful sync at ${escapeHtml(formatDateTime(carrierState.lastSyncAt))}.</p>
  `;
}

function renderMissionsTab() {
  const routes = getSortedRouteViews();

  return `
    <section class="screen-stack">
      <article class="screen-card">
        <div class="screen-card__head">
          <div>
            <p class="screen-card__eyebrow">Mon Planning</p>
            <h2>Assigned missions</h2>
            <p class="screen-card__subtitle">Tap a route to open the full workflow: depart, Waze, arrival, proof, and route progress.</p>
          </div>
        </div>

        <div class="mission-list">
          ${routes.length > 0
            ? routes
                .map((routeView) => {
                  const nextStop = routeView.nextStop ?? routeView.route?.stops?.find((stop) => stop.status === "arrived") ?? routeView.route?.stops?.[0];
                  return `
                    <button class="mission-card" type="button" data-action="open-route" data-route-id="${routeView.route.id}">
                      <div class="mission-card__head">
                        <span class="status-chip" data-status="${routeView.route.status}">${escapeHtml(labelForRouteStatus(routeView.route.status))}</span>
                        <strong>${escapeHtml(getRouteDisplayName(routeView))}</strong>
                      </div>
                      <h3>${escapeHtml(nextStop ? toAddressLabel(nextStop.address) : "No next stop")}</h3>
                      <p>${escapeHtml(routeView.driver?.name ?? carrierState.driver?.name ?? "Driver")} • ${escapeHtml(formatDateOnly(routeView.shift?.startAt ?? routeView.route?.stops?.[0]?.plannedArrivalAt))}</p>
                      <div class="mission-card__meta">
                        <span class="metric-chip">⏱️ ${escapeHtml(formatTime(nextStop?.plannedArrivalAt ?? routeView.shift?.startAt))}</span>
                        <span class="metric-chip">📍 ${routeView.pendingStops ?? 0} pending</span>
                        <span class="metric-chip">✅ ${routeView.completedStops ?? 0}/${routeView.totalStops ?? 0}</span>
                        <span class="metric-chip">🧭 ${escapeHtml(formatDistance(routeView.route?.totalDistanceMeters))}</span>
                      </div>
                    </button>
                  `;
                })
                .join("")
            : `<div class="empty-state"><p>No mission is assigned yet. The ops team can dispatch a route to make it appear here.</p></div>`}
        </div>
      </article>
    </section>
  `;
}

function buildCalendarDays() {
  const monthStart = new Date(carrierState.calendarCursor.getFullYear(), carrierState.calendarCursor.getMonth(), 1);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function renderPlanningTab() {
  const routesByDateKey = getSortedRouteViews().reduce((map, routeView) => {
    const key = getRouteDateKey(routeView);
    if (!key) {
      return map;
    }
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(routeView);
    return map;
  }, new Map());

  const days = buildCalendarDays();
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(carrierState.calendarCursor);
  return `
    <section class="screen-stack">
      <article class="screen-card">
        <div class="screen-card__head">
          <div>
            <p class="screen-card__eyebrow">Planning</p>
            <h2>Calendar view</h2>
            <p class="screen-card__subtitle">Each day is fully colored: red when missions are assigned, Naaval green when the day is open.</p>
          </div>
        </div>

        <div class="calendar">
          <div class="calendar__header">
            <button class="ghost-button ghost-button--small" type="button" data-action="calendar-prev">Prev</button>
            <strong>${escapeHtml(monthLabel)}</strong>
            <button class="ghost-button ghost-button--small" type="button" data-action="calendar-next">Next</button>
          </div>

          <div class="calendar__grid">
            ${["L", "M", "M", "J", "V", "S", "D"].map((label) => `<span class="calendar__weekday">${label}</span>`).join("")}
            ${days
              .map((day) => {
                const key = createDateKey(day);
                const dayRoutes = routesByDateKey.get(key) ?? [];
                const hasMission = dayRoutes.length > 0;
                const inCurrentMonth = day.getMonth() === carrierState.calendarCursor.getMonth();
                const classNames = [
                  "calendar-day",
                  hasMission ? "calendar-day--busy" : "calendar-day--free",
                  !inCurrentMonth ? "calendar-day--muted" : "",
                  carrierState.selectedCalendarDateKey === key ? "calendar-day--selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ");
                const detailLabel = hasMission
                  ? `${dayRoutes.length} mission${dayRoutes.length > 1 ? "s" : ""}`
                  : "Libre";
                return `
                  <button class="${classNames}" type="button" data-action="open-calendar-day" data-date-key="${key}">
                    <div class="calendar-day__head">
                      <strong class="calendar-day__date">${day.getDate()}</strong>
                    </div>
                    <div class="calendar-day__body">
                      <span class="calendar-day__status">${detailLabel}</span>
                    </div>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderInboxTab() {
  const messages = carrierState.messages;

  return `
    <section class="screen-stack">
      <article class="screen-card">
        <div class="screen-card__head">
          <div>
            <p class="screen-card__eyebrow">Inbox</p>
            <h2>Naaval Ops</h2>
            <p class="screen-card__subtitle">Use this thread to coordinate exceptions, delays, and customer updates with operations.</p>
          </div>
        </div>

        <div class="inbox-wrap">
          <div class="inbox-thread-card">
            <div class="inbox-head">
              <strong>Ops Conversation</strong>
              <span class="metric-chip">${carrierState.driver?.name ?? "Driver"}</span>
            </div>
            <div class="inbox-messages">
              ${messages.length > 0
                ? messages
                    .map(
                      (message) => `
                        <article class="inbox-message ${message.senderType === "driver" ? "inbox-message--mine" : ""}">
                          <strong>${escapeHtml(message.author)}</strong>
                          <p>${escapeHtml(message.body)}</p>
                          <span>${escapeHtml(message.time || formatTime(message.createdAt))}</span>
                        </article>
                      `
                    )
                    .join("")
                : `<div class="empty-state"><p>No messages yet. Your first message to ops will appear here.</p></div>`}
            </div>
          </div>

          <form id="carrier-inbox-form" class="inbox-composer screen-card">
            <label class="field">
              <span>Reply to ops</span>
              <textarea name="body" rows="3" placeholder="Write a quick update for Naaval ops..." required></textarea>
            </label>
            <button class="solid-button" type="submit">Send Message</button>
          </form>
        </div>
      </article>
    </section>
  `;
}

function renderAccountTab() {
  const driver = carrierState.driver;
  const carrierCompany = carrierState.carrierCompanies.find((company) => company.id === driver?.carrierCompanyId) ?? null;

  return `
    <section class="screen-stack">
      <article class="screen-card">
        <div class="screen-card__head">
          <div>
            <p class="screen-card__eyebrow">My Account</p>
            <h2>Edit driver profile</h2>
            <p class="screen-card__subtitle">Keep your contact details, vehicle type, tags, and truck photos up to date.</p>
          </div>
        </div>

        <form id="carrier-account-form" class="account-form">
          <div class="account-card">
            <h3>${escapeHtml(joinName(driver?.firstName, driver?.lastName) || driver?.name || "Driver")}</h3>
            <p>${escapeHtml(driver?.email ?? "")}</p>
            <div class="account-meta">
              <span class="metric-chip">📞 ${escapeHtml(driver?.phone ?? "Not set")}</span>
              <span class="metric-chip">🚚 ${escapeHtml(labelForVehicleType(driver?.vehicleType))}</span>
              <span class="metric-chip">🏢 ${escapeHtml(carrierCompany?.name ?? "Independent")}</span>
            </div>
          </div>

          <div class="screen-card">
            <div class="screen-card__head">
              <div>
                <p class="screen-card__eyebrow">Profile</p>
                <h3>Personal information</h3>
              </div>
            </div>

            <div class="stack">
              <div class="field">
                <span>First Name</span>
                <input name="firstName" value="${escapeHtml(driver?.firstName ?? "")}" required />
              </div>
              <div class="field">
                <span>Last Name</span>
                <input name="lastName" value="${escapeHtml(driver?.lastName ?? "")}" required />
              </div>
              <div class="field">
                <span>Email</span>
                <input name="email" type="email" value="${escapeHtml(driver?.email ?? "")}" required />
              </div>
              <div class="field">
                <span>Phone</span>
                <input name="phone" value="${escapeHtml(driver?.phone ?? "")}" required />
              </div>
              <div class="field">
                <span>Vehicle Type</span>
                <select name="vehicleType">
                  ${["bike", "scooter", "car", "van_3m3", "van_5m3", "van_10m3", "van_15m3", "van_20m3"]
                    .map(
                      (option) => `
                        <option value="${option}" ${option === driver?.vehicleType ? "selected" : ""}>${escapeHtml(labelForVehicleType(option))}</option>
                      `
                    )
                    .join("")}
                </select>
              </div>
              <div class="field">
                <span>Truck Photos</span>
                <input name="vehiclePhotos" type="file" accept="image/*" capture="environment" multiple />
              </div>
            </div>
          </div>

          <div class="screen-card">
            <div class="screen-card__head">
              <div>
                <p class="screen-card__eyebrow">Tags</p>
                <h3>Vehicle capabilities</h3>
              </div>
            </div>
            <div class="tag-grid">
              ${ACCOUNT_TAGS.map(
                (tag) => `
                  <button class="tag-toggle ${carrierState.accountSkillDraft.includes(tag.id) ? "tag-toggle--active" : ""}" type="button" data-action="toggle-account-tag" data-tag-id="${tag.id}">
                    ${escapeHtml(tag.label)}
                  </button>
                `
              ).join("")}
            </div>
          </div>

          <div class="screen-card">
            <div class="screen-card__head">
              <div>
                <p class="screen-card__eyebrow">Carrier Company</p>
                <h3>Legal entity</h3>
              </div>
            </div>
            <div class="account-company">
              <strong>${escapeHtml(carrierCompany?.name ?? "Independent")}</strong>
              <p>${escapeHtml(carrierCompany?.legalName ?? "No legal entity linked yet")}</p>
              <div class="account-meta">
                <span class="metric-chip">✉️ ${escapeHtml(carrierCompany?.email ?? "Not set")}</span>
                <span class="metric-chip">📞 ${escapeHtml(carrierCompany?.phone ?? "Not set")}</span>
              </div>
            </div>
          </div>

          ${
            driver?.vehiclePhotoUrls?.length
              ? `
                <div class="screen-card">
                  <div class="screen-card__head">
                    <div>
                      <p class="screen-card__eyebrow">Media</p>
                      <h3>Current truck photos</h3>
                    </div>
                  </div>
                  <div class="photo-preview-grid">
                    ${driver.vehiclePhotoUrls.map((photoUrl) => `<img class="account-photo" src="${escapeHtml(photoUrl)}" alt="Vehicle" />`).join("")}
                  </div>
                </div>
              `
              : ""
          }

          <button class="solid-button" type="submit">Save My Account</button>
        </form>
      </article>
    </section>
  `;
}

function renderRouteModal() {
  const routeView = getSelectedRouteView();
  const container = document.querySelector("#carrier-route-modal-content");
  if (!container) {
    return;
  }

  if (!routeView) {
    container.innerHTML = `<div class="empty-state"><p>No route selected.</p></div>`;
    return;
  }

  const nextStop = routeView.nextStop ?? routeView.route?.stops?.find((stop) => stop.status === "arrived") ?? routeView.route?.stops?.[0];
  container.innerHTML = `
    <p class="screen-card__eyebrow">Route Execution</p>
    <h2>${escapeHtml(getRouteDisplayName(routeView))}</h2>
    <p class="screen-card__subtitle">${escapeHtml(labelForRouteStatus(routeView.route.status))} • ${escapeHtml(formatDateOnly(routeView.shift?.startAt ?? routeView.route?.stops?.[0]?.plannedArrivalAt))}</p>

    <div class="screen-stack">
      <article class="screen-card">
        ${buildMapEmbed((routeView.route?.stops ?? []).map((stop) => stop.address), `${getRouteDisplayName(routeView)} map`)}
      </article>

      <article class="screen-card">
        <div class="route-summary">
          <div class="summary-pill"><span>Driver</span><strong>${escapeHtml(routeView.driver?.name ?? carrierState.driver?.name ?? "Driver")}</strong></div>
          <div class="summary-pill"><span>Vehicle</span><strong>${escapeHtml(labelForVehicleType(routeView.driver?.vehicleType))}</strong></div>
          <div class="summary-pill"><span>Start</span><strong>${escapeHtml(formatTime(routeView.shift?.startAt ?? routeView.route?.stops?.[0]?.plannedArrivalAt))}</strong></div>
          <div class="summary-pill"><span>End</span><strong>${escapeHtml(formatTime(routeView.shift?.endAt ?? routeView.route?.stops?.at(-1)?.plannedDepartureAt))}</strong></div>
          <div class="summary-pill"><span>Distance</span><strong>${escapeHtml(formatDistance(routeView.route?.totalDistanceMeters))}</strong></div>
          <div class="summary-pill"><span>Duration</span><strong>${escapeHtml(formatDuration(routeView.route?.totalDurationSeconds))}</strong></div>
        </div>

        <div class="route-actions">
          ${["ready", "dispatched"].includes(routeView.route?.status) ? `<button class="solid-button" type="button" data-action="start-route" data-route-id="${routeView.route.id}">Start Route</button>` : ""}
          <button class="ghost-button" type="button" data-action="open-waze" data-route-id="${routeView.route.id}" ${!nextStop ? "disabled" : ""}>Open Waze</button>
          <button class="ghost-button" type="button" data-action="send-checkin" data-route-id="${routeView.route.id}">Share Position</button>
        </div>
      </article>

      <article class="screen-card">
        <div class="screen-card__head">
          <div>
            <p class="screen-card__eyebrow">Stops</p>
            <h3>Delivery funnel</h3>
          </div>
        </div>

        <div class="stop-list">
          ${(routeView.route?.stops ?? [])
            .map((stop) => {
              const order = findStopOrder(routeView, stop);
              const targetAddress = stop.kind === "pickup" ? order?.pickupAddress ?? stop.address : order?.dropoffAddress ?? stop.address;
              const stopStatusCode = stop.proofOutcomeCode ?? stop.status;
              const stopStatusTone = toneForExecutionStatus(stopStatusCode);
              const stopStatusLabel = stop.proofOutcomeLabel ?? labelForStopStatus(stopStatusCode);
              const contactName =
                targetAddress?.contactName ||
                [targetAddress?.firstName, targetAddress?.lastName].filter(Boolean).join(" ") ||
                order?.reference ||
                "Pending contact";
              return `
                <article class="stop-card">
                  <div class="stop-card__head">
                    <strong>${escapeHtml(stop.kind === "pickup" ? "Pickup" : "Drop")} • ${escapeHtml(order?.reference ?? stop.orderId ?? "Order")}</strong>
                    <span class="status-chip" data-status="${escapeHtml(stopStatusTone)}">${escapeHtml(stopStatusLabel)}</span>
                  </div>
                  <h4>${escapeHtml(toAddressLabel(targetAddress))}</h4>
                  <p>${escapeHtml(contactName)}</p>
                  ${stop.note ? `<p>${escapeHtml(stop.note)}</p>` : ""}
                  <div class="stop-card__meta">
                    <span class="metric-chip">⏱️ ${escapeHtml(formatTime(stop.plannedArrivalAt))}</span>
                    <span class="metric-chip">📞 ${escapeHtml(targetAddress?.phone ?? order?.phone ?? "No phone")}</span>
                    <span class="metric-chip">${stop.kind === "pickup" ? "📦 Pickup" : "📬 Delivery"}</span>
                  </div>
                  <div class="stop-actions">
                    <button class="ghost-button ghost-button--small" type="button" data-action="open-stop-waze" data-route-id="${routeView.route.id}" data-stop-id="${stop.id}">Waze</button>
                    ${stop.status === "pending" ? `<button class="solid-button" type="button" data-action="arrive-stop" data-route-id="${routeView.route.id}" data-stop-id="${stop.id}">Arrived</button>` : ""}
                    ${stop.status === "arrived" ? `<button class="solid-button" type="button" data-action="open-proof" data-route-id="${routeView.route.id}" data-stop-id="${stop.id}">${stop.kind === "pickup" ? "Pickup Proof" : "Delivery Proof"}</button>` : ""}
                    ${["pending", "arrived"].includes(stop.status) ? `<button class="ghost-button ghost-button--small" type="button" data-action="skip-stop" data-route-id="${routeView.route.id}" data-stop-id="${stop.id}">Skip</button>` : ""}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </article>
    </div>
  `;
}

function renderDayModal() {
  const container = document.querySelector("#carrier-day-modal-content");
  if (!container) {
    return;
  }

  const dateKey = carrierState.selectedCalendarDateKey;
  const routes = getSortedRouteViews().filter((routeView) => getRouteDateKey(routeView) === dateKey);

  container.innerHTML = `
    <p class="screen-card__eyebrow">Planning Day</p>
    <h2>${escapeHtml(formatDateOnly(dateKey))}</h2>
    <p class="screen-card__subtitle">Tap a mission to open its execution detail.</p>
    <div class="calendar-mission-list">
      ${routes.length > 0
        ? routes
            .map(
              (routeView) => `
                <button class="mission-card" type="button" data-action="open-route" data-route-id="${routeView.route.id}">
                  <div class="mission-card__head">
                    <strong>${escapeHtml(getRouteDisplayName(routeView))}</strong>
                    <span class="status-chip" data-status="${routeView.route.status}">${escapeHtml(labelForRouteStatus(routeView.route.status))}</span>
                  </div>
                  <h3>${escapeHtml(toAddressLabel(routeView.nextStop?.address ?? routeView.route?.stops?.[0]?.address))}</h3>
                  <p>${escapeHtml(formatTime(routeView.shift?.startAt ?? routeView.route?.stops?.[0]?.plannedArrivalAt))} • ${routeView.pendingStops} pending stop(s)</p>
                </button>
              `
            )
            .join("")
        : `<div class="empty-state"><p>No mission assigned on this date.</p></div>`}
    </div>
  `;
}

function renderProofModal() {
  const container = document.querySelector("#carrier-proof-modal-content");
  if (!container) {
    return;
  }

  signaturePadBoundCanvasId = null;

  if (!carrierState.proofContext) {
    container.innerHTML = `<div class="empty-state"><p>No stop selected for proof.</p></div>`;
    return;
  }

  const routeView = getSortedRouteViews().find((route) => route.route?.id === carrierState.proofContext.routeId) ?? null;
  const stop = (routeView?.route?.stops ?? []).find((candidate) => candidate.id === carrierState.proofContext.stopId) ?? null;
  const order = stop ? findStopOrder(routeView, stop) : null;
  const targetAddress = stop?.kind === "pickup" ? order?.pickupAddress ?? stop?.address : order?.dropoffAddress ?? stop?.address;
  const outcomeOptions = getProofOutcomeOptions(stop?.kind);
  const reasonOptions = getProofReasonOptions(stop?.kind);

  container.innerHTML = `
    <p class="screen-card__eyebrow">Proof of ${escapeHtml(stop?.kind === "pickup" ? "Pickup" : "Delivery")}</p>
    <h2>${escapeHtml(order?.reference ?? "Mission stop")}</h2>
    <p class="screen-card__subtitle">${escapeHtml(toAddressLabel(targetAddress))}</p>

    <form id="carrier-proof-form" class="stack">
      <input type="hidden" name="routeId" value="${escapeHtml(routeView?.route?.id ?? "")}" />
      <input type="hidden" name="stopId" value="${escapeHtml(stop?.id ?? "")}" />

      <label class="field">
        <span>Recipient Name</span>
        <input name="recipientName" placeholder="Client name" />
      </label>

      <label class="field">
        <span>Outcome</span>
        <select name="proofOutcomeCode">
          ${outcomeOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>

      <label class="field">
        <span>Reason</span>
        <select name="failureReasonCode">
          ${reasonOptions.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>

      <label class="field">
        <span>Photo Proof</span>
        <input name="photoFiles" type="file" accept="image/*" capture="environment" multiple />
      </label>

      <label class="field">
        <span>Customer Signature</span>
        <canvas class="proof-canvas" id="proof-signature-canvas" width="360" height="180"></canvas>
      </label>

      <div class="route-actions">
        <button class="ghost-button ghost-button--small" type="button" data-action="clear-signature">Clear Signature</button>
        <button class="ghost-button ghost-button--small" type="button" data-action="capture-proof-location">Use My Position</button>
      </div>

      <p class="proof-helper" id="proof-location-label">${escapeHtml(carrierState.proofLocation?.label ?? "Location will be attached from your device when available.")}</p>

      <label class="field">
        <span>Comment</span>
        <textarea name="note" rows="3" placeholder="${escapeHtml(
          stop?.kind === "pickup"
            ? "Explain what happened at pickup. Required for failed or refused pickups."
            : "Explain what happened at delivery. Required for failed or refused deliveries."
        )}"></textarea>
      </label>

      <p class="proof-helper">${
        stop?.kind === "pickup"
          ? "Pickup success requires a photo and signature. Failed or refused pickups require a comment, and refused pickups also require a photo."
          : "Delivery success requires a photo and signature. Failed or refused deliveries require a comment, and refused deliveries also require a photo."
      }</p>

      <button class="solid-button" type="submit">${stop?.kind === "pickup" ? "Submit Pickup Proof" : "Submit Delivery Proof"}</button>
    </form>
  `;
}

function renderMain() {
  if (carrierState.activeTab === "planning") {
    return renderPlanningTab();
  }

  if (carrierState.activeTab === "inbox") {
    return renderInboxTab();
  }

  if (carrierState.activeTab === "account") {
    return renderAccountTab();
  }

  return renderMissionsTab();
}

function renderTopbarCopy() {
  const title = document.querySelector("#carrier-title");
  const subtitle = document.querySelector("#carrier-subtitle");
  if (!title || !subtitle) {
    return;
  }

  const firstName = carrierState.driver?.firstName || carrierState.driver?.name?.split(" ")[0] || "Driver";
  title.textContent = `Hello, ${firstName}.`;

  if (carrierState.activeTab === "planning") {
    subtitle.textContent = "See your assigned delivery days in calendar format and open the missions attached to each date.";
    return;
  }

  if (carrierState.activeTab === "inbox") {
    subtitle.textContent = "Stay aligned with ops without leaving the carrier workspace.";
    return;
  }

  if (carrierState.activeTab === "account") {
    subtitle.textContent = "Update your profile, vehicle tags, and truck media from the field.";
    return;
  }

  subtitle.textContent = "Open a route, launch Waze, and capture proof without breaking your delivery flow.";
}

function render() {
  const login = document.querySelector("#carrier-login");
  const shell = document.querySelector("#carrier-shell");
  const syncbar = document.querySelector("#carrier-syncbar");
  const metrics = document.querySelector("#carrier-metrics");
  const main = document.querySelector("#carrier-main");

  const isAuthenticated = Boolean(carrierState.driver && carrierState.session);
  login?.classList.toggle("hidden", isAuthenticated);
  shell?.classList.toggle("hidden", !isAuthenticated);

  if (!isAuthenticated) {
    return;
  }

  renderTopbarCopy();

  if (syncbar) {
    const syncHtml = renderSyncBar();
    syncbar.innerHTML = syncHtml;
    syncbar.classList.toggle("hidden", !syncHtml);
    syncbar.classList.toggle("carrier-syncbar--online", !carrierState.isOffline);
  }

  if (metrics) {
    metrics.innerHTML = renderMetrics();
  }

  if (main) {
    main.innerHTML = renderMain();
  }

  document.querySelectorAll("[data-carrier-tab]").forEach((button) => {
    button.classList.toggle("carrier-tab--active", button.getAttribute("data-carrier-tab") === carrierState.activeTab);
  });

  renderRouteModal();
  renderDayModal();
  renderProofModal();
  setupSignaturePad();
}

function openModal(name) {
  document.querySelector(`#${name}-modal`)?.classList.remove("hidden");
}

function closeModal(name) {
  document.querySelector(`#${name}-modal`)?.classList.add("hidden");

  if (name === "carrier-proof") {
    carrierState.proofContext = null;
    carrierState.proofLocation = null;
    signaturePadDirty = false;
    signaturePadBoundCanvasId = null;
  }
}

function setupGoogleIdentity(retryCount = 0) {
  const slot = document.querySelector("#carrier-google-slot");
  const fallbackButton = document.querySelector("#carrier-google-button");
  const clientId = String(getConfigValue("NAAVAL_GOOGLE_CLIENT_ID") || "").trim();

  if (!slot || !fallbackButton) {
    return;
  }

  slot.innerHTML = "";
  fallbackButton.classList.add("hidden");

  if (!clientId) {
    fallbackButton.classList.remove("hidden");
    return;
  }

  if (!window.google?.accounts?.id) {
    fallbackButton.classList.remove("hidden");
    if (retryCount < 10) {
      window.clearTimeout(googleRetryTimer);
      googleRetryTimer = window.setTimeout(() => setupGoogleIdentity(retryCount + 1), 400);
    }
    return;
  }

  window.clearTimeout(googleRetryTimer);
  googleRetryTimer = null;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async (response) => {
      const payload = decodeJwtPayload(response?.credential);
      if (!payload?.email) {
        setCarrierLoginStatus("Google login failed.", "error");
        showToast("Google login failed.", "error");
        return;
      }

      try {
        const session = await postJson("/auth/google-driver", {
          credential: response?.credential,
          email: payload.email
        });
        const driver = {
          ...(session.actor || {}),
          id: session.driverId || session.actor?.id,
          email: session.email || session.actor?.email,
          token: session.token
        };
        loginDriver(driver, "google");
        await requestSystemNotificationPermission();
        await refreshCarrier();
        setCarrierLoginStatus("");
        showToast(`Google login successful for ${driver.name}.`);
      } catch (error) {
        setCarrierLoginStatus(error.message || "Google login failed.", "error");
        showToast(error.message || "Google login failed.", "error");
      }
    }
  });

  window.google.accounts.id.renderButton(slot, {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 320
  });
}

function extractPositionError(error) {
  return error?.message || "Geolocation unavailable";
}

async function getCurrentPosition() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not available on this device");
  }

  return await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => reject(new Error(extractPositionError(error))),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

function getFallbackPosition(routeView, stop = null) {
  const coordinates =
    stop?.address?.coordinates ??
    routeView?.nextStop?.address?.coordinates ??
    routeView?.shift?.startCoordinates ??
    routeView?.route?.lastKnownPosition ??
    null;
  if (Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lon)) {
    return { lat: coordinates.lat, lon: coordinates.lon };
  }
  return null;
}

async function sendCheckIn(routeId, stop = null) {
  const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId) ?? null;
  let position = null;

  try {
    position = await getCurrentPosition();
  } catch (_error) {
    position = getFallbackPosition(routeView, stop);
  }

  if (!position) {
    throw new Error("No position available for this route");
  }

  return await postJson("/carrier/check-ins", {
    driverId: carrierState.driver.id,
    routeId,
    latitude: position.lat,
    longitude: position.lon,
    locationLabel: `Live position ${position.lat.toFixed(5)} / ${position.lon.toFixed(5)}`,
    occurredAt: new Date().toISOString()
  });
}

function openWazeForAddress(address) {
  window.open(buildWazeUrl(address), "_blank", "noopener,noreferrer");
}

async function readFilesAsDataUrls(files) {
  const fileList = [...(files ?? [])];
  return await Promise.all(
    fileList.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
          reader.readAsDataURL(file);
        })
    )
  );
}

function setupSignaturePad() {
  const canvas = document.querySelector("#proof-signature-canvas");
  if (!canvas || signaturePadBoundCanvasId === canvas.id) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.strokeStyle = "#17211d";

  let drawing = false;

  const toPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] ?? event;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY
    };
  };

  const start = (event) => {
    drawing = true;
    const point = toPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    signaturePadDirty = true;
  };

  const move = (event) => {
    if (!drawing) {
      return;
    }
    event.preventDefault();
    const point = toPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const end = () => {
    drawing = false;
  };

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointerleave", end);
  canvas.addEventListener("touchstart", start, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  signaturePadBoundCanvasId = canvas.id;
}

async function handleCarrierLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value.trim();

  if (!email || !password) {
    setCarrierLoginStatus("Use the driver email and the app password configured in Naaval.", "error");
    showToast("Enter both email and password.", "error");
    return;
  }

  try {
    const session = await postJson("/auth/driver-login", { email, password });
    const driver = {
      ...(session.actor || {}),
      id: session.driverId || session.actor?.id,
      email: session.email || session.actor?.email,
      token: session.token
    };

    loginDriver(driver, "password");
    await requestSystemNotificationPermission();
    await refreshCarrier();
    setCarrierLoginStatus("");
    showToast(`Welcome back ${driver.firstName || driver.name}.`);
  } catch (error) {
    setCarrierLoginStatus(error.message || "Unable to open the carrier app.", "error");
    showToast(`Unable to open the carrier app: ${error.message}`, "error");
  }
}

async function handleStartRoute(routeId) {
  const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId);
  if (!routeView) {
    return;
  }

  try {
    await sendCheckIn(routeId, routeView.nextStop ?? routeView.route?.stops?.[0] ?? null).catch(() => null);
    await postJson(`/carrier/routes/${routeId}/start`, {
      startedAt: new Date().toISOString()
    });
    await refreshCarrier();
    carrierState.selectedRouteId = routeId;
    openModal("carrier-route");
    showToast("Route started. Ops can now see the route as live.");
  } catch (error) {
    showToast(`Unable to start route: ${error.message}`, "error");
  }
}

async function handleArriveStop(routeId, stopId) {
  const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId);
  const stop = (routeView?.route?.stops ?? []).find((candidate) => candidate.id === stopId);

  try {
    await sendCheckIn(routeId, stop).catch(() => null);
    await postJson(`/carrier/stops/${stopId}/status`, {
      status: "arrived",
      note: "Arrival confirmed from carrier app"
    });
    await refreshCarrier();
    carrierState.selectedRouteId = routeId;
    openModal("carrier-route");
    showToast("Arrival sent to ops.");
  } catch (error) {
    showToast(`Unable to update stop: ${error.message}`, "error");
  }
}

async function handleSkipStop(routeId, stopId) {
  try {
    await postJson(`/carrier/stops/${stopId}/status`, {
      status: "skipped",
      note: "Skipped from carrier app"
    });
    await refreshCarrier();
    carrierState.selectedRouteId = routeId;
    openModal("carrier-route");
    showToast("Stop marked as skipped.");
  } catch (error) {
    showToast(`Unable to skip stop: ${error.message}`, "error");
  }
}

async function handleProofSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const stopId = form.elements.stopId.value;
  const routeId = form.elements.routeId.value;
  const note = form.elements.note.value.trim();
  const proofOutcomeCode = form.elements.proofOutcomeCode.value;
  const failureReasonCode = form.elements.failureReasonCode.value || null;
  const canvas = document.querySelector("#proof-signature-canvas");

  try {
    const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId);
    const stop = (routeView?.route?.stops ?? []).find((candidate) => candidate.id === stopId) ?? null;
    const photoUrls = await readFilesAsDataUrls(form.elements.photoFiles.files);
    if (photoUrls.length === 0) {
      showToast("At least one photo is required.", "error");
      return;
    }
    if (isProofSuccess(proofOutcomeCode) && (!signaturePadDirty || !canvas)) {
      showToast("A signature is required for a successful pickup or delivery.", "error");
      return;
    }
    if (!isProofSuccess(proofOutcomeCode) && !note) {
      showToast("Add a comment explaining why the stop failed or was refused.", "error");
      return;
    }
    if (isProofRefused(proofOutcomeCode) && photoUrls.length === 0) {
      showToast("A refusal requires a photo.", "error");
      return;
    }
    let position = carrierState.proofLocation;

    if (!position) {
      try {
        const coords = await getCurrentPosition();
        position = {
          lat: coords.lat,
          lon: coords.lon,
          label: `Lat ${coords.lat.toFixed(5)} / Lon ${coords.lon.toFixed(5)}`
        };
      } catch (_error) {
        const fallback = getFallbackPosition(routeView, stop);
        if (fallback) {
          position = {
            lat: fallback.lat,
            lon: fallback.lon,
            label: `Route position ${fallback.lat.toFixed(5)} / ${fallback.lon.toFixed(5)}`
          };
        }
      }
    }

    await postJson(`/carrier/stops/${stopId}/proof`, {
      deliveredAt: new Date().toISOString(),
      recipientName: form.elements.recipientName.value.trim() || null,
      proofOutcomeCode,
      signatureImageUrl: isProofSuccess(proofOutcomeCode) && canvas ? canvas.toDataURL("image/png") : null,
      photoUrls,
      failureReasonCode,
      note,
      latitude: position?.lat ?? null,
      longitude: position?.lon ?? null,
      locationLabel: position?.label ?? null
    });
    closeModal("carrier-proof");
    await refreshCarrier();
    carrierState.selectedRouteId = routeId;
    openModal("carrier-route");
    showToast(stop?.kind === "pickup" ? "Pickup proof saved." : "Delivery proof saved.");
  } catch (error) {
    showToast(`Unable to submit proof: ${error.message}`, "error");
  }
}

async function handleInboxSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = form.elements.body.value.trim();
  if (!body) {
    showToast("Write a message first.", "error");
    return;
  }

  try {
    const message = await postJson("/inbox/messages", {
      audience: "drivers",
      threadId: carrierState.driver.id,
      author: joinName(carrierState.driver.firstName, carrierState.driver.lastName) || carrierState.driver.name,
      body,
      senderType: "driver",
      senderId: carrierState.driver.id,
      createdAt: new Date().toISOString(),
      time: formatTime(new Date().toISOString())
    });
    carrierState.messages = [...carrierState.messages, message].sort((left, right) => String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")));
    form.reset();
    render();
    showToast("Message sent to ops.");
  } catch (error) {
    showToast(`Unable to send message: ${error.message}`, "error");
  }
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const photoUrls = await readFilesAsDataUrls(form.elements.vehiclePhotos.files);
    const payload = {
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      name: joinName(form.elements.firstName.value.trim(), form.elements.lastName.value.trim()),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      vehicleType: form.elements.vehicleType.value,
      skills: [...carrierState.accountSkillDraft],
      vehiclePhotoUrls: photoUrls.length > 0 ? [...(carrierState.driver.vehiclePhotoUrls ?? []), ...photoUrls] : carrierState.driver.vehiclePhotoUrls ?? [],
      carrierCompanyId: carrierState.driver.carrierCompanyId ?? null
    };

    const saved = await patchJson(`/fleet/drivers/${carrierState.driver.id}`, payload);
    carrierState.driver = { ...carrierState.driver, ...saved };
    carrierState.accountSkillDraft = [...(saved.skills ?? [])];
    await refreshCarrier();
    showToast("Driver profile updated.");
  } catch (error) {
    showToast(`Unable to save account: ${error.message}`, "error");
  }
}

function changeCalendarMonth(delta) {
  carrierState.calendarCursor = new Date(carrierState.calendarCursor.getFullYear(), carrierState.calendarCursor.getMonth() + delta, 1);
  render();
}

function handleCalendarOpen(dateKey) {
  carrierState.selectedCalendarDateKey = dateKey;
  const hasRoutes = getSortedRouteViews().some((routeView) => getRouteDateKey(routeView) === dateKey);
  render();
  if (hasRoutes) {
    openModal("carrier-day");
  }
}

async function captureProofLocation() {
  try {
    const coords = await getCurrentPosition();
    carrierState.proofLocation = {
      lat: coords.lat,
      lon: coords.lon,
      label: `Live position ${coords.lat.toFixed(5)} / ${coords.lon.toFixed(5)}`
    };
    const label = document.querySelector("#proof-location-label");
    if (label) {
      label.textContent = carrierState.proofLocation.label;
    }
    showToast("Current position attached.");
  } catch (error) {
    showToast(`Unable to capture location: ${error.message}`, "error");
  }
}

function clearSignature() {
  const canvas = document.querySelector("#proof-signature-canvas");
  const context = canvas?.getContext?.("2d");
  if (!canvas || !context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  signaturePadDirty = false;
}

function bindEvents() {
  document.querySelector("#carrier-login-form")?.addEventListener("submit", handleCarrierLogin);
  document.querySelector("#carrier-notification")?.addEventListener("click", openCarrierInboxFromNotification);
  document.querySelector("#carrier-refresh-button")?.addEventListener("click", () => refreshCarrier(true));
  document.querySelector("#carrier-logout-button")?.addEventListener("click", () => {
    logoutDriver();
    showToast("Carrier session closed.");
  });
  document.querySelector("#carrier-google-button")?.addEventListener("click", () => {
    setCarrierLoginStatus("Google Sign-In appears when the Google Client ID is configured and this domain is authorized.", "error");
    showToast("Google sign-in appears when a Google Client ID is configured.", "error");
  });

  document.addEventListener("click", async (event) => {
    const tabButton = event.target.closest("[data-carrier-tab]");
    if (tabButton) {
      carrierState.activeTab = tabButton.getAttribute("data-carrier-tab");
      render();
      return;
    }

    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      closeModal(`${closeButton.getAttribute("data-close-modal")}`);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }

    const action = actionButton.getAttribute("data-action");
    const routeId = actionButton.getAttribute("data-route-id");
    const stopId = actionButton.getAttribute("data-stop-id");

    if (action === "open-route") {
      carrierState.selectedRouteId = routeId;
      renderRouteModal();
      openModal("carrier-route");
      closeModal("carrier-day");
      return;
    }

    if (action === "start-route" && routeId) {
      await handleStartRoute(routeId);
      return;
    }

    if (action === "open-waze" && routeId) {
      const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId);
      const nextStop = routeView?.nextStop ?? routeView?.route?.stops?.find((stop) => stop.status === "pending");
      if (nextStop) {
        openWazeForAddress(nextStop.address);
      }
      return;
    }

    if (action === "open-stop-waze" && routeId && stopId) {
      const routeView = getSortedRouteViews().find((route) => route.route?.id === routeId);
      const stop = (routeView?.route?.stops ?? []).find((candidate) => candidate.id === stopId);
      if (stop) {
        openWazeForAddress(stop.address);
      }
      return;
    }

    if (action === "send-checkin" && routeId) {
      try {
        await sendCheckIn(routeId);
        await refreshCarrier();
        carrierState.selectedRouteId = routeId;
        openModal("carrier-route");
        showToast("Live position sent to ops.");
      } catch (error) {
        showToast(`Unable to share position: ${error.message}`, "error");
      }
      return;
    }

    if (action === "arrive-stop" && routeId && stopId) {
      await handleArriveStop(routeId, stopId);
      return;
    }

    if (action === "skip-stop" && routeId && stopId) {
      await handleSkipStop(routeId, stopId);
      return;
    }

    if (action === "open-proof" && routeId && stopId) {
      carrierState.proofContext = { routeId, stopId };
      carrierState.proofLocation = null;
      renderProofModal();
      openModal("carrier-proof");
      setupSignaturePad();
      return;
    }

    if (action === "capture-proof-location") {
      await captureProofLocation();
      return;
    }

    if (action === "clear-signature") {
      clearSignature();
      return;
    }

    if (action === "calendar-prev") {
      changeCalendarMonth(-1);
      return;
    }

    if (action === "calendar-next") {
      changeCalendarMonth(1);
      return;
    }

    if (action === "open-calendar-day") {
      handleCalendarOpen(actionButton.getAttribute("data-date-key"));
      return;
    }

    if (action === "toggle-account-tag") {
      const tagId = actionButton.getAttribute("data-tag-id");
      if (carrierState.accountSkillDraft.includes(tagId)) {
        carrierState.accountSkillDraft = carrierState.accountSkillDraft.filter((tag) => tag !== tagId);
      } else {
        carrierState.accountSkillDraft = [...carrierState.accountSkillDraft, tagId];
      }
      actionButton.classList.toggle("tag-toggle--active", carrierState.accountSkillDraft.includes(tagId));
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.matches("#carrier-inbox-form")) {
      handleInboxSubmit(event);
      return;
    }

    if (event.target.matches("#carrier-account-form")) {
      handleAccountSubmit(event);
      return;
    }

    if (event.target.matches("#carrier-proof-form")) {
      handleProofSubmit(event);
    }
  });
}

async function bootstrapCarrierApp() {
  bindEvents();
  setupGoogleIdentity();

  try {
    const restored = await restoreDriverFromSession();
    if (restored) {
      await refreshCarrier();
    }
  } catch (error) {
    clearSession();
    showToast(`Unable to restore carrier session: ${error.message}`, "error");
  }

  render();
}

bootstrapCarrierApp();
