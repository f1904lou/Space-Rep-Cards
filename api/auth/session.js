import { hasValidSession } from "../_lib/auth.js";
import { allowMethods } from "../_lib/http.js";

export default function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  res.status(200).json({ authenticated: hasValidSession(req) });
}
