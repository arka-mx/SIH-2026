"use client";

/**
 * Share a URL via the native share sheet, falling back to the clipboard, then to
 * "the caller should show the link for manual copy".
 *
 * IMPORTANT: `navigator.share` (and `navigator.clipboard.writeText` on some
 * browsers) requires transient user activation — it must be reached without an
 * `await` in between the click handler and this call. Do any network work
 * *after* calling this, or in parallel without awaiting it first.
 */
export type ShareOutcome = "shared" | "copied" | "manual";

export interface ShareLinkData {
  title?: string;
  text?: string;
  url: string;
}

export async function shareOrCopyLink(data: ShareLinkData): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      // User dismissed the sheet on purpose — treat as handled, don't also copy.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Any other failure (NotAllowedError from a stale gesture, unsupported
      // payload, …) → fall through to the clipboard.
    }
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(data.url);
      return "copied";
    } catch {
      // Clipboard blocked (insecure context / permissions policy / not focused).
    }
  }

  return "manual";
}
