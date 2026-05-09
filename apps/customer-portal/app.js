const PORTAL_API_BASE_CANDIDATES = (() => {
  const candidates = [];

  if (window.location.protocol.startsWith("http")) {
    candidates.push(window.location.origin);
  }

  candidates.push("http://localhost:3001");
  return [...new Set(candidates)];
})();

const PORTAL_SESSION_KEY = "naaval.customer.portal.session";
const RECURRING_DAY_OPTIONS = [
  { code: "mon", short: "M", label: "Monday" },
  { code: "tue", short: "T", label: "Tuesday" },
  { code: "wed", short: "W", label: "Wednesday" },
  { code: "thu", short: "T", label: "Thursday" },
  { code: "fri", short: "F", label: "Friday" },
  { code: "sat", short: "S", label: "Saturday" },
  { code: "sun", short: "S", label: "Sunday" }
];

const portalState = {
  apiBaseUrl: "",
  customers: [],
  hubs: [],
  drivers: [],
  routes: [],
  orders: [],
  allRecurringRoutes: [],
  recurringRoutes: [],
  customer: null,
  session: null,
  activeTab: "new-order",
  selectedOrderId: null,
  toastTimer: null
};

let googleRetryTimer = null;
let portalLiveRefreshTimer = null;

function getPortalAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (portalState.session?.token) {
    headers.Authorization = `Bearer ${portalState.session.token}`;
  }
  return headers;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinNameParts(firstName, lastName) {
  return [firstName, lastName].map((chunk) => String(chunk ?? "").trim()).filter(Boolean).join(" ");
}

function initials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function formatDateLabel(value) {
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTimeLabel(value) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  return String(value);
}

function labelForAlgo(algoId) {
  const labels = {
    basic: "Basic Algo",
    pallet: "Palette",
    hours: "By Hours",
    drops: "By Drop"
  };
  return labels[algoId] ?? "Basic Algo";
}

function normalizeStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) {
    return "idle";
  }
  if (["delivered", "completed", "delivery_order_delivered"].includes(value)) {
    return "completed";
  }
  if (["delivery_failed", "delivery_refused_by_customer", "pickup_failed", "pickup_refused_by_tsp", "failed"].includes(value)) {
    return "failed";
  }
  if (value === "pickup_handed_over_to_tsp") {
    return "pickup_done";
  }
  if (value === "en_route_pickup" || value === "arrived") {
    return "en_route_pickup";
  }
  return value;
}

function labelForStatus(status) {
  const value = normalizeStatus(status);
  const labels = {
    ready: "Ready",
    planned: "Planned",
    dispatched: "Assigned",
    in_progress: "In Progress",
    completed: "Delivered",
    cancelled: "Cancelled",
    failed: "Failed",
    pickup_done: "Pickup Done",
    en_route_pickup: "Driver En Route",
    pickup_handed_over_to_tsp: "Handed Over to TSP",
    pickup_failed: "Failed Pickup",
    pickup_refused_by_tsp: "Refused by TSP",
    delivery_order_delivered: "Order Delivered",
    delivery_failed: "Failed",
    delivery_refused_by_customer: "Refused by Customer",
    idle: "Pending"
  };
  return labels[status] ?? labels[value] ?? value;
}

function labelForReasonCode(code) {
  const labels = {
    customer_absent: "Customer absent",
    damaged: "Damaged goods",
    access_issue: "Access issue",
    site_closed: "Site closed",
    wrong_address: "Wrong address",
    tsp_absent: "TSP unavailable",
    tsp_refusal: "TSP refusal",
    customer_refusal: "Customer refusal",
    quality_issue: "Quality issue",
    rejected: "Refused",
    other: "Other"
  };
  return labels[code] ?? String(code ?? "").replaceAll("_", " ");
}

function formatRecurringDays(codes = []) {
  const selected = RECURRING_DAY_OPTIONS.filter((option) => codes.includes(option.code));
  if (selected.length === 7) {
    return "Daily";
  }
  if (selected.length === 5 && !codes.includes("sat") && !codes.includes("sun")) {
    return "Weekdays";
  }
  return selected.map((option) => option.label).join(", ") || "Flexible";
}

function getNextRunLabel(codes = [], pickupTime = "08:00") {
  const selected = RECURRING_DAY_OPTIONS.find((option) => codes.includes(option.code));
  if (!selected) {
    return "Not scheduled";
  }
  return `${selected.label} ${pickupTime.replace(":", "h")}`;
}

function isPastOrder(order) {
  return ["completed", "cancelled", "failed"].includes(normalizeStatus(order.status));
}

function isLiveOrder(order) {
  return !isPastOrder(order);
}

function currentHubId() {
  return portalState.hubs[0]?.id || "hub_paris_central";
}

