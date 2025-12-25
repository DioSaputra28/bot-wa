import { jest } from '@jest/globals';

const mockYoutubedl = jest.fn();
jest.mock('youtube-dl-exec', () => ({
    youtubedl: mockYoutubedl
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

import { downloadYouTube } from '../../downloader/youtube.js';
import fs from 'fs';

describe('YouTube Downloader', () => {
    beforeEach(() => {
        mockYoutubedl.mockClear();
        fs.existsSync.mockReturnValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Success scenarios - Video download', () => {
        it('should successfully download a YouTube video', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const result = await downloadYouTube(url, false);

            expect(result).toEqual({
                success: true,
                type: 'video',
                url: expect.stringMatching(/temp\/youtube_\d+\.mp4$/),
                filename: expect.stringMatching(/^youtube_\d+\.mp4$/),
                filepath: expect.stringMatching(/temp\/youtube_\d+\.mp4$/)
            });
            expect(mockYoutubedl).toHaveBeenCalledWith(url, expect.objectContaining({
                format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                noCheckCertificate: true,
                noWarnings: true
            }));
        });

        it('should handle different valid YouTube URL formats', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const urls = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtu.be/dQw4w9WgXcQ',
                'https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
                'https://www.youtube.com/embed/dQw4w9WgXcQ',
                'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
            ];

            for (const url of urls) {
                const result = await downloadYouTube(url, false);
                expect(result.success).toBe(true);
            }

            expect(mockYoutubedl).toHaveBeenCalledTimes(5);
        });
    });

    describe('Success scenarios - Audio download', () => {
        it('should successfully download a YouTube video as audio (MP3)', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const result = await downloadYouTube(url, true);

            expect(result).toEqual({
                success: true,
                type: 'audio',
                url: expect.stringMatching(/temp\/youtube_\d+\.mp3$/),
                filename: expect.stringMatching(/^youtube_\d+\.mp3$/),
                filepath: expect.stringMatching(/temp\/youtube_\d+\.mp3$/)
            });
            expect(mockYoutubedl).toHaveBeenCalledWith(url, expect.objectContaining({
                extractAudio: true,
                audioFormat: 'mp3',
                noCheckCertificate: true,
                noWarnings: true,
                preferFreeFormats: true
            }));
        });

        it('should handle isAudio parameter correctly', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

            // Test video download
            const videoResult = await downloadYouTube(url, false);
            expect(videoResult.type).toBe('video');
            expect(videoResult.filename).toMatch(/\.mp4$/);

            // Test audio download
            const audioResult = await downloadYouTube(url, true);
            expect(audioResult.type).toBe('audio');
            expect(audioResult.filename).toMatch(/\.mp3$/);
        });

        it('should default to video download when isAudio is not specified', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const result = await downloadYouTube(url);

            expect(result.type).toBe('video');
            expect(result.filename).toMatch(/\.mp4$/);
        });
    });

    describe('Failure scenarios', () => {
        it('should reject when youtubedl throws an error', async () => {
            const mockError = new Error('Video unavailable');
            mockYoutubedl.mockRejectedValue(mockError);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=invalid';
            await expect(downloadYouTube(url)).rejects.toThrow('YouTube download failed: Video unavailable');
        });

        it('should reject with network error', async () => {
            const mockError = new Error('Network connection lost');
            mockYoutubedl.mockRejectedValue(mockError);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            await expect(downloadYouTube(url)).rejects.toThrow('YouTube download failed: Network connection lost');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty URL', async () => {
            const mockError = new Error('Invalid URL');
            mockYoutubedl.mockRejectedValue(mockError);
            fs.existsSync.mockReturnValue(true);

            await expect(downloadYouTube('')).rejects.toThrow('YouTube download failed');
        });

        it('should handle non-YouTube URL', async () => {
            const mockError = new Error('ERROR: "https://www.example.com" is not a valid URL');
            mockYoutubedl.mockRejectedValue(mockError);
            fs.existsSync.mockReturnValue(true);

            await expect(downloadYouTube('https://www.example.com')).rejects.toThrow('YouTube download failed');
        });

        it('should generate unique filenames for concurrent downloads', async () => {
            mockYoutubedl.mockResolvedValue(undefined);
            fs.existsSync.mockReturnValue(true);

            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const results = await Promise.all([
                downloadYouTube(url),
                downloadYouTube(url),
                downloadYouTube(url)
            ]);

            const filenames = results.map(r => r.filename);
            expect(new Set(filenames).size).toBe(3);
        });
    });
});
