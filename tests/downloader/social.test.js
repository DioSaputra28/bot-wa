import { jest } from '@jest/globals';

jest.mock('btch-downloader', () => jest.fn());
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

import {
    downloadGeneric,
    downloadInstagram,
    downloadTwitter,
    downloadFacebook
} from '../../downloader/social.js';
import fs from 'fs';
import btch from 'btch-downloader';

describe('Social Downloader', () => {
    beforeEach(() => {
        fs.existsSync.mockReturnValue(true);
        btch.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Generic downloader', () => {
        describe('Success scenarios', () => {
            it('should successfully download Instagram content', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        url: 'https://example.com/insta_video.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);

                const url = 'https://www.instagram.com/reel/ABC123';
                const result = await downloadGeneric(url, 'instagram');

                expect(result).toEqual({
                    success: true,
                    type: 'video',
                    url: 'https://example.com/insta_video.mp4',
                    filename: expect.stringMatching(/^instagram_\d+\.mp4$/),
                    filepath: expect.stringMatching(/temp\/instagram_\d+\.mp4$/)
                });
                expect(btch).toHaveBeenCalledWith(url, 'instagram');
            });

            it('should successfully download Twitter content', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        video: 'https://example.com/tweet_video.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);

                const url = 'https://twitter.com/user/status/123456';
                const result = await downloadGeneric(url, 'twitter');

                expect(result.success).toBe(true);
                expect(btch).toHaveBeenCalledWith(url, 'twitter');
            });

            it('should successfully download Facebook content', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        hd: 'https://example.com/fb_hd.mp4',
                        sd: 'https://example.com/fb_sd.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);

                const url = 'https://www.facebook.com/watch?v=123456';
                const result = await downloadGeneric(url, 'facebook');

                expect(result.success).toBe(true);
                expect(result.url).toBe('https://example.com/fb_hd.mp4');
                expect(btch).toHaveBeenCalledWith(url, 'facebook');
            });

            it('should handle X (Twitter) platform correctly', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        url: 'https://example.com/x_video.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);

                const url = 'https://x.com/user/status/123456';
                const result = await downloadGeneric(url, 'x');

                expect(result.success).toBe(true);
                expect(btch).toHaveBeenCalledWith(url, 'twitter');
            });

            it('should create temp directory if it does not exist', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        url: 'https://example.com/video.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);
                fs.existsSync.mockReturnValue(false);
                fs.mkdirSync.mockImplementation(() => {});

                await downloadGeneric('https://example.com/video', 'instagram');

                expect(fs.existsSync).toHaveBeenCalled();
                expect(fs.mkdirSync).toHaveBeenCalled();
            });
        });

        describe('Failure scenarios', () => {
            it('should reject when btch throws an error', async () => {
                const mockError = new Error('Download failed');
                btch.mockRejectedValue(mockError);

                await expect(downloadGeneric('https://example.com/invalid', 'instagram'))
                    .rejects.toThrow('instagram download error: Download failed');
            });

            it('should reject when result status is not 200', async () => {
                const mockResult = {
                    status: 404,
                    data: null
                };

                btch.mockResolvedValue(mockResult);

                await expect(downloadGeneric('https://example.com/notfound', 'instagram'))
                    .rejects.toThrow('instagram download failed');
            });
        });

        describe('Edge cases', () => {
            it('should handle empty URL', async () => {
                const mockError = new Error('Invalid URL');
                btch.mockRejectedValue(mockError);

                await expect(downloadGeneric('', 'instagram'))
                    .rejects.toThrow('instagram download error: Invalid URL');
            });

            it('should handle unknown platform', async () => {
                const mockResult = {
                    status: 200,
                    data: {
                        url: 'https://example.com/video.mp4'
                    }
                };

                btch.mockResolvedValue(mockResult);

                const result = await downloadGeneric('https://example.com/video', 'unknown_platform');
                expect(result.success).toBe(true);
                expect(btch).toHaveBeenCalledWith('https://example.com/video', 'unknown_platform');
            });
        });
    });

    describe('Instagram downloader', () => {
        it('should call downloadGeneric with instagram platform', async () => {
            const mockResult = {
                status: 200,
                data: {
                    url: 'https://example.com/insta.mp4'
                }
            };

            btch.mockResolvedValue(mockResult);

            const url = 'https://www.instagram.com/reel/ABC123';
            const result = await downloadInstagram(url);

            expect(result.success).toBe(true);
            expect(btch).toHaveBeenCalledWith(url, 'instagram');
        });
    });

    describe('Twitter downloader', () => {
        it('should call downloadGeneric with twitter platform', async () => {
            const mockResult = {
                status: 200,
                data: {
                    url: 'https://example.com/tweet.mp4'
                }
            };

            btch.mockResolvedValue(mockResult);

            const url = 'https://twitter.com/user/status/123456';
            const result = await downloadTwitter(url);

            expect(result.success).toBe(true);
            expect(btch).toHaveBeenCalledWith(url, 'twitter');
        });
    });

    describe('Facebook downloader', () => {
        it('should call downloadGeneric with facebook platform', async () => {
            const mockResult = {
                status: 200,
                data: {
                    url: 'https://example.com/fb.mp4'
                }
            };

            btch.mockResolvedValue(mockResult);

            const url = 'https://www.facebook.com/watch?v=123456';
            const result = await downloadFacebook(url);

            expect(result.success).toBe(true);
            expect(btch).toHaveBeenCalledWith(url, 'facebook');
        });
    });
});
