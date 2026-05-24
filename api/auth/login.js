import {
  createSessionCookie,
  isValidPasscode,
} from "../_lib/auth.js";
import { allowMethods } from "../_lib/http.js";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    if (!isValidPasscode(req.body?.passcode)) {
      res.status(401).json({ error: "Invalid passcode" });
      return;
    }

    res.setHeader("Set-Cookie", createSessionCookie(req));
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Login failed",
    });
  }
}
