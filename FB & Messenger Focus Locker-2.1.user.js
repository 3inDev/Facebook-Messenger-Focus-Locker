// ==UserScript==
// @name         FB & Messenger Focus Locker
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Blocks FB and Messenger. Fixed Emergency Unlock bug.
// @author       Ein
// @match        *://*.facebook.com/*
// @match        *://facebook.com/*
// @match        *://*.messenger.com/*
// @match        *://messenger.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// ==/UserScript==

(async function () {
    'use strict';

    const LOCK_KEY = 'tm_fb_lock_until_v2';
    const SHAME_PHRASE = "I'm a failure";

    const now = () => Date.now();
    const formatTime = (ms) => {
        if (ms <= 0) return '00:00';
        const s = Math.ceil(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        #tm-focus-widget {
            position: fixed; bottom: 20px; left: 20px; width: 180px;
            background: #242526; color: #e4e6eb; padding: 12px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-family: sans-serif; z-index: 999999; border: 1px solid #3e4042;
        }
        #tm-focus-header { display: flex; justify-content: space-between; cursor: move; margin-bottom: 8px; font-weight: bold; }
        .tm-input-group { display: flex; gap: 5px; }
        #tm-min-input { flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #3e4042; background: #3a3b3c; color: white; width: 50px; }
        #tm-lock-btn { padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; background: #2d88ff; color: white; font-weight: 600; }
        #tm-timer-display { font-size: 12px; color: #b0b3b8; margin-top: 6px; text-align: center; }

        #tm-focus-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.98); color: white;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 2147483647; font-family: sans-serif; pointer-events: all;
        }
        .tm-overlay-cnt { font-size: 5rem; font-weight: 800; color: #ff4d4d; margin: 20px 0; }
        #tm-emergency-unlock {
            background: #333; border: 1px solid #444; color: #888;
            padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;
        }
        #tm-emergency-unlock:hover { background: #444; color: #ccc; }
    `;
    document.head.appendChild(styleSheet);

    const widget = document.createElement('div');
    widget.id = 'tm-focus-widget';
    widget.innerHTML = `
        <div id="tm-focus-header"><span>Focus Locker</span></div>
        <div class="tm-input-group">
            <input id="tm-min-input" type="number" min="1" value="25">
            <button id="tm-lock-btn">Lock</button>
        </div>
        <div id="tm-timer-display">Ready</div>
    `;
    document.body.appendChild(widget);

    let isDragging = false, ox, oy;
    widget.onmousedown = (e) => {
        if(e.target.closest('.tm-input-group')) return;
        isDragging = true;
        ox = e.clientX - widget.offsetLeft; oy = e.clientY - widget.offsetTop;
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        widget.style.left = (e.clientX - ox) + 'px';
        widget.style.top = (e.clientY - oy) + 'px';
        widget.style.bottom = 'auto';
    };
    document.onmouseup = () => isDragging = false;

    async function update() {
        const lockUntil = Number(await GM_getValue(LOCK_KEY, 0));
        const remaining = lockUntil - now();
        const btn = document.getElementById('tm-lock-btn');
        const display = document.getElementById('tm-timer-display');
        let overlay = document.getElementById('tm-focus-overlay');

        if (remaining > 0) {
            btn.disabled = true;
            display.textContent = `Locked: ${formatTime(remaining)}`;

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'tm-focus-overlay';
                overlay.innerHTML = `
                    <div style="font-size:24px">FOCUS MODE IS RUNNING...</div>
                    <div id="tm-countdown" class="tm-overlay-cnt">${formatTime(remaining)}</div>
                    <button id="tm-emergency-unlock">Emergency Unlock</button>
                `;
                document.body.appendChild(overlay);
                document.documentElement.style.overflow = 'hidden';
                overlay.querySelector('#tm-emergency-unlock').onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const input = prompt(`To unlock, write this:\n"${SHAME_PHRASE}"`);
                    if (input === SHAME_PHRASE) {
                        await GM_setValue(LOCK_KEY, 0);
                        update();
                    }
                };
            } else {
                document.getElementById('tm-countdown').textContent = formatTime(remaining);
            }
        } else {
            btn.disabled = false;
            display.textContent = "Ready";
            if (overlay) {
                overlay.remove();
                document.documentElement.style.overflow = '';
            }
        }
    }

    document.getElementById('tm-lock-btn').onclick = async () => {
        const mins = document.getElementById('tm-min-input').value;
        await GM_setValue(LOCK_KEY, now() + mins * 60000);
        update();
    };
    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(LOCK_KEY, () => update());
    }
    setInterval(update, 1000);
    update();

})();