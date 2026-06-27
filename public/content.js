// WSH Content Script
'use strict';

const appliedStyles = {};

function applyCSS(css, ruleId) {
    const styleId = 'wsh-css-' + ruleId;
    let el = document.getElementById(styleId);
    if (!el) {
        el = document.createElement('style');
        el.id = styleId;
        (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
    appliedStyles[ruleId] = css;
    console.log('[WSH:content] applyCSS ruleId=', ruleId);
}

function removeCSS(ruleId) {
    const el = document.getElementById('wsh-css-' + ruleId);
    if (el) el.remove();
    delete appliedStyles[ruleId];
    console.log('[WSH:content] removeCSS ruleId=', ruleId);
}

function reapplyAll() {
    for (const [ruleId, css] of Object.entries(appliedStyles)) {
        applyCSS(css, ruleId);
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'WSH_INSERT_CSS') {
        applyCSS(msg.css, msg.ruleId);
        sendResponse({ ok: true });
    }
    if (msg.type === 'WSH_REMOVE_CSS') {
        removeCSS(msg.ruleId);
        sendResponse({ ok: true });
    }
    if (msg.type === 'WSH_EXEC_SCRIPT') {
        // Inject as <script> tag into the page -- bypasses extension CSP
        // because the script runs in the page's own context
        try {
            const el = document.createElement('script');
            el.textContent = msg.code;
            (document.head || document.documentElement).appendChild(el);
            el.remove();
            console.log('[WSH:content] WSH_EXEC_SCRIPT injected OK');
            sendResponse({ ok: true });
        } catch(e) {
            console.error('[WSH:content] WSH_EXEC_SCRIPT failed:', e.message);
            sendResponse({ ok: false, error: e.message });
        }
    }
});

// Request CSS from background, retry if background not ready yet or returned 0 rules
function requestCSS(attempt = 1) {
    console.log('[WSH:content] requestCSS attempt=', attempt, 'hostname=', location.hostname);
    chrome.runtime.sendMessage({ type: 'WSH_REQUEST_CSS', hostname: location.hostname })
        .then(resp => {
            if (!resp || !resp.rules) {
                console.warn('[WSH:content] no response, retry attempt=', attempt);
                if (attempt < 8) setTimeout(() => requestCSS(attempt + 1), attempt * 300);
                return;
            }
            if (resp.rules.length === 0 && attempt < 8) {
                // Background may still be initializing
                console.log('[WSH:content] got 0 rules, retry attempt=', attempt);
                setTimeout(() => requestCSS(attempt + 1), attempt * 300);
                return;
            }
            console.log('[WSH:content] got', resp.rules.length, 'CSS rules');
            for (const { css, ruleId } of resp.rules) {
                applyCSS(css, ruleId);
            }
        })
        .catch(e => {
            console.warn('[WSH:content] requestCSS failed attempt=', attempt, e.message);
            if (attempt < 8) setTimeout(() => requestCSS(attempt + 1), attempt * 300);
        });
}

// Re-apply on SPA navigation
function patchHistory() {
    const wrap = (fn) => function(...args) {
        const result = fn.apply(this, args);
        setTimeout(reapplyAll, 0);
        return result;
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', () => setTimeout(reapplyAll, 0));
}
// https://scontent.fraj3-5.fna.fbcdn.net/v/t39.99422-6/733127125_1500543798425430_7322800316609469396_n.png?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=Xr64h4AO-CYQ7kNvwEmIu8U&_nc_oc=AdrobY3UpC7_pJAwD8YDh9TTPRXIYn1iRJfNer5q1WgAgcG3FMcynAGma_i2URg2mr63_g5LdfqKo2m_l-DicknS&_nc_zt=14&_nc_ht=scontent.fraj3-5.fna&_nc_gid=dYFupA-SUI5EnsO5tr3YYQ&_nc_ss=7b2a8&oh=00_Af_mmAEbuT22YkZPndzCQcKpsEqVvLm19oErLUsjN6-J8A&oe=6A45DE90
patchHistory();
requestCSS();
console.log('[WSH:content] content script ready on', location.hostname);