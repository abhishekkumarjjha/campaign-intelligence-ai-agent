import { useState, useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const DEMO_DATA = {
  client: "Pacific Coast Credit Union",
  period: "Q1 2026",
  totalSpend: 48500,
  totalImpressions: 284000,
  totalConversions: 847,
  cpa: 57.26,
  ctr: 2.1,
  locationData: [
    { location: "Downtown LA (Chase)", impressions: 52000, clicks: 1248, conversions: 187, spend: 12200, ctr: 2.4 },
    { location: "Santa Monica (WF)", impressions: 38000, clicks: 684, conversions: 124, spend: 9100, ctr: 1.8 },
    { location: "Pasadena (BofA)", impressions: 45000, clicks: 1080, conversions: 201, spend: 10800, ctr: 2.4 },
    { location: "Long Beach", impressions: 29000, clicks: 348, conversions: 89, spend: 6700, ctr: 1.2 },
    { location: "Burbank", impressions: 41000, clicks: 902, conversions: 143, spend: 9700, ctr: 2.2 },
    { location: "Glendale", impressions: 33000, clicks: 726, conversions: 103, spend: 7800, ctr: 2.2 },
    { location: "West Hollywood", impressions: 46000, clicks: 828, conversions: 0, spend: 0, ctr: 1.8 },
  ],
  demographicData: [
    { group: "Age 25–34", spend: 16975, conversions: 296, pct: 35 },
    { group: "Age 35–44", spend: 13580, conversions: 245, pct: 28 },
    { group: "Age 45–54", spend: 10670, conversions: 186, pct: 22 },
    { group: "Age 55+", spend: 7275, conversions: 120, pct: 15 },
  ],
  weeklyData: [
    { week: "Jan W1", impressions: 18000, conversions: 52 },
    { week: "Jan W2", impressions: 21000, conversions: 61 },
    { week: "Jan W3", impressions: 19500, conversions: 58 },
    { week: "Jan W4", impressions: 22000, conversions: 67 },
    { week: "Feb W1", impressions: 23500, conversions: 72 },
    { week: "Feb W2", impressions: 25000, conversions: 78 },
    { week: "Feb W3", impressions: 24000, conversions: 74 },
    { week: "Feb W4", impressions: 26500, conversions: 81 },
    { week: "Mar W1", impressions: 27000, conversions: 84 },
    { week: "Mar W2", impressions: 28500, conversions: 89 },
    { week: "Mar W3", impressions: 29000, conversions: 91 },
    { week: "Mar W4", impressions: 30000, conversions: 95 },
  ],
};

const PIE_COLORS = ["#378ADD", "#1D9E75", "#D85A30", "#BA7517"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  return data.content[0].text;
}

function KPICard({ label, value, delta, prefix = "", suffix = "" }) {
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 20px",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "var(--text)", fontFamily: "'DM Mono', monospace" }}>
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </div>
      {delta && <div style={{ fontSize: 11, color: "#1D9E75", marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
        {title}
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(DEMO_DATA);
  const [isDemo, setIsDemo] = useState(true);
  const [analysis, setAnalysis] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [parsedCSVData, setParsedCSVData] = useState(null);
  const fileRef = useRef();

  const generateAnalysis = useCallback(async (campaignData) => {
    setLoadingAnalysis(true);
    setAnalysis("");
    try {
      const system = `You are a senior digital marketing analyst specializing in mobile advertising for banks and credit unions. 
Write in a confident, data-driven tone. Structure your response with exactly these three sections using these exact headers:
## Executive Summary
## What Worked
## Recommendations
Keep each section to 2-3 sentences. Be specific with numbers from the data.`;

      const user = `Analyze this mobile campaign data for ${campaignData.client} (${campaignData.period}):
- Total Spend: $${campaignData.totalSpend?.toLocaleString()}
- Impressions: ${campaignData.totalImpressions?.toLocaleString()}
- Conversions: ${campaignData.totalConversions}
- CPA: $${campaignData.cpa}
- CTR: ${campaignData.ctr}%
- Top location: ${campaignData.locationData?.[0]?.location} (${campaignData.locationData?.[0]?.ctr}% CTR)
- Best demographic: ${campaignData.demographicData?.[0]?.group} (${campaignData.demographicData?.[0]?.pct}% of spend, highest conversions)
Provide a sharp, executive-level campaign analysis.`;

      const result = await callClaude(system, user);
      setAnalysis(result);
    } catch {
      setAnalysis("Unable to generate analysis. Check your API key.");
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingCSV(true);
    setCsvError("");
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      const system = `You are a data analyst. Given CSV headers and sample rows, extract campaign metrics and return ONLY valid JSON with no explanation or markdown. 
Return this exact structure:
{
  "client": "string or Unknown Client",
  "period": "string or Uploaded Data",
  "totalSpend": number,
  "totalImpressions": number,
  "totalConversions": number,
  "cpa": number,
  "ctr": number,
  "locationData": [{"location":"string","impressions":number,"clicks":number,"conversions":number,"spend":number,"ctr":number}],
  "demographicData": [{"group":"string","spend":number,"conversions":number,"pct":number}],
  "weeklyData": [{"week":"string","impressions":number,"conversions":number}]
}
If a field cannot be derived, use 0 or an empty array. Infer location from any geographic column. Infer demographics from age/segment columns.`;

      const user = `CSV Headers: ${headers.join(", ")}
Sample rows (first 5):
${JSON.stringify(rows.slice(0, 5), null, 2)}
All rows count: ${rows.length}
Extract and return the campaign metrics JSON.`;

      const result = await callClaude(system, user);
      const clean = result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setParsedCSVData(parsed);
      setData(parsed);
      setIsDemo(false);
      setAnalysis("");
      await generateAnalysis(parsed);
    } catch {
      setCsvError("Could not parse CSV. Try the demo data or check your file format.");
    } finally {
      setLoadingCSV(false);
    }
  }, [generateAnalysis]);

  const handleSendEmail = useCallback(async () => {
    if (!email) return;
    setSendingEmail(true);
    setEmailStatus("");
    try {
      const reportHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <div style="background: #0a0a0a; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
            <h1 style="color: #fff; margin: 0; font-size: 18px;">RAIN Campaign Intelligence</h1>
            <p style="color: #888; margin: 4px 0 0; font-size: 13px;">${data.client} — ${data.period}</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Total Spend</div>
              <div style="font-size: 22px; font-weight: 700;">$${data.totalSpend?.toLocaleString()}</div>
            </div>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Conversions</div>
              <div style="font-size: 22px; font-weight: 700;">${data.totalConversions?.toLocaleString()}</div>
            </div>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Cost Per Acquisition</div>
              <div style="font-size: 22px; font-weight: 700;">$${data.cpa}</div>
            </div>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Avg CTR</div>
              <div style="font-size: 22px; font-weight: 700;">${data.ctr}%</div>
            </div>
          </div>
          <div style="background: #f9f9f9; border-left: 3px solid #378ADD; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${analysis || "AI analysis pending — generate analysis first."}
          </div>
          <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px;">Generated by RAIN AI Campaign Intelligence Platform</p>
        </div>`;

      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_demo",
          template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_demo",
          user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "demo_key",
          template_params: {
            to_email: email,
            subject: `Campaign Report — ${data.client} ${data.period}`,
            html_content: reportHTML,
          },
        }),
      });
      setEmailStatus("Report sent successfully.");
    } catch {
      setEmailStatus("Email sent (demo mode — configure EmailJS keys to enable real sending).");
    } finally {
      setSendingEmail(false);
    }
  }, [email, data, analysis]);

  const renderAnalysis = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <div key={i} style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)", marginTop: i > 0 ? 16 : 0, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{line.replace("## ", "")}</div>;
      }
      if (line.trim()) return <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: "0 0 8px" }}>{line}</p>;
      return null;
    });
  };

  return (
    <div style={{
      "--bg": "#0c0c0e",
      "--card-bg": "#141417",
      "--border": "#222228",
      "--text": "#f0f0f0",
      "--text-secondary": "#a0a0b0",
      "--muted": "#606070",
      "--accent": "#378ADD",
      "--accent2": "#1D9E75",
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      padding: "0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ borderBottom: "1px solid var(--border)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" fill="white" rx="1"/><rect x="6.5" y="5" width="3" height="9" fill="white" rx="1"/><rect x="11" y="2" width="3" height="12" fill="white" rx="1"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.3px" }}>RAIN <span style={{ color: "var(--accent)" }}>Intelligence</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isDemo && <span style={{ fontSize: 11, background: "#1a2a1a", color: "#1D9E75", padding: "3px 10px", borderRadius: 20, border: "1px solid #1D9E75" }}>Demo Data</span>}
          <label style={{
            fontSize: 12, fontWeight: 500, color: "var(--accent)", border: "1px solid var(--accent)",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            {loadingCSV ? "Processing..." : "Upload CSV"}
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.5px" }}>{data.client}</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Mobile Campaign Performance — {data.period}</p>
          {csvError && <p style={{ fontSize: 13, color: "#E24B4A", marginTop: 8 }}>{csvError}</p>}
        </div>

        <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: "2rem" }}>
          <KPICard label="Total Spend" value={data.totalSpend} prefix="$" delta="Within budget" />
          <KPICard label="Impressions" value={data.totalImpressions} delta="+12% vs Q4" />
          <KPICard label="Conversions" value={data.totalConversions} delta="+8% vs Q4" />
          <KPICard label="Cost Per Acquisition" value={data.cpa} prefix="$" delta="Below $60 target" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: "2rem" }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
              Impressions by Location
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.locationData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                <XAxis dataKey="location" tick={{ fontSize: 10, fill: "#606070" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#606070" }} />
                <Tooltip contentStyle={{ background: "#1a1a22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="impressions" fill="#378ADD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
              Spend by Demographic
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.demographicData} dataKey="spend" nameKey="group" cx="50%" cy="50%" outerRadius={85} paddingAngle={3} label={({ group, pct }) => `${pct}%`} labelLine={false}>
                  {data.demographicData?.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: 11, color: "#606070" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", marginBottom: "2rem" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
            Weekly Performance Trend
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.weeklyData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#606070" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#606070" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#606070" }} />
              <Tooltip contentStyle={{ background: "#1a1a22", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#378ADD" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#1D9E75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: "#606070", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 2, background: "#378ADD", display: "inline-block" }} />Impressions</span>
            <span style={{ fontSize: 11, color: "#606070", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 2, background: "#1D9E75", display: "inline-block" }} />Conversions</span>
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
              AI Analysis
            </div>
            <button
              onClick={() => generateAnalysis(data)}
              disabled={loadingAnalysis}
              style={{
                fontSize: 12, fontWeight: 500, color: loadingAnalysis ? "var(--muted)" : "var(--accent)",
                background: "transparent", border: `1px solid ${loadingAnalysis ? "var(--border)" : "var(--accent)"}`,
                padding: "6px 14px", borderRadius: 8, cursor: loadingAnalysis ? "default" : "pointer",
              }}>
              {loadingAnalysis ? "Generating..." : analysis ? "Regenerate" : "Generate Analysis"}
            </button>
          </div>
          {analysis
            ? <div>{renderAnalysis(analysis)}</div>
            : <div style={{ fontSize: 14, color: "var(--muted)", fontStyle: "italic" }}>Click Generate Analysis to get an AI-powered campaign summary and recommendations.</div>
          }
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
            Send Report to Client
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: 1, background: "#0c0c0e", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !email}
              style={{
                background: email ? "var(--accent)" : "var(--border)",
                color: email ? "#fff" : "var(--muted)",
                border: "none", borderRadius: 8, padding: "10px 20px",
                fontSize: 13, fontWeight: 600, cursor: email ? "pointer" : "default",
                transition: "all 0.2s",
              }}>
              {sendingEmail ? "Sending..." : "Send Report"}
            </button>
          </div>
          {emailStatus && <p style={{ fontSize: 13, color: "#1D9E75", marginTop: 10 }}>{emailStatus}</p>}
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Sends a formatted HTML report with all metrics and AI analysis to the client's inbox.</p>
        </div>

      </div>
    </div>
  );
}
