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
        name: "LinkedIn auto click on 'more' (Only reference purpose)",
        domain: "www.linkedin.com",
        regex: "^https:\\/\\/www\\.linkedin\\.com\\/flagship-web\\/rsc-action\\/actions\\/pagination(?:\\?.*)?$",
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
    },
    {
        id: 'system_linkedin_post_auto_expand',
        name: "LinkedIn Post Auto Expand",
        domain: "www.linkedin.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: false,
        enableCSS: true,
        cssCode: `[data-testid=expandable-text-button] {
    display: none;
}
[data-testid=expandable-text-box] {
    -webkit-line-clamp: unset;
}`
    },
    {
        id: 'system_linked_in_hide_right_sidebar',
        name: "LinkedIn Hide Right Sidebar",
        domain: "www.linkedin.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: false,
        enableCSS: true,
        cssCode: `
        #workspace aside[aria-label="Aside"] {
            display:none;
        }
        #workspace section[aria-label="Primary content"] {
            grid-column-end: -1;
        }
        
        #workspace [data-sdui-screen="com.linkedin.sdui.flagshipnav.search.SearchResultsContent"] section[aria-label="Primary content"] > div:nth-child(1) {
            grid-template-columns: unset;
        }
        #workspace [data-sdui-screen="com.linkedin.sdui.flagshipnav.search.SearchResultsContent"] section[aria-label="Primary content"] > div:nth-child(1) > div:nth-child(2) {
            display:none;
        }
        `
    },
    {
        id: 'system_linked_in_hide_left_sidebar',
        name: "LinkedIn Hide Left Sidebar",
        domain: "www.linkedin.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: false,
        enableCSS: true,
        cssCode: `
        #workspace aside[aria-label="Sidebar"] {
            display:none;
        }
        #workspace section[aria-label="Primary content"] {
            grid-column-start: 1;
        }
        `
    },
    {
        id: 'system_fb_clean_feed_mode',
        name: "Facebook CleanFeed Mode",
        domain: "www.facebook.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: false,
        enableCSS: true,
        cssCode: `
        html#facebook body .xornbnt > * {
    display: none;
}

html#facebook body .xornbnt > div[role=main] {
    display: flex;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli {
    width: 100%;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow {
    width: 100%;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl .x1n2onr6 a.x1pdlv7q > .x6ikm8r > div {
    width: 100% !important;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl > .x1n2onr6 > .x1n2onr6 {
    display: flex;
    display: block;
    padding-top: unset!important;
    justify-content: center;
    margin: 0 auto;
    text-align: center;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl > .x1n2onr6 > .x1n2onr6:not(.xl56j7k) > .x10l6tqk {
    position: static;
    display: inline-block;
    width:100%;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl > .x1n2onr6 > .x1n2onr6:not(.xl56j7k) > .x10l6tqk > a.x1pdlv7q {
    position: relative;
    width:100%;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl .x1n2onr6 a.x1pdlv7q > .x6ikm8r .x1n2onr6 {
    display: inline;
    padding-top: unset;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl .x1n2onr6 a.x1pdlv7q > .x6ikm8r .x1n2onr6 > .x13vifvy {
    position: relative;
}

html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl .x1n2onr6 a.x1pdlv7q > .x6ikm8r .x1n2onr6 > .x13vifvy img {
    display: block;
    max-width: 100%;
    width: auto !important;
    height: auto;
    position: relative;
    left: 50%;
    transform: translateX(-50%);
}
        `
    },
    {
        id: 'system_fb_full_width_images',
        name: "Facebook Full Width Images",
        domain: "www.facebook.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: false,
        enableCSS: true,
        cssCode: `
            html#facebook body .xornbnt > div[role=main] > .xeuugli .x1v0nzow .x6o7n8i .x1lliihq .html-div.x1c1uobl .x1n2onr6 a.x1pdlv7q > .x6ikm8r .x1n2onr6 > .x13vifvy img { width:100%!important; }
        `
    },
    {
        id: 'system_fb_high_res_images',
        name: "Facebook High-Res Images",
        domain: "www.facebook.com",
        regex: "",
        types: [],
        conditionLogic: "OR",
        active: false,
        isSystem: true,
        enableBlock: false,
        enableScript: true,
        scriptTrigger: "document_idle",
        scriptCodes: {
            document_start: "console.log('start')",
            document_end: "console.log('end')",
            document_idle: `
            console.log('dc_start');
const processImage = (img) => {
console.log('called');
    if (img.tagName !== 'IMG' || !img.src.includes('fbcdn.net')) return;

    let url = img.src;
    if(url.includes('cstp=') && url.includes('ctp=')) {
        try {
            let urlObj = new URL(url);
            let cstp = urlObj.searchParams.get('cstp');
            let currentCtp = urlObj.searchParams.get('ctp');

            if (cstp && currentCtp && cstp !== currentCtp) {
                let targetCtp = cstp.replace(/^[a-zA-Z]+/, 's');
                if (currentCtp !== targetCtp) {
                    urlObj.searchParams.set('ctp', targetCtp);
                    img.src = urlObj.toString();
                }
            }
        } catch(e) {
        console.log('error while adding high res images', e);
        }
    }
};

document.querySelectorAll('img[src*="fbcdn.net"]').forEach(processImage);

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                if (node.tagName === 'IMG') {
                    processImage(node);
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('img[src*="fbcdn.net"]').forEach(processImage);
                }
            }
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
`.trim(),
            on_intercept: ""
        }
    }
];

