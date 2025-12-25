export const URL_PATTERNS = {
    tiktok: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/(@?[\w.]+)\/video\/(\d+)|(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/[\w-]+/,
    youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|stories\/[\w-]+\/\d+)\/([\w-]+)|(?:https?:\/\/)?(?:www\.)?instagram\.com\/reels?\/[\w-]+/,
    twitter: /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/[\w]+\/status\/(\d+)|(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/i\/status\/(\d+)/,
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:[\w.]+\/videos\/|[\w.]+\/posts\/|watch\/?\?v=)(\d+)/
}

export function validateURL(url, type) {
    if (!url) return false
    const pattern = URL_PATTERNS[type]
    if (!pattern) return false
    return pattern.test(url)
}

export function extractCommandAndURL(text) {
    const commands = {
        '.tiktok': 'tiktok',
        '.yt': 'youtube',
        '.ytmp3': 'youtube_mp3',
        '.ig': 'instagram',
        '.twitter': 'twitter',
        '.fb': 'facebook',
        '.x': 'twitter'
    }

    for (const [cmd, platform] of Object.entries(commands)) {
        if (text.startsWith(cmd)) {
            const url = text.slice(cmd.length).trim()
            if (url && validateURL(url, platform === 'youtube_mp3' ? 'youtube' : platform)) {
                return { command: cmd, platform, url }
            }
        }
    }

    return null
}

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getTempDir() {
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }
    return tempDir
}

export function generateTempFilename(prefix) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
}

export function cleanupTempFile(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath)
        }
    } catch (error) {
        console.error('Error cleaning up temp file:', error)
    }
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
