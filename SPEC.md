# WhatsApp Bot Downloader - Specification Document

## 📋 Project Overview

**bot-wa** adalah WhatsApp bot yang dibuat menggunakan library **Baileys** yang berfungsi untuk mendownload video/audio dari berbagai platform seperti TikTok, YouTube, YouTube Music, Instagram, Twitter, Facebook, dan lainnya. Bot ini merespon perintah dalam format:

- `.tiktok{link_tiktok}` - Download video TikTok
- `.yt{link_youtube}` - Download video YouTube  
- `.ytmp3{link_youtube}` - Download audio YouTube
- `.ig{link_instagram}` - Download dari Instagram
- `.twitter{link_twitter}` - Download dari Twitter/X
- `.fb{link_facebook}` - Download dari Facebook

**Bot akan memproses link dan mengirimkan file yang didownload langsung ke user yang mengirim pesan.**

---

## 🔧 Teknologi & Dependencies

### Core Stack
- **Node.js 17+** (requirement Baileys)
- **@whiskeysockets/baileys** - WhatsApp Web library
- **pino** - Logging
- **@hapi/boom** - Error handling

### Downloader Packages (FREE)

#### TikTok Downloader
**Recommended**: `@tobyg74/tiktok-api-dl`
```bash
npm install @tobyg74/tiktok-api-dl
```

**Why**: 
- ✅ Aktif dikembangkan (44 versions)
- ✅ Support video, image, music, user data
- ✅ No watermark option
- ✅ Cookie management untuk better success rate
- ✅ CLI tool included

**Alternative**: `@faouzkk/tiktok-dl` (lebih ringan, 2 dependencies)

#### YouTube Downloader  
**Recommended**: `youtube-dl-exec`
```bash
npm install youtube-dl-exec --save
```

**Why**:
- ✅ Paling reliable (backend yt-dlp)
- ✅ Auto-installs latest yt-dlp binary
- ✅ Support semua format yt-dlp
- ✅ Promise & Stream interface
- ✅ Aktif maintained

**Alternative**: `@distube/ytdl-core` (deprecated, avoid)

#### Multi-Platform Downloader
**Recommended**: `btch-downloader`
```bash
npm install btch-downloader
```

**Why**:
- ✅ Support 15+ platform: Instagram, TikTok, Facebook, Twitter, YouTube, dll
- ✅ Aktif maintained (64 versions)
- ✅ Minimal dependencies (only 1)
- ✅ Auto-detect platform
- ✅ TypeScript support

**Supported Platforms**:
- Instagram
- TikTok  
- Facebook
- Twitter/X
- YouTube
- CapCut
- Pinterest
- Spotify
- SoundCloud
- Google Drive
- MediaFire
- Douyin
- dll.

---

## 🏗️ Architecture & Implementation Plan

### 1. Command System
```javascript
// Command patterns
const commands = {
    '.tiktok': 'tiktok',
    '.yt': 'youtube', 
    '.ytmp3': 'youtube_mp3',
    '.ig': 'instagram',
    '.twitter': 'twitter',
    '.fb': 'facebook'
}
```

### 2. URL Detection & Validation
```javascript
// Regex patterns
const patterns = {
    tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?.+\/video\/\d+/,
    youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/[\w-]+/,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status\/\d+/,
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[\w]+\/posts\/\d+/
}
```

### 3. Download Handler Structure
```javascript
// Base handler
async function handleDownload(url, platform, jid) {
    try {
        await sock.sendMessage(jid, { text: '⏳ Processing...' })
        
        let result
        switch (platform) {
            case 'tiktok':
                result = await downloadTikTok(url)
                break
            case 'youtube':
                result = await downloadYouTube(url)
                break
            // etc.
        }
        
        // Send file back to user
        await sendFile(jid, result)
        
    } catch (error) {
        await sock.sendMessage(jid, { text: '❌ Failed to download' })
    }
}
```

### 4. File Sending Module
```javascript
async function sendFile(jid, downloadResult) {
    if (downloadResult.type === 'video') {
        await sock.sendMessage(jid, {
            video: { url: downloadResult.url },
            caption: downloadResult.caption
        })
    } else if (downloadResult.type === 'audio') {
        await sock.sendMessage(jid, {
            audio: { url: downloadResult.url },
            mimetype: 'audio/mpeg'
        })
    }
}
```

---

