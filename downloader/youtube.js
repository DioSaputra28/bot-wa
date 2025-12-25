import pkg from 'youtube-dl-exec'
const { youtubedl } = pkg
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function downloadYouTube(url, isAudio = false) {
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const timestamp = Date.now()
    const extension = isAudio ? 'mp3' : 'mp4'
    const tempPath = path.join(tempDir, `youtube_${timestamp}.${extension}`)

    try {
        let result

        if (isAudio) {
            await youtubedl(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: tempPath,
                noCheckCertificate: true,
                noWarnings: true,
                preferFreeFormats: true
            })

            result = {
                success: true,
                type: 'audio',
                url: tempPath,
                filename: `youtube_${timestamp}.mp3`,
                filepath: tempPath
            }
        } else {
            await youtubedl(url, {
                format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                output: tempPath,
                noCheckCertificate: true,
                noWarnings: true
            })

            result = {
                success: true,
                type: 'video',
                url: tempPath,
                filename: `youtube_${timestamp}.mp4`,
                filepath: tempPath
            }
        }

        return result
    } catch (error) {
        throw new Error(`YouTube download failed: ${error.message}`)
    }
}
