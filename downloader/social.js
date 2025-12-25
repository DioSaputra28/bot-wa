import btch from 'btch-downloader'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const platformMap = {
    instagram: 'instagram',
    twitter: 'twitter',
    facebook: 'facebook',
    x: 'twitter'
}

export async function downloadGeneric(url, platform) {
    const tempDir = path.join(__dirname, '../temp')
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
    }

    const timestamp = Date.now()
    const platformName = platformMap[platform] || platform
    const tempPath = path.join(tempDir, `${platformName}_${timestamp}.mp4`)

    try {
        const result = await btch(url, platform)

        if (result && result.status === 200 && result.data) {
            let downloadUrl = result.data.url || result.data.video || result.data.audio || result.data.media?.[0]
            let type = 'video'

            if (downloadUrl) {
                if (platform === 'facebook' && !downloadUrl) {
                    downloadUrl = result.data.hd || result.data.sd
                }
            }

            return {
                success: true,
                type: type,
                url: downloadUrl,
                filename: `${platformName}_${timestamp}.mp4`,
                filepath: tempPath
            }
        }

        throw new Error(`${platform} download failed`)
    } catch (error) {
        throw new Error(`${platform} download error: ${error.message}`)
    }
}

export async function downloadInstagram(url) {
    return downloadGeneric(url, 'instagram')
}

export async function downloadTwitter(url) {
    return downloadGeneric(url, 'twitter')
}

export async function downloadFacebook(url) {
    return downloadGeneric(url, 'facebook')
}
