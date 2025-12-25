import P from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadTikTok, downloadYouTube, downloadInstagram, downloadTwitter, downloadFacebook } from '../downloader/index.js'
import { extractCommandAndURL, cleanupTempFile, getTempDir, generateTempFilename } from '../downloader/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = P({ level: 'info' })

export async function startHandler(sock, msg) {
    try {
        if (msg.key.fromMe) return
        if (!msg.message) return

        const jid = msg.key.remoteJid
        const pushName = msg.pushName
        const messageContent = msg.message

        const text = messageContent.conversation ||
                    messageContent.extendedTextMessage?.text ||
                    ''

        logger.info({ jid, pushName, text }, 'Received message')

        const downloadCommand = extractCommandAndURL(text)
        if (downloadCommand) {
            await handleDownload(sock, jid, pushName, downloadCommand)
            return
        }

        if (text.startsWith('!')) {
            await handleCommand(sock, jid, text, pushName)
        } else {
            await sock.sendMessage(jid, {
                text: `Halo ${pushName}! Bot WhatsApp aktif.\n\nKetik !help untuk melihat daftar perintah.\n\nAtau gunakan perintah download:\n• .tt<url> - Download video TikTok\n• .ytmp4<url> - Download video YouTube\n• .ytmp3<url> - Download audio YouTube\n• .ig<url> - Download Instagram\n• .twitter<url> - Download Twitter/X\n• .fb<url> - Download Facebook`
            })
        }

    } catch (error) {
        logger.error({ error: error.message }, 'Error handling message')
    }
}

async function handleCommand(sock, jid, text, pushName) {
    const command = text.toLowerCase().split(' ')[0]

    switch (command) {
        case '!help':
            await sock.sendMessage(jid, {
                text: `📋 *Daftar Perintah Bot*\n\n` +
                      `!help - Menampilkan daftar perintah\n` +
                      `!ping - Cek koneksi bot\n` +
                      `!time - Menampilkan waktu sekarang\n` +
                      `!about - Informasi tentang bot`
            })
            break

        case '!ping':
            await sock.sendMessage(jid, {
                text: '🏓 Pong! Bot aktif dan merespon.'
            })
            break

        case '!time':
            const now = new Date()
            await sock.sendMessage(jid, {
                text: `🕐 Waktu sekarang: ${now.toLocaleString('id-ID')}`
            })
            break

        case '!about':
            await sock.sendMessage(jid, {
                text: `🤖 *Bot WhatsApp*\n\n` +
                      `Bot ini dibuat menggunakan library Baileys.\n` +
                      `Version: 1.0.0\n` +
                      `Made with ❤️`
            })
            break

        default:
            await sock.sendMessage(jid, {
                text: `❌ Perintah tidak dikenal: ${command}\n\nKetik !help untuk melihat daftar perintah yang tersedia.`
            })
    }
}

async function handleDownload(sock, jid, pushName, { platform, url }) {
    let tempFilePath = null
    let tempFilename = null

    try {
        await sock.sendMessage(jid, { text: '⏳ Processing...' })

        let result
        const isAudio = platform === 'youtube_mp3'
        const platformForLog = isAudio ? 'YouTube MP3' : platform.charAt(0).toUpperCase() + platform.slice(1)

        await sock.sendMessage(jid, { text: `📥 Downloading dari ${platformForLog}...` })

        switch (platform) {
            case 'tiktok':
                result = await downloadTikTok(url)
                break
            case 'youtube':
                result = await downloadYouTube(url, false)
                break
            case 'youtube_mp3':
                result = await downloadYouTube(url, true)
                break
            case 'instagram':
                result = await downloadInstagram(url)
                break
            case 'twitter':
                result = await downloadTwitter(url)
                break
            case 'facebook':
                result = await downloadFacebook(url)
                break
            default:
                throw new Error('Platform tidak didukung')
        }

        if (!result.success) {
            throw new Error('Download gagal')
        }

        tempFilePath = result.filepath
        tempFilename = result.filename

        await sock.sendMessage(jid, { text: '📤 Mengirim file...' })

        await sendMediaFile(sock, jid, result)

        await sock.sendMessage(jid, { text: '✅ Berhasil dikirim!' })

    } catch (error) {
        logger.error({ error: error.message }, 'Download error')
        await sock.sendMessage(jid, {
            text: `❌ Gagal mendownload: ${error.message}\n\nPastikan URL valid dan coba lagi.`
        })
    } finally {
        if (tempFilePath) {
            cleanupTempFile(tempFilePath)
        }
    }
}

async function sendMediaFile(sock, jid, result) {
    const filePath = result.filepath
    const fileExists = fs.existsSync(filePath)

    if (!fileExists && result.url && result.url.startsWith('http')) {
        if (result.type === 'video') {
            await sock.sendMessage(jid, {
                video: { url: result.url },
                caption: `📹 File dari ${result.type}`
            })
        } else if (result.type === 'audio') {
            await sock.sendMessage(jid, {
                audio: { url: result.url },
                mimetype: 'audio/mpeg',
                caption: '🎵 Audio'
            })
        }
        return
    }

    const fileStats = fs.statSync(filePath)
    const fileSize = fileStats.size

    const MAX_WA_SIZE = 16 * 1024 * 1024

    if (fileSize > MAX_WA_SIZE) {
        await sock.sendMessage(jid, {
            text: `⚠️ File terlalu besar (${formatFileSize(fileSize)}). Maksimum WhatsApp adalah ${formatFileSize(MAX_WA_SIZE)}.\n\nCoba kualitas lebih rendah atau platform lain.`
        })
        return
    }

    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()

    if (result.type === 'video' || ext === '.mp4' || ext === '.mov' || ext === '.avi') {
        await sock.sendMessage(jid, {
            video: fileBuffer,
            mimetype: 'video/mp4',
            caption: `📹 Video dari ${result.platform || 'download'}`
        })
    } else if (result.type === 'audio' || ext === '.mp3' || ext === '.m4a' || ext === '.wav') {
        const mimetype = ext === '.mp3' ? 'audio/mpeg' : `audio/${ext.slice(1)}`
        await sock.sendMessage(jid, {
            audio: fileBuffer,
            mimetype: mimetype,
            caption: '🎵 Audio'
        })
    } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        await sock.sendMessage(jid, {
            image: fileBuffer,
            mimetype: `image/${ext.slice(1)}`,
            caption: '🖼️ Gambar'
        })
    } else {
        await sock.sendMessage(jid, {
            document: fileBuffer,
            mimetype: 'application/octet-stream',
            fileName: result.filename || 'file',
            caption: '📄 File'
        })
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