let activeScriptRules = [];
let activeCSSRules = [];

const CSP_RULE_ID_START = 9000; // Reserve 9000-9999 for CSP bypass rules

async function updateEngine() {
    const L = (...a) => console.log('[WSH]', ...a);
    const LE = (...a) => console.error('[WSH:ERR]', ...a);
    L('updateEngine: START');
    const result = await chrome.storage.local.get("rules");
    let customRules = result.rules || [];
    L('updateEngine: loaded', customRules.length, 'rules from storage');

// --- 1. PRESERVE SYSTEM RULES ---
    let storageNeedsUpdate = false;

    // A. Remove any old system rules from storage that no longer exist in background.js
    const validSystemIds = SYSTEM_RULES.map(r => r.id);
    const initialLength = customRules.length;
    customRules = customRules.filter(r => !r.isSystem || validSystemIds.includes(r.id));
    if (customRules.length !== initialLength) storageNeedsUpdate = true;

    // B. Add new system rules OR update existing ones
    for (const sysRule of SYSTEM_RULES) {
        const existingIndex = customRules.findIndex(r => r.id === sysRule.id);

        if (existingIndex === -1) {
            // Rule doesn't exist at all, add it
            customRules.push(sysRule);
            storageNeedsUpdate = true;
        } else {
            // Rule exists, update its properties (like Name, CSS, Regex)
            // but preserve the user's On/Off toggle state!
            const userActiveState = customRules[existingIndex].active;
            const updatedRule = { ...sysRule, active: userActiveState };

            // Only trigger a storage save if something actually changed
            if (JSON.stringify(customRules[existingIndex]) !== JSON.stringify(updatedRule)) {
                customRules[existingIndex] = updatedRule;
                storageNeedsUpdate = true;
            }
        }
    }

    if (storageNeedsUpdate) {
        L('updateEngine: saving updated rules to storage');
        await chrome.storage.local.set({ rules: customRules });
    }
    const dnrRules = [];
    activeScriptRules = [];
    activeCSSRules = [];
    let idCounter = 1;       // 1-8999 for block rules
    let cspIdCounter = CSP_RULE_ID_START; // 9000+ for CSP bypass rules

    // Collect domains that need CSP stripped (enableScript: true + active)
    const cspStripDomains = new Set();

    L('updateEngine: processing', customRules.length, 'rules, active script rules before:', activeScriptRules.length, 'css rules before:', activeCSSRules.length);
    for (const rule of customRules) {
        if (!rule.active) { continue; }
        L('updateEngine: processing active rule id=', rule.id, 'enableBlock=', rule.enableBlock, 'enableScript=', rule.enableScript, 'enableCSS=', rule.enableCSS);

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
                L('updateEngine: SCRIPT RULE added trigger=', trigger, 'domains=', hostnames, 'codeLen=', code.length);
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

        // --- 4. CSS INJECTION ENGINE ---
        if (rule.enableCSS && rule.cssCode && rule.cssCode.trim() !== "") {
            L('updateEngine: CSS RULE added ruleId=', rule.id, 'domains=', hostnames);
            activeCSSRules.push({
                domainList: hostnames,
                cssCode: rule.cssCode,
                ruleId: rule.id
            });
        }
    }

    // --- 5. BUILD CSP BYPASS RULES ---
    const cspHeaders = [
        { header: "content-security-policy",             operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" },
        { header: "x-webkit-csp",                        operation: "remove" },
        { header: "x-content-security-policy",           operation: "remove" }
    ];

// Always build a global rule if ANY script rule is active
    if (cspStripDomains.size > 0) {
        if (cspStripDomains.has('*')) {
            // Script rule with no domain -- must be global
            dnrRules.push({
                id: cspIdCounter++,
                priority: 10,
                action: { type: "modifyHeaders", responseHeaders: cspHeaders },
                condition: { urlFilter: "*", resourceTypes: ["main_frame", "sub_frame"] }
            });
        } else {
            // One rule per domain -- try both www and non-www variants
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

    L('updateEngine: applying', dnrRules.length, 'DNR rules,', activeScriptRules.length, 'script rules,', activeCSSRules.length, 'CSS rules');
    // Apply all DNR rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRules.map(r => r.id),
            addRules: dnrRules
        });
    } catch (e) {
        LE('updateEngine: DNR rejected rules:', e);
    }

    // --- 6. REGISTER DYNAMIC CONTENT SCRIPTS FOR CSS ---
    L('updateEngine: registering', activeCSSRules.length, 'CSS content scripts');
    await syncRegisteredCSSScripts();
    L('updateEngine: DONE');
}

