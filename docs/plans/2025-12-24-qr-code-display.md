# QR Code Display Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add QR code display to frontend dashboard for WhatsApp authentication

**Architecture:** Modify Baileys connection handler to emit QR codes via Server-Sent Events (SSE), update Express server with QR endpoint, enhance frontend dashboard with real-time QR display and connection status

**Tech Stack:** Baileys WhatsApp library, Express.js, Server-Sent Events (SSE), HTML/CSS/JavaScript, QR code rendering

## Implementation Tasks

### Task 1: Update WhatsApp Connection Handler to Capture QR Events

**Files:**
- Modify: `index.js:21-36`

**Step 1: Add global socket reference and QR code storage**

```javascript
// Add at top after imports
let globalSock = null;
let qrCodeData = null;
let connectionStatus = 'connecting';
```

**Step 2: Modify connection.update event handler**

```javascript
sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    
    // Store QR code when available
    if (qr) {
        qrCodeData = qr;
        connectionStatus = 'qr-ready';
        logger.info('QR Code received and stored');
    }
    
    if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        connectionStatus = 'disconnected';
        
        if (shouldReconnect) {
            logger.info('Reconnecting...')
            startBot()
        } else {
            logger.error('Connection closed. Please scan QR again.')
            connectionStatus = 'needs-scan';
        }
    } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeData = null; // Clear QR code when connected
        logger.info('Connection opened!')
    } else if (connection === 'connecting') {
        connectionStatus = 'connecting';
    }
})
```

**Step 3: Store socket globally**

```javascript
// Before return sock in startBot function
globalSock = sock;
return sock;
```

**Step 4: Export getters for server access**

```javascript
// Add at end of file
export function getSocket() { return globalSock; }
export function getQRCode() { return qrCodeData; }
export function getConnectionStatus() { return connectionStatus; }
```

**Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add QR code capture and connection status tracking"
```

### Task 2: Add SSE Endpoint and QR API to Express Server

**Files:**
- Modify: `server/index.js`

**Step 1: Import connection functions**

```javascript
// Add at top with other imports
import { getSocket, getQRCode, getConnectionStatus } from '../index.js';
```

**Step 2: Add QR code SSE endpoint**

```javascript
// Add after requireAuth function
app.get('/api/qr-events', requireAuth, (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial status
    res.write(`data: ${JSON.stringify({ 
        status: getConnectionStatus(),
        qr: getQRCode() 
    })}\n\n`);

    // Set up interval to check for updates
    const interval = setInterval(() => {
        const data = {
            status: getConnectionStatus(),
            qr: getQRCode()
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 1000);

    // Clean up on disconnect
    req.on('close', () => {
        clearInterval(interval);
    });
});
```

**Step 3: Add manual refresh endpoint**

```javascript
app.post('/api/refresh-qr', requireAuth, async (req, res) => {
    try {
        const sock = getSocket();
        if (sock && sock.ws) {
            await sock.ws.close();
            res.json({ success: true, message: 'QR refresh requested' });
        } else {
            res.status(400).json({ success: false, message: 'Cannot refresh QR' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Refresh failed' });
    }
});
```

**Step 4: Update status endpoint to include connection info**

```javascript
app.get('/api/status', requireAuth, (req, res) => {
    res.json({
        status: 'online',
        port: PORT,
        bot: 'WhatsApp Bot',
        version: '1.0.0',
        whatsappStatus: getConnectionStatus(),
        hasQR: !!getQRCode()
    })
})
```

**Step 5: Commit**

```bash
git add server/index.js
git commit -m "feat: add SSE QR endpoint and connection status API"
```

### Task 3: Update Frontend Dashboard with QR Code Display

**Files:**
- Modify: `frontend/public/dashboard.html`

**Step 1: Add QR code CSS styles**

```css
/* Add after .highlight style */
.qr-section {
    background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%);
    border: 2px solid #667eea;
    border-radius: 15px;
    padding: 30px;
    margin-bottom: 25px;
    text-align: center;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.qr-header {
    margin-bottom: 20px;
}

.qr-title {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin-bottom: 8px;
}

.qr-subtitle {
    font-size: 16px;
    color: #666;
}

.qr-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
    font-size: 18px;
    font-weight: 600;
}

.status-connecting {
    color: #ff9800;
}

.status-ready {
    color: #4caf50;
}

.status-connected {
    color: #4caf50;
}

.status-failed {
    color: #f44336;
}

.qr-canvas {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    margin: 20px 0;
    display: inline-block;
}

.qr-canvas canvas {
    display: block;
    max-width: 256px;
    height: auto;
}

.spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.retry-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 15px;
}

.retry-btn:hover {
    background: #d32f2f;
}

.refresh-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-left: 15px;
}

.refresh-btn:hover {
    background: #5a6fd8;
}

.connection-icon {
    font-size: 24px;
}

@media (max-width: 768px) {
    .qr-section {
        margin: 0 -10px 20px -10px;
        border-radius: 10px;
        padding: 20px 15px;
        min-height: 350px;
    }
    
    .qr-canvas canvas {
        max-width: 200px;
    }
}
```

**Step 2: Add QR code HTML section**

```html
<!-- Add after .navbar and before .container -->
<div class="container">
    <!-- QR Code Section -->
    <div class="card qr-section" id="qrSection">
        <div class="qr-header">
            <h2 class="qr-title">WhatsApp Connection</h2>
            <p class="qr-subtitle">Connect your WhatsApp account to use the bot</p>
        </div>
        
        <div class="qr-status" id="qrStatus">
            <span class="connection-icon" id="statusIcon">⏳</span>
            <span id="statusText">Connecting...</span>
        </div>
        
        <div id="qrContainer"></div>
        
        <div id="actionButtons"></div>
    </div>
    
    <!-- Rest of existing cards -->
```

**Step 3: Add QR code generation library**

```html
<!-- Add before closing </head> tag -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

**Step 4: Add QR code JavaScript functionality**

```javascript
// Add after existing logout event listener
let eventSource = null;
let currentQR = null;

function updateQRDisplay(data) {
    const qrContainer = document.getElementById('qrContainer');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');
    const qrStatus = document.getElementById('qrStatus');
    const actionButtons = document.getElementById('actionButtons');
    
    // Clear previous content
    qrContainer.innerHTML = '';
    actionButtons.innerHTML = '';
    
    switch(data.status) {
        case 'connecting':
            qrStatus.className = 'qr-status status-connecting';
            statusIcon.textContent = '⏳';
            statusText.textContent = 'Connecting to WhatsApp...';
            qrContainer.innerHTML = '<div class="spinner"></div>';
            break;
            
        case 'qr-ready':
            qrStatus.className = 'qr-status status-ready';
            statusIcon.textContent = '📱';
            statusText.textContent = 'Scan QR Code with WhatsApp';
            
            if (data.qr && data.qr !== currentQR) {
                currentQR = data.qr;
                const qrCanvas = document.createElement('div');
                qrCanvas.className = 'qr-canvas';
                const canvas = document.createElement('canvas');
                qrCanvas.appendChild(canvas);
                qrContainer.appendChild(qrCanvas);
                
                QRCode.toCanvas(canvas, data.qr, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, function (error) {
                    if (error) console.error('QR generation error:', error);
                });
                
                // Add refresh button
                actionButtons.innerHTML = '<button class="refresh-btn" id="refreshQR">🔄 Refresh QR</button>';
                document.getElementById('refreshQR').addEventListener('click', refreshQR);
            }
            break;
            
        case 'connected':
            qrStatus.className = 'qr-status status-connected';
            statusIcon.textContent = '✅';
            statusText.textContent = 'WhatsApp Connected Successfully!';
            currentQR = null;
            break;
            
        case 'needs-scan':
            qrStatus.className = 'qr-status status-failed';
            statusIcon.textContent = '❌';
            statusText.textContent = 'Connection Failed - Please Try Again';
            actionButtons.innerHTML = '<button class="retry-btn" id="retryConnection">🔄 Retry Connection</button>';
            document.getElementById('retryConnection').addEventListener('click', refreshQR);
            break;
            
        case 'disconnected':
            qrStatus.className = 'qr-status status-failed';
            statusIcon.textContent = '❌';
            statusText.textContent = 'Disconnected - Please Reconnect';
            actionButtons.innerHTML = '<button class="retry-btn" id="retryConnection">🔄 Reconnect</button>';
            document.getElementById('retryConnection').addEventListener('click', refreshQR);
            break;
    }
}

function startQRUpdates() {
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource('/api/qr-events');
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            updateQRDisplay(data);
        } catch (error) {
            console.error('Error parsing QR event:', error);
        }
    };
    
    eventSource.onerror = function(event) {
        console.error('QR SSE error:', event);
        setTimeout(startQRUpdates, 5000); // Reconnect after 5 seconds
    };
}

async function refreshQR() {
    try {
        const response = await fetch('/api/refresh-qr', {
            method: 'POST'
        });
        const data = await response.json();
        if (data.success) {
            updateQRDisplay({ status: 'connecting' });
        }
    } catch (error) {
        console.error('Refresh QR failed:', error);
    }
}

// Start QR updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    startQRUpdates();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (eventSource) {
        eventSource.close();
    }
});
```

**Step 5: Commit**

```bash
git add frontend/public/dashboard.html
git commit -m "feat: add QR code display with real-time updates"
```

### Task 4: Testing and Verification

**Files:**
- Test: Existing codebase

**Step 1: Start the application**

```bash
npm start
```

**Step 2: Test the flow**

1. Navigate to http://localhost:9091
2. Login with credentials
3. Verify QR section appears at top
4. Check connection status updates
5. Verify QR code displays correctly
6. Test refresh/retry buttons
7. Confirm successful connection state

**Step 3: Verify mobile responsiveness**

1. Use browser dev tools to test mobile view
2. Check QR code sizing on smaller screens
3. Verify button layout and functionality

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix: address responsive and UX issues found in testing"
```

### Task 5: Final Integration Testing

**Step 1: Test complete authentication flow**

1. Clear existing auth files: `rm -rf storage/auth/*`
2. Restart application
3. Complete WhatsApp authentication via web QR
4. Verify bot functionality works

**Step 2: Test reconnection scenarios**

1. Disconnect WhatsApp from phone
2. Verify dashboard shows reconnect option
3. Test reconnection flow

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete QR code authentication feature"
```

## Implementation Notes

- Uses Server-Sent Events for real-time updates (simpler than WebSocket)
- QR codes are generated client-side using qrcode.js library
- Connection status is tracked globally and exposed via API
- Responsive design ensures mobile compatibility
- Auto-refresh combined with manual refresh options
- Proper cleanup of SSE connections on page unload