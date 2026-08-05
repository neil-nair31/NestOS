import { Resend } from "resend";
import { config, hasResend } from "../config.js";

export async function sendCandidateEmail(opts: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ ok: boolean; mode: string; id?: string; error?: string }> {
  if (!hasResend()) {
    console.log("[NestOS email stub]", opts);
    return { ok: true, mode: "console-stub" };
  }
  try {
    const resend = new Resend(config.resendApiKey);
    const { data, error } = await resend.emails.send({
      from: config.resendFrom,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
      replyTo: opts.replyTo,
    });
    if (error) return { ok: false, mode: "resend", error: error.message };
    return { ok: true, mode: "resend", id: data?.id };
  } catch (e) {
    return { ok: false, mode: "resend", error: e instanceof Error ? e.message : String(e) };
  }
}

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
