// Global variable for ClientJS instance
let client = null;

// SHA-256 hash function using Web Crypto API with collision resistance
async function generateHash(str) {
    try {
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
    } catch (error) {
        return simpleHash(str);
    }
}

// Simple hash function (fallback)
function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0');
}

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
        // Try to get IP through various methods with timeouts
        const ipData = {
            ip: 'unknown',
            country: 'unknown',
            region: 'unknown',
            city: 'unknown',
            isp: 'unknown',
            timezone: 'unknown'
        };
        
        // Method 1: Try ipinfo.io (free tier) - 1000ms timeout
        try {
            const response = await fetch('https://ipinfo.io/json', { 
                signal: AbortSignal.timeout(1000) 
            });
            if (response.ok) {
                const data = await response.json();
                ipData.ip = data.ip || 'unknown';
                ipData.country = data.country || 'unknown';
                ipData.region = data.region || 'unknown';
                ipData.city = data.city || 'unknown';
                ipData.isp = data.org || 'unknown';
                ipData.timezone = data.timezone || 'unknown';
            }
        } catch (e) {
            // Continue to next service
        }
        
        // Method 2: Try ip-api.com (free tier) - 1000ms timeout
        if (ipData.ip === 'unknown') {
            try {
                const response = await fetch('http://ip-api.com/json/', { 
                    signal: AbortSignal.timeout(1000) 
                });
                if (response.ok) {
                    const data = await response.json();
                    ipData.ip = data.query || 'unknown';
                    ipData.country = data.country || 'unknown';
                    ipData.region = data.regionName || 'unknown';
                    ipData.city = data.city || 'unknown';
                    ipData.isp = data.isp || 'unknown';
                    ipData.timezone = data.timezone || 'unknown';
                }
            } catch (e) {
                // Continue to next service
            }
        }
        
        // Method 3: Try ipapi.co (free tier) - 1500ms timeout (moved to third position)
        if (ipData.ip === 'unknown') {
            try {
                const response = await fetch('https://ipapi.co/json/', { 
                    signal: AbortSignal.timeout(1500) 
                });
                if (response.ok) {
                    const data = await response.json();
                    ipData.ip = data.ip || 'unknown';
                    ipData.country = data.country_name || 'unknown';
                    ipData.region = data.region || 'unknown';
                    ipData.city = data.city || 'unknown';
                    ipData.isp = data.org || 'unknown';
                    ipData.timezone = data.timezone || 'unknown';
                }
            } catch (e) {
                // Continue to next service
            }
        }
        
        // Method 4: Try ip.guide (free tier) - 1000ms timeout
        if (ipData.ip === 'unknown') {
            try {
                const response = await fetch('https://ip.guide/', { 
                    signal: AbortSignal.timeout(1000) 
                });
                if (response.ok) {
                    const data = await response.json();
                    ipData.ip = data.ip || 'unknown';
                    ipData.country = data.location?.country || 'unknown';
                    ipData.region = data.location?.region || 'unknown';
                    ipData.city = data.location?.city || 'unknown';
                    ipData.isp = data.network?.autonomous_system?.name || 'unknown';
                    ipData.timezone = data.timezone || 'unknown';
                }
            } catch (e) {
                // All services failed
            }
        }
        
        // For Firefox, return only IP and timezone to avoid service provider differences
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

function generateCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 200;
        canvas.height = 200;
        
        // Draw complex shapes and text
        ctx.fillStyle = '#f60';
        ctx.fillRect(10, 10, 50, 50);
        
        ctx.fillStyle = '#069';
        ctx.fillRect(60, 10, 50, 50);
        
        ctx.fillStyle = '#0f0';
        ctx.fillRect(110, 10, 50, 50);
        
        // Add text with different fonts
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.fillText('Canvas fingerprint', 10, 100);
        
        ctx.font = '14px Times New Roman';
        ctx.fillText('Browser identification', 10, 120);
        
        // Add gradients
        const gradient = ctx.createLinearGradient(0, 0, 200, 0);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(0.5, 'green');
        gradient.addColorStop(1, 'blue');
        ctx.fillStyle = gradient;
        ctx.fillRect(10, 140, 180, 20);
        
        // Add arcs and curves
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(50, 180, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        return {
            dataURL: canvas.toDataURL()
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateFontFingerprint() {
    try {
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const fonts = [
            'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
            'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
            'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Console',
            'Tahoma', 'Geneva', 'Lucida Sans Unicode', 'Franklin Gothic Medium',
            'Arial Narrow', 'Verdana'
        ];
        
        const fontMetrics = [];
        
        fonts.forEach(font => {
            ctx.font = `${testSize} ${font}`;
            const metrics = ctx.measureText(testString);
            fontMetrics.push({
                font: font,
                width: Math.round(metrics.width),
                actualBoundingBoxLeft: Math.round(metrics.actualBoundingBoxLeft || 0),
                actualBoundingBoxRight: Math.round(metrics.actualBoundingBoxRight || 0),
                actualBoundingBoxAscent: Math.round(metrics.actualBoundingBoxAscent || 0),
                actualBoundingBoxDescent: Math.round(metrics.actualBoundingBoxDescent || 0)
            });
        });
        
        return {
            fontMetrics: fontMetrics
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateWebGLVendorFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { error: 'not_supported' };
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return { error: 'no_debug_info' };
        
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        return {
            vendor: vendor,
            renderer: renderer
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateHardwareFingerprint() {
    try {
        const hardware = {
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pointerEnabled: navigator.pointerEnabled || false,
            msMaxTouchPoints: navigator.msMaxTouchPoints || 0,
            userAgentData: navigator.userAgentData || 'not_supported'
        };
        
        return hardware;
    } catch (e) {
        return { error: 'error' };
    }
}

function generateMediaDevicesFingerprint() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return { error: 'not_supported' };
        }
        
        return new Promise((resolve) => {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const deviceInfo = devices.map(device => ({
                        kind: device.kind,
                        deviceId: device.deviceId ? device.deviceId.substring(0, 8) : 'unknown',
                        label: device.label ? device.label.substring(0, 10) : 'unknown'
                    }));
                    resolve({ devices: deviceInfo });
                })
                .catch(() => resolve({ error: 'error' }));
        });
    } catch (e) {
        return { error: 'error' };
    }
}

function generateScreenFingerprint() {
    try {
        const screen = window.screen;
        const colorDepth = screen.colorDepth;
        const pixelDepth = screen.pixelDepth;
        const availWidth = screen.availWidth;
        const availHeight = screen.availHeight;
        const width = screen.width;
        const height = screen.height;
        
        return {
            colorDepth: colorDepth,
            pixelDepth: pixelDepth,
            availWidth: availWidth,
            availHeight: availHeight,
            width: width,
            height: height
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generatePluginsFingerprint() {
    try {
        const plugins = Array.from(navigator.plugins).map(plugin => ({
            name: plugin.name,
            description: plugin.description,
            filename: plugin.filename,
            length: plugin.length
        }));
        
        return { plugins: plugins };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateMimeTypesFingerprint() {
    try {
        const mimeTypes = Array.from(navigator.mimeTypes).map(mimeType => ({
            type: mimeType.type,
            description: mimeType.description,
            suffixes: mimeType.suffixes,
            enabledPlugin: mimeType.enabledPlugin ? mimeType.enabledPlugin.name : null
        }));
        
        return { mimeTypes: mimeTypes };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateLanguageFingerprint() {
    try {
        const languages = navigator.languages || [navigator.language];
        const language = navigator.language;
        const userLanguage = navigator.userLanguage;
        const browserLanguage = navigator.browserLanguage;
        const systemLanguage = navigator.systemLanguage;
        
        return {
            languages: languages,
            language: language,
            userLanguage: userLanguage,
            browserLanguage: browserLanguage,
            systemLanguage: systemLanguage
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateTimezoneFingerprint() {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneOffset = new Date().getTimezoneOffset();
        
        return {
            timezone: timezone,
            timezoneOffset: timezoneOffset
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function generateConnectionFingerprint() {
    try {
        if (!navigator.connection) {
            return { error: 'not_supported' };
        }
        
        const connection = navigator.connection;
        return {
            effectiveType: connection.effectiveType,
            saveData: connection.saveData
        };
    } catch (e) {
        return { error: 'error' };
    }
}

function isBrave() {
    const userAgentData = navigator.userAgentData;
    return (
        userAgentData &&
        Array.isArray(userAgentData.brands) &&
        userAgentData.brands.some(b => b.brand === 'Brave')
    );
} 

function initializeClientJS() {
    try {
        if (typeof ClientJS !== 'undefined') {
            client = new ClientJS();
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

async function generateUniqueId() {
    try {
        if (!client) {
            if (!initializeClientJS()) {
                document.getElementById('uniqueId').textContent = 'ClientJS not available';
                return;
            }
        }
        
        function cleanAndSortCollection(collection) {
            if (!collection) return '';
            return collection
                .split(',')
                .map(item => item.trim())
                .filter(item => item && item.length > 0)
                .sort()
                .join(', ');
        }
        
        const clientJSData = {            
            // Browser information
            userAgent: client.getUserAgent(),
            userAgentLowerCase: client.getUserAgentLowerCase(),
            browser: client.getBrowser(),
            browserVersion: client.getBrowserVersion(),
            browserMajorVersion: client.getBrowserMajorVersion(),
            
            // Engine information
            engine: client.getEngine(),
            engineVersion: client.getEngineVersion(),
            
            // Operating system
            os: client.getOS(),
            osVersion: client.getOSVersion(),
            
            // Device information
            device: client.getDevice(),
            deviceType: client.getDeviceType(),
            deviceVendor: client.getDeviceVendor(),
            cpu: client.getCPU(),
            
            // Screen and display
            screenPrint: client.getScreenPrint(),
            colorDepth: client.getColorDepth(),
            currentResolution: client.getCurrentResolution(),
            availableResolution: client.getAvailableResolution(),
            deviceXDPI: client.getDeviceXDPI(),
            deviceYDPI: client.getDeviceYDPI(),
            
            // System capabilities
            timezone: client.getTimeZone(),
            language: client.getLanguage(),
            systemLanguage: client.getSystemLanguage(),
            
            // Storage capabilities
            sessionStorage: client.isSessionStorage(),
            localStorage: client.isLocalStorage(),
            cookies: client.isCookie(),
            
            // Plugins and capabilities
            plugins: cleanAndSortCollection(client.getPlugins()),
            mimeTypes: cleanAndSortCollection(client.getMimeTypes()),
            isMimeTypes: client.isMimeTypes(),
            java: client.isJava(),
            flash: client.isFlash(),
            silverlight: client.isSilverlight(),
            silverlightVersion: client.getSilverlightVersion(),
            
            // Fonts and rendering
            //Remove font GungSeo from the fonts list
            fonts: cleanAndSortCollection(client.getFonts()).replace('GungSeo', ''),
            canvas: client.isCanvas(),
            canvasPrint: client.getCanvasPrint(),
            
            // Mobile detection
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
            
            // Browser type detection
            isIE: client.isIE(),
            isChrome: client.isChrome(),
            isFirefox: client.isFirefox(),
            isSafari: client.isSafari(),
            isOpera: client.isOpera(),

            // OS type detection
            isWindows: client.isWindows(),
            isMac: client.isMac(),
            isLinux: client.isLinux(),
            isUbuntu: client.isUbuntu(),
            isSolaris: client.isSolaris()
        };
        
        // Enhanced data that complements ClientJS
        const enhancedData = {
            // Hardware characteristics
            devicePixelRatio: window.devicePixelRatio || 1,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0,
            pointerEnabled: navigator.pointerEnabled || false,
            msMaxTouchPoints: navigator.msMaxTouchPoints || 0,
            
            // Browser capabilities
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
            
            // Advanced fingerprinting techniques (like FingerprintJS)
            webglFingerprint: JSON.stringify(generateWebGLFingerprint()),
            audioFingerprint: JSON.stringify(generateAudioFingerprint()),
            batteryFingerprint: JSON.stringify(await generateBatteryFingerprint()),
            timezoneOffset: new Date().getTimezoneOffset(),
            
            // New enhanced fingerprinting techniques
            ipFingerprint: JSON.stringify(await generateIPFingerprint(clientJSData.browser)),
            enhancedCanvasFingerprint: generateCanvasFingerprint(),
            fontFingerprint: JSON.stringify(generateFontFingerprint()),
            webglVendorFingerprint: JSON.stringify(generateWebGLVendorFingerprint()),
            hardwareFingerprint: JSON.stringify(generateHardwareFingerprint()),
            mediaDevicesFingerprint: JSON.stringify(await generateMediaDevicesFingerprint()),
            screenFingerprint: JSON.stringify(generateScreenFingerprint()),
            pluginsFingerprint: JSON.stringify(generatePluginsFingerprint()),
            mimeTypesFingerprint: JSON.stringify(generateMimeTypesFingerprint()),
            languageFingerprint: JSON.stringify(generateLanguageFingerprint()),
            primaryLanguage: generateLanguageFingerprint().language,
            timezoneFingerprint: JSON.stringify(generateTimezoneFingerprint()),
            connectionFingerprint: JSON.stringify(generateConnectionFingerprint())
        };
        
        // Privacy detection data (may change between normal/incognito)
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
        
        // Combine all data
        const allData = {
            ...clientJSData,
            ...enhancedData,
            ...privacyData
        };
        
        // Create stable data for hashing (exclude privacy-sensitive data)
        const stableData = {
            ...clientJSData,
            ...enhancedData
        };
        
        delete stableData.fingerprint; // Remove ClientJS fingerprint as it varies between modes
        
        // Browser-specific exclusions for privacy mode differences
        if (isBrave()) {
            console.log('Brave detected');
            delete stableData.availableResolution;
            if (stableData.enhancedCanvasFingerprint.dataURL.startsWith('data:image/png;base64,')) {
                const base64Data = stableData.enhancedCanvasFingerprint.dataURL.substring(22); // Remove the data URL prefix
                stableData.enhancedCanvasFingerprint.dataURL = 'data:image/png;base64,' + base64Data.substring(0, 64);
            }
            delete stableData.currentResolution;
            delete stableData.hardwareConcurrency;
            delete stableData.deviceMemory;
            delete stableData.canvasPrint;
            delete stableData.audioFingerprint;
            delete stableData.mimeTypesFingerprint;
            delete stableData.hardwareFingerprint;
            delete stableData.plugins;
            delete stableData.pluginsFingerprint;
            delete stableData.screenFingerprint;
            delete stableData.screenPrint;
        } else if (stableData.browser === 'Safari') {
            delete stableData.availableResolution; // Safari: available resolution may vary in private mode
            delete stableData.canvasPrint; // Canvas fingerprint may vary in Safari private mode
            delete stableData.currentResolution; // Safari: current resolution may vary in private mode
            delete stableData.screenPrint; // Safari: screen print may vary in private mode
            delete stableData.screenFingerprint; // Screen size can be constrained in private mode
            // Truncate enhancedCanvasFingerprint to first 128 base64 characters for Safari
            if (stableData.enhancedCanvasFingerprint.dataURL.startsWith('data:image/png;base64,')) {
                const base64Data = stableData.enhancedCanvasFingerprint.dataURL.substring(22); // Remove the data URL prefix
                stableData.enhancedCanvasFingerprint.dataURL = 'data:image/png;base64,' + base64Data.substring(0, 128);
            }
        } else if (stableData.browser === 'Firefox') {
            delete stableData.canvasPrint;   // Firefox: canvas print changes in private mode
            delete stableData.fonts;         // Firefox: fonts list changes in private mode
            delete stableData.doNotTrack;    // Firefox: doNotTrack changes in private mode
        } else if (stableData.browser === 'Opera') {
            delete stableData.languageFingerprint;     // Opera: language fingerprint changes in private mode
            delete stableData.windowOuterWidth;        // Opera: window dimensions change in private mode
            delete stableData.windowInnerWidth;        // Opera: window dimensions change in private mode
        } else if (stableData.browser === 'Edge') {
            delete stableData.languageFingerprint;     // Edge: language fingerprint changes in private mode
        } else if (stableData.browser === 'Chrome') {
            delete stableData.mediaDevicesFingerprint; // Chrome: media devices change in private mode
            delete stableData.languageFingerprint;     // Chrome: language fingerprint changes in private mode
            delete stableData.windowInnerWidth;        // Chrome: window dimensions change in private mode
            delete stableData.windowOuterWidth;        // Chrome: window dimensions change in private mode
        }
        const stableString = Object.values(stableData).join('|');
        
        // Generate hash with better collision resistance
        const hash = await generateHash(stableString);
        
        // Calculate confidence score based on weighted privacy indicators
        function calculateConfidenceScore() {
            let score = 100; // Start with 100% confidence
            let deductions = [];
            
            // Define privacy indicators with weights (higher weight = more significant)
            const privacyIndicators = [
                // HIGH WEIGHT (10-15 points) - Critical privacy indicators
                {
                    name: 'Limited plugins detected',
                    weight: 15,
                    condition: () => clientJSData.plugins && clientJSData.plugins.split(', ').length < 3,
                    deduction: 'Limited plugins detected (major privacy indicator)'
                },
                {
                    name: 'Limited MIME types detected',
                    weight: 12,
                    condition: () => clientJSData.mimeTypes && clientJSData.mimeTypes.split(', ').length < 2,
                    deduction: 'Limited MIME types detected (major privacy indicator)'
                },
                {
                    name: 'Canvas fingerprint limited',
                    weight: 10,
                    condition: () => clientJSData.canvasPrint && clientJSData.canvasPrint.length < 100,
                    deduction: 'Canvas fingerprint limited (major privacy indicator)'
                },
                {
                    name: 'Enhanced canvas fingerprinting blocked',
                    weight: 10,
                    condition: () => enhancedData.enhancedCanvasFingerprint === 'error',
                    deduction: 'Enhanced canvas fingerprinting blocked (major privacy indicator)'
                },
                
                // MEDIUM WEIGHT (5-8 points) - Significant privacy indicators
                {
                    name: 'Hardware concurrency spoofed',
                    weight: 8,
                    condition: () => enhancedData.hardwareConcurrency === 'unknown' || enhancedData.hardwareConcurrency < 4,
                    deduction: 'Hardware concurrency spoofed (significant privacy indicator)'
                },
                {
                    name: 'Device memory spoofed',
                    weight: 8,
                    condition: () => enhancedData.deviceMemory === 'unknown',
                    deduction: 'Device memory spoofed (significant privacy indicator)'
                },
                {
                    name: 'Font fingerprinting blocked',
                    weight: 7,
                    condition: () => enhancedData.fontFingerprint === 'error',
                    deduction: 'Font fingerprinting blocked (significant privacy indicator)'
                },
                {
                    name: 'WebGL vendor fingerprinting blocked',
                    weight: 7,
                    condition: () => enhancedData.webglVendorFingerprint === 'not_supported',
                    deduction: 'WebGL vendor fingerprinting blocked (significant privacy indicator)'
                },
                {
                    name: 'Limited font list',
                    weight: 6,
                    condition: () => clientJSData.fonts && clientJSData.fonts.split(', ').length < 15,
                    deduction: 'Limited font list (significant privacy indicator)'
                },
                {
                    name: 'IP fingerprinting blocked',
                    weight: 5,
                    condition: () => enhancedData.ipFingerprint === 'not_supported',
                    deduction: 'IP fingerprinting blocked (significant privacy indicator)'
                },
                
                // LOW WEIGHT (2-4 points) - Minor privacy indicators
                {
                    name: 'Window width mismatch',
                    weight: 3,
                    condition: () => privacyData.windowInnerWidth !== privacyData.windowOuterWidth,
                    deduction: 'Window width mismatch (minor privacy indicator)'
                },
                {
                    name: 'Window height mismatch',
                    weight: 3,
                    condition: () => privacyData.windowInnerHeight !== privacyData.windowOuterHeight,
                    deduction: 'Window height mismatch (minor privacy indicator)'
                },
                {
                    name: 'Media devices fingerprinting blocked',
                    weight: 4,
                    condition: () => enhancedData.mediaDevicesFingerprint === 'not_supported',
                    deduction: 'Media devices fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'Plugins fingerprinting blocked',
                    weight: 4,
                    condition: () => enhancedData.pluginsFingerprint === 'error',
                    deduction: 'Plugins fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'MIME types fingerprinting blocked',
                    weight: 4,
                    condition: () => enhancedData.mimeTypesFingerprint === 'error',
                    deduction: 'MIME types fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'Language fingerprinting blocked',
                    weight: 3,
                    condition: () => enhancedData.languageFingerprint === 'error',
                    deduction: 'Language fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'Timezone fingerprinting blocked',
                    weight: 3,
                    condition: () => enhancedData.timezoneFingerprint === 'error',
                    deduction: 'Timezone fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'Connection fingerprinting blocked',
                    weight: 2,
                    condition: () => enhancedData.connectionFingerprint === 'not_supported',
                    deduction: 'Connection fingerprinting blocked (minor privacy indicator)'
                },
                {
                    name: 'Screen fingerprinting blocked',
                    weight: 2,
                    condition: () => enhancedData.screenFingerprint === 'error',
                    deduction: 'Screen fingerprinting blocked (minor privacy indicator)'
                },
                
                // BROWSER-SPECIFIC INDICATORS
                {
                    name: 'Safari private mode detected',
                    weight: 8,
                    condition: () => stableData.browser === 'Safari' && enhancedData.deviceMemory === 'unknown',
                    deduction: 'Safari private mode detected (significant privacy indicator)'
                },
                {
                    name: 'Firefox privacy mode detected',
                    weight: 8,
                    condition: () => stableData.browser === 'Firefox' && enhancedData.doNotTrack === '1',
                    deduction: 'Firefox privacy mode detected (significant privacy indicator)'
                },
                {
                    name: 'Safari private mode window constraints',
                    weight: 4,
                    condition: () => stableData.browser === 'Safari' && privacyData.windowInnerWidth < 1000 && privacyData.windowInnerHeight < 1000,
                    deduction: 'Safari private mode window constraints detected (minor privacy indicator)'
                },
                {
                    name: 'Opera private mode window constraints',
                    weight: 4,
                    condition: () => stableData.browser === 'Opera' && privacyData.windowInnerWidth < 1200 && privacyData.windowInnerHeight < 1000,
                    deduction: 'Opera private mode window constraints detected (minor privacy indicator)'
                },
                {
                    name: 'Opera private mode detected',
                    weight: 6,
                    condition: () => stableData.browser === 'Opera' && clientJSData.plugins && clientJSData.plugins.split(', ').length > 4,
                    deduction: 'Opera private mode detected (more plugins than normal)'
                },
                {
                    name: 'Language mismatch',
                    weight: 3,
                    condition: () => clientJSData.language !== clientJSData.systemLanguage,
                    deduction: 'Language mismatch (minor privacy indicator)'
                }
            ];
            
            // Calculate weighted score
            let detectedIndicators = [];
            let totalDeduction = 0;
            
            privacyIndicators.forEach(indicator => {
                if (indicator.condition()) {
                    detectedIndicators.push(indicator);
                    totalDeduction += indicator.weight;
                    deductions.push(indicator.deduction);
                }
            });
            
            // Calculate final score with weighted deductions
            score = Math.max(25, 100 - totalDeduction); // Minimum 25% confidence
            
            // Determine confidence level based on score and indicator types
            let confidenceLevel = 'High';
            let confidenceReason = '';
            
            if (score >= 85) {
                confidenceLevel = 'Very High';
                confidenceReason = 'Excellent fingerprinting capabilities with minimal privacy restrictions';
            } else if (score >= 70) {
                confidenceLevel = 'High';
                confidenceReason = 'Good fingerprinting capabilities with minor privacy restrictions';
            } else if (score >= 55) {
                confidenceLevel = 'Medium';
                confidenceReason = 'Moderate fingerprinting capabilities with some privacy restrictions';
            } else if (score >= 40) {
                confidenceLevel = 'Low';
                confidenceReason = 'Limited fingerprinting capabilities with significant privacy restrictions';
            } else {
                confidenceLevel = 'Very Low';
                confidenceReason = 'Severely limited fingerprinting capabilities with strong privacy restrictions';
            }
            
            // Add summary to deductions
            deductions.push(`--- CONFIDENCE ANALYSIS ---`);
            deductions.push(`Total weighted deduction: ${totalDeduction} points`);
            deductions.push(`Detected indicators: ${detectedIndicators.length}`);
            deductions.push(`Confidence level: ${confidenceLevel}`);
            deductions.push(`Reason: ${confidenceReason}`);
            
            return {
                score: Math.round(score),
                confidence: confidenceLevel,
                deductions: deductions,
                privacyIndicators: detectedIndicators.length,
                totalWeight: totalDeduction,
                detectedIndicators: detectedIndicators.map(i => i.name)
            };
        }
        
        const confidence = calculateConfidenceScore();
        
        // Display the hash and confidence score
        const displayText = `Hash: ${hash}\nConfidence: ${confidence.score}% (${confidence.confidence})`;
        document.getElementById('uniqueId').textContent = displayText;
        
        // Create summary data for display
        const summaryData = {
            fingerprint: clientJSData.fingerprint || 'N/A',
            hash: hash,
            confidenceScore: confidence.score,
            confidenceLevel: confidence.confidence,
            confidenceDeductions: confidence.deductions,
            privacyIndicators: confidence.privacyIndicators,
            browser: stableData.browser,
            browserVersion: stableData.browserVersion,
            os: stableData.os,
            osVersion: stableData.osVersion,
            device: stableData.device,
            deviceType: stableData.deviceType,
            colorDepth: stableData.colorDepth,
            timezone: stableData.timezone,
            language: stableData.language || 'N/A',
            systemLanguage: stableData.systemLanguage || 'N/A',
            sessionStorage: stableData.sessionStorage,
            localStorage: stableData.localStorage,
            cookies: stableData.cookies,
            java: stableData.java,
            flash: stableData.flash,
            silverlight: stableData.silverlight,
            canvas: stableData.canvas,
            isMobile: stableData.isMobile,
            isChrome: stableData.isChrome,
            isSafari: stableData.isSafari,
            isFirefox: stableData.isFirefox,
            isIE: stableData.isIE,
            isOpera: stableData.isOpera,
            isWindows: stableData.isWindows,
            isMac: stableData.isMac,
            isLinux: stableData.isLinux,
            pluginsCount: clientJSData.plugins ? clientJSData.plugins.split(', ').length : 0,
            fontsCount: stableData.fonts ? stableData.fonts.split(', ').length : 0,
            mimeTypesCount: clientJSData.mimeTypes ? clientJSData.mimeTypes.split(', ').length : 0,
            devicePixelRatio: stableData.devicePixelRatio,
            hardwareConcurrency: stableData.hardwareConcurrency || 'N/A',
            deviceMemory: stableData.deviceMemory || 'N/A',
            connectionType: stableData.connectionType,
            maxTouchPoints: stableData.maxTouchPoints,
            pointerEnabled: stableData.pointerEnabled,
            webdriver: stableData.webdriver,
            doNotTrack: stableData.doNotTrack || 'N/A',
            cookieEnabled: stableData.cookieEnabled,
            onLine: stableData.onLine,
            webglFingerprint: stableData.webglFingerprint,
            audioFingerprint: enhancedData.audioFingerprint ? enhancedData.audioFingerprint.substring(0, 30) + '...' : 'N/A',
            batteryFingerprint: enhancedData.batteryFingerprint ? enhancedData.batteryFingerprint.substring(0, 30) + '...' : 'N/A',
            timezoneOffset: stableData.timezoneOffset,
            ipFingerprint: enhancedData.ipFingerprint ? enhancedData.ipFingerprint.substring(0, 30) + '...' : 'N/A',
            enhancedCanvasFingerprint: enhancedData.enhancedCanvasFingerprint ? 'Available' : 'N/A',
            fontFingerprint: enhancedData.fontFingerprint ? 'Available' : 'N/A',
            webglVendorFingerprint: enhancedData.webglVendorFingerprint ? enhancedData.webglVendorFingerprint.substring(0, 30) + '...' : 'N/A',

            hardwareFingerprint: enhancedData.hardwareFingerprint ? 'Available' : 'N/A',
            mediaDevicesFingerprint: enhancedData.mediaDevicesFingerprint ? 'Available' : 'N/A',
            screenFingerprint: enhancedData.screenFingerprint ? 'Available' : 'N/A',
            pluginsFingerprint: enhancedData.pluginsFingerprint ? 'Available' : 'N/A',
            mimeTypesFingerprint: enhancedData.mimeTypesFingerprint ? 'Available' : 'N/A',
            languageFingerprint: enhancedData.languageFingerprint ? 'Available' : 'N/A',
            timezoneFingerprint: enhancedData.timezoneFingerprint ? 'Available' : 'N/A',
            connectionFingerprint: enhancedData.connectionFingerprint ? 'Available' : 'N/A'
        };
        
        // Store data in window for export function
        window.currentHash = hash;
        window.currentConfidenceScore = confidence.score;
        window.currentConfidenceLevel = confidence.confidence;
        window.currentConfidenceDeductions = confidence.deductions;
        window.currentPrivacyIndicators = confidence.privacyIndicators;
        

        window.currentStableData = stableData;
        window.currentSummaryData = summaryData;
        window.currentAllData = allData;
        window.currentClientJSData = clientJSData;
        window.currentEnhancedData = enhancedData;
        window.currentPrivacyData = privacyData;
        
        return { 
            hash, 
            stableData, 
            summaryData, 
            allData,
            clientJSData,
            enhancedData,
            privacyData
        };
    } catch (error) {
        document.getElementById('uniqueId').textContent = 'Error generating ID: ' + error.message;
    }
}

// Function to generate a new ID (called by the refresh button)
async function generateNewId() {
    document.getElementById('uniqueId').textContent = 'Generating...';
    
    setTimeout(async () => {
        await generateUniqueId();
    }, 500);
}

// Generate unique ID when ClientJS is loaded
window.addEventListener('clientjs-loaded', async function() {
    await generateUniqueId();
});

// Fallback: try to generate ID when page loads
window.addEventListener('load', async function() {
    setTimeout(async () => {
        if (typeof ClientJS !== 'undefined') {
            await generateUniqueId();
        }
    }, 1000);
});

// Function to export clean data
function exportCleanData() {
    const timestamp = new Date().toISOString();
    const data = {
        timestamp: timestamp,
        fingerprint: {
            hash: window.currentHash || 'N/A',
            confidenceScore: window.currentConfidenceScore || 0,
            confidenceLevel: window.currentConfidenceLevel || 'Unknown',
            confidenceDeductions: window.currentConfidenceDeductions || [],
            privacyIndicators: window.currentPrivacyIndicators || 0,
            stableData: window.currentStableData || {},
            summaryData: window.currentSummaryData || {},
            allData: window.currentAllData || {},
            clientJSData: window.currentClientJSData || {},
            enhancedData: window.currentEnhancedData || {},
            privacyData: window.currentPrivacyData || {}
        }
    };

    // Determine browser name
    let browserName = 'Browser';
    if (window.currentSummaryData && window.currentSummaryData.browser) {
        browserName = window.currentSummaryData.browser;
    } else if (window.currentStableData && window.currentStableData.browser) {
        browserName = window.currentStableData.browser;
    } else if (window.currentClientJSData && window.currentClientJSData.browser) {
        browserName = window.currentClientJSData.browser;
    }

    // Determine mode
    let mode = 'Normal';
    if (window.currentConfidenceScore !== undefined && window.currentConfidenceScore < 85) {
        mode = 'Incognito';
    }

    // Clean up browser name for filename
    browserName = browserName.replace(/[^a-zA-Z0-9]/g, '');

    const fileName = `${browserName}-${mode}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export functions for potential external use
window.generateUniqueId = generateUniqueId;
window.generateNewId = generateNewId;
window.exportCleanData = exportCleanData;