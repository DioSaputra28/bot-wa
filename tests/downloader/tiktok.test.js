import { jest } from '@jest/globals';

const mockTikTokDL = jest.fn();
jest.mock('@tobyg74/tiktok-api-dl', () => ({
    default: {
        TikTokDL: mockTikTokDL
    },
    TikTokDL: mockTikTokDL
}));

import { downloadTikTok } from '../../downloader/tiktok.js';

describe('TikTok Downloader', () => {
    beforeEach(() => {
        mockTikTokDL.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Success scenarios', () => {
        it('should successfully download a TikTok video with valid URL', async () => {
            const mockResult = {
                status: 'success',
                result: {
                    video: 'https://example.com/tiktok_video.mp4'
                }
            };

            mockTikTokDL.mockResolvedValue(mockResult);

            const url = 'https://www.tiktok.com/@user/video/123456789';
            const result = await downloadTikTok(url);

            expect(result).toEqual({
                success: true,
                type: 'video',
                url: 'https://example.com/tiktok_video.mp4',
                filename: expect.stringMatching(/^tiktok_\d+\.mp4$/),
                filepath: expect.stringMatching(/temp\/tiktok_\d+\.mp4$/)
            });
            expect(mockTikTokDL).toHaveBeenCalledWith(url, {
                device: 'MOBILE',
                useWaterMark: false,
                page: 2
            });
        });
    });

    describe('Failure scenarios', () => {
        it('should reject when TikTokDL returns failure status', async () => {
            const mockResult = {
                status: 'failed',
                result: null
            };

            mockTikTokDL.mockResolvedValue(mockResult);

            const url = 'https://www.tiktok.com/@user/video/invalid';
            await expect(downloadTikTok(url)).rejects.toThrow('TikTok download failed');
        });

        it('should reject when TikTokDL throws an error', async () => {
            const mockError = new Error('Network error');
            mockTikTokDL.mockRejectedValue(mockError);

            const url = 'https://www.tiktok.com/@user/video/123456789';
            await expect(downloadTikTok(url)).rejects.toThrow('Network error');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty URL', async () => {
            const mockError = new Error('Invalid URL');
            mockTikTokDL.mockRejectedValue(mockError);

            await expect(downloadTikTok('')).rejects.toThrow('Invalid URL');
        });

        it('should generate unique filenames for concurrent downloads', async () => {
            const mockResult = {
                status: 'success',
                result: {
                    video: 'https://example.com/video.mp4'
                }
            };

            mockTikTokDL.mockResolvedValue(mockResult);

            const url = 'https://www.tiktok.com/@user/video/123456789';
            const results = await Promise.all([
                downloadTikTok(url),
                downloadTikTok(url),
                downloadTikTok(url)
            ]);

            const filenames = results.map(r => r.filename);
            expect(new Set(filenames).size).toBe(3);
        });
    });
});
