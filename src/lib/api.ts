export interface ApiErrorBody {
  error?: string;
}

export async function readApiError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return data?.error ?? `Request failed (${res.status})`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}
