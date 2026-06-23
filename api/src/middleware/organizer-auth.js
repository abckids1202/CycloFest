import { getOrganizerSession } from "../modules/auth/auth.service.js";

export function readBearerToken(request) {
  const authorization = request.get("Authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireOrganizer(request, _response, next) {
  try {
    const token = readBearerToken(request);
    if (!token) {
      const error = new Error("Organizer login is required.");
      error.statusCode = 401;
      error.code = "ORGANIZER_AUTH_REQUIRED";
      throw error;
    }

    const session = await getOrganizerSession(token);

    if (!session) {
      const error = new Error("Organizer login is required.");
      error.statusCode = 401;
      error.code = "ORGANIZER_AUTH_REQUIRED";
      throw error;
    }

    request.organizer = session;
    request.organizerToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission) {
  return function permissionMiddleware(request, _response, next) {
    const memberships = request.organizer?.memberships ?? [];
    const matchingMembership = memberships.find(
      (membership) =>
        membership.permissions.includes("*") ||
        membership.permissions.includes(permission)
    );

    if (!matchingMembership) {
      const error = new Error(`Organizer permission '${permission}' is required.`);
      error.statusCode = 403;
      error.code = "ORGANIZER_PERMISSION_DENIED";
      next(error);
      return;
    }

    request.organizerMembership = matchingMembership;
    next();
  };
}