// --- SCRIPT EXECUTION ---
const L = (...a) => console.log('[WSH]', ...a);
const LW = (...a) => console.warn('[WSH:WARN]', ...a);
const LE = (...a) => console.error('[WSH:ERR]', ...a);

function isValidTabUrl(url) {
    const valid = !!(url && (url.startsWith('http://') || url.startsWith('https://')));
    if (!valid) L('isValidTabUrl: SKIP non-http url:', url);
    return valid;
}

function executeUserScript(tabId, code) {
    L('executeUserScript: called tabId=', tabId, 'codeLen=', code?.length);
    if (tabId < 0) { L('executeUserScript: SKIP tabId < 0'); return; }

    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) { L('executeUserScript: tabs.get error:', chrome.runtime.lastError.message); return; }
        if (!tab?.url) { L('executeUserScript: SKIP no url'); return; }
        if (!isValidTabUrl(tab.url)) { L('executeUserScript: SKIP invalid url:', tab.url); return; }

        L('executeUserScript: sending via content script to', tab.url);

        // Send code to content.js which injects it as a <script> tag in the page
        // This bypasses CSP because content scripts can manipulate the DOM
        chrome.tabs.sendMessage(tabId, { type: 'WSH_EXEC_SCRIPT', code })
            .then(() => L('executeUserScript: content script ack tabId=', tabId))
            .catch(e => {
                LE('executeUserScript: sendMessage failed, ensuring content script first:', e.message);
                // Content script not ready yet -- inject it first then retry
                ensureContentScriptAndSendCSS(tabId, new URL(tab.url).hostname).then(() => {
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { type: 'WSH_EXEC_SCRIPT', code })
                            .then(() => L('executeUserScript: retry OK tabId=', tabId))
                            .catch(e2 => LE('executeUserScript: retry failed:', e2.message));
                    }, 200);
                });
            });
    });
}

