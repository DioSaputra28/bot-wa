import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 9091
const FRONTEND_USER = process.env.FRONTEND_USER || 'diosaputra'
const FRONTEND_PASS = process.env.FRONTEND_PASS || 'Diosaputra288@'

// Middleware
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

// Serve static files
app.use(express.static(path.join(process.cwd(), 'frontend')))

// Routes
app.get('/', (req, res) => {
    const isAuthenticated = req.cookies.auth === 'true'
    if (isAuthenticated) {
        res.redirect('/dashboard')
    } else {
        res.sendFile(path.join(process.cwd(), 'frontend/login.html'))
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
    res.sendFile(path.join(process.cwd(), 'frontend/dashboard.html'))
})

app.get('/api/status', requireAuth, (req, res) => {
    res.json({
        status: 'online',
        port: PORT,
        bot: 'WhatsApp Bot',
        version: '1.0.0'
    })
})

export function startServer() {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`)
        console.log(`Frontend: http://localhost:${PORT}`)
    })
}

export default app
