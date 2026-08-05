import fs from "fs";
import { extractText, getDocumentProxy } from "unpdf";

for (const f of ["Rohini_Menon_Resume.pdf", "Farhan_Ali_Resume.pdf"]) {
  const b = fs.readFileSync(`data/samples/${f}`);
  try {
    const pdf = await getDocumentProxy(new Uint8Array(b));
    const { text } = await extractText(pdf, { mergePages: true });
    const t = Array.isArray(text) ? text.join("\n") : String(text || "");
    console.log(f, "len", t.length);
    console.log(t.slice(0, 250));
  } catch (e) {
    console.error(f, e);
  }
}
