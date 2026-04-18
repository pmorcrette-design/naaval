export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2));
}

export function sendNoContent(response, statusCode = 204) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
  });
  response.end();
}

export async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

export function badRequest(response, message) {
  sendJson(response, 400, {
    error: {
      code: "bad_request",
      message
    }
  });
}

export function notFound(response, message = "Resource not found") {
  sendJson(response, 404, {
    error: {
      code: "not_found",
      message
    }
  });
}

export function serverError(response, error) {
  sendJson(response, 500, {
    error: {
      code: "internal_error",
      message: error instanceof Error ? error.message : "Unexpected server error"
    }
  });
}

