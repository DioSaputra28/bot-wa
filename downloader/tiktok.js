import pkg from '@tobyg74/tiktok-api-dl'
const { TikTokDL } = pkg
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function downloadTikTok(url) {
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const timestamp = Date.now()
    const tempPath = path.join(tempDir, `tiktok_${timestamp}.mp4`)

    return new Promise((resolve, reject) => {
        TikTokDL(url, {
            device: 'MOBILE',
            useWaterMark: false,
            page: 2
        }).then((result) => {
            if (result.status === 'success' && result.result.video) {
                resolve({
                    success: true,
                    type: 'video',
                    url: result.result.video,
                    filename: `tiktok_${timestamp}.mp4`,
                    filepath: tempPath
                })
            } else {
                reject(new Error('TikTok download failed'))
            }
        }).catch((error) => {
            reject(error)
        })
    })
}
