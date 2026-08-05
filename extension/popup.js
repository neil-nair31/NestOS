const msg = document.getElementById("msg");
const signedOut = document.getElementById("signedOut");
const signedIn = document.getElementById("signedIn");

function show(text, ok) {
  msg.textContent = text;
  msg.className = "msg on " + (ok ? "ok" : "err");
}

function refresh() {
  chrome.storage.sync.get({ nestosUrl: "http://localhost:4100", token: "", email: "", userName: "", role: "" }, (cfg) => {
    document.getElementById("url").value = cfg.nestosUrl || "http://localhost:4100";
    if (cfg.token) {
      signedOut.style.display = "none";
      signedIn.style.display = "block";
      document.getElementById("who").textContent = `Signed in as ${cfg.userName || cfg.email} (${cfg.role || "user"})`;
    } else {
      signedOut.style.display = "block";
      signedIn.style.display = "none";
    }
  });
}

document.getElementById("login").onclick = () => {
  const nestosUrl = document.getElementById("url").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  show("Signing in…", true);
  chrome.runtime.sendMessage({ type: "NESTOS_LOGIN", nestosUrl, email, password }, (res) => {
    if (chrome.runtime.lastError) return show(chrome.runtime.lastError.message, false);
    if (!res?.ok) return show(res?.error || "Login failed", false);
    show("Connected to NestOS", true);
    refresh();
  });
};

document.getElementById("logout").onclick = () => {
  chrome.storage.sync.set({ token: "", userName: "", role: "" }, () => {
    show("Signed out", true);
    refresh();
  });
};

document.getElementById("demo").onclick = () => {
  chrome.storage.sync.get({ nestosUrl: "http://localhost:4100" }, (cfg) => {
    chrome.tabs.create({ url: `${(cfg.nestosUrl || "").replace(/\/$/, "")}/extension-demo` });
  });
};
document.getElementById("naukri").onclick = () => chrome.tabs.create({ url: "https://www.naukri.com/recruit/login" });
document.getElementById("app").onclick = () => {
  chrome.storage.sync.get({ nestosUrl: "http://localhost:4100" }, (cfg) => {
    chrome.tabs.create({ url: `${(cfg.nestosUrl || "").replace(/\/$/, "")}/app` });
  });
};

refresh();
