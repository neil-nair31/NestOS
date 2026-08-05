import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Candidate, DocVerification, Invoice, OutreachLog } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "store.json");

type Store = {
  candidates: Candidate[];
  outreach: OutreachLog[];
  invoices: Invoice[];
  verifications: DocVerification[];
};

function empty(): Store {
  return { candidates: [], outreach: [], invoices: [], verifications: [] };
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(empty(), null, 2));
}

function read(): Store {
  ensure();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Store;
}

function write(store: Store) {
  ensure();
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}

export const localStore = {
  uploadDir: UPLOAD_DIR,

  listCandidates(): Candidate[] {
    return read().candidates.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getCandidate(id: string): Candidate | undefined {
    return read().candidates.find((c) => c.id === id);
  },

  upsertCandidate(c: Candidate): Candidate {
    const store = read();
    const i = store.candidates.findIndex((x) => x.id === c.id);
    if (i >= 0) store.candidates[i] = c;
    else store.candidates.unshift(c);
    write(store);
    return c;
  },

  findByEmailOrName(email: string | null, name: string): Candidate | undefined {
    const store = read();
    if (email) {
      const byEmail = store.candidates.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase());
      if (byEmail) return byEmail;
    }
    return store.candidates.find((c) => c.name.toLowerCase() === name.toLowerCase());
  },

  saveFile(filename: string, buffer: Buffer): string {
    ensure();
    const safe = filename.replace(/[^\w.\-]+/g, "_");
    const dest = path.join(UPLOAD_DIR, `${Date.now()}_${safe}`);
    fs.writeFileSync(dest, buffer);
    return dest;
  },

  addOutreach(row: OutreachLog) {
    const store = read();
    store.outreach.unshift(row);
    write(store);
    return row;
  },

  listOutreach(): OutreachLog[] {
    return read().outreach;
  },

  listInvoices(): Invoice[] {
    return read().invoices.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  upsertInvoice(inv: Invoice) {
    const store = read();
    const i = store.invoices.findIndex((x) => x.id === inv.id);
    if (i >= 0) store.invoices[i] = inv;
    else store.invoices.unshift(inv);
    write(store);
    return inv;
  },

  listVerifications(): DocVerification[] {
    return read().verifications;
  },

  addVerification(v: DocVerification) {
    const store = read();
    store.verifications.unshift(v);
    write(store);
    return v;
  },
};
