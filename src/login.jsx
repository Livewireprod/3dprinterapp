import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyPassword, isAuthed } from "./auth";

export default function Login() {
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await verifyPassword(pwd);
    setBusy(false);
    if (res.ok) {
      nav("/", { replace: true });
    } else {
      setErr(res.error || "Login failed");
    }
  }

  if (isAuthed()) {
    nav("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-2xl p-6 shadow"
      >
        <h1 className="text-xl font-semibold">Sign in</h1>
        <label className="block text-sm">
          Password
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            autoFocus
          />
        </label>
        {err && <p className="text-sm" style={{ color: "#b91c1c" }}>{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2.5 font-semibold border"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
