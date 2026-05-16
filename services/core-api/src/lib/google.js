function normalizeIssuer(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function verifyGoogleIdCredential(config, credential) {
  const googleClientId = String(config?.googleClientId ?? "").trim();
  const token = String(credential ?? "").trim();

  if (!googleClientId) {
    throw new Error("Google Sign-In is not configured on the API.");
  }

  if (!token) {
    throw new Error("Google credential is required.");
  }

  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", token);

  const response = await fetch(url, {
    method: "GET"
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok || !payload) {
    throw new Error(payload?.error_description || payload?.error || "Google token verification failed.");
  }

  if (String(payload.aud ?? "").trim() !== googleClientId) {
    throw new Error("Google token audience mismatch.");
  }

  const issuer = normalizeIssuer(payload.iss);
  if (issuer && issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") {
    throw new Error("Google token issuer mismatch.");
  }

  if (String(payload.email_verified ?? "").trim().toLowerCase() !== "true") {
    throw new Error("Google account email is not verified.");
  }

  return {
    subject: payload.sub ?? null,
    email: String(payload.email ?? "").trim().toLowerCase(),
    emailVerified: true,
    name: payload.name ?? "",
    firstName: payload.given_name ?? "",
    lastName: payload.family_name ?? "",
    picture: payload.picture ?? null
  };
}
