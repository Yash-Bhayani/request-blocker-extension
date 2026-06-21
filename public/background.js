const SYSTEM_RULES = [
    {
        id: 'system_linkedin_images',
        name: "Block LinkedIn Images",
        domain: "www.linkedin.com",
        regex: "^https://media\\.licdn\\.com/dms/image/.*",
        types: ["image"],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: true,
        enableScript: false
    },
    {
        id: 'system_linkedin_video',
        name: "Block LinkedIn Video",
        domain: "www.linkedin.com",
        regex: "^https://dms\\.licdn\\.com/playlist/vid/.*",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: true,
        enableScript: false
    },
    {
        id: 'system_ws_helper',
        name: "Auto click on 'more'",
        domain: "www.linkedin.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: true,
        scriptTrigger: "document_start",
        scriptCodes: {
            document_start: `
window.__wsHelper = {
    waitForElement(selector, callback, timeout = 10000) {
        const existing = document.querySelectorAll(selector);
        if (existing.length > 0) { existing.forEach(callback); return; }

        const observer = new MutationObserver(() => {
            const els = document.querySelectorAll(selector);
            if (els.length > 0) {
                observer.disconnect();
                clearTimeout(timer);
                els.forEach(callback);
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

        const timer = setTimeout(() => {
            observer.disconnect();
            console.warn('[WSHelper] waitForElement timed out:', selector);
        }, timeout);
    },

    clickWhenReady(selector, timeout = 10000) {
        this.waitForElement(selector, el => el.click(), timeout);
    }
};
`.trim(),
            document_end: "",
            document_idle: "",
            on_intercept: "window.__wsHelper.clickWhenReady('[data-testid=\"expandable-text-button\"]');"
        }
    }
];

let activeScriptRules = [];

const CSP_RULE_ID_START = 9000; // Reserve 9000-9999 for CSP bypass rules

async function updateEngine() {
    const result = await chrome.storage.local.get("rules");
    let customRules = result.rules || [];

    // --- 1. PRESERVE SYSTEM RULES ---
    let storageNeedsUpdate = false;
    for (const sysRule of SYSTEM_RULES) {
        if (!customRules.find(r => r.id === sysRule.id)) {
            customRules.push(sysRule);
            storageNeedsUpdate = true;
        }
    }
    if (storageNeedsUpdate) {
        await chrome.storage.local.set({ rules: customRules });
    }

    const dnrRules = [];
    activeScriptRules = [];
    let idCounter = 1;       // 1–8999 for block rules
    let cspIdCounter = CSP_RULE_ID_START; // 9000+ for CSP bypass rules

    // Collect domains that need CSP stripped (enableScript: true + active)
    const cspStripDomains = new Set();

    for (const rule of customRules) {
        if (!rule.active) continue;

        // Clean domains
        let hostnames = [];
        if (rule.domain && rule.domain.trim() !== "") {
            hostnames = rule.domain.split(',')
                .map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0])
                .filter(d => d.length > 0);
        }

        // --- 2. DNR BLOCKING ENGINE ---
        if (rule.enableBlock !== false) {
            const baseCondition = {};
            if (hostnames.length > 0) baseCondition.initiatorDomains = hostnames;

            if (rule.methods && rule.methods.length > 0) {
                baseCondition.requestMethods = rule.methods;
            }

            const hasRegex = rule.regex && rule.regex.trim() !== "";
            const hasTypes = rule.types && rule.types.length > 0;
            const logic = rule.conditionLogic || "OR";

            if (logic === "AND") {
                let combinedCondition = { ...baseCondition };
                if (hasRegex) {
                    let cleanRegex = rule.regex.trim();
                    if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) cleanRegex = cleanRegex.slice(1, -1);
                    combinedCondition.regexFilter = cleanRegex;
                }
                if (hasTypes) combinedCondition.resourceTypes = rule.types;
                else if (!hasRegex) combinedCondition.urlFilter = "*";

                dnrRules.push({ id: idCounter++, priority: 1, action: { type: "block" }, condition: combinedCondition });
            } else {
                if (hasRegex) {
                    let cleanRegex = rule.regex.trim();
                    if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) cleanRegex = cleanRegex.slice(1, -1);
                    dnrRules.push({ id: idCounter++, priority: 1, action: { type: "block" }, condition: { ...baseCondition, regexFilter: cleanRegex } });
                }
                if (hasTypes) {
                    dnrRules.push({ id: idCounter++, priority: 1, action: { type: "block" }, condition: { ...baseCondition, resourceTypes: rule.types, urlFilter: "*" } });
                }
                if (!hasRegex && !hasTypes) {
                    dnrRules.push({ id: idCounter++, priority: 1, action: { type: "block" }, condition: { ...baseCondition, urlFilter: "*" } });
                }
            }
        }

        // --- 3. SCRIPT INJECTION ENGINE ---
        if (rule.enableScript) {
            const scriptCodes = rule.scriptCodes || {
                [rule.scriptTrigger || 'document_idle']: rule.scriptCode || ""
            };

            for (const [trigger, code] of Object.entries(scriptCodes)) {
                if (!code || code.trim() === "") continue;
                activeScriptRules.push({
                    domainList: hostnames,
                    regex: rule.regex ? rule.regex.trim() : null,
                    scriptCode: code,
                    scriptTrigger: trigger
                });
                if (hostnames.length > 0) {
                    hostnames.forEach(h => cspStripDomains.add(h));
                } else {
                    cspStripDomains.add('*');
                }
            }
        }
    }

    // --- 4. BUILD CSP BYPASS RULES ---
    const cspHeaders = [
        { header: "content-security-policy",             operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" },
        { header: "x-webkit-csp",                        operation: "remove" },
        { header: "x-content-security-policy",           operation: "remove" }
    ];

// Always build a global rule if ANY script rule is active
    if (cspStripDomains.size > 0) {
        if (cspStripDomains.has('*')) {
            // Script rule with no domain — must be global
            dnrRules.push({
                id: cspIdCounter++,
                priority: 10,
                action: { type: "modifyHeaders", responseHeaders: cspHeaders },
                condition: { urlFilter: "*", resourceTypes: ["main_frame", "sub_frame"] }
            });
        } else {
            // One rule per domain — try both www and non-www variants
            const expandedDomains = new Set();
            for (const domain of cspStripDomains) {
                expandedDomains.add(domain);
                // Add bare domain if www.x.com was given, and vice versa
                if (domain.startsWith('www.')) {
                    expandedDomains.add(domain.slice(4));
                } else {
                    expandedDomains.add(`www.${domain}`);
                }
            }

            for (const domain of expandedDomains) {
                if (cspIdCounter > 9999) break;
                dnrRules.push({
                    id: cspIdCounter++,
                    priority: 10,
                    action: { type: "modifyHeaders", responseHeaders: cspHeaders },
                    condition: {
                        urlFilter: `*://*.${domain.replace(/^www\./, '')}/*`,
                        resourceTypes: ["main_frame", "sub_frame"]
                    }
                });
            }
        }
    }

    // Apply all DNR rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRules.map(r => r.id),
            addRules: dnrRules
        });
    } catch (e) {
        console.error("[DNR Error] Browser rejected rules:", e);
    }
}

