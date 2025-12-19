// --- Simple client-side gate (privacy, not security) ---

const TOKEN_KEY = "printui.auth.v1";
const ATTEMPTS_KEY = "printui.auth.attempts.v1";

// Your salted hash and salt:
const LOGIN_HASH = "eb322645958df2fd5fea89f34dfdfdeef2917beed47edc602c79d55497c7e99d";
const SALT = "print-ui-v1"; // same salt you used when hashing

async function sha256Hex(s) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(input) {
  // Light rate-limit (in-browser only)
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]")
    .filter((t) => now - t < 10 * 60 * 1000);
  if (attempts.length >= 20)
    return { ok: false, error: "Too many attempts. Try again later." };

  const hash = await sha256Hex(`${SALT}:${input}`);
  const ok = hash === LOGIN_HASH;

  attempts.push(now);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));

  if (ok) {
    sessionStorage.setItem(TOKEN_KEY, "ok");
    return { ok: true };
  }
  return { ok: false, error: "Invalid password" };
}

export function isAuthed() {
  return sessionStorage.getItem(TOKEN_KEY) === "ok";
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
}
