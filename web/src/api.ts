export type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  skills: string[];
  experience: string | null;
  ctc: string | null;
  stage: string;
  source: string;
  resume_original_name: string | null;
  parse_confidence: number;
  parse_method: string;
  updated_at: string;
};

export type Health = {
  ok: boolean;
  store: string;
  azureOcr: boolean;
  resend: boolean;
  supabaseConfigured: boolean;
};

export type Invoice = {
  id: string;
  invoice_no: string;
  client_name: string;
  service_line: "IaaS" | "Staff Aug" | "Talent Acq";
  description: string;
  amount: number;
  gst_percent: number;
  status: string;
  due_date: string;
};

export type Verification = {
  id: string;
  candidate_id: string;
  doc_type: string;
  file_name: string;
  status: string;
  extracted: Record<string, string>;
  notes: string;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export const api = {
  health: () => req<Health>("/api/health"),
  candidates: () => req<{ data: Candidate[]; ocr: string }>("/api/candidates"),
  bulkUpload: async (files: FileList | File[]) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    return req<{
      created: number;
      updated: number;
      errors: number;
      ocr: string;
      results: Array<{ file: string; status: string; error?: string; candidate?: Candidate }>;
    }>("/api/candidates/bulk-upload", { method: "POST", body: fd });
  },
  whatsapp: (body: { candidateId?: string; phone: string; message?: string }) =>
    req<{ link: string }>("/api/comms/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  email: (body: { candidateId?: string; to: string; subject: string; body: string }) =>
    req<{ ok: boolean; mode: string }>("/api/comms/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  outreach: () => req<{ data: unknown[] }>("/api/comms/outreach"),
  invoices: () => req<{ data: Invoice[] }>("/api/invoices"),
  createInvoice: (body: Omit<Invoice, "id" | "invoice_no" | "status"> & { status?: string }) =>
    req<Invoice>("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  setInvoiceStatus: (id: string, status: string) =>
    req<Invoice>(`/api/invoices/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  verifications: () => req<{ data: Verification[] }>("/api/verify"),
  verifyDoc: async (candidateId: string, docType: string, file: File) => {
    const fd = new FormData();
    fd.append("candidateId", candidateId);
    fd.append("docType", docType);
    fd.append("file", file);
    return req<Verification>("/api/verify", { method: "POST", body: fd });
  },
};
