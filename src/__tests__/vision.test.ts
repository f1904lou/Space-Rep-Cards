import { describe, it, expect, vi, afterEach } from "vitest";
import { extractTextFromRegion } from "../lib/vision";

const TEST_DATA_URL = "data:image/jpeg;base64,/9j/fakeimagedata";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("extractTextFromRegion", () => {
  it("sends the correct payload to the server-side OpenAI endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: "Some extracted text" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await extractTextFromRegion(TEST_DATA_URL);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("/api/openai/chat");
    expect(options.credentials).toBe("include");

    const body = JSON.parse(options.body as string) as {
      model: string;
      messages: {
        role: string;
        content: { type: string; image_url?: { url: string }; text?: string }[];
      }[];
    };

    // Always uses gpt-4o regardless of settings
    expect(body.model).toBe("gpt-4o");

    const content = body.messages[0].content;
    // First content item is the image
    expect(content[0].type).toBe("image_url");
    expect(content[0].image_url?.url).toBe(TEST_DATA_URL);
    // Second content item is the text extraction prompt
    expect(content[1].type).toBe("text");
    expect(content[1].text).toContain("Extract all the text");
  });

  it("returns the extracted text from a successful response", async () => {
    const expectedText = "Chapter 1\n\nIn the beginning there was light.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: expectedText }),
      }),
    );

    const result = await extractTextFromRegion(TEST_DATA_URL);

    expect(result).toBe(expectedText);
  });

  it("throws with the server error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Authentication required" }),
      }),
    );

    await expect(
      extractTextFromRegion(TEST_DATA_URL),
    ).rejects.toThrow("Authentication required");
  });

  it("throws a fallback message when non-ok response has no error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      }),
    );

    await expect(
      extractTextFromRegion(TEST_DATA_URL),
    ).rejects.toThrow("Request failed (500)");
  });
});
