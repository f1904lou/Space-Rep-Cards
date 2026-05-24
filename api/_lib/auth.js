import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "src_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("APP_SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionCookie(req) {
  const expiresAt = Math.floor(Date.now() / 1000) + THIRTY_DAYS;
  const payload = base64url(JSON.stringify({ exp: expiresAt }));
  const token = `${payload}.${sign(payload)}`;
  const secure =
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.VERCEL_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${THIRTY_DAYS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export function hasValidSession(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;

    const [payload, signature] = token.split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) {
      return false;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.exp === "number" && parsed.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function requireSession(req, res) {
  if (hasValidSession(req)) return true;
  res.status(401).json({ error: "Authentication required" });
  return false;
}

export function isValidPasscode(passcode) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) throw new Error("APP_PASSCODE is not configured");
  if (typeof passcode !== "string") return false;
  return safeEqual(passcode, expected);
}
