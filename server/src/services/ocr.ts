import { extractText, getDocumentProxy } from "unpdf";
import { config, hasAzure } from "../config.js";

export type ParseResult = {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  skills: string[];
  experience: string | null;
  ctc: string | null;
  notice: string | null;
  location: string | null;
  rawText: string;
  confidence: number;
  method: string;
};

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{5}[\s-]?\d{4,5}/);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function extractName(text: string, fallbackFile: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    if (line.length < 3 || line.length > 60) continue;
    if (/@|http|linkedin|github|resume|curriculum|objective|summary|experience|education|skills|phone|email|mobile/i.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,3}$/.test(line) || /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line)) {
      return line;
    }
  }
  return (
    fallbackFile
      .replace(/\.(pdf|docx?)$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b(resume|cv|curriculum\s*vitae)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "Unknown Candidate"
  );
}

function extractRole(text: string): string | null {
  const m = text.match(/(?:title|role|designation|position)\s*[:\-]\s*(.+)/i);
  if (m) return m[1].split(/\n/)[0].trim().slice(0, 80);
  const common = text.match(
    /\b((?:Senior|Junior|Lead|Staff)?\s?(?:Software|Frontend|Backend|Full[\s-]?Stack|DevOps|Data|ML|Product|QA|SDET|React|Java|Python)\s?(?:Engineer|Developer|Manager|Analyst|Architect)?)\b/i
  );
  return common ? common[1].replace(/\s+/g, " ").trim() : null;
}

function extractSkills(text: string): string[] {
  const block = text.match(/skills?\s*[:\-]?\s*([\s\S]{0,400})/i);
  const chunk = block ? block[1] : text.slice(0, 1500);
  const known = [
    "React",
    "TypeScript",
    "JavaScript",
    "Node",
    "Python",
    "Java",
    "AWS",
    "Azure",
    "Docker",
    "Kubernetes",
    "SQL",
    "Postgres",
    "MongoDB",
    "Go",
    "Next.js",
    "GraphQL",
    "Terraform",
    "Spark",
    "Airflow",
  ];
  return known.filter((s) => new RegExp(`\\b${s.replace(".", "\\.")}\\b`, "i").test(chunk)).slice(0, 10);
}

function extractExperience(text: string): string | null {
  const m = text.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
  return m ? `${m[1]} yrs` : null;
}

function extractCtc(text: string): string | null {
  const m = text.match(/(?:CTC|current\s*(?:ctc|salary)|package)\s*[:\-]?\s*(₹?\s?\d+(?:\.\d+)?\s*(?:L|LPA|lakhs?|k)?)/i);
  return m ? m[1].replace(/\s+/g, "") : null;
}

function extractNotice(text: string): string | null {
  const m = text.match(/(?:notice(?:\s*period)?)\s*[:\-]?\s*(\d+\s*(?:days?|months?)|immediate)/i);
  return m ? m[1] : null;
}

function extractLocation(text: string): string | null {
  const cities = ["Bengaluru", "Bangalore", "Hyderabad", "Chennai", "Mumbai", "Pune", "Delhi", "Noida", "Gurgaon", "Gurugram", "Kochi", "Remote"];
  for (const c of cities) if (new RegExp(`\\b${c}\\b`, "i").test(text)) return c === "Bangalore" ? "Bengaluru" : c;
  const m = text.match(/(?:location|based in|city)\s*[:\-]?\s*([A-Za-z]+)/i);
  return m ? m[1].trim().slice(0, 40) : null;
}

function structureFromText(text: string, filename: string, method: string, confidence: number): ParseResult {
  const clean = text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ");
  return {
    name: extractName(clean, filename),
    email: extractEmail(clean),
    phone: extractPhone(clean),
    role: extractRole(clean),
    skills: extractSkills(clean),
    experience: extractExperience(clean),
    ctc: extractCtc(clean),
    notice: extractNotice(clean),
    location: extractLocation(clean),
    rawText: clean.slice(0, 4000),
    confidence,
    method,
  };
}

async function localPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text || "");
  } catch {
    return "";
  }
}

async function azureExtractText(buffer: Buffer): Promise<string | null> {
  if (!hasAzure()) return null;
  const analyzeUrl = `${config.azureEndpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;
  const start = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.azureKey,
      "Content-Type": "application/pdf",
    },
    body: new Uint8Array(buffer),
  });
  if (!start.ok) {
    const err = await start.text();
    throw new Error(`Azure DI start failed: ${start.status} ${err}`);
  }
  const op = start.headers.get("operation-location") || start.headers.get("Operation-Location");
  if (!op) throw new Error("Azure DI missing operation-location");

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(op, { headers: { "Ocp-Apim-Subscription-Key": config.azureKey } });
    const json = (await poll.json()) as {
      status?: string;
      analyzeResult?: { content?: string; pages?: { lines?: { content?: string }[] }[] };
    };
    if (json.status === "failed") throw new Error("Azure DI analysis failed");
    if (json.status === "succeeded") {
      if (json.analyzeResult?.content) return json.analyzeResult.content;
      const lines = (json.analyzeResult?.pages || []).flatMap((p) => (p.lines || []).map((l) => l.content || ""));
      return lines.join("\n");
    }
  }
  throw new Error("Azure DI timed out");
}

export async function parseResumePdf(buffer: Buffer, filename: string): Promise<ParseResult> {
  let text = await localPdfText(buffer);
  let method = "unpdf";
  let confidence = 0.75;

  if (text.trim().length < 80 && hasAzure()) {
    const azureText = await azureExtractText(buffer);
    if (azureText && azureText.trim().length > 20) {
      text = azureText;
      method = "azure-document-intelligence";
      confidence = 0.9;
    }
  } else if (text.trim().length >= 80 && hasAzure()) {
    try {
      const azureText = await azureExtractText(buffer);
      if (azureText && azureText.trim().length > text.trim().length * 0.6) {
        text = azureText;
        method = "azure-document-intelligence";
        confidence = 0.92;
      }
    } catch {
      // keep local text
    }
  }

  if (text.trim().length < 40) {
    const stubName =
      filename
        .replace(/\.(pdf|docx?)$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b(resume|cv|curriculum\s*vitae)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim() || "Parsed Candidate";
    return {
      name: stubName,
      email: null,
      phone: null,
      role: "Parsed from resume",
      skills: [],
      experience: null,
      ctc: null,
      notice: null,
      location: null,
      rawText: "",
      confidence: 0.35,
      method: hasAzure() ? "low-text-fallback" : "filename-fallback (add AZURE_DI_* for scanned PDFs)",
    };
  }

  return structureFromText(text, filename, method, confidence);
}
