import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import QRCode from 'qrcode'
import os from 'os'
import fs from 'fs'
import { getQRCode, getConnectionStatus } from './bot-state.js'

const app = express()
const PORT = process.env.PORT || 9091
const FRONTEND_USER = process.env.FRONTEND_USER || 'diosaputra'
const FRONTEND_PASS = process.env.FRONTEND_PASS || 'Diosaputra288@'

// System monitoring
let bandwidthUsage = { upload: 0, download: 0 }
const startTime = Date.now()

// Function to get system stats
function getSystemStats() {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    
    // Calculate CPU usage (simplified)
    let totalIdle = 0
    let totalTick = 0
    cpus.forEach(cpu => {
        for (const type in cpu.times) {
            totalTick += cpu.times[type]
        }
        totalIdle += cpu.times.idle
    })
    const cpuUsage = 100 - (totalIdle / totalTick * 100)
    
    // Get process memory usage
    const memUsage = process.memoryUsage()
    
    return {
        cpu: {
            usage: Math.round(cpuUsage * 100) / 100,
            cores: cpus.length
        },
        memory: {
            total: Math.round(totalMem / 1024 / 1024), // MB
            used: Math.round(usedMem / 1024 / 1024), // MB
            free: Math.round(freeMem / 1024 / 1024), // MB
            process: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024) // MB
            }
        },
        uptime: Date.now() - startTime,
        loadavg: os.loadavg()
    }
}

// Function to track bandwidth
function trackBandwidth(req, res, next) {
    const startTime = Date.now()
    
    res.on('finish', () => {
        const responseSize = res.get('Content-Length') || 0
        const requestSize = req.socket.bytesRead || 0
        
        bandwidthUsage.download += parseInt(requestSize)
        bandwidthUsage.upload += parseInt(responseSize)
    })
    
    next()
}

// Apply bandwidth tracking to all routes
app.use(trackBandwidth)

// Middleware
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use(express.static(path.join(process.cwd(), 'frontend')))

// Routes
app.get('/', (req, res) => {
    const isAuthenticated = req.cookies.auth === 'true'
    if (isAuthenticated) {
        res.redirect('/dashboard')
    } else {
        res.sendFile(path.join(process.cwd(), 'frontend/public/login.html'))
    }
})

app.post('/api/login', (req, res) => {
    const { username, password } = req.body

    if (username === FRONTEND_USER && password === FRONTEND_PASS) {
        res.cookie('auth', 'true', {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true
        })
        res.json({ success: true, message: 'Login berhasil' })
    } else {
        res.status(401).json({ success: false, message: 'Username atau password salah' })
    }
})

app.post('/api/logout', (req, res) => {
    res.clearCookie('auth')
    res.json({ success: true, message: 'Logout berhasil' })
})

function requireAuth(req, res, next) {
    if (req.cookies.auth === 'true') {
        next()
    } else {
        res.redirect('/')
    }
}

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'frontend/public/dashboard.html'))
})

app.get('/api/status', requireAuth, (req, res) => {
    const connectionStatus = getConnectionStatus()
    const qrCodeData = getQRCode()
    const systemStats = getSystemStats()
    
    res.json({
        status: 'online',
        port: PORT,
        bot: 'WhatsApp Bot',
        version: '1.0.0',
        uptime: systemStats.uptime,
        whatsapp: {
            status: connectionStatus,
            hasQR: !!qrCodeData,
            timestamp: new Date().toISOString()
        },
        system: {
            cpu: systemStats.cpu,
            memory: systemStats.memory,
            bandwidth: {
                upload: Math.round(bandwidthUsage.upload / 1024), // KB
                download: Math.round(bandwidthUsage.download / 1024), // KB
                uploadMb: Math.round(bandwidthUsage.upload / 1024 / 1024 * 100) / 100, // MB
                downloadMb: Math.round(bandwidthUsage.download / 1024 / 1024 * 100) / 100 // MB
            }
        }
    })
})

app.get('/api/qr', requireAuth, (req, res) => {
    const qrCodeData = getQRCode()
    const connectionStatus = getConnectionStatus()
    
    if (!qrCodeData && connectionStatus !== 'qr-ready') {
        return res.status(404).json({
            success: false,
            message: 'QR code not available'
        })
    }
    
    res.json({
        success: true,
        qrCode: qrCodeData,
        status: connectionStatus,
        timestamp: new Date().toISOString()
    })
})

app.get('/api/qr/image', requireAuth, async (req, res) => {
    const qrCodeData = getQRCode()
    
    if (!qrCodeData) {
        return res.status(404).json({
            success: false,
            message: 'QR code not available'
        })
    }
    
    try {
        const qrImage = await QRCode.toBuffer(qrCodeData, {
            type: 'png',
            width: 256,
            margin: 2
        })
        
        res.set('Content-Type', 'image/png')
        res.send(qrImage)
    } catch (error) {
        console.error('Failed to generate QR image:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to generate QR code image'
        })
    }
})

app.get('/api/events', requireAuth, (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    })
    
    const sendUpdate = () => {
        const status = getConnectionStatus()
        const qrCode = getQRCode()
        
        const data = {
            type: 'status-update',
            status,
            hasQR: !!qrCode,
            timestamp: new Date().toISOString()
        }
        
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
    
    sendUpdate()
    
    const interval = setInterval(sendUpdate, 2000)
    
    req.on('close', () => {
        clearInterval(interval)
    })
})

app.post('/api/pair-code', requireAuth, express.json(), async (req, res) => {
    const { phoneNumber } = req.body
    
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            message: 'Phone number is required'
        })
    }
    
    try {
        res.json({
            success: false,
            message: 'Pair code feature not yet implemented'
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

export function startServer() {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`)
        console.log(`Frontend: http://localhost:${PORT}`)
    })
}

export default app