## 📦 Package Dependencies Final

```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^7.0.0-rc.9",
    "pino": "^10.1.0",
    "@hapi/boom": "^10.0.1",
    "@tobyg74/tiktok-api-dl": "^1.0.0",
    "youtube-dl-exec": "^2.4.12",
    "btch-downloader": "^4.0.7"
  }
}
```

---

## 🚀 Implementation Steps

### Phase 1: Basic Command Handler
1. Extend existing handler in `connect/handler.js`
2. Add command detection for `.tiktok`, `.yt`, `.ytmp3`, etc.
3. URL validation for each platform
4. Basic response messages

### Phase 2: Downloader Integration  
1. Install and integrate TikTok downloader (`@tobyg74/tiktok-api-dl`)
2. Install and integrate YouTube downloader (`youtube-dl-exec`)
3. Install and integrate multi-platform downloader (`btch-downloader`)
4. Create wrapper functions for each platform

### Phase 3: File Processing & Sending
1. Download file to temporary storage
2. Convert/reformat if needed (audio extraction)
3. Send file via WhatsApp message
4. Cleanup temporary files
5. Error handling and fallbacks

### Phase 4: Advanced Features
1. Progress indicators
2. Batch downloads (playlist support)
3. Quality options
4. Cache system
5. Rate limiting

---

## 🔍 Deep Research Required

### 1. WhatsApp File Size Limits
- **Maximum video size**: 16MB (WhatsApp limit)
- **Maximum audio size**: 16MB
- **Document limit**: 100MB

**Solution**: Implement quality adjustment for large files

### 2. Rate Limiting & Anti-Block
- YouTube API limitations
- TikTok rate limiting  
- WhatsApp message rate limits

**Solution**: 
- Implement delay between downloads
- Use multiple user agents
- Proxy rotation (if needed)

### 3. Error Recovery
- Network timeouts
- Platform API changes
- File conversion failures

**Solution**:
- Multiple fallback downloaders
- Retry mechanisms
- Graceful degradation

### 4. Performance Optimization
- Memory management for large files
- Streaming downloads (avoid full memory load)
- Concurrent download limits

**Solution**:
- Stream-based downloads
- Queue system
- Memory cleanup

---

## ⚠️ Legal & Ethical Considerations

### 1. Terms of Service
- Respect platform ToS
- Only download public content
- No mass/copyrighted content distribution

### 2. User Responsibilities  
- Users must have rights to downloaded content
- Educational/personal use only
- Compliance with local laws

### 3. Bot Limitations
- Add disclaimer in bot messages
- Rate limiting per user
- Content type restrictions

---

## 📝 Usage Examples

### TikTok Download
```
User: .tiktokhttps://www.tiktok.com/@user/video/1234567890
Bot: ⏳ Processing download...
Bot: (Sends video file)
```

### YouTube Audio Download  
```
User: .ytmp3https://www.youtube.com/watch?v=dQw4w9WgXcQ
Bot: ⏳ Extracting audio...
Bot: (Sends audio file)
```

### Instagram Download
```
User: .igthttps://www.instagram.com/p/ABC123/
Bot: ⏳ Processing Instagram content...
Bot: (Sends media file)
```

---

## 🎯 Success Metrics

### Functionality
- ✅ All commands work correctly
- ✅ File downloads successfully
- ✅ Files sent via WhatsApp
- ✅ Error handling works
- ✅ Size limits respected

### Performance
- ✅ Fast download speeds
- ✅ Low memory usage  
- ✅ Stable connection
- ✅ No crashes/hangs

### User Experience
- ✅ Simple command syntax
- ✅ Clear progress indicators
- ✅ Helpful error messages
- ✅ Responsive bot

---

## 🔄 Maintenance & Updates

### Regular Tasks
1. **Monitor package updates** - Update downloaders when new versions available
2. **Test platform compatibility** - Verify downloads still work after platform changes
3. **Performance monitoring** - Check bot stability and performance
4. **User feedback** - Collect and address user issues

### Platform Changes
- TikTok API changes (frequent)
- YouTube algorithm updates
- Instagram API modifications
- WhatsApp policy updates

### Contingency Plans
- Multiple fallback downloaders
- Alternative packages for each platform
- Backup deployment strategies

---

**Status**: ✅ Research complete, ready for implementation  
**Next Step**: Begin Phase 1 - Command Handler Integration