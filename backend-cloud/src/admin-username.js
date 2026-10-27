const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,62})[a-z0-9]$/;

export function normalizeAdminUsername(value) {
  const username = String(value || "")
    .trim()
    .toLowerCase();
  return usernamePattern.test(username) ? username : null;
}
