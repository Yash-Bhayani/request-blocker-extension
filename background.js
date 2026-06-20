const SYSTEM_RULES = [
    {
        id: 'system_linkedin_images',
        name: "block linked in images",
        domain: "www.linkedin.com",
        regex: "^https://media\\.licdn\\.com/dms/image/.*",
        types: ["image"],
        conditionLogic: "OR",
        active: true,
        isSystem: true
    },
    {
        id: 'system_linkedin_video',
        name: "block linked video",
        domain: "www.linkedin.com",
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

    // Ensure system rules are present
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
    let idCounter = 1;

    for (const rule of customRules) {
        if (!rule.active) continue;

        // NEW: Parse comma-separated domains into a clean list of hostnames
        const baseCondition = {};
        if (rule.domain && rule.domain.trim() !== "") {
            const hostnames = rule.domain.split(',')
                .map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0])
                .filter(d => d.length > 0);

            if (hostnames.length > 0) {
                baseCondition.initiatorDomains = hostnames; // Passes array of domains to browser
            }
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
                typesCondition.urlFilter = "*";

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

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
            addRules: dnrRules
        });
    } catch (e) {
        console.error("[DNR FATAL ERROR] Browser rejected the rules:", e);
    }
}

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