function createReference(prefix = "PORTAL") {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function showToast(message, type = "info") {
  const toast = document.querySelector("#portal-toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden", "toast--error");
  if (type === "error") {
    toast.classList.add("toast--error");
  }

  window.clearTimeout(portalState.toastTimer);
  portalState.toastTimer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 4200);
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

async function fetchJson(path) {
  const candidates = portalState.apiBaseUrl
    ? [portalState.apiBaseUrl, ...PORTAL_API_BASE_CANDIDATES.filter((baseUrl) => baseUrl !== portalState.apiBaseUrl)]
    : PORTAL_API_BASE_CANDIDATES;
  const errors = [];

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: getPortalAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      portalState.apiBaseUrl = baseUrl;
      return await response.json();
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

async function postJson(path, payload) {
  const candidates = portalState.apiBaseUrl
    ? [portalState.apiBaseUrl, ...PORTAL_API_BASE_CANDIDATES.filter((baseUrl) => baseUrl !== portalState.apiBaseUrl)]
    : PORTAL_API_BASE_CANDIDATES;
  const errors = [];

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: getPortalAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      portalState.apiBaseUrl = baseUrl;
      return await response.json();
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

async function deleteJson(path) {
  const candidates = portalState.apiBaseUrl
    ? [portalState.apiBaseUrl, ...PORTAL_API_BASE_CANDIDATES.filter((baseUrl) => baseUrl !== portalState.apiBaseUrl)]
    : PORTAL_API_BASE_CANDIDATES;
  const errors = [];

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: getPortalAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      portalState.apiBaseUrl = baseUrl;
      return response.status === 204 ? {} : await response.json();
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

function persistSession(session) {
  window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
}

function restoreSession() {
  try {
    const raw = window.localStorage.getItem(PORTAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(PORTAL_SESSION_KEY);
}

function getCustomerEmails(customer) {
  return [customer.companyEmail, customer.contactEmail]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function findCustomerByEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  return portalState.customers.find((customer) => getCustomerEmails(customer).includes(normalized)) ?? null;
}

function toAddressLabel(address) {
  if (!address) {
    return "Address pending";
  }
  return [address.label, address.street1, address.postalCode, address.city].filter(Boolean).join(", ");
}

function formDateTimeToIso(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildAddressFromFields(fields, prefix) {
  const street1 = fields[`${prefix}Street1`]?.value.trim();
  if (!street1) {
    return null;
  }

  return {
    label: fields[`${prefix}Label`]?.value.trim() || street1,
    street1,
    city: fields[`${prefix}City`]?.value.trim() || "",
    postalCode: fields[`${prefix}PostalCode`]?.value.trim() || "",
    countryCode: fields[`${prefix}CountryCode`]?.value.trim() || "FR",
    contactName: joinNameParts(fields[`${prefix}FirstName`]?.value, fields[`${prefix}LastName`]?.value),
    phone: fields[`${prefix}Phone`]?.value.trim() || "",
    email: fields[`${prefix}Email`]?.value.trim() || "",
    parcelSize: fields[`${prefix}ParcelSize`]?.value || "M",
    comment: fields[`${prefix}Comment`]?.value.trim() || ""
  };
}

function buildDropoffFromFields(fields, prefix, index) {
  const street1 = fields[`${prefix}Street1_${index}`]?.value.trim();
  if (!street1) {
    return null;
  }

  return {
    label: fields[`${prefix}Label_${index}`]?.value.trim() || street1,
    street1,
    city: fields[`${prefix}City_${index}`]?.value.trim() || "",
    postalCode: fields[`${prefix}PostalCode_${index}`]?.value.trim() || "",
    countryCode: fields[`${prefix}CountryCode_${index}`]?.value.trim() || "FR",
    contactName: joinNameParts(fields[`${prefix}FirstName_${index}`]?.value, fields[`${prefix}LastName_${index}`]?.value),
    phone: fields[`${prefix}Phone_${index}`]?.value.trim() || "",
    email: fields[`${prefix}Email_${index}`]?.value.trim() || "",
    parcelSize: fields[`${prefix}ParcelSize_${index}`]?.value || "M",
    comment: fields[`${prefix}Comment_${index}`]?.value.trim() || ""
  };
}

function buildDropoffCard(index, prefix, removeAction) {
  return `
    <article class="dropoff-card" data-drop-index="${index}">
      <div class="dropoff-card__header">
        <strong>Drop ${index + 1}</strong>
        ${index > 0 ? `<button class="ghost-button ghost-button--small" type="button" data-action="${removeAction}" data-drop-index="${index}">Remove</button>` : ""}
      </div>
      <div class="form-grid">
        <label class="field">
          <span>First Name</span>
          <input name="${prefix}FirstName_${index}" placeholder="Claire" />
        </label>

        <label class="field">
          <span>Last Name</span>
          <input name="${prefix}LastName_${index}" placeholder="Dubois" />
        </label>

        <label class="field field--wide">
          <span>Dropoff / Site</span>
          <input name="${prefix}Label_${index}" placeholder="Store, office, patient, client..." required />
        </label>

        <label class="field field--wide">
          <span>Address</span>
          <input name="${prefix}Street1_${index}" placeholder="25 Rue Example" required />
        </label>

        <label class="field">
          <span>City</span>
          <input name="${prefix}City_${index}" placeholder="Paris" />
        </label>

        <label class="field">
          <span>Postal Code</span>
          <input name="${prefix}PostalCode_${index}" placeholder="75017" />
        </label>

        <label class="field">
          <span>Country</span>
          <input name="${prefix}CountryCode_${index}" value="FR" />
        </label>

        <label class="field">
          <span>Phone</span>
          <input name="${prefix}Phone_${index}" placeholder="+33600000000" />
        </label>

        <label class="field">
          <span>Email</span>
          <input name="${prefix}Email_${index}" type="email" placeholder="client@dropoff.com" />
        </label>

        <label class="field">
          <span>Parcel Size</span>
          <select name="${prefix}ParcelSize_${index}">
            <option value="S">S</option>
            <option value="M" selected>M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
            <option value="Palette">Palette</option>
          </select>
        </label>

        <label class="field field--wide">
          <span>Comments</span>
          <textarea name="${prefix}Comment_${index}" rows="2" placeholder="Intercom, floor, access instructions..."></textarea>
        </label>
      </div>
    </article>
  `;
}

function ensureDropoffCards(listSelector, prefix, removeAction) {
  const list = document.querySelector(listSelector);
  if (list && list.children.length === 0) {
    list.innerHTML = buildDropoffCard(0, prefix, removeAction);
  }
}

function renumberDropoffCards(listSelector, removeAction) {
  const cards = [...document.querySelectorAll(`${listSelector} .dropoff-card`)];
  cards.forEach((card, index) => {
    card.setAttribute("data-drop-index", String(index));
    const title = card.querySelector(".dropoff-card__header strong");
    if (title) {
      title.textContent = `Drop ${index + 1}`;
    }
    const removeButton = card.querySelector(`[data-action='${removeAction}']`);
    if (removeButton) {
      removeButton.setAttribute("data-drop-index", String(index));
      removeButton.classList.toggle("hidden", index === 0);
    }
    card.querySelectorAll("[name]").forEach((field) => {
      const currentName = field.getAttribute("name");
      if (currentName) {
        field.setAttribute("name", currentName.replace(/_\d+$/, `_${index}`));
      }
    });
  });
}

function addDropoffCard(listSelector, prefix, removeAction) {
  const list = document.querySelector(listSelector);
  if (!list) {
    return;
  }
  list.insertAdjacentHTML("beforeend", buildDropoffCard(list.children.length, prefix, removeAction));
}

function removeDropoffCard(index, listSelector, removeAction) {
  document.querySelector(`${listSelector} .dropoff-card[data-drop-index="${index}"]`)?.remove();
  renumberDropoffCards(listSelector, removeAction);
}

function buildRecurringTemplateOrders(baseReference, basePayload, dropoffAddresses, pickupTimeLabel) {
  return dropoffAddresses.map((dropoffAddress, index) => ({
    reference: dropoffAddresses.length > 1 ? `${baseReference}-D${index + 1}` : baseReference,
    dropoffLabel: toAddressLabel(dropoffAddress),
    timeLabel: pickupTimeLabel,
    status: "planned",
    pickupAddress: basePayload.pickupAddress,
    dropoffAddress,
    pricingAlgorithmId: basePayload.pricingAlgorithmId,
    kind: index === 0 ? basePayload.kind : "delivery"
  }));
}

function updateRecurringDayUi() {
  const form = document.querySelector("#portal-recurring-form");
  if (!form) {
    return;
  }

  const selectedDays = new Set(
    String(form.elements.recurringDays?.value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

  document.querySelectorAll("#portal-recurring-days [data-action='toggle-recurring-day']").forEach((button) => {
    const isActive = selectedDays.has(button.getAttribute("data-day"));
    button.classList.toggle("weekday-pill--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncPortalOrderFormDefaults(force = false) {
  const form = document.querySelector("#portal-order-form");
  if (!form || !portalState.customer) {
    return;
  }

  form.elements.pricingAlgorithmId.value = portalState.customer.pricingAlgorithmId || "basic";
  if (force || !form.elements.pickupLabel.value.trim()) {
    form.elements.pickupLabel.value = portalState.customer.companyName || "";
  }
  if (force || !form.elements.pickupStreet1.value.trim()) {
    form.elements.pickupStreet1.value = portalState.customer.headquartersAddress || "";
  }
  if (force || !form.elements.pickupEmail.value.trim()) {
    form.elements.pickupEmail.value = portalState.customer.contactEmail || portalState.customer.companyEmail || "";
  }
  if (force || !form.elements.pickupPhone.value.trim()) {
    form.elements.pickupPhone.value = portalState.customer.contactPhone || portalState.customer.companyPhone || "";
  }
  if (force || !form.elements.pickupFirstName.value.trim()) {
    form.elements.pickupFirstName.value = portalState.customer.contactFirstName || "";
  }
  if (force || !form.elements.pickupLastName.value.trim()) {
    form.elements.pickupLastName.value = portalState.customer.contactLastName || "";
  }
}

function syncPortalRecurringFormDefaults(force = false) {
  const form = document.querySelector("#portal-recurring-form");
  if (!form || !portalState.customer) {
    return;
  }

  form.elements.pricingAlgorithmId.value = portalState.customer.pricingAlgorithmId || "basic";
  if (force || !form.elements.recurringPickupLabel.value.trim()) {
    form.elements.recurringPickupLabel.value = portalState.customer.companyName || "";
  }
  if (force || !form.elements.recurringPickupStreet1.value.trim()) {
    form.elements.recurringPickupStreet1.value = portalState.customer.headquartersAddress || "";
  }
  if (force || !form.elements.recurringPickupEmail.value.trim()) {
    form.elements.recurringPickupEmail.value = portalState.customer.contactEmail || portalState.customer.companyEmail || "";
  }
  if (force || !form.elements.recurringPickupPhone.value.trim()) {
    form.elements.recurringPickupPhone.value = portalState.customer.contactPhone || portalState.customer.companyPhone || "";
  }
  if (force || !form.elements.recurringPickupFirstName.value.trim()) {
    form.elements.recurringPickupFirstName.value = portalState.customer.contactFirstName || "";
  }
  if (force || !form.elements.recurringPickupLastName.value.trim()) {
    form.elements.recurringPickupLastName.value = portalState.customer.contactLastName || "";
  }
  if (force || !form.elements.recurringDays.value.trim()) {
    form.elements.recurringDays.value = "mon,tue,wed,thu,fri";
  }
  if (force || !form.elements.recurringPickupTime.value) {
    form.elements.recurringPickupTime.value = "08:00";
  }
  updateRecurringDayUi();
}

function openPortalModal(name) {
  document.querySelector(`#${name}-modal`)?.classList.remove("hidden");
  if (name === "portal-order") {
    document.querySelector("#portal-order-form")?.reset();
    const dropoffList = document.querySelector("#portal-dropoff-list");
    if (dropoffList) {
      dropoffList.innerHTML = "";
    }
    ensureDropoffCards("#portal-dropoff-list", "dropoff", "remove-drop");
    syncPortalOrderFormDefaults(true);
  }
  if (name === "portal-recurring") {
    document.querySelector("#portal-recurring-form")?.reset();
    const recurringDropoffList = document.querySelector("#portal-recurring-dropoff-list");
    if (recurringDropoffList) {
      recurringDropoffList.innerHTML = "";
    }
    ensureDropoffCards("#portal-recurring-dropoff-list", "recurringDropoff", "remove-recurring-drop");
    syncPortalRecurringFormDefaults(true);
  }
}

function closePortalModal(name) {
  document.querySelector(`#${name}-modal`)?.classList.add("hidden");
}

function coordinatesFromPoint(point) {
  if (Number.isFinite(point?.lat) && Number.isFinite(point?.lon)) {
    return point;
  }
  return null;
}

function projectPoint(point, bounds) {
  if (!point || !bounds) {
    return null;
  }

  const lonSpan = Math.max(0.0001, bounds.maxLon - bounds.minLon);
  const latSpan = Math.max(0.0001, bounds.maxLat - bounds.minLat);
  return {
    left: ((point.lon - bounds.minLon) / lonSpan) * 100,
    top: (1 - (point.lat - bounds.minLat) / latSpan) * 100
  };
}

function buildTrackedMap(addresses = [], livePosition = null, title = "Live delivery map") {
  const routePoints = addresses
    .map((address) => coordinatesFromPoint(address?.coordinates))
    .filter(Boolean);
  const livePoint = coordinatesFromPoint(livePosition);
  const allPoints = livePoint ? [...routePoints, livePoint] : routePoints;

  if (allPoints.length === 0) {
    return `<div class="portal-route-map"><div class="empty-state">No map coordinates available yet.</div></div>`;
  }

  const lats = allPoints.map((point) => point.lat);
  const lons = allPoints.map((point) => point.lon);
  const padding = 0.02;
  const bounds = {
    minLat: Math.min(...lats) - padding,
    maxLat: Math.max(...lats) + padding,
    minLon: Math.min(...lons) - padding,
    maxLon: Math.max(...lons) + padding
  };
  const bbox = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(",");
  const marker = routePoints.at(-1) ?? livePoint;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(
    `${marker.lat},${marker.lon}`
  )}`;
  const routePins = routePoints
    .map((point, index) => {
      const projected = projectPoint(point, bounds);
      if (!projected) {
        return "";
      }
      return `<span class="portal-route-map__pin ${index === 0 ? "portal-route-map__pin--start" : index === routePoints.length - 1 ? "portal-route-map__pin--end" : ""}" style="left:${projected.left}%; top:${projected.top}%;" aria-hidden="true"></span>`;
    })
    .join("");
  const liveProjected = projectPoint(livePoint, bounds);

  return `
    <div class="portal-route-map">
      <iframe title="${escapeHtml(title)}" loading="lazy" src="${src}"></iframe>
      <div class="portal-route-map__overlay" aria-hidden="true">
        ${routePins}
        ${
          liveProjected
            ? `<span class="portal-route-map__driver" style="left:${liveProjected.left}%; top:${liveProjected.top}%;"></span>`
            : ""
        }
      </div>
      ${
        livePoint
          ? `<span class="portal-route-map__badge">Driver live</span>`
          : `<span class="portal-route-map__badge portal-route-map__badge--muted">Awaiting live GPS</span>`
      }
    </div>
  `;
}

function buildAssignedDriverMap() {
  const routeByOrderId = new Map();
  for (const route of portalState.routes) {
    for (const stop of route.stops ?? []) {
      if (stop.orderId) {
        routeByOrderId.set(stop.orderId, route);
      }
    }
  }
  const driverById = new Map(portalState.drivers.map((driver) => [driver.id, driver]));

  return { routeByOrderId, driverById };
}

function enrichOrders(orders) {
  const { routeByOrderId, driverById } = buildAssignedDriverMap();
  return orders
    .map((order) => {
      const route = routeByOrderId.get(order.id);
      const driver = route?.driverId ? driverById.get(route.driverId) : null;
      const statusCode = order.status || "planned";
      return {
        ...order,
        statusCode,
        statusTone: normalizeStatus(statusCode),
        statusLabel: labelForStatus(statusCode),
        statusReason: order.statusReason || order.lastProofNote || "",
        statusReasonCode: order.statusReasonCode || "",
        statusReasonLabel: order.statusReasonLabel || (order.statusReasonCode ? labelForReasonCode(order.statusReasonCode) : ""),
        assignedDriverName: driver?.name || "",
        routeId: route?.id || null,
        routeStatus: route?.status || null,
        livePosition: order.lastKnownPosition || route?.lastKnownPosition || null,
        livePositionAt: order.lastKnownPositionAt || route?.lastHeartbeatAt || null,
        lastProofOutcomeLabel: order.lastProofOutcomeLabel || (statusCode ? labelForStatus(statusCode) : ""),
        proofPhotoUrls: order.lastProofPhotoUrls || [],
        stops: route?.stops || []
      };
    })
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
}

async function bootstrapPortalData() {
  const [
    customersResponse,
    hubsResponse,
    driversResponse,
    routesResponse,
    recurringRoutesResponse
  ] = await Promise.all([
    fetchJson("/customers"),
    fetchJson("/fleet/hubs").catch(() => ({ items: [] })),
    fetchJson("/fleet/drivers").catch(() => ({ items: [] })),
    fetchJson("/routes").catch(() => ({ items: [] })),
    fetchJson("/recurring-routes").catch(() => ({ items: [] }))
  ]);

  portalState.customers = customersResponse.items ?? [];
  portalState.hubs = hubsResponse.items ?? [];
  portalState.drivers = driversResponse.items ?? [];
  portalState.routes = routesResponse.items ?? [];
  portalState.allRecurringRoutes = recurringRoutesResponse.items ?? [];
}

async function loadOrdersForCurrentCustomer() {
  if (!portalState.customer) {
    portalState.orders = [];
    return;
  }

  const [byCustomerId, byMerchantId] = await Promise.all([
    fetchJson(`/orders?customerId=${encodeURIComponent(portalState.customer.id)}`).catch(() => ({ items: [] })),
    fetchJson(`/orders?merchantId=${encodeURIComponent(portalState.customer.companyName)}`).catch(() => ({ items: [] }))
  ]);

  const byId = new Map();
  for (const order of [...(byCustomerId.items ?? []), ...(byMerchantId.items ?? [])]) {
    byId.set(order.id, order);
  }

  portalState.orders = enrichOrders([...byId.values()]);
  if (!portalState.orders.some((order) => order.id === portalState.selectedOrderId)) {
    portalState.selectedOrderId = portalState.orders[0]?.id ?? null;
  }
}

function syncRecurringRoutesForCurrentCustomer() {
  if (!portalState.customer) {
    portalState.recurringRoutes = [];
    return;
  }

  const companyName = String(portalState.customer.companyName ?? "").trim().toLowerCase();
  portalState.recurringRoutes = [...portalState.allRecurringRoutes]
    .filter((route) => {
      const routeCustomerId = String(route.customerId ?? "").trim();
      const routeMerchantId = String(route.merchantId ?? "").trim().toLowerCase();
      return routeCustomerId === portalState.customer.id || routeMerchantId === companyName;
    })
    .sort((left, right) => String(right.updatedAt ?? right.createdAt ?? "").localeCompare(String(left.updatedAt ?? left.createdAt ?? "")));
}

function loginCustomer(customer, source = "email") {
  portalState.customer = customer;
  portalState.session = {
    customerId: customer.id,
    tenantId: customer.tenantId || customer.companyId || null,
    email: customer.contactEmail || customer.companyEmail || "",
    token: customer.token || null,
    source
  };
  persistSession(portalState.session);
}

function logoutCustomer() {
  portalState.customer = null;
  portalState.session = null;
  portalState.orders = [];
  portalState.recurringRoutes = [];
  clearSession();
  window.google?.accounts?.id?.disableAutoSelect?.();
  renderPortal();
  setupGoogleIdentity();
}

function renderOrderCards(targetId, orders, emptyMessage) {
  const container = document.querySelector(targetId);
  if (!container) {
    return;
  }

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  container.innerHTML = orders
    .map((order) => {
      const pickup = order.pickupAddress?.label || order.pickupAddress?.street1 || "Pickup pending";
      const dropoff = order.dropoffAddress?.label || order.dropoffAddress?.street1 || "Dropoff pending";
      const driverLine = order.assignedDriverName
        ? `<div class="portal-order__driver">👤 ${escapeHtml(order.assignedDriverName)}</div>`
        : `<div class="portal-order__driver portal-order__driver--muted">👤 Driver not assigned yet</div>`;
      const reasonLine = order.statusReason
        ? `<div class="portal-order__reason">Reason: ${escapeHtml(order.statusReason)}</div>`
        : order.statusReasonLabel
          ? `<div class="portal-order__reason">Reason: ${escapeHtml(order.statusReasonLabel)}</div>`
          : "";
      const liveLine = order.livePositionAt
        ? `<div class="portal-order__live">📍 Driver live ${escapeHtml(formatDateLabel(order.livePositionAt))}</div>`
        : "";

      return `
        <article class="portal-order">
          <div class="portal-order__top">
            <div class="portal-order__copy">
              <strong>${escapeHtml(order.reference || order.id)}</strong>
              <span>${escapeHtml(pickup)} → ${escapeHtml(dropoff)}</span>
            </div>
            <span class="status-chip" data-status="${escapeHtml(order.statusTone)}">${escapeHtml(order.statusLabel)}</span>
          </div>
          ${driverLine}
          ${liveLine}
          ${reasonLine}
          <div class="portal-order__meta">
            <span>📦 ${escapeHtml(order.parcelSize || order.dropoffAddress?.parcelSize || "M")}</span>
            <span>🗓️ ${escapeHtml(formatDateLabel(order.createdAt))}</span>
            <span>⚙️ ${escapeHtml(labelForAlgo(order.pricingAlgorithmId || "basic"))}</span>
            <span>🚏 ${escapeHtml(labelForStatus(order.routeStatus || order.statusCode))}</span>
            ${order.routeId ? `<span>🧭 ${escapeHtml(order.routeId)}</span>` : ""}
          </div>
          <div class="portal-order__actions">
            <button class="ghost-button ghost-button--small" type="button" data-action="open-order-detail" data-order-id="${order.id}">Track Order</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSelectedOrderDetail() {
  const container = document.querySelector("#portal-order-detail-modal-content");
  if (!container) {
    return;
  }

  const order = portalState.orders.find((candidate) => candidate.id === portalState.selectedOrderId) ?? null;
  if (!order) {
    container.innerHTML = `<div class="empty-state">No order selected.</div>`;
    return;
  }

  const proofReason = order.statusReason || order.statusReasonLabel || "No incident reported";
  container.innerHTML = `
    <p class="eyebrow">Customer Portal</p>
    <h3 class="modal__title">Order Tracking</h3>
    <p class="modal__subtitle">Follow the assigned driver, the current status, and the last proof captured in the field.</p>

    <div class="portal-order-detail">
      <div class="portal-order-detail__head">
        <div>
          <strong>${escapeHtml(order.reference || order.id)}</strong>
          <p>${escapeHtml(order.pickupAddress?.label || order.pickupAddress?.street1 || "Pickup")} → ${escapeHtml(order.dropoffAddress?.label || order.dropoffAddress?.street1 || "Dropoff")}</p>
        </div>
        <span class="status-chip" data-status="${escapeHtml(order.statusTone)}">${escapeHtml(order.statusLabel)}</span>
      </div>

      ${buildTrackedMap([order.pickupAddress, order.dropoffAddress], order.livePosition, `${order.reference || order.id} live map`)}

      <div class="portal-order-detail__grid">
        <div class="portal-order-detail__card">
          <span>Assigned Driver</span>
          <strong>${escapeHtml(order.assignedDriverName || "Pending assignment")}</strong>
        </div>
        <div class="portal-order-detail__card">
          <span>Live Position</span>
          <strong>${escapeHtml(order.livePositionAt ? formatDateLabel(order.livePositionAt) : "Waiting for GPS")}</strong>
        </div>
        <div class="portal-order-detail__card">
          <span>Last Proof</span>
          <strong>${escapeHtml(order.lastProofOutcomeLabel || "Pending")}</strong>
        </div>
        <div class="portal-order-detail__card">
          <span>Reason</span>
          <strong>${escapeHtml(proofReason)}</strong>
        </div>
      </div>

      ${
        order.proofPhotoUrls?.length
          ? `
            <div class="portal-order-detail__photos">
              ${order.proofPhotoUrls.slice(0, 3).map((url) => `<img src="${escapeHtml(url)}" alt="Proof" />`).join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderRecurringRoutes() {
  const container = document.querySelector("#portal-recurring-routes");
  if (!container) {
    return;
  }

  if (portalState.recurringRoutes.length === 0) {
    container.innerHTML = `<div class="empty-state">No recurring delivery yet. Create your first recurring template from this tab.</div>`;
    return;
  }

  container.innerHTML = portalState.recurringRoutes
    .map((route) => {
      const days = route.recurringDays ?? [];
      return `
        <article class="portal-order portal-order--recurring">
          <div class="portal-order__top">
            <div class="portal-order__copy">
              <strong>${escapeHtml(route.label || route.reference || route.id)}</strong>
              <span>${escapeHtml(route.pickupAddress?.label || route.pickupAddress?.street1 || "Pickup pending")}</span>
            </div>
            <span class="status-chip" data-status="${escapeHtml(normalizeStatus(route.status))}">${escapeHtml(labelForStatus(route.status || "planned"))}</span>
          </div>
          <div class="portal-order__meta">
            <span>🔁 ${escapeHtml(formatRecurringDays(days))}</span>
            <span>⏰ ${escapeHtml(route.pickupTime || "08:00")}</span>
            <span>📍 ${route.stopCount ?? route.orders?.length ?? 0} stops</span>
            <span>⚙️ ${escapeHtml(labelForAlgo(route.pricingAlgorithmId || "basic"))}</span>
            <span>👤 ${escapeHtml(route.driverName || "Unassigned")}</span>
          </div>
          <div class="portal-order__meta">
            <span>Next run: ${escapeHtml(route.nextRunLabel || getNextRunLabel(days, route.pickupTime || "08:00"))}</span>
          </div>
          <div class="portal-order__actions">
            <button class="ghost-button ghost-button--small" type="button" data-action="delete-recurring-route" data-recurring-id="${route.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMetrics() {
  const orders = portalState.orders;
  const live = orders.filter(isLiveOrder).length;
  const delivered = orders.filter((order) => normalizeStatus(order.status) === "completed").length;

  document.querySelector("#metric-orders").textContent = String(orders.length);
  document.querySelector("#metric-live").textContent = String(live);
  document.querySelector("#metric-delivered").textContent = String(delivered);
  document.querySelector("#metric-algo").textContent = labelForAlgo(portalState.customer?.pricingAlgorithmId || "basic");
}

function renderTabs() {
  document.querySelectorAll("[data-portal-tab]").forEach((button) => {
    button.classList.toggle("portal-tab--active", button.getAttribute("data-portal-tab") === portalState.activeTab);
  });

  document.querySelectorAll("[data-portal-panel]").forEach((panel) => {
    panel.classList.toggle("portal-panel--active", panel.getAttribute("data-portal-panel") === portalState.activeTab);
  });
}

function renderPortal() {
  const loginGate = document.querySelector("#portal-login");
  const shell = document.querySelector("#portal-shell");
  const title = document.querySelector("#portal-title");
  const subtitle = document.querySelector("#portal-subtitle");

  const isAuthenticated = Boolean(portalState.customer);
  loginGate?.classList.toggle("hidden", isAuthenticated);
  shell?.classList.toggle("hidden", !isAuthenticated);

  if (!isAuthenticated) {
    return;
  }

  title.textContent = `${portalState.customer.companyName}`;
  subtitle.textContent = `Create a delivery request for ${portalState.customer.companyName}, manage recurring jobs, and monitor the courier assigned from Naaval ops.`;

  renderMetrics();
  renderTabs();

  const liveOrders = portalState.orders.filter(isLiveOrder);
  const pastOrders = portalState.orders.filter(isPastOrder);
  renderOrderCards("#portal-live-orders", liveOrders, "No active delivery yet. Create a new order to start the flow.");
  renderOrderCards("#portal-past-orders", pastOrders, "No completed delivery yet for this account.");
  renderRecurringRoutes();
  renderSelectedOrderDetail();
}

async function refreshPortal(showMessage = false) {
  try {
    await bootstrapPortalData();

    if (portalState.session?.customerId) {
      portalState.customer = portalState.customers.find((customer) => customer.id === portalState.session.customerId) ?? null;
    }

    if (portalState.customer) {
      await loadOrdersForCurrentCustomer();
      syncRecurringRoutesForCurrentCustomer();
    }

    renderPortal();
    if (showMessage) {
      showToast("Portal refreshed.");
    }
  } catch (error) {
    showToast(`Unable to load portal data: ${error.message}`, "error");
  }
}

function syncPortalLiveRefreshLoop() {
  if (portalLiveRefreshTimer) {
    window.clearInterval(portalLiveRefreshTimer);
    portalLiveRefreshTimer = null;
  }

  portalLiveRefreshTimer = window.setInterval(() => {
    if (!portalState.customer) {
      return;
    }
    void refreshPortal(false);
  }, 15000);
}

async function handlePortalLogin(event) {
  event.preventDefault();

  const email = event.currentTarget.elements.email.value.trim().toLowerCase();
  if (!email) {
    showToast("Email is required.", "error");
    return;
  }

  try {
    const session = await postJson("/auth/customer-login", { email });
    loginCustomer(
      {
        id: session.customerId,
        tenantId: session.tenantId,
        contactEmail: session.email,
        companyEmail: session.email,
        companyName: session.tenant?.companyName || session.name,
        token: session.token
      },
      "email"
    );
    await bootstrapPortalData();
    portalState.customer = portalState.customers.find((customer) => customer.id === session.customerId) ?? portalState.customer;
    await loadOrdersForCurrentCustomer();
    syncRecurringRoutesForCurrentCustomer();
    renderPortal();
    showToast(`Welcome to the portal, ${portalState.customer?.companyName || session.name}.`);
  } catch (error) {
    showToast(`Unable to open portal: ${error.message}`, "error");
  }
}

async function handlePortalOrderSubmit(event) {
  event.preventDefault();

  if (!portalState.customer) {
    showToast("You must be logged in to create an order.", "error");
    return;
  }

  const form = event.currentTarget;
  const fields = form.elements;
  const pickupAddress = buildAddressFromFields(fields, "pickup");
  const dropIndexes = [...form.querySelectorAll(".dropoff-card")]
    .map((card) => Number.parseInt(card.getAttribute("data-drop-index"), 10))
    .filter((value) => Number.isFinite(value));
  const dropoffs = dropIndexes.map((index) => buildDropoffFromFields(fields, "dropoff", index)).filter(Boolean);

  if (!pickupAddress) {
    showToast("Pickup address is required.", "error");
    return;
  }

  if (dropoffs.length === 0) {
    showToast("At least one dropoff is required.", "error");
    return;
  }

  const reference = fields.reference.value.trim() || createReference("PORTAL");
  const timeWindowStart = formDateTimeToIso(fields.timeWindowStart.value);
  const timeWindowEnd = formDateTimeToIso(fields.timeWindowEnd.value);
  const basePayload = {
    merchantId: portalState.customer.companyName,
    customerId: portalState.customer.id,
    hubId: currentHubId(),
    kind: fields.kind.value,
    pricingAlgorithmId: fields.pricingAlgorithmId.value,
    source: "customer_portal",
    sourceLabel: "Customer Portal",
    pickupAddress,
    parcelSize: pickupAddress.parcelSize || "M",
    serviceDurationSeconds: 300,
    parcelCount: 1,
    weightKg: 0,
    volumeDm3: 0,
    notes: fields.notes.value.trim(),
    timeWindows:
      timeWindowStart && timeWindowEnd
        ? [
            {
              start: timeWindowStart,
              end: timeWindowEnd
            }
          ]
        : []
  };

  try {
    for (const [index, dropoffAddress] of dropoffs.entries()) {
      await postJson("/orders", {
        ...basePayload,
        reference: dropoffs.length > 1 ? `${reference}-D${index + 1}` : reference,
        kind: index === 0 ? fields.kind.value : "delivery",
        dropoffAddress,
        parcelSize: dropoffAddress.parcelSize || basePayload.parcelSize
      });
    }

    form.reset();
    document.querySelector("#portal-dropoff-list").innerHTML = "";
    ensureDropoffCards("#portal-dropoff-list", "dropoff", "remove-drop");
    syncPortalOrderFormDefaults(true);
    closePortalModal("portal-order");
    await refreshPortal();
    portalState.activeTab = "new-order";
    renderPortal();
    showToast(`${dropoffs.length} order(s) created and sent to Naaval ops.`);
  } catch (error) {
    showToast(`Unable to create order: ${error.message}`, "error");
  }
}

function buildRecurringRoutePayloadFromForm(form) {
  const fields = form.elements;
  const pickupAddress = buildAddressFromFields(fields, "recurringPickup");
  const dropIndexes = [...form.querySelectorAll(".dropoff-card")]
    .map((card) => Number.parseInt(card.getAttribute("data-drop-index"), 10))
    .filter((value) => Number.isFinite(value));
  const dropoffAddresses = dropIndexes.map((index) => buildDropoffFromFields(fields, "recurringDropoff", index)).filter(Boolean);

  if (!pickupAddress) {
    throw new Error("Pickup address is required.");
  }

  if (dropoffAddresses.length === 0) {
    throw new Error("At least one dropoff address is required.");
  }

  const recurringDays = String(fields.recurringDays.value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (recurringDays.length === 0) {
    throw new Error("Select at least one recurring day.");
  }

  const pickupTime = fields.recurringPickupTime.value;
  if (!pickupTime) {
    throw new Error("Pickup time is required.");
  }

  const reference = fields.reference.value.trim() || createReference("RR");
  const label = fields.recurringLabel.value.trim() || reference;
  const pickupTimeLabel = pickupTime.replace(":", "h");
  const basePayload = {
    merchantId: portalState.customer.companyName,
    customerId: portalState.customer.id,
    hubId: currentHubId(),
    kind: fields.kind.value,
    pricingAlgorithmId: fields.pricingAlgorithmId.value,
    pickupAddress,
    note: fields.notes.value.trim(),
    pickupTime
  };
  const orders = buildRecurringTemplateOrders(reference, basePayload, dropoffAddresses, pickupTimeLabel);
  const hubLabel = portalState.hubs.find((hub) => hub.id === basePayload.hubId)?.label ?? "Central Hub";

  return {
    reference,
    label,
    source: "customer_portal",
    customerId: portalState.customer.id,
    recurringDays,
    frequency: formatRecurringDays(recurringDays),
    pickupTime,
    windowLabel: `${pickupTimeLabel} pickup`,
    nextRunLabel: getNextRunLabel(recurringDays, pickupTime),
    hubId: basePayload.hubId,
    hubLabel,
    merchantId: basePayload.merchantId,
    kind: basePayload.kind,
    pricingAlgorithmId: basePayload.pricingAlgorithmId,
    pickupAddress,
    dropoffAddresses,
    driverName: "Unassigned",
    vehicleLabel: "Pending assignment",
    stopCount: orders.length,
    customerCount: new Set(orders.map((order) => order.dropoffLabel)).size,
    status: "planned",
    tags: [
      `🔁 ${formatRecurringDays(recurringDays)}`,
      `⏱️ ${pickupTimeLabel}`,
      `⚙️ ${labelForAlgo(basePayload.pricingAlgorithmId)}`
    ],
    note: basePayload.note || "Recurring delivery template created from customer portal.",
    orders
  };
}

async function handlePortalRecurringSubmit(event) {
  event.preventDefault();

  if (!portalState.customer) {
    showToast("You must be logged in to create a recurring delivery.", "error");
    return;
  }

  try {
    const payload = buildRecurringRoutePayloadFromForm(event.currentTarget);
    await postJson("/recurring-routes", payload);
    event.currentTarget.reset();
    document.querySelector("#portal-recurring-dropoff-list").innerHTML = "";
    ensureDropoffCards("#portal-recurring-dropoff-list", "recurringDropoff", "remove-recurring-drop");
    syncPortalRecurringFormDefaults(true);
    closePortalModal("portal-recurring");
    portalState.activeTab = "recurring-delivery";
    await refreshPortal();
    renderPortal();
    showToast(`Recurring delivery ${payload.label} created in ops.`);
  } catch (error) {
    showToast(`Unable to create recurring delivery: ${error.message}`, "error");
  }
}

async function deleteRecurringRoute(routeId) {
  try {
    await deleteJson(`/recurring-routes/${routeId}`);
    await refreshPortal();
    renderPortal();
    showToast("Recurring delivery deleted.");
  } catch (error) {
    showToast(`Unable to delete recurring delivery: ${error.message}`, "error");
  }
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

function getConfigValue(key) {
  return window[key];
}

function setupGoogleIdentity(retryCount = 0) {
  const slot = document.querySelector("#portal-google-slot");
  const fallbackButton = document.querySelector("#portal-google-button");
  const clientId = getConfigValue("NAAVAL_GOOGLE_CLIENT_ID");

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
        showToast("Google login failed.", "error");
        return;
      }

      const session = await postJson("/auth/customer-login", { email: payload.email });
      loginCustomer(
        {
          id: session.customerId,
          tenantId: session.tenantId,
          contactEmail: session.email,
          companyEmail: session.email,
          companyName: session.tenant?.companyName || session.name,
          token: session.token
        },
        "google"
      );
      await bootstrapPortalData();
      portalState.customer = portalState.customers.find((customer) => customer.id === session.customerId) ?? portalState.customer;
      await loadOrdersForCurrentCustomer();
      syncRecurringRoutesForCurrentCustomer();
      renderPortal();
      showToast(`Google login successful for ${portalState.customer?.companyName || session.name}.`);
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

function bindEvents() {
  document.querySelector("#portal-login-form")?.addEventListener("submit", handlePortalLogin);
  document.querySelector("#portal-order-form")?.addEventListener("submit", handlePortalOrderSubmit);
  document.querySelector("#portal-recurring-form")?.addEventListener("submit", handlePortalRecurringSubmit);
  document.querySelector("#portal-refresh-button")?.addEventListener("click", () => refreshPortal(true));
  document.querySelector("#portal-logout-button")?.addEventListener("click", () => {
    logoutCustomer();
    showToast("Portal session closed.");
  });
  document.querySelector("#portal-google-button")?.addEventListener("click", () => {
    showToast("Google button is available when the Google client ID is configured.", "error");
  });
  document.querySelector("#portal-add-drop")?.addEventListener("click", () => addDropoffCard("#portal-dropoff-list", "dropoff", "remove-drop"));
  document.querySelector("#portal-recurring-add-drop")?.addEventListener("click", () =>
    addDropoffCard("#portal-recurring-dropoff-list", "recurringDropoff", "remove-recurring-drop")
  );

  document.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-portal-tab]");
    if (tabButton) {
      portalState.activeTab = tabButton.getAttribute("data-portal-tab") || "new-order";
      renderPortal();
      return;
    }

    const openModalButton = event.target.closest("[data-open-modal]");
    if (openModalButton) {
      openPortalModal(openModalButton.getAttribute("data-open-modal"));
      return;
    }

    const orderDetailButton = event.target.closest("[data-action='open-order-detail']");
    if (orderDetailButton) {
      portalState.selectedOrderId = orderDetailButton.getAttribute("data-order-id");
      renderSelectedOrderDetail();
      openPortalModal("portal-order-detail");
      return;
    }

    const closeModalButton = event.target.closest("[data-close-modal]");
    if (closeModalButton) {
      closePortalModal(closeModalButton.getAttribute("data-close-modal"));
      return;
    }

    const removeButton = event.target.closest("[data-action='remove-drop']");
    if (removeButton) {
      removeDropoffCard(Number.parseInt(removeButton.getAttribute("data-drop-index"), 10), "#portal-dropoff-list", "remove-drop");
      return;
    }

    const removeRecurringButton = event.target.closest("[data-action='remove-recurring-drop']");
    if (removeRecurringButton) {
      removeDropoffCard(
        Number.parseInt(removeRecurringButton.getAttribute("data-drop-index"), 10),
        "#portal-recurring-dropoff-list",
        "remove-recurring-drop"
      );
      return;
    }

    const recurringDayButton = event.target.closest("[data-action='toggle-recurring-day']");
    if (recurringDayButton) {
      const form = document.querySelector("#portal-recurring-form");
      if (!form) {
        return;
      }
      const day = recurringDayButton.getAttribute("data-day");
      const current = new Set(
        String(form.elements.recurringDays.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      );
      if (current.has(day)) {
        current.delete(day);
      } else {
        current.add(day);
      }
      form.elements.recurringDays.value = RECURRING_DAY_OPTIONS.map((option) => option.code).filter((code) => current.has(code)).join(",");
      updateRecurringDayUi();
      return;
    }

    const deleteRecurringButton = event.target.closest("[data-action='delete-recurring-route']");
    if (deleteRecurringButton) {
      deleteRecurringRoute(deleteRecurringButton.getAttribute("data-recurring-id"));
    }
  });
}

async function initialize() {
  bindEvents();
  syncPortalLiveRefreshLoop();
  ensureDropoffCards("#portal-dropoff-list", "dropoff", "remove-drop");
  ensureDropoffCards("#portal-recurring-dropoff-list", "recurringDropoff", "remove-recurring-drop");

  const session = restoreSession();
  if (session) {
    portalState.session = session;
  }

  if (portalState.session?.token) {
    await refreshPortal();
  } else {
    renderPortal();
  }
  setupGoogleIdentity();
}

initialize();
