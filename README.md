# Fingerprint2Me.js

A comprehensive browser fingerprinting library that generates unique visitor IDs based on device and browser characteristics. Built with privacy compliance in mind and supports GDPR requirements.

## Features

- 🔒 **Privacy-First**: GDPR compliant with consent management
- 🚀 **High Performance**: Caching and performance monitoring built-in
- 🔍 **Advanced Fingerprinting**: 15+ fingerprinting techniques
- 🌐 **Cross-Browser**: Works across all modern browsers
- 📱 **Device Detection**: Mobile, tablet, and desktop support
- 🛡️ **Error Handling**: Comprehensive error tracking and logging
- 📊 **Confidence Scoring**: Reliability assessment for each fingerprint

## Installation

### CDN (Recommended)
```html
<script src="https://cdn.jsdelivr.net/npm/clientjs@0.2.1/dist/client.min.js"></script>
<script src="path/to/fingerprint2me.js"></script>
```

### NPM (if using in Node.js environment)
```bash
npm install clientjs
```

### Direct Download
Download `fingerprint2me.js` and `client.min.js` from this repository.

## Basic Usage

### Simple Implementation
```html
<!DOCTYPE html>
<html>
<head>
    <script src="client.min.js"></script>
    <script src="fingerprint2me.js"></script>
</head>
<body>
    <script>
        // Get unique visitor ID
        fingerprint2me.getUniqueVisitorId().then(result => {
            console.log('Visitor ID:', result.uniqueVisitorId);
            console.log('Confidence:', result.confidence);
            console.log('Timezone:', result.timezone);
            console.log('IP Data:', result.ipData);
        });
    </script>
</body>
</html>
```

### Advanced Usage with Privacy Compliance
```javascript
// Check current consent status
const consentStatus = fingerprint2me.getConsentStatus();
console.log('Consent given:', consentStatus.consentGiven);

// Give consent for advanced fingerprinting
fingerprint2me.giveConsent(['basic', 'advanced', 'network']);

// Get fingerprint with consent
fingerprint2me.getUniqueVisitorId().then(result => {
    console.log('Unique ID:', result.uniqueVisitorId);
    console.log('Confidence Score:', result.confidence.score + '%');
    console.log('Confidence Level:', result.confidence.level);
    console.log('Hash Method:', result.hashMethod);
});

// Revoke consent (clears cache and limits data collection)
fingerprint2me.revokeConsent();
```

## API Reference

### Main Functions

#### `getUniqueVisitorId()`
Generates a unique visitor ID based on device characteristics.

**Returns:** `Promise<Object>`
```javascript
{
    uniqueVisitorId: "abc123def456...",  // 32-character hash
    confidence: {
        score: 85,                       // 0-100 confidence percentage
        level: "High",                   // Very Low, Low, Medium, High, Very High
        deductions: [...],               // Array of issues found
        details: [...],                  // Available data points
        rawScore: 120,                   // Raw score before percentage
        maxPossibleScore: 150,           // Maximum possible score
        dataPointsAvailable: 45,         // Number of data points collected
        fingerprintingTechniques: {
            core: 40,                    // Core techniques score
            advanced: 60                 // Advanced techniques score
        }
    },
    timezone: "America/New_York",
    ipData: {
        ip: "192.168.1.1",
        country: "United States",
        region: "New York",
        city: "New York",
        isp: "ISP Name",
        timezone: "America/New_York"
    },
    hashMethod: "SHA-256"               // or "SimpleHash" for older browsers
}
```

#### `getStableDeviceData()`
Returns stable device characteristics (excludes window size data).

**Returns:** `Promise<Object>`
```javascript
{
    userAgent: "Mozilla/5.0...",
    browser: "Chrome",
    browserVersion: "91.0.4472.124",
    os: "Windows",
    osVersion: "10",
    hardwareConcurrency: 8,
    deviceMemory: 8,
    // ... and many more properties
}
```

#### `getAllDeviceData()`
Returns all device data including privacy-sensitive information like window sizes.

**Returns:** `Promise<Object>`

### Privacy & GDPR Compliance

#### `giveConsent(techniques)`
Grants consent for fingerprinting techniques.

**Parameters:**
- `techniques` (Array): `['basic', 'advanced', 'network']`

**Technique Levels:**
- `basic`: Core browser/device info only
- `advanced`: Canvas, WebGL, Audio fingerprinting
- `network`: IP geolocation, network information

```javascript
// Basic consent (minimal data collection)
fingerprint2me.giveConsent(['basic']);

// Full consent
fingerprint2me.giveConsent(['basic', 'advanced', 'network']);
```

