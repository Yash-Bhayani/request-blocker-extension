// background.js

const SYSTEM_RULES = [
    {
        id: 'system_linkedin_images',
        name: "Block LinkedIn feed images",
        domain: "www.linkedin.com/feed",
        regex: "^https://media\\.licdn\\.com/dms/image/.*",
        types: ["image"],
        conditionLogic: "OR",
        active: true,
        isSystem: true
    },
    {
        id: 'system_linkedin_video',
        name: "Block LinkedIn feed videos",
        domain: "www.linkedin.com/feed",
        regex: "^https://dms\\.licdn\\.com/playlist/vid/.*",
        types: [],
        conditionLogic: "OR",
        active: true,
        isSystem: true
    }
];

async function updateDNRRules() {
    const result = await chrome.storage.local.get("rules");
    let customRules = result.rules || [];

    // 1. Ensure system rules are always present in the storage array
    let storageNeedsUpdate = false;
    for (const sysRule of SYSTEM_RULES) {
        if (!customRules.find(r => r.id === sysRule.id)) {
            customRules.push(sysRule);
            storageNeedsUpdate = true;
        }
    }

    // Save back to storage if we had to inject the system rules
    if (storageNeedsUpdate) {
        await chrome.storage.local.set({ rules: customRules });
    }

    const dnrRules = [];
    let idCounter = 1;

    for (const rule of customRules) {
        if (!rule.active) continue;

        // Parse Domain & Path
        let targetString = rule.domain ? rule.domain.trim().replace(/^https?:\/\//, '') : "";
        let hostname = "";
        let path = "";

        if (targetString) {
            const slashIndex = targetString.indexOf('/');
            if (slashIndex !== -1) {
                hostname = targetString.substring(0, slashIndex);
                path = targetString.substring(slashIndex);
            } else {
                hostname = targetString;
            }
        }

        const baseCondition = {};
        if (hostname) {
            baseCondition.initiatorDomains = [hostname];
        }

        const hasRegex = rule.regex && rule.regex.trim() !== "";
        const hasTypes = rule.types && rule.types.length > 0;
        const logic = rule.conditionLogic || "OR";

        // --- THE "AND" LOGIC PATH ---
        if (logic === "AND") {
            let combinedCondition = { ...baseCondition };

            if (hasRegex) {
                let cleanRegex = rule.regex.trim();
                if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) {
                    cleanRegex = cleanRegex.substring(1, cleanRegex.length - 1);
                }
                combinedCondition.regexFilter = cleanRegex;
            }

            if (hasTypes) {
                combinedCondition.resourceTypes = rule.types;
                if (path && path !== "/" && !hasRegex) {
                    combinedCondition.urlFilter = `||${hostname}${path}*`;
                }
            } else if (!hasRegex) {
                combinedCondition.urlFilter = "*";
            }

            dnrRules.push({
                id: idCounter++,
                priority: 1,
                action: { type: "block" },
                condition: combinedCondition
            });

            // --- THE "OR" LOGIC PATH ---
        } else {
            if (hasRegex) {
                let regexCondition = { ...baseCondition };
                let cleanRegex = rule.regex.trim();
                if (cleanRegex.startsWith('/') && cleanRegex.endsWith('/')) {
                    cleanRegex = cleanRegex.substring(1, cleanRegex.length - 1);
                }
                regexCondition.regexFilter = cleanRegex;

                dnrRules.push({
                    id: idCounter++,
                    priority: 1,
                    action: { type: "block" },
                    condition: regexCondition
                });
            }

            if (hasTypes) {
                let typesCondition = { ...baseCondition };
                typesCondition.resourceTypes = rule.types;
                if (path && path !== "/") {
                    typesCondition.urlFilter = `||${hostname}${path}*`;
                } else {
                    typesCondition.urlFilter = "*";
                }

                dnrRules.push({
                    id: idCounter++,
                    priority: 1,
                    action: { type: "block" },
                    condition: typesCondition
                });
            }

            if (!hasRegex && !hasTypes) {
                let catchAllCondition = { ...baseCondition, urlFilter: "*" };
                dnrRules.push({
                    id: idCounter++,
                    priority: 1,
                    action: { type: "block" },
                    condition: catchAllCondition
                });
            }
        }
    }

    console.log("[DNR] Generated rules:", dnrRules);

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
            addRules: dnrRules
        });

        const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
        console.log(`[DNR SUCCESS] Applied ${activeRules.length} underlying rules!`);
    } catch (e) {
        console.error("[DNR FATAL ERROR] Browser rejected the rules:", e);
    }
}

// Initial load
updateDNRRules();

let dnrUpdateTimeout = null;

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
        if (dnrUpdateTimeout) clearTimeout(dnrUpdateTimeout);
        dnrUpdateTimeout = setTimeout(() => {
            updateDNRRules();
        }, 250);
    }
});