/**
 * Emergency SMS gateway (server-only).
 *
 * Sends transactional SMS through whichever provider is configured via backend
 * environment variables. Two providers are supported out of the box:
 *
 *   Twilio  — SMS_PROVIDER=twilio
 *             TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *             TWILIO_FROM_NUMBER  (or TWILIO_MESSAGING_SERVICE_SID)
 *
 *   MSG91   — SMS_PROVIDER=msg91
 *             MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_ROUTE (default "4"),
 *             MSG91_COUNTRY_CODE (default "91"), MSG91_FLOW_ID (optional)
 *
 * Credentials never leave the backend — this module is imported only from route
 * handlers and server-side stores. When nothing is configured the gateway runs
 * in "simulate" mode: it logs the message and reports a synthetic success so the
 * in-app notification path and local development keep working.
 *
 * `sendEmergencySms` is best-effort by contract: it resolves with a per-number
 * result array and never throws, so a provider outage can never block a rescue
 * dispatch or an evacuation order.
 */

export type SmsDeliveryState = "sent" | "failed" | "simulated" | "skipped";

export interface SmsDeliveryResult {
  to: string;
  state: SmsDeliveryState;
  provider: string;
  providerMessageId?: string;
  error?: string;
}

const DEFAULT_MAX_LEN = 480; // ~3 concatenated GSM-7 segments

function activeProvider(): "twilio" | "msg91" | "none" {
  const explicit = (process.env.SMS_PROVIDER || "").trim().toLowerCase();
  if (explicit === "twilio" || explicit === "msg91") return explicit;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return "twilio";
  if (process.env.MSG91_AUTH_KEY) return "msg91";
  return "none";
}

/** Are real SMS credentials present, or are we in simulate mode? */
export function isSmsConfigured(): boolean {
  return activeProvider() !== "none";
}

export function smsProviderName(): string {
  const p = activeProvider();
  return p === "none" ? "simulate" : p;
}

/** Normalise a phone number to E.164-ish; drops obviously invalid entries. */
export function normalizePhone(raw: string, defaultCountryCode = process.env.MSG91_COUNTRY_CODE || "91"): string | null {
  if (!raw) return null;
  let n = raw.replace(/[\s()\-.]/g, "").trim();
  if (!n) return null;
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (n.startsWith("+")) {
    return /^\+\d{8,15}$/.test(n) ? n : null;
  }
  // Bare national number — prepend the configured country code.
  const digits = n.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 12) return null;
  return `+${defaultCountryCode}${digits.length > 10 ? digits.slice(-10) : digits}`;
}

function truncate(body: string, max = DEFAULT_MAX_LEN): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

async function sendViaTwilio(to: string, body: string): Promise<SmsDeliveryResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!from && !messagingServiceSid) {
    return { to, state: "failed", provider: "twilio", error: "TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID required" };
  }

  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else params.set("From", from!);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { to, state: "failed", provider: "twilio", error: data?.message || `HTTP ${res.status}` };
    }
    return { to, state: "sent", provider: "twilio", providerMessageId: data?.sid };
  } catch (err) {
    return { to, state: "failed", provider: "twilio", error: err instanceof Error ? err.message : "network error" };
  }
}

async function sendViaMsg91(to: string, body: string): Promise<SmsDeliveryResult> {
  const authKey = process.env.MSG91_AUTH_KEY!;
  const senderId = process.env.MSG91_SENDER_ID || "ALERTS";
  const route = process.env.MSG91_ROUTE || "4";
  const mobile = to.replace(/^\+/, "");

  try {
    const res = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: authKey },
      body: JSON.stringify({
        sender: senderId,
        route,
        sms: [{ message: body, to: [mobile] }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data?.type && data.type === "error")) {
      return { to, state: "failed", provider: "msg91", error: data?.message || `HTTP ${res.status}` };
    }
    return { to, state: "sent", provider: "msg91", providerMessageId: typeof data === "string" ? data : data?.request_id };
  } catch (err) {
    return { to, state: "failed", provider: "msg91", error: err instanceof Error ? err.message : "network error" };
  }
}

/**
 * Deliver one emergency SMS body to many recipients. Never throws.
 * Returns one result per (valid) recipient plus "skipped" entries for numbers
 * that could not be normalised.
 */
export async function sendEmergencySms(
  recipients: string[],
  rawBody: string
): Promise<SmsDeliveryResult[]> {
  const body = truncate(rawBody);
  const provider = activeProvider();

  const seen = new Set<string>();
  const targets: { normalized: string | null; original: string }[] = [];
  for (const original of recipients) {
    const normalized = normalizePhone(original);
    const key = normalized || `raw:${original}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ normalized, original });
  }

  const results = await Promise.all(
    targets.map(async ({ normalized, original }): Promise<SmsDeliveryResult> => {
      if (!normalized) {
        return { to: original, state: "skipped", provider: smsProviderName(), error: "invalid phone number" };
      }
      if (provider === "none") {
        console.info(`[sms:simulate] -> ${normalized}: ${body}`);
        return { to: normalized, state: "simulated", provider: "simulate" };
      }
      if (provider === "twilio") return sendViaTwilio(normalized, body);
      return sendViaMsg91(normalized, body);
    })
  );

  return results;
}
