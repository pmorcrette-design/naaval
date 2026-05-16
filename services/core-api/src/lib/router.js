import { notFound, sendNoContent, serverError } from "./http.js";

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

function tokenize(pathname) {
  return normalizePath(pathname)
    .split("/")
    .filter(Boolean);
}

function matchRoute(routeSegments, requestSegments) {
  if (routeSegments.length !== requestSegments.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const requestSegment = requestSegments[index];

    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
      continue;
    }

    if (routeSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

export function createRouter(context) {
  const routes = [];

  function register(method, path, handler) {
    routes.push({
      method,
      path,
      segments: tokenize(path),
      handler
    });
  }

  async function handle(request, response) {
    if (request.method === "OPTIONS") {
      sendNoContent(response);
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = normalizePath(url.pathname);
    const requestSegments = tokenize(pathname);

    for (const route of routes) {
      if (route.method !== request.method) {
        continue;
      }

      const params = matchRoute(route.segments, requestSegments);

      if (!params) {
        continue;
      }

      try {
        await route.handler(request, response, {
          ...context,
          params,
          url,
          query: Object.fromEntries(url.searchParams.entries())
        });
      } catch (error) {
        serverError(response, error);
      }

      return;
    }

    notFound(response);
  }

  return {
    get(path, handler) {
      register("GET", path, handler);
    },
    post(path, handler) {
      register("POST", path, handler);
    },
    patch(path, handler) {
      register("PATCH", path, handler);
    },
    delete(path, handler) {
      register("DELETE", path, handler);
    },
    handle
  };
}
