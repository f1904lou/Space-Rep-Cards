export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: "Method not allowed" });
  return false;
}

export function missingEnv(res, name) {
  res.status(500).json({ error: `${name} is not configured` });
}

export function providerError(data, fallback) {
  if (data?.error?.message) return data.error.message;
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(", ");
  }
  return fallback;
}
