import { clearSessionCookie } from "../_lib/auth.js";
import { allowMethods } from "../_lib/http.js";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
}
