const LS_KEY = "promptforge_settings";

function getApiKey(): string {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return (JSON.parse(raw) as { apiKey?: string }).apiKey ?? "";
  } catch {
    // ignore
  }
  return "";
}

export async function extractTextFromRegion(
  dataUrl: string,
  _apiKey?: string,
): Promise<string> {
  const apiKey = _apiKey ?? getApiKey();
  if (!apiKey) throw new Error("Set your API key in Settings first.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            {
              type: "text",
              text: "Extract all the text from this image exactly as written. Return only the text content, preserving paragraph breaks. Do not add commentary.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const data = await res
      .json()
      .catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(
      data?.error?.message ?? `OpenAI error ${res.status}: ${res.statusText}`,
    );
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
