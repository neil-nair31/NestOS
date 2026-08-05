export type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  skills: string[];
  experience: string | null;
  ctc: string | null;
  notice: string | null;
  location: string | null;
  stage: string;
  source: string;
  service?: string;
  resume_path: string | null;
  resume_original_name: string | null;
  raw_text_preview: string | null;
  parse_confidence: number;
  parse_method: string | null;
  created_at: string;
  updated_at: string;
};

export type OutreachLog = {
  id: string;
  candidate_id: string | null;
  type: "WhatsApp" | "Email" | "Call" | "Message";
  target: string;
  context: string;
  outcome: string;
  created_at: string;
  user_id?: string;
  user_name?: string;
};

export type Invoice = {
  id: string;
  invoice_no: string;
  client_name: string;
  service_line: "IaaS" | "Staff Aug" | "Talent Acq";
  description: string;
  amount: number;
  gst_percent: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  due_date: string;
  created_at: string;
};

export type DocVerification = {
  id: string;
  candidate_id: string;
  doc_type: string;
  file_name: string;
  status: "Pending" | "Valid" | "Warning" | "Invalid" | "Review";
  extracted: Record<string, string>;
  notes: string;
  created_at: string;
};