// --- CSS CONTENT SCRIPT REGISTRATION (Firefox-compatible) ---
// Injects CSS into open tabs; nav handler covers future navigations.

async function syncRegisteredCSSScripts() {
    const tabs = await chrome.tabs.query({});
    L('syncRegisteredCSSScripts: pushing CSS to', tabs.length, 'open tabs');

    for (const tab of tabs) {
        if (!tab.url || !isValidTabUrl(tab.url)) continue;
        try {
            const hostname = new URL(tab.url).hostname;
            const matchingRules = activeCSSRules.filter(rule =>
                rule.domainList.length === 0 || rule.domainList.some(d => hostname.includes(d))
            );
            if (matchingRules.length === 0) continue;
            L('syncRegisteredCSSScripts: tab', tab.url, 'has', matchingRules.length, 'matching rules');
            await ensureContentScriptAndSendCSS(tab.id, hostname);
        } catch(e) {}
    }
}

// Keep removeUserCSS working for the storage toggle handler
function removeUserCSS(tabId, ruleId) {
    L('removeUserCSS: sendMessage tabId=', tabId, 'ruleId=', ruleId);
    if (tabId < 0) return;
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url || !isValidTabUrl(tab.url)) return;
        chrome.tabs.sendMessage(tabId, { type: 'WSH_REMOVE_CSS', ruleId })
            .then(resp => L('removeUserCSS: content script ack ruleId=', ruleId, 'resp=', resp))
            .catch(e => LE('removeUserCSS: sendMessage failed tabId=', tabId, 'ruleId=', ruleId, 'err=', e.message));
    });
}

function executeUserCSS(tabId, css, ruleId, attempt = 1) {
    L('executeUserCSS: sendMessage tabId=', tabId, 'ruleId=', ruleId, 'attempt=', attempt);
    if (tabId < 0) return;
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url || !isValidTabUrl(tab.url)) return;
        chrome.tabs.sendMessage(tabId, { type: 'WSH_INSERT_CSS', css, ruleId })
            .then(resp => L('executeUserCSS: OK ruleId=', ruleId, 'tabId=', tabId))
            .catch(e => {
                if (attempt < 5) {
                    const delay = attempt * 200;
                    L('executeUserCSS: retry in', delay, 'ms attempt=', attempt);
                    setTimeout(() => executeUserCSS(tabId, css, ruleId, attempt + 1), delay);
                } else {
                    LE('executeUserCSS: ALL retries failed tabId=', tabId, 'ruleId=', ruleId, 'err=', e.message);
                }
            });
    });
}
// Track which tabs have content.js injected: tabId -> true
const contentScriptInjected = new Set();

// Inject content.js into a tab if not already done, then send CSS
async function ensureContentScriptAndSendCSS(tabId, hostname) {
    if (!contentScriptInjected.has(tabId)) {
        L('ensureContentScript: injecting content.js into tabId=', tabId);
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            contentScriptInjected.add(tabId);
            L('ensureContentScript: injected OK tabId=', tabId);
        } catch(e) {
            LE('ensureContentScript: FAILED tabId=', tabId, 'err=', e.message);
            return;
        }
    }

    // Send matching CSS rules
    const rules = activeCSSRules.filter(rule =>
        rule.domainList.length === 0 || rule.domainList.some(d => hostname.includes(d))
    );
    L('ensureContentScript: sending', rules.length, 'CSS rules to tabId=', tabId);
    for (const rule of rules) {
        chrome.tabs.sendMessage(tabId, { type: 'WSH_INSERT_CSS', css: rule.cssCode, ruleId: rule.ruleId })
            .then(() => L('ensureContentScript: CSS sent OK ruleId=', rule.ruleId))
            .catch(e => LE('ensureContentScript: sendMessage failed ruleId=', rule.ruleId, 'err=', e.message));
    }
}

