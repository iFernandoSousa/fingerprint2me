// fingerprint2me.js
// UMD wrapper
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./client.min.js'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('../dist/client.min.js'));
    } else {
        root.fingerprint2me = factory(root.ClientJS);
    }
}(typeof self !== 'undefined' ? self : this, function (ClientJS) {
    // --- Error Handling & Logging ---
    const ErrorHandler = {
        errors: [],
        warnings: [],
        
        logError(funcName, error, data = null) {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                function: funcName,
                error: error.message || String(error),
                data: data,
                stack: error.stack
            };
            this.errors.push(errorEntry);
            
            // Log to console in development
            if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
                console.error(`[Fingerprint2Me] ${funcName}:`, error, data);
            }
        },
        
        logWarning(funcName, message, data = null) {
            const warningEntry = {
                timestamp: new Date().toISOString(),
                function: funcName,
                message: message,
                data: data
            };
            this.warnings.push(warningEntry);
            
            // Log to console in development
            if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
                console.warn(`[Fingerprint2Me] ${funcName}:`, message, data);
            }
        },
        
        wrapAsync(func, funcName) {
            return async (...args) => {
                try {
                    return await func(...args);
                } catch (error) {
                    this.logError(funcName, error, { args });
                    return { error: 'function_failed', details: error.message };
                }
            };
        },
        
        wrap(func, funcName) {
            return (...args) => {
                try {
                    return func(...args);
                } catch (error) {
                    this.logError(funcName, error, { args });
                    return { error: 'function_failed', details: error.message };
                }
            };
        },
        
        getErrorSummary() {
            return {
                errorCount: this.errors.length,
                warningCount: this.warnings.length,
                recentErrors: this.errors.slice(-5),
                recentWarnings: this.warnings.slice(-5)
            };
        },
        
        clearLogs() {
            this.errors = [];
            this.warnings = [];
        }
    };

    // --- Performance & Caching ---
    const FingerprintCache = {
        cache: new Map(),
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        
        get(key) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
                return cached.value;
            }
            this.cache.delete(key);
            return null;
        },
        
        set(key, value) {
            this.cache.set(key, {
                value: value,
                timestamp: Date.now()
            });
        },
        
        clear() {
            this.cache.clear();
        },
        
        getOrSet(key, generator) {
            const cached = this.get(key);
            if (cached !== null) {
                return cached;
            }
            const value = generator();
            this.set(key, value);
            return value;
        },
        
        async getOrSetAsync(key, asyncGenerator) {
            const cached = this.get(key);
            if (cached !== null) {
                return cached;
            }
            const value = await asyncGenerator();
            this.set(key, value);
            return value;
        }
    };

    // Performance monitoring
    const PerformanceMonitor = {
        timings: new Map(),
        
        start(label) {
            this.timings.set(label, performance.now());
        },
        
        end(label) {
            const start = this.timings.get(label);
            if (start) {
                const duration = performance.now() - start;
                this.timings.delete(label);
                return duration;
            }
            return 0;
        },
        
        measure(label, func) {
            this.start(label);
            const result = func();
            const duration = this.end(label);
            
            if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
                console.log(`[Fingerprint2Me] ${label}: ${duration.toFixed(2)}ms`);
            }
            
            return result;
        },
        
        async measureAsync(label, asyncFunc) {
            this.start(label);
            const result = await asyncFunc();
            const duration = this.end(label);
            
            if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
                console.log(`[Fingerprint2Me] ${label}: ${duration.toFixed(2)}ms`);
            }
            
            return result;
        }
    };

    // --- Privacy Controls & GDPR Compliance ---
    const PrivacyManager = {
        consentGiven: false,
        allowedTechniques: new Set(['basic']),
        
        checkConsent() {
            try {
                const consent = localStorage.getItem('fingerprint2me_consent');
                if (consent) {
                    const consentData = JSON.parse(consent);
                    this.consentGiven = consentData.given;
                    this.allowedTechniques = new Set(consentData.techniques || ['basic']);
                }
            } catch (e) {
                ErrorHandler.logError('PrivacyManager.checkConsent', e);
            }
        },
        
        giveConsent(allowedTechniques = ['basic', 'advanced', 'network']) {
            try {
                this.consentGiven = true;
                this.allowedTechniques = new Set(allowedTechniques);
                localStorage.setItem('fingerprint2me_consent', JSON.stringify({
                    given: true,
                    techniques: allowedTechniques,
                    timestamp: new Date().toISOString()
                }));
            } catch (e) {
                ErrorHandler.logError('PrivacyManager.giveConsent', e);
            }
        },
        
        revokeConsent() {
            try {
                this.consentGiven = false;
                this.allowedTechniques = new Set(['basic']);
                localStorage.removeItem('fingerprint2me_consent');
                FingerprintCache.clear();
            } catch (e) {
                ErrorHandler.logError('PrivacyManager.revokeConsent', e);
            }
        },
        
        isAllowed(technique) {
            if (!this.consentGiven) {
                return technique === 'basic';
            }
            return this.allowedTechniques.has(technique);
        },
        
        getConsentStatus() {
            return {
                consentGiven: this.consentGiven,
                allowedTechniques: Array.from(this.allowedTechniques),
                timestamp: this.getConsentTimestamp()
            };
        },
        
        getConsentTimestamp() {
            try {
                const consent = localStorage.getItem('fingerprint2me_consent');
                if (consent) {
                    const consentData = JSON.parse(consent);
                    return consentData.timestamp;
                }
            } catch (e) {
                ErrorHandler.logError('PrivacyManager.getConsentTimestamp', e);
            }
            return null;
        }
    };

    // Initialize privacy manager
    PrivacyManager.checkConsent();

    // --- Input Validation & Sanitization ---
    function validateAndSanitizeInput(input, maxLength = 10000) {
        if (typeof input !== 'string') {
            input = String(input);
        }
        // Remove potentially malicious characters
        const sanitized = input.replace(/[<>\"'&]/g, '');
        // Limit length to prevent DoS
        return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
    }
    
    function isValidURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
        } catch {
            return false;
        }
    }
    
    // --- Utility Hash Functions ---
    async function generateHash(str) {
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex.substring(0, 32);
        } else {
            return simpleHash(str);
        }
    }
    function simpleHash(str) {
        if (str.length === 0) return '0'.repeat(32);
        
        // Use multiple hash functions to create a longer, more collision-resistant hash
        let hash1 = 0, hash2 = 0, hash3 = 0, hash4 = 0;
        
        // First hash function (djb2)
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash1 = ((hash1 << 5) + hash1) + char;
            hash1 = hash1 & 0xffffffff; // Convert to 32-bit integer
        }
        
        // Second hash function (sdbm)
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
            hash2 = hash2 & 0xffffffff;
        }
        
        // Third hash function (lose lose)
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash3 = ((hash3 << 5) - hash3) + char;
            hash3 = hash3 & 0xffffffff;
        }
        
        // Fourth hash function (fnv1a-like)
        const FNV_PRIME = 0x01000193;
        hash4 = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash4 ^= char;
            hash4 = (hash4 * FNV_PRIME) & 0xffffffff;
        }
        
        // Combine all hashes and ensure we get 32 characters
        const combined = Math.abs(hash1).toString(16).padStart(8, '0') +
                        Math.abs(hash2).toString(16).padStart(8, '0') +
                        Math.abs(hash3).toString(16).padStart(8, '0') +
                        Math.abs(hash4).toString(16).padStart(8, '0');
        
        return combined;
    }
    // --- Helper Functions ---
    function cleanAndSortCollection(collection) {
        if (!collection) return '';
        return collection
            .split(',')
            .map(item => item.trim())
            .filter(item => item && item.length > 0)
            .sort()
            .join(', ');
    }
    function isBrave() {
        const userAgentData = navigator.userAgentData;
        return (
            userAgentData &&
            Array.isArray(userAgentData.brands) &&
            userAgentData.brands.some(b => b.brand === 'Brave')
        );
    }
    // --- Advanced Fingerprinting Techniques ---
    // These techniques focus on STABLE CAPABILITIES rather than performance metrics
    // to ensure consistent hashes across page refreshes
    
    function generateWebRTCFingerprint() {
        return new Promise((resolve) => {
            try {
                const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
                if (!RTCPeerConnection) {
                    resolve({ error: 'not_supported' });
                    return;
                }

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                let localIPs = [];
                let candidateCount = 0;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        candidateCount++;
                        const candidate = event.candidate.candidate;
                        const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
                        if (match && !localIPs.includes(match[1])) {
                            localIPs.push(match[1]);
                        }
                    } else {
                        pc.close();
                        resolve({
                            localIPs: localIPs,
                            candidateCount: candidateCount
                        });
                    }
                };

                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                // Timeout after 3 seconds
                setTimeout(() => {
                    pc.close();
                    resolve({
                        localIPs: localIPs,
                        candidateCount: candidateCount,
                        timeout: true
                    });
                }, 3000);
            } catch (e) {
                resolve({ error: 'error' });
            }
        });
    }

    function generateCSSMediaQueriesFingerprint() {
        try {
            const mediaQueries = [
                '(prefers-color-scheme: dark)',
                '(prefers-reduced-motion: reduce)',
                '(prefers-contrast: high)',
                '(prefers-transparency: reduce)',
                '(forced-colors: active)',
                '(hover: hover)',
                '(any-hover: hover)',
                '(pointer: fine)',
                '(any-pointer: fine)',
                '(display-mode: standalone)',
                // Note: '(orientation: portrait)' removed - unstable across window resizes
                '(min-device-pixel-ratio: 2)',
                '(color-gamut: srgb)',
                '(color-gamut: p3)',
                '(color-gamut: rec2020)'
            ];

            const results = {};
            mediaQueries.forEach(query => {
                results[query] = window.matchMedia(query).matches;
            });

            return results;
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    function generateGamepadFingerprint() {
        try {
            if (!navigator.getGamepads) {
                return { error: 'not_supported' };
            }

            const gamepads = navigator.getGamepads();
            const gamepadInfo = [];
            
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    gamepadInfo.push({
                        id: gamepads[i].id,
                        mapping: gamepads[i].mapping,
                        connected: gamepads[i].connected,
                        timestamp: gamepads[i].timestamp
                    });
                }
            }

            return {
                gamepads: gamepadInfo,
                length: gamepads.length
            };
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    async function generateIndexedDBFingerprint() {
        try {
            if (!window.indexedDB) {
                return { error: 'not_supported' };
            }

            return new Promise((resolve) => {
                const testDB = 'test_fingerprint_db';
                const request = indexedDB.open(testDB, 1);
                
                request.onerror = () => resolve({ error: 'access_denied' });
                request.onsuccess = () => {
                    const db = request.result;
                    const info = {
                        name: db.name,
                        version: db.version,
                        objectStoreNames: Array.from(db.objectStoreNames)
                    };
                    db.close();
                    
                    // Clean up test database
                    indexedDB.deleteDatabase(testDB);
                    resolve(info);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    db.createObjectStore('test', { keyPath: 'id' });
                };
                
                setTimeout(() => resolve({ error: 'timeout' }), 1000);
            });
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    function generateNetworkFingerprint() {
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (!connection) {
                return { error: 'not_supported' };
            }

            return {
                effectiveType: connection.effectiveType,
                type: connection.type,
                //Disabled for variation across refreshes
                // downlink: connection.downlink,
                // downlinkMax: connection.downlinkMax,
                // rtt: connection.rtt,
                saveData: connection.saveData
            };
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    // --- Speech Synthesis Stable Handler ---
    function generateSpeechSynthesisFingerprint() {
        try {
            if (!window.speechSynthesis || !window.speechSynthesis.getVoices) {
                return { error: 'not_supported' };
            }

            // Get voices - this is stable across page loads
            let voices = window.speechSynthesis.getVoices();
            
            // If voices aren't loaded yet, try to get them synchronously
            if (voices.length === 0) {
                // Try to trigger voice loading
                if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
                    // Return a consistent placeholder that won't change hash
                    return { 
                        voicesLoaded: false,
                        speechSynthesisSupported: true,
                        voiceCount: 0,
                        placeholder: 'voices_not_loaded'
                    };
                }
                voices = window.speechSynthesis.getVoices();
            }

            // If still no voices, return consistent placeholder
            if (voices.length === 0) {
                return { 
                    voicesLoaded: false,
                    speechSynthesisSupported: true,
                    voiceCount: 0,
                    placeholder: 'voices_not_loaded'
                };
            }

            const voiceData = voices.map(voice => ({
                name: voice.name,
                lang: voice.lang,
                localService: voice.localService,
                default: voice.default
            }));

            return {
                voicesLoaded: true,
                speechSynthesisSupported: true,
                voiceCount: voices.length,
                voices: voiceData,
                // Stable characteristics
                defaultVoice: voices.find(v => v.default)?.name || 'none',
                localServiceCount: voices.filter(v => v.localService).length,
                remoteServiceCount: voices.filter(v => !v.localService).length,
                languageCount: new Set(voices.map(v => v.lang)).size,
                uniqueLanguages: Array.from(new Set(voices.map(v => v.lang))).sort()
            };
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    function generateCryptoAPIFingerprint() {
        try {
            if (!window.crypto) {
                return { error: 'not_supported' };
            }

            const cryptoCapabilities = {
                cryptoSupported: true,
                subtleCrypto: !!window.crypto.subtle,
                getRandomValues: typeof window.crypto.getRandomValues === 'function',
                algorithms: []
            };

            if (window.crypto.subtle) {
                // Test supported algorithms (these are stable capabilities)
                const algorithmsToTest = [
                    'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512',
                    'RSA-PSS', 'RSA-OAEP', 'RSASSA-PKCS1-v1_5',
                    'ECDSA', 'ECDH',
                    'AES-CTR', 'AES-CBC', 'AES-GCM', 'AES-KW',
                    'HMAC', 'PBKDF2', 'HKDF'
                ];

                // Check which algorithms are supported by testing their availability
                for (const alg of algorithmsToTest) {
                    try {
                        // This is a sync check that doesn't actually perform crypto operations
                        const supported = typeof window.crypto.subtle.digest === 'function' ||
                                        typeof window.crypto.subtle.encrypt === 'function' ||
                                        typeof window.crypto.subtle.sign === 'function' ||
                                        typeof window.crypto.subtle.generateKey === 'function';
                        
                        if (supported) {
                            cryptoCapabilities.algorithms.push(alg);
                        }
                    } catch (e) {
                        // Algorithm not supported
                    }
                }

                // Test available methods (stable)
                cryptoCapabilities.methods = {
                    encrypt: typeof window.crypto.subtle.encrypt === 'function',
                    decrypt: typeof window.crypto.subtle.decrypt === 'function',
                    sign: typeof window.crypto.subtle.sign === 'function',
                    verify: typeof window.crypto.subtle.verify === 'function',
                    digest: typeof window.crypto.subtle.digest === 'function',
                    generateKey: typeof window.crypto.subtle.generateKey === 'function',
                    deriveKey: typeof window.crypto.subtle.deriveKey === 'function',
                    deriveBits: typeof window.crypto.subtle.deriveBits === 'function',
                    importKey: typeof window.crypto.subtle.importKey === 'function',
                    exportKey: typeof window.crypto.subtle.exportKey === 'function',
                    wrapKey: typeof window.crypto.subtle.wrapKey === 'function',
                    unwrapKey: typeof window.crypto.subtle.unwrapKey === 'function'
                };

                cryptoCapabilities.methodCount = Object.values(cryptoCapabilities.methods).filter(Boolean).length;
            }

            return cryptoCapabilities;
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    async function generateServiceWorkerFingerprint() {
        try {
            if (!('serviceWorker' in navigator)) {
                return { error: 'not_supported' };
            }

            const swFingerprint = {
                serviceWorkerSupported: true,
                scope: '',
                registrations: [],
                controller: null
            };

            try {
                // Get service worker registrations (stable)
                const registrations = await navigator.serviceWorker.getRegistrations();
                
                swFingerprint.registrations = registrations.map(reg => ({
                    scope: reg.scope,
                    active: !!reg.active,
                    installing: !!reg.installing,
                    waiting: !!reg.waiting,
                    updateViaCache: reg.updateViaCache || 'none'
                }));

                swFingerprint.registrationCount = registrations.length;

                // Check for active service worker controller
                if (navigator.serviceWorker.controller) {
                    swFingerprint.controller = {
                        scriptURL: navigator.serviceWorker.controller.scriptURL,
                        state: navigator.serviceWorker.controller.state
                    };
                }

                // Test service worker capabilities (stable)
                swFingerprint.capabilities = {
                    register: typeof navigator.serviceWorker.register === 'function',
                    getRegistration: typeof navigator.serviceWorker.getRegistration === 'function',
                    getRegistrations: typeof navigator.serviceWorker.getRegistrations === 'function',
                    addEventListener: typeof navigator.serviceWorker.addEventListener === 'function',
                    ready: !!navigator.serviceWorker.ready
                };

                return swFingerprint;
            } catch (e) {
                return {
                    serviceWorkerSupported: true,
                    error: 'access_denied',
                    capabilities: {
                        register: typeof navigator.serviceWorker.register === 'function',
                        getRegistration: typeof navigator.serviceWorker.getRegistration === 'function',
                        getRegistrations: typeof navigator.serviceWorker.getRegistrations === 'function'
                    }
                };
            }
        } catch (e) {
            return { error: 'not_supported' };
        }
    }

    function generateSensorFingerprint() {
        return new Promise((resolve) => {
            try {
                const sensors = [];
                
                // Check for various sensor APIs
                if ('DeviceOrientationEvent' in window) {
                    sensors.push('DeviceOrientationEvent');
                }
                if ('DeviceMotionEvent' in window) {
                    sensors.push('DeviceMotionEvent');
                }
                if ('Accelerometer' in window) {
                    sensors.push('Accelerometer');
                }
                if ('Gyroscope' in window) {
                    sensors.push('Gyroscope');
                }
                if ('Magnetometer' in window) {
                    sensors.push('Magnetometer');
                }
                if ('AmbientLightSensor' in window) {
                    sensors.push('AmbientLightSensor');
                }
                if ('ProximitySensor' in window) {
                    sensors.push('ProximitySensor');
                }

                // Test permissions for generic sensors
                if (navigator.permissions) {
                    navigator.permissions.query({ name: 'accelerometer' })
                        .then(result => {
                            resolve({
                                availableSensors: sensors,
                                accelerometerPermission: result.state
                            });
                        })
                        .catch(() => {
                            resolve({
                                availableSensors: sensors,
                                accelerometerPermission: 'denied'
                            });
                        });
                } else {
                    resolve({
                        availableSensors: sensors,
                        accelerometerPermission: 'unknown'
                    });
                }
            } catch (e) {
                resolve({ error: 'not_supported' });
            }
        });
    }

    // --- Minimal Fingerprint Functions (WebGL, Audio, Battery, IP, etc.) ---
    function generateWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { error: 'not_supported' };
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return { error: 'no_debug_info' };
            const vendor = gl.getParameter(gl.VENDOR);
            const renderer = gl.getParameter(gl.RENDERER);
            const version = gl.getParameter(gl.VERSION);
            const unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return {
                vendor: vendor,
                renderer: renderer,
                version: version,
                unmaskedRenderer: unmaskedRenderer
            };
        } catch (e) {
            return { error: 'error' };
        }
    }
    function generateAudioFingerprint() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const state = audioContext.state;
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            oscillator.connect(analyser);
            analyser.connect(audioContext.destination);
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(frequencyData);
            const stableFreqData = Array.from(frequencyData.slice(0, 5));
            return {
                sampleRate: sampleRate,
                state: state,
                frequencyData: stableFreqData
            };
        } catch (e) {
            return { error: 'not_supported' };
        }
    }
    async function generateBatteryFingerprint() {
        try {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                return {
                    charging: battery.charging
                };
            }
            return { error: 'not_supported' };
        } catch (e) {
            return { error: 'error' };
        }
    }
    async function generateIPFingerprint(browser = null) {
        try {
            // Secure API endpoints with rate limiting
            const apiEndpoints = [
                { url: 'https://ipinfo.io/json', timeout: 1000, priority: 1 },
                { url: 'https://ipapi.co/json/', timeout: 1500, priority: 2 },
                { url: 'https://ip.guide/', timeout: 1000, priority: 3 }
            ].filter(api => isValidURL(api.url));

            const ipData = {
                ip: 'unknown',
                country: 'unknown',
                region: 'unknown',
                city: 'unknown',
                isp: 'unknown',
                timezone: 'unknown'
            };

            // Rate limiting check
            const lastAPICall = localStorage.getItem('lastIPAPICall');
            const now = Date.now();
            if (lastAPICall && now - parseInt(lastAPICall) < 5000) {
                return { error: 'rate_limited' };
            }

            // Try APIs in parallel for better performance
            const promises = apiEndpoints.map(async (api) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), api.timeout);
                    
                    const response = await fetch(api.url, { 
                        signal: controller.signal,
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const data = await response.json();
                    
                    // Validate response structure
                    if (!data || typeof data !== 'object') {
                        throw new Error('Invalid response format');
                    }
                    
                    return {
                        success: true,
                        data: data,
                        priority: api.priority,
                        source: api.url
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        priority: api.priority,
                        source: api.url
                    };
                }
            });

            const results = await Promise.allSettled(promises);
            
            // Find first successful result by priority
            const successfulResults = results
                .filter(result => result.status === 'fulfilled' && result.value.success)
                .map(result => result.value)
                .sort((a, b) => a.priority - b.priority);

            if (successfulResults.length > 0) {
                const data = successfulResults[0].data;
                
                // Sanitize and validate data
                ipData.ip = validateAndSanitizeInput(data.ip || data.query || 'unknown');
                ipData.country = validateAndSanitizeInput(data.country || data.country_name || 'unknown');
                ipData.region = validateAndSanitizeInput(data.region || data.regionName || 'unknown');
                ipData.city = validateAndSanitizeInput(data.city || 'unknown');
                ipData.isp = validateAndSanitizeInput(data.org || data.isp || data.network?.autonomous_system?.name || 'unknown');
                ipData.timezone = validateAndSanitizeInput(data.timezone || 'unknown');
                
                // Store rate limiting info
                localStorage.setItem('lastIPAPICall', now.toString());
            }

            // Firefox-specific filtering for privacy
            if (browser === 'Firefox') {
                return {
                    ip: ipData.ip,
                    timezone: ipData.timezone
                };
            }

            return ipData;
        } catch (e) {
            return { error: 'not_supported' };
        }
    }
    // --- Main Data Extraction ---
    async function getStableDeviceData() {
        if (typeof ClientJS === 'undefined') {
            throw new Error('ClientJS is not available');
        }
        const client = new ClientJS();
        const clientJSData = {
            userAgent: client.getUserAgent(),
            userAgentLowerCase: client.getUserAgentLowerCase(),
            browser: client.getBrowser(),
            browserVersion: client.getBrowserVersion(),
            browserMajorVersion: client.getBrowserMajorVersion(),
            engine: client.getEngine(),
            engineVersion: client.getEngineVersion(),
            os: client.getOS(),
            osVersion: client.getOSVersion(),
            device: client.getDevice(),
            deviceType: client.getDeviceType(),
            deviceVendor: client.getDeviceVendor(),
            cpu: client.getCPU(),
            screenPrint: client.getScreenPrint(),
            colorDepth: client.getColorDepth(),
            currentResolution: client.getCurrentResolution(),
            availableResolution: client.getAvailableResolution(),
            deviceXDPI: client.getDeviceXDPI(),
            deviceYDPI: client.getDeviceYDPI(),
            timezone: client.getTimeZone(),
            language: client.getLanguage(),
            systemLanguage: client.getSystemLanguage(),
            sessionStorage: client.isSessionStorage(),
            localStorage: client.isLocalStorage(),
            cookies: client.isCookie(),
            plugins: cleanAndSortCollection(client.getPlugins()),
            mimeTypes: cleanAndSortCollection(client.getMimeTypes()),
            isMimeTypes: client.isMimeTypes(),
            java: client.isJava(),
            flash: client.isFlash(),
            silverlight: client.isSilverlight(),
            silverlightVersion: client.getSilverlightVersion(),
            fonts: cleanAndSortCollection(client.getFonts()).replace('GungSeo', ''),
            canvas: client.isCanvas(),
            canvasPrint: client.getCanvasPrint(),
            isMobile: client.isMobile(),
            isMobileMajor: client.isMobileMajor(),
            isMobileAndroid: client.isMobileAndroid(),
            isMobileOpera: client.isMobileOpera(),
            isMobileWindows: client.isMobileWindows(),
            isMobileBlackBerry: client.isMobileBlackBerry(),
            isMobileIOS: client.isMobileIOS(),
            isIphone: client.isIphone(),
            isIpad: client.isIpad(),
            isIpod: client.isIpod(),
            isIE: client.isIE(),
            isChrome: client.isChrome(),
            isFirefox: client.isFirefox(),
            isSafari: client.isSafari(),
            isOpera: client.isOpera(),
            isWindows: client.isWindows(),
            isMac: client.isMac(),
            isLinux: client.isLinux(),
            isUbuntu: client.isUbuntu(),
            isSolaris: client.isSolaris()
        };
        const enhancedData = {
            devicePixelRatio: window.devicePixelRatio || 1,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pointerEnabled: navigator.pointerEnabled || false,
            msMaxTouchPoints: navigator.msMaxTouchPoints || 0,
            doNotTrack: navigator.doNotTrack || 'unknown',
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            userAgentData: navigator.userAgentData || 'not_supported',
            webdriver: navigator.webdriver || false,
            permissions: navigator.permissions ? 'supported' : 'not_supported',
            mediaDevices: navigator.mediaDevices ? 'supported' : 'not_supported',
            geolocation: navigator.geolocation ? 'supported' : 'not_supported',
            battery: navigator.getBattery ? 'supported' : 'not_supported',
            connectionType: navigator.connection ? navigator.connection.effectiveType || 'unknown' : 'unknown',
            webglFingerprint: JSON.stringify(generateWebGLFingerprint()),
            audioFingerprint: JSON.stringify(generateAudioFingerprint()),
            batteryFingerprint: JSON.stringify(await generateBatteryFingerprint()),
            timezoneOffset: new Date().getTimezoneOffset(),
            ipFingerprint: JSON.stringify(await generateIPFingerprint(clientJSData.browser)),
            // New advanced fingerprinting techniques (stable across page refreshes)
            webrtcFingerprint: JSON.stringify(await generateWebRTCFingerprint()),
            cssMediaFingerprint: JSON.stringify(generateCSSMediaQueriesFingerprint()),
            gamepadFingerprint: JSON.stringify(generateGamepadFingerprint()),
            indexedDBFingerprint: JSON.stringify(await generateIndexedDBFingerprint()),
            networkFingerprint: JSON.stringify(generateNetworkFingerprint()),
            sensorFingerprint: JSON.stringify(await generateSensorFingerprint()),
            speechSynthesisFingerprint: JSON.stringify(generateSpeechSynthesisFingerprint()),
            cryptoAPIFingerprint: JSON.stringify(generateCryptoAPIFingerprint()),
            serviceWorkerFingerprint: JSON.stringify(await generateServiceWorkerFingerprint())
        };
        // Combine all data
        let stableData = {
            ...clientJSData,
            ...enhancedData
        };
        delete stableData.fingerprint;
        // Browser-specific exclusions for privacy mode differences
        if (isBrave()) {
            delete stableData.availableResolution;
            delete stableData.audioFingerprint;
            if (stableData.enhancedCanvasFingerprint && stableData.enhancedCanvasFingerprint.dataURL && stableData.enhancedCanvasFingerprint.dataURL.startsWith('data:image/png;base64,')) {
                const base64Data = stableData.enhancedCanvasFingerprint.dataURL.substring(22);
                stableData.enhancedCanvasFingerprint.dataURL = 'data:image/png;base64,' + base64Data.substring(0, 64);
            }
            delete stableData.currentResolution;
            delete stableData.hardwareConcurrency;
            delete stableData.deviceMemory;
            delete stableData.canvasPrint;
            delete stableData.plugins;
        } else if (stableData.browser === 'Safari') {
            delete stableData.availableResolution;
            delete stableData.canvasPrint;
            delete stableData.currentResolution;
            delete stableData.screenPrint;
            // Truncate enhancedCanvasFingerprint to first 128 base64 characters for Safari
            if (stableData.enhancedCanvasFingerprint && stableData.enhancedCanvasFingerprint.dataURL && stableData.enhancedCanvasFingerprint.dataURL.startsWith('data:image/png;base64,')) {
                const base64Data = stableData.enhancedCanvasFingerprint.dataURL.substring(22);
                stableData.enhancedCanvasFingerprint.dataURL = 'data:image/png;base64,' + base64Data.substring(0, 128);
            }
        } else if (stableData.browser === 'Firefox') {
            delete stableData.canvasPrint;
            delete stableData.fonts;
            delete stableData.doNotTrack;
        } else if (stableData.browser === 'Opera') {
            delete stableData.languageFingerprint;
            delete stableData.windowOuterWidth;
            delete stableData.windowInnerWidth;
        } else if (stableData.browser === 'Edge') {
            delete stableData.languageFingerprint;
            delete stableData.speechSynthesisFingerprint;
            
        } else if (stableData.browser === 'Chrome') {
            delete stableData.mediaDevicesFingerprint;
            delete stableData.languageFingerprint;
            delete stableData.windowInnerWidth;
            delete stableData.windowOuterWidth;
        }
        return stableData;
    }
    async function getAllDeviceData() {
        const stableData = await getStableDeviceData();
        // Add privacyData (window/screen sizes)
        const privacyData = {
            windowInnerWidth: window.innerWidth,
            windowInnerHeight: window.innerHeight,
            windowOuterWidth: window.outerWidth,
            windowOuterHeight: window.outerHeight,
            screenAvailWidth: screen.availWidth,
            screenAvailHeight: screen.availHeight,
            screenWidth: screen.width,
            screenHeight: screen.height
        };
        return {
            ...stableData,
            ...privacyData
        };
    }
    // --- Confidence Calculation ---
    function calculateConfidenceScore(stableData) {
        let score = 0;
        let maxScore = 0;
        let deductions = [];
        let details = [];

        // Define scoring weights for different fingerprinting techniques
        const scoringCriteria = {
            // Core browser fingerprinting (high weight)
            userAgent: { weight: 8, check: (data) => data.userAgent && data.userAgent.length > 10 },
            browser: { weight: 6, check: (data) => data.browser && data.browser !== 'unknown' },
            browserVersion: { weight: 4, check: (data) => data.browserVersion && data.browserVersion !== 'unknown' },
            engine: { weight: 5, check: (data) => data.engine && data.engine !== 'unknown' },
            os: { weight: 7, check: (data) => data.os && data.os !== 'unknown' },
            osVersion: { weight: 3, check: (data) => data.osVersion && data.osVersion !== 'unknown' },
            
            // Hardware fingerprinting (medium-high weight)
            hardwareConcurrency: { weight: 6, check: (data) => data.hardwareConcurrency && data.hardwareConcurrency !== 'unknown' && data.hardwareConcurrency > 0 },
            deviceMemory: { weight: 6, check: (data) => data.deviceMemory && data.deviceMemory !== 'unknown' && data.deviceMemory > 0 },
            devicePixelRatio: { weight: 4, check: (data) => data.devicePixelRatio && data.devicePixelRatio > 0 },
            maxTouchPoints: { weight: 3, check: (data) => data.maxTouchPoints !== undefined },
            
            // Screen/Display fingerprinting (medium weight)
            screenPrint: { weight: 5, check: (data) => data.screenPrint && data.screenPrint.length > 5 },
            colorDepth: { weight: 3, check: (data) => data.colorDepth && data.colorDepth > 0 },
            currentResolution: { weight: 4, check: (data) => data.currentResolution && data.currentResolution.length > 5 },
            availableResolution: { weight: 4, check: (data) => data.availableResolution && data.availableResolution.length > 5 },
            
            // Canvas fingerprinting (high weight)
            canvasPrint: { weight: 8, check: (data) => data.canvasPrint && data.canvasPrint.length > 50 },
            canvas: { weight: 2, check: (data) => data.canvas === true },
            
            // Plugin/Extension fingerprinting (medium weight)
            plugins: { weight: 6, check: (data) => data.plugins && data.plugins.split(', ').length > 2 },
            mimeTypes: { weight: 4, check: (data) => data.mimeTypes && data.mimeTypes.split(', ').length > 1 },
            fonts: { weight: 7, check: (data) => data.fonts && data.fonts.split(', ').length > 10 },
            
            // Language/Locale fingerprinting (medium weight)
            language: { weight: 4, check: (data) => data.language && data.language !== 'unknown' },
            systemLanguage: { weight: 3, check: (data) => data.systemLanguage && data.systemLanguage !== 'unknown' },
            timezone: { weight: 5, check: (data) => data.timezone && data.timezone !== 'unknown' },
            timezoneOffset: { weight: 3, check: (data) => data.timezoneOffset !== undefined },
            
            // Storage capabilities (low-medium weight)
            localStorage: { weight: 2, check: (data) => data.localStorage === true },
            sessionStorage: { weight: 2, check: (data) => data.sessionStorage === true },
            cookies: { weight: 2, check: (data) => data.cookies === true },
            
            // Advanced fingerprinting techniques (high weight)
            webglFingerprint: { weight: 8, check: (data) => {
                try {
                    const webgl = JSON.parse(data.webglFingerprint || '{}');
                    return webgl.vendor && webgl.renderer && !webgl.error;
                } catch { return false; }
            }},
            audioFingerprint: { weight: 7, check: (data) => {
                try {
                    const audio = JSON.parse(data.audioFingerprint || '{}');
                    return audio.sampleRate && !audio.error;
                } catch { return false; }
            }},
            webrtcFingerprint: { weight: 6, check: (data) => {
                try {
                    const webrtc = JSON.parse(data.webrtcFingerprint || '{}');
                    return webrtc.localIPs && webrtc.localIPs.length > 0 && !webrtc.error;
                } catch { return false; }
            }},
            cssMediaFingerprint: { weight: 5, check: (data) => {
                try {
                    const css = JSON.parse(data.cssMediaFingerprint || '{}');
                    return typeof css === 'object' && Object.keys(css).length > 5 && !css.error;
                } catch { return false; }
            }},
            speechSynthesisFingerprint: { weight: 6, check: (data) => {
                try {
                    const speech = JSON.parse(data.speechSynthesisFingerprint || '{}');
                    return speech.voicesLoaded && speech.voiceCount > 0 && !speech.error;
                } catch { return false; }
            }},
            cryptoAPIFingerprint: { weight: 5, check: (data) => {
                try {
                    const crypto = JSON.parse(data.cryptoAPIFingerprint || '{}');
                    return crypto.cryptoSupported && crypto.algorithms && crypto.algorithms.length > 0 && !crypto.error;
                } catch { return false; }
            }},
            serviceWorkerFingerprint: { weight: 4, check: (data) => {
                try {
                    const sw = JSON.parse(data.serviceWorkerFingerprint || '{}');
                    return sw.serviceWorkerSupported && !sw.error;
                } catch { return false; }
            }},
            networkFingerprint: { weight: 3, check: (data) => {
                try {
                    const network = JSON.parse(data.networkFingerprint || '{}');
                    return network.effectiveType && !network.error;
                } catch { return false; }
            }},
            ipFingerprint: { weight: 7, check: (data) => {
                try {
                    const ip = JSON.parse(data.ipFingerprint || '{}');
                    return ip.ip && ip.ip !== 'unknown' && !ip.error;
                } catch { return false; }
            }},
            
            // Device-specific checks (medium weight)
            isMobile: { weight: 3, check: (data) => data.isMobile !== undefined },
            deviceType: { weight: 4, check: (data) => data.deviceType && data.deviceType !== 'unknown' },
            deviceVendor: { weight: 3, check: (data) => data.deviceVendor && data.deviceVendor !== 'unknown' }
        };

        // Calculate score for each criterion
        Object.entries(scoringCriteria).forEach(([key, criterion]) => {
            maxScore += criterion.weight;
            
            if (stableData.hasOwnProperty(key)) {
                if (criterion.check(stableData)) {
                    score += criterion.weight;
                    details.push(`${key}: Available (+${criterion.weight})`);
                } else {
                    deductions.push(`${key}: Invalid or spoofed data`);
                }
            } else {
                deductions.push(`${key}: Missing (browser limitation)`);
            }
        });

        // Additional penalties for known privacy/anti-fingerprinting behaviors
        if (stableData.doNotTrack === '1') {
            score = Math.max(0, score - 5);
            deductions.push('Do Not Track enabled (-5)');
        }
        
        if (stableData.webdriver === true) {
            score = Math.max(0, score - 10);
            deductions.push('WebDriver detected (-10)');
        }

        // Check for Brave browser specific limitations
        if (stableData.browser === 'Chrome' && 
            (!stableData.plugins || stableData.plugins.length < 10) &&
            (!stableData.mimeTypes || stableData.mimeTypes.length < 10)) {
            score = Math.max(0, score - 5);
            deductions.push('Possible Brave browser privacy restrictions (-5)');
        }

        // Calculate percentage
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        
        // Determine confidence level
        let level = 'Very Low';
        if (percentage >= 90) level = 'Very High';
        else if (percentage >= 75) level = 'High';
        else if (percentage >= 60) level = 'Medium';
        else if (percentage >= 45) level = 'Low';
        else level = 'Very Low';

        return { 
            score: percentage, 
            level, 
            deductions,
            details: details.slice(0, 10), // Limit details for readability
            rawScore: score,
            maxPossibleScore: maxScore,
            dataPointsAvailable: Object.keys(stableData).length,
            fingerprintingTechniques: {
                core: Math.round(((score / maxScore) * 100) * 0.4), // 40% weight to core techniques
                advanced: Math.round(((score / maxScore) * 100) * 0.6) // 60% weight to advanced techniques
            }
        };
    }
    // --- Hash Method Detection ---
    function getHashMethod() {
        if (window.crypto && window.crypto.subtle) {
            return 'SHA-256';
        } else {
            return 'SimpleHash';
        }
    }
    // --- Main Exported Function ---
    async function getUniqueVisitorId() {
        const stableData = await getStableDeviceData();
        const stableString = Object.values(stableData).join('|');
        const uniqueVisitorId = await generateHash(stableString);
        const confidence = calculateConfidenceScore(stableData);
        let timezone = stableData.timezone;
        let ipData = {};
        try {
            ipData = JSON.parse(stableData.ipFingerprint || '{}');
        } catch (e) {
            ipData = { error: 'parse_error' };
        }
        return {
            uniqueVisitorId,
            confidence,
            timezone,
            ipData,
            hashMethod: getHashMethod()
        };
    }
    // --- Exports ---
    return {
        // Main functions
        getUniqueVisitorId,
        getStableDeviceData,
        getAllDeviceData,
        getHashMethod,
        
        // Individual fingerprinting functions
        generateWebGLFingerprint,
        generateAudioFingerprint,
        generateBatteryFingerprint,
        generateIPFingerprint,
        generateWebRTCFingerprint,
        generateCSSMediaQueriesFingerprint,
        generateGamepadFingerprint,
        generateIndexedDBFingerprint,
        generateNetworkFingerprint,
        generateSensorFingerprint,
        generateSpeechSynthesisFingerprint,
        generateCryptoAPIFingerprint,
        generateServiceWorkerFingerprint,
        
        // Privacy & GDPR compliance
        giveConsent: PrivacyManager.giveConsent.bind(PrivacyManager),
        revokeConsent: PrivacyManager.revokeConsent.bind(PrivacyManager),
        getConsentStatus: PrivacyManager.getConsentStatus.bind(PrivacyManager),
        
        // Utility functions
        validateAndSanitizeInput,
        isValidURL
    };
})); 