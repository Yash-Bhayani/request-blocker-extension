import Alpine from './main.js'

Alpine.data('ruleManager', () => ({
    rules: [],
    domains: [""],
    ruleName: "",

    enableBlock: true,
    enableScript: false,
    regex: "",
    types: [],
    methods: [],
    conditionLogic: "OR",
    scriptCodes: {
        document_start: "",
        document_end: "",
        document_idle: "",
        on_intercept: ""
    },
    scriptTrigger: "document_idle",
    active: true,
    editingId: null,
    viewingId: null,
    successMessage: "",
    enableCSS: false,
    cssCode: "",

    // --- NEW: Safety Modal State ---
    showSafetyModal: false,
    modalStep: 1,
    aiPromptText: "",

    get titleText() {
        if (this.viewingId) return 'View Rule';
        return this.editingId ? 'Edit Rule' : 'Create Rule';
    },
    get isReadOnly() { return !!this.viewingId; },

    formatTypes(types) { return types && types.length > 0 ? types.join(', ') : '(none)'; },

    get scriptCode() { return this.scriptCodes[this.scriptTrigger] || ""; },
    set scriptCode(val) { if (!this.isReadOnly) this.scriptCodes[this.scriptTrigger] = val; },

    get enabledTriggers() {
        return Object.entries(this.scriptCodes)
            .filter(([_, code]) => code.trim() !== "")
            .map(([trigger]) => trigger);
    },

    init() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('domain')) this.domains = [params.get('domain').split('/')[0]];
        this.loadRules();

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes.rules) {
                this.rules = changes.rules.newValue || [];
            }
        });

        this.$watch('successMessage', (val) => { if (val) setTimeout(() => this.successMessage = "", 3000); });
    },

    addDomainField() { if (!this.isReadOnly) this.domains.push(""); },
    removeDomainField(index) {
        if (this.isReadOnly) return;
        if (this.domains.length > 1) this.domains.splice(index, 1); else this.domains = [""];
    },

    async loadRules() {
        const result = await chrome.storage.local.get("rules");
        this.rules = result.rules || [];
    },

    // --- UPDATED: Initiates the save process ---
    async saveRule() {
        let cleanList = this.domains.map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0]).filter(d => d.length > 0);
        if (cleanList.length === 0) return alert("Please provide at least one Target Domain.");
        if (!this.ruleName.trim()) return alert("Please provide a Rule Name.");
        if (!this.enableBlock && !this.enableScript && !this.enableCSS) return alert("You must enable at least one action: Block Requests or Execute Script or Execute CSS.");
        if (this.enableBlock && !this.regex.trim() && this.types.length === 0) return alert("Blocking enabled: Provide a Regex or Resource Type.");
        if (this.enableScript && this.enabledTriggers.length === 0) return alert("Script enabled: Please provide JavaScript code for at least one trigger.");

        // NEW LOGIC: Only trigger the safety check flow if Custom JavaScript is enabled
        if (this.enableScript) {
            this.modalStep = 1;
            this.showSafetyModal = true;
            return;
        }

        // If it's just CSS or Blocking, save immediately
        this.confirmAndSaveRule(cleanList);
    },

    // --- UPDATED: Sets up the AI prompt based on Developer status ---
    selectDeveloperStatus(isDeveloper) {
        // We only care about the JS code now
        let codeToCheck = "JavaScript:\n" + this.scriptCode + "\n\n";

        if (isDeveloper) {
            this.modalStep = 2.2;
            this.aiPromptText = `I am adding this custom JavaScript to my browser extension. Can you review this script to ensure it is completely safe and does not contain any malicious code, XSS risks, or data stealers?\n\n${codeToCheck.trim()}`;
        } else {
            this.modalStep = 2.1;
            this.aiPromptText = `I am trying to add this custom JavaScript to a browser extension. I am not a developer. Can you check if this exact code is safe to use? Does it contain any malicious scripts, session stealers, trackers, or security risks? Here is the code:\n\n${codeToCheck.trim()}`;
        }
    },

    async copyPrompt() {
        try {
            await navigator.clipboard.writeText(this.aiPromptText);
            alert("Prompt copied to clipboard! Paste it into Chat AI.");
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    },

    cancelSave() {
        this.showSafetyModal = false;
        this.modalStep = 1;
    },

    // --- MOVED: The actual saving logic happens here now ---
    async confirmAndSaveRule(cleanListParam = null) {
        this.showSafetyModal = false;

        // Request persistent permissions when saving a rule
        try {
            const granted = await chrome.permissions.request({ origins: ["<all_urls>"] });
            if (!granted) console.warn("[WebSurfHelper] Host permissions were denied by the user.");
        } catch (e) {
            console.warn("[WebSurfHelper] Permission request ignored or already granted.");
        }

        let cleanList = cleanListParam || this.domains.map(d => d.trim().replace(/^https?:\/\//, '').split('/')[0]).filter(d => d.length > 0);
        let combinedDomains = cleanList.join(', ');

        const ruleData = {
            name: this.ruleName.trim(),
            domain: combinedDomains,
            enableBlock: this.enableBlock,
            enableScript: this.enableScript,
            regex: this.regex.trim(),
            types: this.types,
            methods: this.methods,
            conditionLogic: this.conditionLogic,
            scriptCodes: { ...this.scriptCodes },
            active: this.active,
            enableCSS: this.enableCSS,
            cssCode: this.cssCode.trim(),
        };

        if (this.editingId) {
            const index = this.rules.findIndex(r => r.id === this.editingId);
            if (index !== -1 && !this.rules[index].isSystem) {
                this.rules[index] = { ...this.rules[index], ...ruleData };
            }
            this.editingId = null;
        } else {
            this.rules.push({ id: Date.now(), ...ruleData, isSystem: false });
        }

        await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        this.successMessage = "Rule saved successfully!";
        this.clearForm();
    },
    // ----------------------------------------------------

    viewRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (!rule) return;
        this.viewingId = rule.id;
        this.editingId = null;
        this.ruleName = rule.name || "";
        this.domains = rule.domain ? rule.domain.split(', ') : [""];
        this.enableBlock = rule.enableBlock !== false;
        this.enableScript = rule.enableScript || false;
        this.enableCSS = rule.enableCSS || false;
        this.regex = rule.regex || "";
        this.types = rule.types || [];
        this.methods = rule.methods || [];
        this.conditionLogic = rule.conditionLogic || "OR";
        this.scriptCodes = rule.scriptCodes
            ? { ...{ document_start: "", document_end: "", document_idle: "", on_intercept: "" }, ...rule.scriptCodes }
            : { document_start: "", document_end: "", document_idle: rule.scriptCode || "", on_intercept: "" };
        this.scriptTrigger = this.enabledTriggers[0] || "document_idle";
        this.cssCode = rule.cssCode || "";
        this.active = rule.active;
        this.$nextTick(() => document.querySelector('.card').scrollIntoView({ behavior: 'smooth' }));
    },

    editRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && !rule.isSystem) {
            this.viewingId = null;
            this.editingId = rule.id;
            this.ruleName = rule.name || "";
            this.domains = rule.domain ? rule.domain.split(', ') : [""];
            this.enableBlock = rule.enableBlock !== false;
            this.enableScript = rule.enableScript || false;
            this.regex = rule.regex || "";
            this.types = rule.types || [];
            this.methods = rule.methods || [];
            this.conditionLogic = rule.conditionLogic || "OR";
            this.scriptCodes = rule.scriptCodes
                ? { ...{ document_start: "", document_end: "", document_idle: "", on_intercept: "" }, ...rule.scriptCodes }
                : { document_start: "", document_end: "", document_idle: rule.scriptCode || "", on_intercept: "" };
            this.scriptTrigger = rule.scriptTrigger || "document_idle";
            this.active = rule.active;
            this.enableCSS = rule.enableCSS || false;
            this.cssCode = rule.cssCode || "";

            // --- NEW: Smoothly scroll to the top of the page ---
            this.$nextTick(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    },

    async deleteRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule && rule.isSystem) return alert("System rules cannot be deleted.");
        if (confirm("Are you sure you want to delete this rule?")) {
            this.rules = this.rules.filter(r => r.id !== id);
            await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        }
    },

    async toggleRuleStatus(id, newStatus) {
        const rule = this.rules.find(r => r.id === id);
        if (rule) {
            rule.active = newStatus;
            await chrome.storage.local.set({ rules: JSON.parse(JSON.stringify(this.rules)) });
        }
    },

    clearForm() {
        this.editingId = null;
        this.viewingId = null;
        this.ruleName = "";
        this.domains = [""];
        this.enableBlock = true;
        this.enableScript = false;
        this.regex = "";
        this.types = [];
        this.methods = [];
        this.conditionLogic = "OR";
        this.scriptCodes = { document_start: "", document_end: "", document_idle: "", on_intercept: "" };
        this.scriptTrigger = "document_idle";
        this.active = true;
        this.enableCSS = false;
        this.cssCode = "";
    }
}));

Alpine.start();