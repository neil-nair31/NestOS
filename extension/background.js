const DEFAULTS = {
  nestosUrl: "http://localhost:4100",
  token: "",
  email: "",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...cfg });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "NESTOS_CAPTURE") {
    captureToNestOS(msg.profiles || [], msg.pageUrl || "", msg.folder || "Shortlist")
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (msg?.type === "NESTOS_GET_CONFIG") {
    chrome.storage.sync.get(DEFAULTS, (cfg) => sendResponse(cfg));
    return true;
  }
  if (msg?.type === "NESTOS_LOGIN") {
    loginNestOS(msg.email, msg.password, msg.nestosUrl)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
});

async function loginNestOS(email, password, nestosUrl) {
  const base = (nestosUrl || DEFAULTS.nestosUrl).replace(/\/$/, "");
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  await chrome.storage.sync.set({
    nestosUrl: base,
    token: data.token,
    email: data.user?.email || email,
    userName: data.user?.name || "",
    role: data.user?.role || "",
  });
  return { ok: true, user: data.user };
}

async function captureToNestOS(profiles, pageUrl, folder) {
  const cfg = await chrome.storage.sync.get(DEFAULTS);
  if (!cfg.token) throw new Error("Sign in via the NestOS helper popup first");
  if (!profiles.length) throw new Error("No profiles to send");

  const base = (cfg.nestosUrl || DEFAULTS.nestosUrl).replace(/\/$/, "");
  const res = await fetch(`${base}/api/resdex/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
    },
    body: JSON.stringify({ profiles, page_url: pageUrl, folder }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `NestOS error ${res.status}`);
  return data;
}
