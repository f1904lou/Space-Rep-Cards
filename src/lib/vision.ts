import { apiFetch, readApiError } from "./api";

export async function extractTextFromRegion(
  dataUrl: string,
): Promise<string> {
  const res = await apiFetch("/api/openai/chat", {
    method: "POST",
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
    throw new Error(await readApiError(res));
  }

  const data = (await res.json()) as { content?: string };
  return data.content ?? "";
}
