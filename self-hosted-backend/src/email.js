const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAndValidateEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return null;
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain || localPart.length > 64) return null;
  if (domain.endsWith(".local") || domain.endsWith(".test")) return null;
  return email;
}