import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, hasSupabase, useSqlite } from "../config.js";
import { sqliteStore } from "../db/sqlite.js";
import type { Candidate, DocVerification, Invoice, OutreachLog } from "../types.js";
import { localStore } from "./local.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function useLocalJson() {
  return config.storeMode === "local" && process.env.FORCE_JSON === "1";
}

export async function listCandidates(): Promise<Candidate[]> {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("candidates").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as Candidate[];
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.listCandidates() as Candidate[];
  return localStore.listCandidates();
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("candidates").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Candidate | null;
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.getCandidate(id) as Candidate | null;
  return localStore.getCandidate(id) || null;
}

export async function upsertCandidate(c: Candidate): Promise<Candidate> {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("candidates").upsert(c).select().single();
    if (error) throw error;
    return data as Candidate;
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.upsertCandidate(c) as Candidate;
  return localStore.upsertCandidate(c);
}

export async function findExisting(email: string | null, name: string): Promise<Candidate | null> {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    if (email) {
      const { data } = await sb.from("candidates").select("*").ilike("email", email).maybeSingle();
      if (data) return data as Candidate;
    }
    const { data } = await sb.from("candidates").select("*").ilike("name", name).maybeSingle();
    return (data as Candidate) || null;
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.findByEmailOrName(email, name) as Candidate | null;
  return localStore.findByEmailOrName(email, name) || null;
}

export async function saveResumeFile(filename: string, buffer: Buffer, mime: string): Promise<string> {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const path = `${Date.now()}_${filename.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await sb.storage.from(config.supabaseBucket).upload(path, buffer, {
      contentType: mime || "application/pdf",
      upsert: false,
    });
    if (error) throw error;
    return path;
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.saveFile(filename, buffer);
  return localStore.saveFile(filename, buffer);
}

export async function addOutreach(row: OutreachLog & { user_id?: string; user_name?: string }) {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("outreach_log").insert(row).select().single();
    if (error) throw error;
    return data as OutreachLog;
  }
  if (useSqlite() && !useLocalJson()) {
    return sqliteStore.addOutreach({
      id: row.id,
      candidate_id: row.candidate_id,
      user_id: row.user_id,
      user_name: row.user_name,
      type: row.type,
      target: row.target,
      context: row.context,
      outcome: row.outcome,
      created_at: row.created_at,
    });
  }
  return localStore.addOutreach(row);
}

export async function listOutreach() {
  if (config.storeMode === "supabase" && getSupabase()) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("outreach_log").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }
  if (useSqlite() && !useLocalJson()) return sqliteStore.listOutreach();
  return localStore.listOutreach();
}

export async function listInvoices(): Promise<Invoice[]> {
  if (useSqlite() && !useLocalJson()) return sqliteStore.listInvoices() as Invoice[];
  return localStore.listInvoices();
}

export async function upsertInvoice(inv: Invoice & { created_by?: string }) {
  if (useSqlite() && !useLocalJson()) return sqliteStore.upsertInvoice(inv as any) as Invoice;
  return localStore.upsertInvoice(inv);
}

export async function listVerifications(): Promise<DocVerification[]> {
  if (useSqlite() && !useLocalJson()) return sqliteStore.listVerifications() as DocVerification[];
  return localStore.listVerifications();
}

export async function addVerification(v: DocVerification & { created_by?: string }) {
  if (useSqlite() && !useLocalJson()) return sqliteStore.addVerification(v as any) as DocVerification;
  return localStore.addVerification(v);
}
