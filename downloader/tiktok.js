import pkg from '@tobyg74/tiktok-api-dl'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const Downloader = pkg.Downloader

export async function downloadTikTok(url) {
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const timestamp = Date.now()
    const tempPath = path.join(tempDir, `tiktok_${timestamp}.mp4`)

    try {
        const result = await Downloader(url, {
            device: 'MOBILE',
            useWaterMark: false,
            page: 2
        })

        if (result.status === 'success' && result.result && result.result.video && result.result.video.downloadAddr) {

            const videoUrl = result.result.video.downloadAddr[0]
            
            // Download video file
            const videoResponse = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'stream'
            })

            const writer = fs.createWriteStream(tempPath)
            videoResponse.data.pipe(writer)

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    resolve({
                        success: true,
                        type: 'video',
                        url: videoUrl,
                        filename: `tiktok_${timestamp}.mp4`,
                        filepath: tempPath,
                        platform: 'TikTok'
                    })
                })
                writer.on('error', reject)
            })
        } else {
            throw new Error('TikTok download failed - no video URL found')
        }
    } catch (error) {
        console.error('TikTok download error:', error)
        throw error
    }
}
