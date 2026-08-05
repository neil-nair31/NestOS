import { useCallback, useEffect, useState } from "react";
import { api, type Candidate, type Health, type Invoice, type Verification } from "./api";

type Tab = "candidates" | "invoices" | "verify";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function App() {
  const [tab, setTab] = useState<Tab>("candidates");
  const [health, setHealth] = useState<Health | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [emailSubject, setEmailSubject] = useState("Opportunity with HummingBrains");
  const [emailBody, setEmailBody] = useState("Hi,\n\nWe'd like to discuss an opportunity with you.\n\nRegards,\nHummingBrains");
  const [invForm, setInvForm] = useState({
    client_name: "Kredmint Technologies",
    service_line: "IaaS" as Invoice["service_line"],
    description: "10 technical interviews — March package",
    amount: 85000,
    gst_percent: 18,
    due_date: "",
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const refresh = useCallback(async () => {
    const [h, c, i, v] = await Promise.all([
      api.health(),
      api.candidates(),
      api.invoices(),
      api.verifications(),
    ]);
    setHealth(h);
    setCandidates(c.data);
    setInvoices(i.data);
    setVerifications(v.data);
  }, []);

  useEffect(() => {
    refresh().catch((e) => flash(e.message));
  }, [refresh]);

  async function onFiles(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const res = await api.bulkUpload(files);
      await refresh();
      flash(`Parsed ${files.length} file(s) · ${res.created} created · ${res.updated} updated · OCR: ${res.ocr}`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp(c: Candidate) {
    if (!c.phone) return flash("No phone on candidate");
    try {
      const { link } = await api.whatsapp({
        candidateId: c.id,
        phone: c.phone,
        message: `Hi ${c.name.split(" ")[0]}, this is HummingBrains regarding a role opportunity.`,
      });
      window.open(link, "_blank");
      flash("WhatsApp opened · logged in outreach");
    } catch (e) {
      flash(e instanceof Error ? e.message : "WhatsApp failed");
    }
  }

  async function sendEmail(c: Candidate) {
    if (!c.email) return flash("No email on candidate");
    try {
      const r = await api.email({
        candidateId: c.id,
        to: c.email,
        subject: emailSubject,
        body: emailBody.replace(/^Hi,?/m, `Hi ${c.name.split(" ")[0]},`),
      });
      flash(r.mode === "console-stub" ? "Email stubbed to console (add RESEND_API_KEY)" : "Email sent via Resend");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Email failed");
    }
  }

  async function createInvoice() {
    setBusy(true);
    try {
      await api.createInvoice({ ...invForm, due_date: invForm.due_date || new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10) });
      await refresh();
      flash("Invoice created");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Invoice failed");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(c: Candidate, file: File) {
    setBusy(true);
    try {
      const v = await api.verifyDoc(c.id, "ID / Resume", file);
      await refresh();
      flash(`Verification: ${v.status} — ${v.notes}`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setBusy(false);
    }
  }

  const totalDue = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount * (1 + i.gst_percent / 100), 0);

  return (
    <div className="app">
      <div className="top">
        <div className="brand">
          <div className="mark" />
          <div>
            <h1>NestOS</h1>
            <p>HummingBrains testing build — candidates, OCR, messaging, invoices</p>
          </div>
        </div>
        <div className="pills">
          <span className={`pill ${health?.ok ? "on" : "warn"}`}>{health?.ok ? "API live" : "API down"}</span>
          <span className="pill">Store: {health?.store || "…"}</span>
          <span className={`pill ${health?.azureOcr ? "on" : "warn"}`}>
            OCR: {health?.azureOcr ? "Azure DI" : "pdf-parse fallback"}
          </span>
          <span className={`pill ${health?.resend ? "on" : ""}`}>Email: {health?.resend ? "Resend" : "stub"}</span>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Candidates</div><div className="v">{candidates.length}</div></div>
        <div className="kpi"><div className="l">Invoices</div><div className="v">{invoices.length}</div></div>
        <div className="kpi"><div className="l">Open amount</div><div className="v" style={{ fontSize: 16 }}>{money(totalDue)}</div></div>
        <div className="kpi"><div className="l">Doc checks</div><div className="v">{verifications.length}</div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "candidates" ? "on" : ""}`} onClick={() => setTab("candidates")}>Candidates + OCR</button>
        <button className={`tab ${tab === "invoices" ? "on" : ""}`} onClick={() => setTab("invoices")}>Invoicing</button>
        <button className={`tab ${tab === "verify" ? "on" : ""}`} onClick={() => setTab("verify")}>Doc verification</button>
      </div>

      {tab === "candidates" && (
        <div className="grid">
          <div>
            <div className="card">
              <h2>Bulk resume upload</h2>
              <p className="sub">Drop up to 20 PDFs. Names/emails/phones are extracted and the candidate database is updated.</p>
              <label
                className={`drop ${drag ? "drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  onFiles(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  hidden
                  disabled={busy}
                  onChange={(e) => onFiles(e.target.files)}
                />
                <b>{busy ? "Parsing…" : "Drop PDFs here or click to choose"}</b>
                <span>Azure Document Intelligence when configured · otherwise pdf-parse for text PDFs</span>
              </label>
            </div>

            <div className="card">
              <h2>Candidate database</h2>
              <p className="sub">{candidates.length} records · click a row for WhatsApp / email</p>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Parse</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.length === 0 ? (
                    <tr><td colSpan={4} className="muted">No candidates yet — upload PDFs to test.</td></tr>
                  ) : (
                    candidates.map((c) => (
                      <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                        <td>
                          <b>{c.name}</b>
                          <div className="muted">{c.resume_original_name || c.source}</div>
                        </td>
                        <td>{c.role || "—"}<div className="muted">{c.skills.slice(0, 3).join(", ")}</div></td>
                        <td>
                          <div>{c.email || "—"}</div>
                          <div className="muted">{c.phone || "—"}</div>
                        </td>
                        <td>
                          <div>{Math.round(c.parse_confidence * 100)}%</div>
                          <div className="muted">{c.parse_method}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="card">
              <h2>Outreach</h2>
              {!selected ? (
                <p className="sub">Select a candidate to WhatsApp or email.</p>
              ) : (
                <>
                  <p className="sub"><b>{selected.name}</b> · {selected.role || "role n/a"}</p>
                  <div className="row" style={{ marginBottom: 12 }}>
                    <button className="btn pri" disabled={!selected.phone || busy} onClick={() => sendWhatsApp(selected)}>WhatsApp</button>
                    <button className="btn" disabled={!selected.email || busy} onClick={() => sendEmail(selected)}>Send email</button>
                  </div>
                  <div className="field">
                    <label>Email subject</label>
                    <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Email body</label>
                    <textarea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <div className="grid">
          <div className="card">
            <h2>Create invoice</h2>
            <p className="sub">IaaS · Staff Aug · Talent Acquisition — GST-aware drafts for testing</p>
            <div className="field">
              <label>Client</label>
              <input value={invForm.client_name} onChange={(e) => setInvForm({ ...invForm, client_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Service line</label>
              <select
                value={invForm.service_line}
                onChange={(e) => setInvForm({ ...invForm, service_line: e.target.value as Invoice["service_line"] })}
              >
                <option value="IaaS">IaaS (interviews)</option>
                <option value="Staff Aug">Staff Augmentation</option>
                <option value="Talent Acq">Talent Acquisition</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <input value={invForm.description} onChange={(e) => setInvForm({ ...invForm, description: e.target.value })} />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label>Amount (₹)</label>
                <input type="number" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: Number(e.target.value) })} />
              </div>
              <div className="field" style={{ width: 100 }}>
                <label>GST %</label>
                <input type="number" value={invForm.gst_percent} onChange={(e) => setInvForm({ ...invForm, gst_percent: Number(e.target.value) })} />
              </div>
            </div>
            <p className="muted" style={{ marginBottom: 10 }}>
              Total with GST: {money(invForm.amount * (1 + invForm.gst_percent / 100))}
            </p>
            <button className="btn pri" disabled={busy} onClick={createInvoice}>Create invoice</button>
          </div>

          <div className="card">
            <h2>Invoice list</h2>
            <table>
              <thead>
                <tr><th>No.</th><th>Client</th><th>Line</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} className="muted">No invoices yet</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_no}</td>
                      <td>{inv.client_name}<div className="muted">{inv.description}</div></td>
                      <td>{inv.service_line}</td>
                      <td>{money(inv.amount * (1 + inv.gst_percent / 100))}</td>
                      <td>
                        <select
                          value={inv.status}
                          onChange={async (e) => {
                            await api.setInvoiceStatus(inv.id, e.target.value);
                            await refresh();
                          }}
                        >
                          {["Draft", "Sent", "Paid", "Overdue"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "verify" && (
        <div className="grid">
          <div className="card">
            <h2>Document verification</h2>
            <p className="sub">Upload a doc against a candidate — OCR extracts fields and name-match is checked (RTS-style starter).</p>
            {!candidates.length ? (
              <p className="muted">Add candidates first via bulk PDF upload.</p>
            ) : (
              candidates.slice(0, 8).map((c) => (
                <div key={c.id} className="row" style={{ justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
                  <div>
                    <b>{c.name}</b>
                    <div className="muted">{c.email || "no email"}</div>
                  </div>
                  <label className="btn">
                    Upload doc
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      hidden
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onVerify(c, f);
                      }}
                    />
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="card">
            <h2>Verification results</h2>
            <table>
              <thead>
                <tr><th>File</th><th>Status</th><th>Extracted</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {verifications.length === 0 ? (
                  <tr><td colSpan={4} className="muted">No checks yet</td></tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id}>
                      <td>{v.file_name}<div className="muted">{v.doc_type}</div></td>
                      <td className={`status-${v.status}`}>{v.status}</td>
                      <td className="muted">{v.extracted.name || "—"}</td>
                      <td className="muted">{v.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "on" : ""}`}>{toast}</div>
    </div>
  );
}
