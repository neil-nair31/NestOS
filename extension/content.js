/* NestOS helper — runs on Naukri Resdex + local demo page */

(function () {
  if (window.__NESTOS_HELPER__) return;
  // Only activate on Naukri or NestOS extension-demo pages (not every website)
  const host = location.hostname || "";
  const path = location.pathname || "";
  const isNaukri = /(^|\.)naukri\.com$/i.test(host);
  const isDemo = /extension-demo/i.test(path) || /extension-demo/i.test(location.href);
  if (!isNaukri && !isDemo) return;
  window.__NESTOS_HELPER__ = true;

  const PANEL_ID = "nestos-helper-panel";

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function uniqueByKey(rows) {
    const seen = new Set();
    return rows.filter((r) => {
      const k = (r.naukri_key || `${r.name}|${r.role}`).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /** Heuristic extractors for Naukri Resdex / demo HTML */
  function extractProfiles() {
    const found = [];

    // 1) Explicit NestOS demo cards
    document.querySelectorAll("[data-nestos-profile]").forEach((card) => {
      const name = card.getAttribute("data-name") || text(card.querySelector("[data-field=name]"));
      if (!name) return;
      found.push({
        name,
        role: card.getAttribute("data-role") || text(card.querySelector("[data-field=role]")) || "Profile from Naukri",
        experience: card.getAttribute("data-exp") || text(card.querySelector("[data-field=exp]")) || undefined,
        ctc: card.getAttribute("data-ctc") || text(card.querySelector("[data-field=ctc]")) || undefined,
        notice: card.getAttribute("data-notice") || text(card.querySelector("[data-field=notice]")) || undefined,
        location: card.getAttribute("data-loc") || text(card.querySelector("[data-field=loc]")) || undefined,
        skills: (card.getAttribute("data-skills") || text(card.querySelector("[data-field=skills]")) || "")
          .split(/[,|·]/)
          .map((s) => s.trim())
          .filter(Boolean),
        naukri_key: card.getAttribute("data-key") || undefined,
        folder: "Shortlist",
        page_url: location.href,
      });
    });

    // 2) Common Resdex-ish card patterns (Naukri DOM changes — keep broad)
    const cardSelectors = [
      ".srp-tuple",
      ".tuple",
      ".resume-tuple",
      ".card-container",
      "[class*='tuple']",
      "article.resume",
      ".search-result-item",
    ];
    const cards = [];
    cardSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => cards.push(el));
    });

    cards.forEach((card, idx) => {
      const nameEl =
        card.querySelector(".name a, .name, a.name, [class*='name'] a, h2 a, h3 a, .candidate-name") ||
        card.querySelector("a[href*='resume'], a[href*='profile']");
      const name = text(nameEl);
      if (!name || name.length < 3 || name.length > 80) return;
      if (/search|filter|login|naukri|resdex/i.test(name)) return;

      const blob = text(card);
      const roleMatch = blob.match(
        /\b((?:Senior|Junior|Lead|Staff)?\s?(?:Software|Frontend|Backend|Full[\s-]?Stack|DevOps|Data|ML|Product|QA|SDET|React|Java|Python|Engineering)\s?(?:Engineer|Developer|Manager|Analyst|Architect)?)\b/i
      );
      const expMatch = blob.match(/(\d+(?:\.\d+)?\s*(?:yrs?|years?))/i);
      const ctcMatch = blob.match(/(₹\s?[\d.,]+\s*(?:L|Lacs?|Lakhs?)|[\d.]+\s*(?:LPA|Lakh))/i);
      const locMatch = blob.match(
        /\b(Bengaluru|Bangalore|Hyderabad|Pune|Chennai|Mumbai|Delhi|Noida|Gurgaon|Gurugram|Kochi|Remote|India)\b/i
      );
      const noticeMatch = blob.match(/(Immediate|[\d]+\s*days?|Serving notice)/i);

      found.push({
        name,
        role: roleMatch ? roleMatch[1].replace(/\s+/g, " ").trim() : "Profile from Naukri",
        experience: expMatch ? expMatch[1] : undefined,
        ctc: ctcMatch ? ctcMatch[1] : undefined,
        notice: noticeMatch ? noticeMatch[1] : undefined,
        location: locMatch ? locMatch[1] : undefined,
        skills: [],
        naukri_key: nameEl?.getAttribute?.("href") || `naukri-${name}-${idx}`,
        folder: "Shortlist",
        page_url: location.href,
        freshness: "Captured from Naukri just now",
      });
    });

    return uniqueByKey(found).slice(0, 40);
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="nh-head">
        <strong>NestOS</strong>
        <span>Naukri helper</span>
        <button type="button" class="nh-x" title="Minimize">–</button>
      </div>
      <div class="nh-body">
        <p class="nh-hint">Search &amp; shortlist on Naukri as usual. Then send visible CVs into NestOS.</p>
        <div class="nh-status" id="nhStatus">Ready</div>
        <div class="nh-actions">
          <button type="button" class="nh-btn" id="nhScan">Scan page</button>
          <button type="button" class="nh-btn primary" id="nhSend">Send to NestOS</button>
        </div>
        <div class="nh-list" id="nhList"></div>
        <a class="nh-link" id="nhOpenApp" href="http://localhost:4100/app" target="_blank" rel="noopener">Open NestOS dashboard →</a>
      </div>
    `;
    document.documentElement.appendChild(panel);

    let scanned = [];

    const status = () => panel.querySelector("#nhStatus");
    const list = () => panel.querySelector("#nhList");

    function renderList(rows) {
      scanned = rows;
      if (!rows.length) {
        list().innerHTML = `<div class="nh-empty">No CV cards detected yet. Open a Resdex results page, or use the NestOS demo page.</div>`;
        return;
      }
      list().innerHTML = rows
        .map(
          (r, i) => `
        <label class="nh-row">
          <input type="checkbox" data-i="${i}" checked/>
          <span><b>${escapeHtml(r.name)}</b><br/><small>${escapeHtml(r.role || "")}${r.location ? " · " + escapeHtml(r.location) : ""}</small></span>
        </label>`
        )
        .join("");
      status().textContent = `${rows.length} profile(s) found on this page`;
    }

    panel.querySelector(".nh-x").onclick = () => panel.classList.toggle("nh-min");
    panel.querySelector("#nhScan").onclick = () => {
      const rows = extractProfiles();
      renderList(rows);
      if (!rows.length) status().textContent = "Nothing found — try Resdex search results or /extension-demo";
    };
    panel.querySelector("#nhSend").onclick = async () => {
      const checked = [...list().querySelectorAll("input[type=checkbox]:checked")].map((el) => scanned[+el.dataset.i]).filter(Boolean);
      if (!checked.length) {
        status().textContent = "Select at least one profile";
        return;
      }
      status().textContent = `Sending ${checked.length} to NestOS…`;
      chrome.runtime.sendMessage(
        { type: "NESTOS_CAPTURE", profiles: checked, pageUrl: location.href, folder: "Shortlist" },
        (res) => {
          if (chrome.runtime.lastError) {
            status().textContent = chrome.runtime.lastError.message;
            return;
          }
          if (!res?.ok) {
            status().textContent = res?.error || "Send failed — open helper popup and sign in";
            return;
          }
          status().textContent = `Sent ✓ ${res.created || 0} new · ${res.updated || 0} updated — open NestOS → Find on Naukri (auto-loads)`;
          panel.classList.add("nh-ok");
          // Open NestOS sourcing so user sees data landed
          const openLink = panel.querySelector("#nhOpenApp");
          if (openLink) openLink.href = (cfgBase() || "http://localhost:4100") + "/app";
        }
      );
    };

    function cfgBase() {
      return "http://localhost:4100";
    }

    // Auto-scan once
    setTimeout(() => {
      const rows = extractProfiles();
      if (rows.length) renderList(rows);
    }, 800);

    // Re-scan when DOM changes (infinite scroll results)
    const mo = new MutationObserver(() => {
      if (panel.classList.contains("nh-min")) return;
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return panel;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePanel);
  } else {
    ensurePanel();
  }
})();
