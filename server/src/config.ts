import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4100),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4100,http://localhost:5174",
  storeMode: (process.env.STORE_MODE || "sqlite") as "sqlite" | "local" | "supabase",
  jwtSecret: process.env.JWT_SECRET || "nestos-dev-secret-change-me",
  jwtDays: Number(process.env.JWT_DAYS || 7),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseBucket: process.env.SUPABASE_BUCKET || "resumes",
  azureEndpoint: (process.env.AZURE_DI_ENDPOINT || "").replace(/\/$/, ""),
  azureKey: process.env.AZURE_DI_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendFrom: process.env.RESEND_FROM || "NestOS <onboarding@resend.dev>",
  notifyEmail: process.env.NOTIFY_EMAIL || "",
  whatsappNumber: (process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, ""),
};

export function hasAzure(): boolean {
  return Boolean(config.azureEndpoint && config.azureKey);
}

export function hasSupabase(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceKey);
}

export function hasResend(): boolean {
  return Boolean(config.resendApiKey);
}

export function useSqlite(): boolean {
  return config.storeMode === "sqlite" || config.storeMode === "local";
}