#### `revokeConsent()`
Revokes all consent and clears cached data.

```javascript
fingerprint2me.revokeConsent();
```

#### `getConsentStatus()`
Returns current consent status.

**Returns:** `Object`
```javascript
{
    consentGiven: true,
    allowedTechniques: ['basic', 'advanced'],
    timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Individual Fingerprinting Functions

These functions can be used independently:

```javascript
// WebGL fingerprinting
const webglData = fingerprint2me.generateWebGLFingerprint();

// Audio context fingerprinting
const audioData = fingerprint2me.generateAudioFingerprint();

// WebRTC fingerprinting
const webrtcData = await fingerprint2me.generateWebRTCFingerprint();

// CSS media queries fingerprinting
const cssData = fingerprint2me.generateCSSMediaQueriesFingerprint();

// And many more...
```

### Utility Functions

#### `validateAndSanitizeInput(input, maxLength)`
Validates and sanitizes input strings.

#### `isValidURL(url)`
Validates if a URL is safe to use.

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | All features supported |
| Firefox | ✅ Full | Some limitations in privacy mode |
| Safari | ✅ Partial | Limited canvas fingerprinting |
| Edge | ✅ Full | All features supported |
| Opera | ✅ Full | All features supported |
| Brave | ⚠️ Limited | Privacy protections reduce data |

## Privacy Considerations

This library is designed with privacy in mind:

1. **Consent Management**: GDPR compliant consent system
2. **Data Minimization**: Only collects necessary data based on consent
3. **Transparency**: Clear logging of what data is collected
4. **User Control**: Easy consent revocation
5. **Secure Storage**: Uses secure APIs when available

### GDPR Compliance Example

```javascript
// Check if user has given consent
if (!fingerprint2me.getConsentStatus().consentGiven) {
    // Show consent dialog
    showConsentDialog()
        .then(userConsent => {
            if (userConsent) {
                fingerprint2me.giveConsent(['basic', 'advanced']);
                return fingerprint2me.getUniqueVisitorId();
            }
        })
        .then(result => {
            if (result) {
                // Use fingerprint
                trackUser(result.uniqueVisitorId);
            }
        });
}
```

## Performance

The library includes built-in performance monitoring:

- **Caching**: 5-minute cache for expensive operations
- **Timeouts**: API calls timeout after 1-3 seconds
- **Rate Limiting**: Prevents API abuse
- **Parallel Processing**: Multiple fingerprinting techniques run concurrently

## Error Handling

Comprehensive error handling is built-in:

```javascript
fingerprint2me.getUniqueVisitorId().then(result => {
    if (result.error) {
        console.error('Fingerprinting failed:', result.error);
    } else {
        console.log('Success:', result.uniqueVisitorId);
    }
});
```

## Security Features

- **Input Sanitization**: All inputs are validated and sanitized
- **URL Validation**: Only allows HTTPS/HTTP URLs
- **DoS Prevention**: Length limits and timeouts
- **CSP Friendly**: No inline scripts or eval()

## Examples

### E-commerce Fraud Prevention
```javascript
fingerprint2me.giveConsent(['basic', 'advanced', 'network']);
fingerprint2me.getUniqueVisitorId().then(result => {
    // Send to fraud detection system
    fetch('/api/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            visitorId: result.uniqueVisitorId,
            confidence: result.confidence.score,
            ipData: result.ipData
        })
    });
});
```

### Analytics Tracking
```javascript
fingerprint2me.giveConsent(['basic']);
fingerprint2me.getUniqueVisitorId().then(result => {
    // Track unique visitors
    analytics.track('unique_visitor', {
        visitorId: result.uniqueVisitorId,
        confidence: result.confidence.level,
        timezone: result.timezone
    });
});
```

### A/B Testing
```javascript
fingerprint2me.getUniqueVisitorId().then(result => {
    // Consistent A/B test assignment
    const testGroup = result.uniqueVisitorId.slice(-1) < '8' ? 'A' : 'B';
    showExperiment(testGroup);
});
```

## Development

### Building from Source
```bash
git clone https://github.com/yourusername/fingerprint2me.git
cd fingerprint2me
# No build process required - vanilla JavaScript
```

### Testing
Open `index.html` in your browser to test the library.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across browsers
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/fingerprint2me/issues)
- Email: support@fingerprint2me.com

---

**Note**: This library is for legitimate use cases such as fraud prevention, analytics, and user experience enhancement. Please ensure compliance with applicable privacy laws and regulations in your jurisdiction. 