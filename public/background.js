// background.js

const SYSTEM_RULES = [
    {
        id: 'system_linkedin_images',
        name: "Block LinkedIn Images",
        domain: "www.linkedin.com",
        regex: "^https://media\\.licdn\\.com/dms/image/.*",
        types: ["image"],
        conditionLogic: "OR",
        active: false, // Disabled by default as requested
        isSystem: true,
        enableBlock: true,  // New property for Web Surf Helper
        enableScript: false // New property for Web Surf Helper
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
    }
];

let activeScriptRules = [];

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
    activeScriptRules = []; // Reset script cache
    let idCounter = 1;

    for (const rule of customRules) {
        if (!rule.active) continue;

        // Clean domains (Supports the multi-domain array)
        let hostnames = [];
        if (rule.domain && rule.domain.trim() !== "") {
            hostnames = rule.domain.split(',')
                .map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0])
                .filter(d => d.length > 0);
        }

        // --- 2. THE ORIGINAL DNR BLOCKING ENGINE ---
        // Defaults to true for older rules that don't have enableBlock set yet
        if (rule.enableBlock !== false) {
            const baseCondition = {};
            if (hostnames.length > 0) baseCondition.initiatorDomains = hostnames;

            const hasRegex = rule.regex && rule.regex.trim() !== "";
            const hasTypes = rule.types && rule.types.length > 0;
            const logic = rule.conditionLogic || "OR";

            if (logic === "AND") {
                let combinedCondition = { ...baseCondition };
                if (hasRegex) {
                    let cleanRegex = rule.regex.trim();
                    if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) cleanRegex = cleanRegex.substring(1, cleanRegex.length - 1);
                    combinedCondition.regexFilter = cleanRegex;
                }
                if (hasTypes) combinedCondition.resourceTypes = rule.types;
                else if (!hasRegex) combinedCondition.urlFilter = "*";

                dnrRules.push({ id: idCounter++, priority: 1, action: { type: "block" }, condition: combinedCondition });
            } else {
                if (hasRegex) {
                    let cleanRegex = rule.regex.trim();
                    if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) cleanRegex = cleanRegex.substring(1, cleanRegex.length - 1);
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

        // --- 3. THE NEW SCRIPT INJECTION ENGINE ---
        if (rule.enableScript && rule.scriptCode && rule.scriptCode.trim() !== "") {
            activeScriptRules.push({
                domainList: hostnames,
                regex: rule.regex ? rule.regex.trim() : null,
                scriptCode: rule.scriptCode,
                scriptTrigger: rule.scriptTrigger || "document_idle"
            });
        }
    }

    // Apply DNR Rules
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

// --- SCRIPT EXECUTION LOGIC ---
function executeUserScript(tabId, code) {
    if (tabId < 0) return;
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: "MAIN",
        func: (injectedCode) => {
            try {
                const el = document.createElement('script');
                el.textContent = injectedCode;
                (document.head || document.documentElement).appendChild(el);
                el.remove();
            } catch (e) { console.error("Web Surf Helper Script Error:", e); }
        },
        args: [code]
    }).catch(() => {});
}

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

chrome.webRequest.onBeforeRequest.addListener((details) => {
    if (!details.initiator) return;
    try {
        const hostname = new URL(details.initiator).hostname;
        activeScriptRules.forEach(rule => {
            if (rule.scriptTrigger !== 'on_intercept') return;
            if (rule.domainList.length > 0 && !rule.domainList.some(domain => hostname.includes(domain))) return;
            if (rule.regex && new RegExp(rule.regex).test(details.url)) {
                executeUserScript(details.tabId, rule.scriptCode);
            }
        });
    } catch (e) {}
}, { urls: ["<all_urls>"] });

updateEngine();
let updateTimeout = null;
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateEngine, 250);
    }
});