// Clear injection tracking when tab navigates (full reload)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        contentScriptInjected.delete(tabId);
        L('tabs.onUpdated: loading tabId=', tabId);
    }
    // Try injecting when tab finishes loading - 'complete' fires after full page load
    if (changeInfo.status === 'complete' && tab.url && isValidTabUrl(tab.url)) {
        L('tabs.onUpdated: complete tabId=', tabId, 'url=', tab.url);
        try {
            const hostname = new URL(tab.url).hostname;
            // Small delay to let page settle
            setTimeout(() => ensureContentScriptAndSendCSS(tabId, hostname), 500);
        } catch(e) {}
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    contentScriptInjected.delete(tabId);
});

// --- NAV EVENT HANDLERS ---
function handleNavEvent(tabId, url, triggerPhase) {
    L('handleNavEvent: tabId=', tabId, 'phase=', triggerPhase, 'url=', url);
    try {
        const hostname = new URL(url).hostname;

        activeScriptRules.forEach(rule => {
            if (rule.scriptTrigger !== triggerPhase) return;
            if (rule.domainList.length === 0 || rule.domainList.some(domain => hostname.includes(domain))) {
                L('handleNavEvent: SCRIPT match phase=', triggerPhase, 'hostname=', hostname);
                executeUserScript(tabId, rule.scriptCode);
            }
        });

        if (triggerPhase === 'document_idle' && isValidTabUrl(url)) {
            ensureContentScriptAndSendCSS(tabId, hostname);
        }
    } catch (e) {
        LE('handleNavEvent: exception:', e.message);
    }
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
                L('onBeforeRequest: INTERCEPT match hostname=', hostname, 'url=', details.url);
                executeUserScript(details.tabId, rule.scriptCode);
            }
        });
    } catch (e) {}
}, { urls: ["<all_urls>"] });

// --- INIT & STORAGE WATCH ---
L('background.js loaded, registering content script then calling updateEngine()');

// On Firefox, host permissions for already-open tabs require explicit runtime grant.
// Request it once on install/startup.
chrome.permissions.request({ origins: ['<all_urls>'] })
    .then(granted => L('permissions.request <all_urls>:', granted ? 'GRANTED' : 'DENIED or already had it'))
    .catch(e => L('permissions.request skipped (no user gesture):', e.message));

// Programmatically register content.js since manifest content_scripts may be ignored
async function registerContentScript() {
    try {
        const existing = await chrome.scripting.getRegisteredContentScripts({ ids: ['wsh-main-content'] });
        if (existing.length > 0) {
            L('registerContentScript: already registered, skipping');
            return;
        }
    } catch(e) {}

    try {
        await chrome.scripting.registerContentScripts([{
            id: 'wsh-main-content',
            matches: ['<all_urls>'],
            js: ['content.js'],
            runAt: 'document_start',
            allFrames: false,
            persistAcrossSessions: true
        }]);
        L('registerContentScript: registered OK');
    } catch(e) {
        LE('registerContentScript: failed:', e.message);
    }
}

registerContentScript();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'WSH_CONTENT_READY') {
        L('WSH_CONTENT_READY: content script live on', msg.hostname);
    }

    if (msg.type === 'WSH_REQUEST_CSS') {
        const hostname = msg.hostname;
        L('WSH_REQUEST_CSS: from', hostname, 'activeCSSRules=', activeCSSRules.length);
        const rules = activeCSSRules
            .filter(rule => rule.domainList.length === 0 || rule.domainList.some(d => hostname.includes(d)))
            .map(rule => ({ css: rule.cssCode, ruleId: rule.ruleId }));
        L('WSH_REQUEST_CSS: sending', rules.length, 'rules to', hostname);
        sendResponse({ rules });
        return true; // keep channel open for async sendResponse
    }
});
updateEngine();
let updateTimeout = null;
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
        L('storage.onChanged: rules changed');
        const oldRules = changes.rules.oldValue || [];
        const newRules = changes.rules.newValue || [];

        // updateEngine re-syncs CSS on every rule change
        L('storage.onChanged: will re-sync via updateEngine');

        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(updateEngine, 250);
    }
});