// --- SCRIPT EXECUTION ---
function executeUserScript(tabId, code) {
    if (tabId < 0) return;

    chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: (codeToRun) => {
            try {
                new Function(codeToRun)();
            } catch (e1) {
                console.warn("[WebSurfHelper] new Function blocked, trying script tag...", e1);
                try {
                    const el = document.createElement('script');
                    el.textContent = codeToRun;
                    (document.head || document.documentElement).appendChild(el);
                    el.remove();
                } catch (e2) {
                    console.error("[WebSurfHelper] All execution methods failed:", e2);
                }
            }
        },
        args: [code]
    }).catch((e) => {
        console.error("[WebSurfHelper] executeScript injection failed:", e);
    });
}

// --- NAV EVENT HANDLERS ---
function handleNavEvent(tabId, url, triggerPhase) {
    try {
        const hostname = new URL(url).hostname;
        activeScriptRules.forEach(rule => {
            if (rule.scriptTrigger !== triggerPhase) return;
            if (rule.domainList.length === 0 || rule.domainList.some(domain => hostname.includes(domain))) {
                executeUserScript(tabId, rule.scriptCode);
            }
        });
    } catch (e) {}
}

chrome.webNavigation.onCommitted.addListener((d) => { if (d.frameId === 0) handleNavEvent(d.tabId, d.url, 'document_start'); });
chrome.webNavigation.onDOMContentLoaded.addListener((d) => { if (d.frameId === 0) handleNavEvent(d.tabId, d.url, 'document_end'); });
chrome.webNavigation.onCompleted.addListener((d) => { if (d.frameId === 0) handleNavEvent(d.tabId, d.url, 'document_idle'); });

// --- INTERCEPT TRIGGER ---
chrome.webRequest.onBeforeRequest.addListener((details) => {
    let initiatorUrl = details.initiator || details.documentUrl || details.originUrl;
    if (!initiatorUrl) return;
    try {
        const hostname = new URL(initiatorUrl).hostname;
        activeScriptRules.forEach(rule => {
            if (rule.scriptTrigger !== 'on_intercept') return;
            if (rule.domainList.length > 0 && !rule.domainList.some(domain => hostname.includes(domain))) return;
            if (rule.regex && new RegExp(rule.regex).test(details.url)) {
                executeUserScript(details.tabId, rule.scriptCode);
            }
        });
    } catch (e) {}
}, { urls: ["<all_urls>"] });

// --- INIT & STORAGE WATCH ---
updateEngine();
let updateTimeout = null;
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateEngine, 250);
    }
});
