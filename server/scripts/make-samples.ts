import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../data/samples");
fs.mkdirSync(outDir, { recursive: true });

const people = [
  {
    file: "Rohini_Menon_Resume.pdf",
    name: "Rohini Menon",
    role: "Senior React Developer",
    email: "rohini.menon@example.com",
    phone: "9876543210",
    skills: "React, TypeScript, Node, AWS",
    exp: "6.5 years of experience",
    loc: "Bengaluru",
  },
  {
    file: "Farhan_Ali_Resume.pdf",
    name: "Farhan Ali",
    role: "DevOps Engineer",
    email: "farhan.ali@example.com",
    phone: "9988776655",
    skills: "AWS, Kubernetes, Terraform, Docker",
    exp: "5 years of experience",
    loc: "Hyderabad",
  },
];

async function writePdf(p: (typeof people)[0]) {
  const doc = new PDFDocument({ margin: 50 });
  const dest = path.join(outDir, p.file);
  const stream = fs.createWriteStream(dest);
  doc.pipe(stream);
  doc.fontSize(20).text(p.name);
  doc.moveDown(0.5);
  doc.fontSize(14).text(p.role);
  doc.moveDown();
  doc.fontSize(11).text(`Email: ${p.email}`);
  doc.text(`Phone: ${p.phone}`);
  doc.text(`Location: ${p.loc}`);
  doc.moveDown();
  doc.text(`Skills: ${p.skills}`);
  doc.text(p.exp);
  doc.text("Notice period: 30 days");
  doc.text("Current CTC: 28 LPA");
  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  console.log("Wrote", dest);
}

for (const p of people) await writePdf(p);
