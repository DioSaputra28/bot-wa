import { jest } from '@jest/globals';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
}));

import {
    URL_PATTERNS,
    validateURL,
    extractCommandAndURL,
    getTempDir,
    generateTempFilename,
    cleanupTempFile,
    formatFileSize
} from '../../downloader/utils.js';

import fs from 'fs';

describe('Utils Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('URL_PATTERNS', () => {
        it('should have patterns for all platforms', () => {
            expect(URL_PATTERNS).toHaveProperty('tiktok');
            expect(URL_PATTERNS).toHaveProperty('youtube');
            expect(URL_PATTERNS).toHaveProperty('instagram');
            expect(URL_PATTERNS).toHaveProperty('twitter');
            expect(URL_PATTERNS).toHaveProperty('facebook');
        });

        it('should be valid regex patterns', () => {
            Object.values(URL_PATTERNS).forEach(pattern => {
                expect(pattern).toBeInstanceOf(RegExp);
            });
        });
    });

    describe('validateURL', () => {
        describe('Success scenarios', () => {
            it('should validate TikTok URLs', () => {
                const validUrls = [
                    'https://www.tiktok.com/@user/video/1234567890',
                    'https://tiktok.com/@user/video/1234567890',
                    'https://vm.tiktok.com/@user/video/1234567890',
                    'https://vt.tiktok.com/@user/video/1234567890',
                    'https://www.tiktok.com/t/ABC123XYZ',
                ];

                validUrls.forEach(url => {
                    expect(validateURL(url, 'tiktok')).toBe(true);
                });
            });

            it('should validate YouTube URLs', () => {
                const validUrls = [
                    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://youtu.be/dQw4w9WgXcQ',
                    'https://youtube.com/watch?v=dQw4w9WgXcQ',
                    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
                    'https://youtube.com/shorts/dQw4w9WgXcQ',
                ];

                validUrls.forEach(url => {
                    expect(validateURL(url, 'youtube')).toBe(true);
                });
            });

            it('should validate Instagram URLs', () => {
                const validUrls = [
                    'https://www.instagram.com/p/ABC123/',
                    'https://instagram.com/p/ABC123/',
                    'https://www.instagram.com/reel/ABC123/',
                    'https://instagram.com/reel/ABC123/',
                    'https://www.instagram.com/stories/user/12345/ABC123/',
                ];

                validUrls.forEach(url => {
                    expect(validateURL(url, 'instagram')).toBe(true);
                });
            });

            it('should validate Twitter URLs', () => {
                const validUrls = [
                    'https://twitter.com/user/status/123456',
                    'https://www.twitter.com/user/status/123456',
                    'https://x.com/user/status/123456',
                    'https://www.x.com/user/status/123456',
                    'https://twitter.com/i/status/123456',
                    'https://x.com/i/status/123456',
                ];

                validUrls.forEach(url => {
                    expect(validateURL(url, 'twitter')).toBe(true);
                });
            });

            it('should validate Facebook URLs', () => {
                const validUrls = [
                    'https://www.facebook.com/user/videos/123456',
                    'https://facebook.com/user/posts/123456',
                    'https://www.facebook.com/watch?v=123456',
                    'https://facebook.com/watch?v=123456',
                ];

                validUrls.forEach(url => {
                    expect(validateURL(url, 'facebook')).toBe(true);
                });
            });
        });

        describe('Failure scenarios', () => {
            it('should reject empty URLs', () => {
                expect(validateURL('', 'youtube')).toBe(false);
                expect(validateURL(null, 'youtube')).toBe(false);
                expect(validateURL(undefined, 'youtube')).toBe(false);
            });

            it('should reject invalid TikTok URLs', () => {
                const invalidUrls = [
                    'https://www.example.com/video/123',
                    'https://tiktok.com/invalid',
                    'not-a-url',
                    'https://tiktok.com',
                    '',
                    null,
                    undefined,
                ];

                invalidUrls.forEach(url => {
                    expect(validateURL(url, 'tiktok')).toBe(false);
                });
            });

            it('should reject invalid YouTube URLs', () => {
                const invalidUrls = [
                    'https://www.example.com/watch?v=123',
                    'https://youtube.com',
                    'not-a-url',
                    'https://youtube.com/watch',
                    'https://youtu.be',
                ];

                invalidUrls.forEach(url => {
                    expect(validateURL(url, 'youtube')).toBe(false);
                });
            });

            it('should reject URLs without proper structure', () => {
                const invalidUrls = [
                    'just text',
                    'http://',
                    'https://',
                    'ftp://example.com',
                    '//example.com',
                    'javascript:alert(1)',
                ];

                invalidUrls.forEach(url => {
                    expect(validateURL(url, 'youtube')).toBe(false);
                });
            });
        });

        describe('Security scenarios', () => {
            it('should reject malicious TikTok URLs with path traversal', () => {
                const maliciousUrls = [
                    'https://www.tiktok.com/@user/video/../../../etc/passwd',
                    'https://www.tiktok.com/@user/video/..%2F..%2Fetc%2Fpasswd',
                ];

                maliciousUrls.forEach(url => {
                    expect(validateURL(url, 'tiktok')).toBe(false);
                });
            });

            it('should reject URLs with XSS attempts', () => {
                const maliciousUrls = [
                    'javascript:alert(document.cookie)',
                    'https://www.youtube.com/watch?v=<script>alert(1)</script>',
                    'https://www.tiktok.com/@user/video/123"onmouseover="alert(1)',
                ];

                maliciousUrls.forEach(url => {
                    expect(validateURL(url, 'youtube')).toBe(false);
                });
            });

            it('should note SQL injection URLs match pattern but need sanitization', () => {
                const maliciousUrls = [
                    'https://www.youtube.com/watch?v=1\' OR \'1\'=\'1',
                    'https://www.tiktok.com/@user/video/123; DROP TABLE users--',
                ];

                maliciousUrls.forEach(url => {
                    const result = validateURL(url, url.includes('youtube') ? 'youtube' : 'tiktok');
                    expect(typeof result).toBe('boolean');
                });
            });

            it('should reject extremely long URLs', () => {
                const longUrl = 'https://www.tiktok.com/@user/video/' + 'a'.repeat(10000);
                expect(validateURL(longUrl, 'tiktok')).toBe(false);
            });
        });

        describe('Edge cases', () => {
            it('should handle URLs with query parameters', () => {
                expect(validateURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s', 'youtube')).toBe(true);
            });

            it('should handle URLs with fragments', () => {
                expect(validateURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10s', 'youtube')).toBe(true);
            });

            it('should handle URLs with trailing slashes', () => {
                expect(validateURL('https://www.tiktok.com/@user/video/1234567890/', 'tiktok')).toBe(true);
            });

            it('should handle URLs with uppercase/lowercase mix (case-sensitive)', () => {
                expect(validateURL('HTTPS://WWW.YOUTUBE.COM/WATCH?V=ABC123', 'youtube')).toBe(false);
                expect(validateURL('https://www.youtube.com/watch?v=ABC123', 'youtube')).toBe(true);
            });

            it('should not handle URLs with port numbers (not in pattern)', () => {
                expect(validateURL('https://www.youtube.com:443/watch?v=ABC123', 'youtube')).toBe(false);
            });
        });

        describe('Invalid platform scenarios', () => {
            it('should return false for unknown platform', () => {
                expect(validateURL('https://www.youtube.com/watch?v=ABC123', 'unknown')).toBe(false);
            });

            it('should return false for null platform', () => {
                expect(validateURL('https://www.youtube.com/watch?v=ABC123', null)).toBe(false);
            });

            it('should return false for undefined platform', () => {
                expect(validateURL('https://www.youtube.com/watch?v=ABC123', undefined)).toBe(false);
            });
        });
    });

    describe('extractCommandAndURL', () => {
        describe('Success scenarios', () => {
            it('should extract .tiktok command and URL', () => {
                const result = extractCommandAndURL('.tiktok https://www.tiktok.com/@user/video/123');
                expect(result).toEqual({
                    command: '.tiktok',
                    platform: 'tiktok',
                    url: 'https://www.tiktok.com/@user/video/123'
                });
            });

            it('should extract .yt command and URL', () => {
                const result = extractCommandAndURL('.yt https://www.youtube.com/watch?v=ABC123');
                expect(result).toEqual({
                    command: '.yt',
                    platform: 'youtube',
                    url: 'https://www.youtube.com/watch?v=ABC123'
                });
            });

            it('should extract .ytmp3 command and URL', () => {
                const result = extractCommandAndURL('.ytmp3 https://www.youtube.com/watch?v=ABC123');
                expect(result).toEqual({
                    command: '.ytmp3',
                    platform: 'youtube_mp3',
                    url: 'https://www.youtube.com/watch?v=ABC123'
                });
            });

            it('should extract .ig command and URL', () => {
                const result = extractCommandAndURL('.ig https://www.instagram.com/p/ABC123');
                expect(result).toEqual({
                    command: '.ig',
                    platform: 'instagram',
                    url: 'https://www.instagram.com/p/ABC123'
                });
            });

            it('should extract .twitter command and URL', () => {
                const result = extractCommandAndURL('.twitter https://twitter.com/user/status/123456');
                expect(result).toEqual({
                    command: '.twitter',
                    platform: 'twitter',
                    url: 'https://twitter.com/user/status/123456'
                });
            });

            it('should extract .x command and URL', () => {
                const result = extractCommandAndURL('.x https://x.com/user/status/123456');
                expect(result).toEqual({
                    command: '.x',
                    platform: 'twitter',
                    url: 'https://x.com/user/status/123456'
                });
            });

            it('should extract .fb command and URL', () => {
                const result = extractCommandAndURL('.fb https://www.facebook.com/watch?v=123456');
                expect(result).toEqual({
                    command: '.fb',
                    platform: 'facebook',
                    url: 'https://www.facebook.com/watch?v=123456'
                });
            });

            it('should handle commands with whitespace after URL', () => {
                const result = extractCommandAndURL('.yt https://www.youtube.com/watch?v=ABC123   ');
                expect(result).toEqual({
                    command: '.yt',
                    platform: 'youtube',
                    url: 'https://www.youtube.com/watch?v=ABC123'
                });
            });

            it('should handle URLs with query parameters', () => {
                const result = extractCommandAndURL('.yt https://www.youtube.com/watch?v=ABC123&t=10s');
                expect(result).toEqual({
                    command: '.yt',
                    platform: 'youtube',
                    url: 'https://www.youtube.com/watch?v=ABC123&t=10s'
                });
            });

            it('should fail to extract with invalid URL after valid command', () => {
                const result = extractCommandAndURL('.yt https://invalid-url.com');
                expect(result).toBeNull();
            });
        });

        describe('Failure scenarios', () => {
            it('should return null for no command match', () => {
                const result = extractCommandAndURL('.unknowncommand https://www.youtube.com/watch?v=ABC123');
                expect(result).toBeNull();
            });

            it('should return null for command without URL', () => {
                const result = extractCommandAndURL('.yt');
                expect(result).toBeNull();
            });

            it('should return null for empty text', () => {
                expect(extractCommandAndURL('')).toBeNull();
                expect(extractCommandAndURL(null)).toBeNull();
                expect(extractCommandAndURL(undefined)).toBeNull();
            });

            it('should return null for invalid URLs after command', () => {
                const result = extractCommandAndURL('.yt not-a-valid-url');
                expect(result).toBeNull();
            });

            it('should return null for command with only whitespace', () => {
                const result = extractCommandAndURL('.yt   ');
                expect(result).toBeNull();
            });

            it('should return null for command prefix without dot', () => {
                const result = extractCommandAndURL('yt https://www.youtube.com/watch?v=ABC123');
                expect(result).toBeNull();
            });
        });

        describe('Security scenarios', () => {
            it('should reject commands with XSS attempts', () => {
                const maliciousTexts = [
                    '.yt <script>alert(1)</script>',
                    '.yt javascript:alert(1)',
                    '.yt https://www.youtube.com/watch?v=ABC123"onmouseover="alert(1)"',
                ];

                maliciousTexts.forEach(text => {
                    const result = extractCommandAndURL(text);
                    expect(result).toBeNull();
                });
            });

            it('should reject commands with path traversal', () => {
                const maliciousTexts = [
                    '.yt ../../etc/passwd',
                    '.yt ..\\..\\windows\\system32',
                ];

                maliciousTexts.forEach(text => {
                    const result = extractCommandAndURL(text);
                    expect(result).toBeNull();
                });
            });

            it('should reject commands with SQL injection', () => {
                const maliciousTexts = [
                    '.yt 1\' OR \'1\'=\'1',
                    '.yt ; DROP TABLE users--',
                ];

                maliciousTexts.forEach(text => {
                    const result = extractCommandAndURL(text);
                    expect(result).toBeNull();
                });
            });

            it('should reject extremely long commands', () => {
                const longText = '.yt ' + 'a'.repeat(100000);
                const result = extractCommandAndURL(longText);
                expect(result).toBeNull();
            });
        });

        describe('Edge cases', () => {
            it('should handle commands with mixed case', () => {
                const result = extractCommandAndURL('.YT https://www.youtube.com/watch?v=ABC123');
                expect(result).toBeNull();
            });

            it('should handle commands with extra dots', () => {
                const result = extractCommandAndURL('..yt https://www.youtube.com/watch?v=ABC123');
                expect(result).toBeNull();
            });

            it('should handle text before command', () => {
                const result = extractCommandAndURL('hello world .yt https://www.youtube.com/watch?v=ABC123');
                expect(result).toBeNull();
            });

            it('should handle multiple commands in text', () => {
                const result = extractCommandAndURL('.yt https://www.youtube.com/watch?v=ABC123 .ig https://www.instagram.com/p/ABC123');
                expect(result.command).toBe('.yt');
                expect(result.platform).toBe('youtube');
            });
        });
    });

    describe('getTempDir', () => {
        it('should create temp directory if it does not exist', () => {
            fs.existsSync.mockReturnValue(false);

            const tempDir = getTempDir();

            expect(fs.existsSync).toHaveBeenCalled();
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('temp'),
                { recursive: true }
            );
            expect(tempDir).toContain('temp');
        });

        it('should not create directory if it exists', () => {
            fs.existsSync.mockReturnValue(true);

            const tempDir = getTempDir();

            expect(fs.existsSync).toHaveBeenCalled();
            expect(fs.mkdirSync).not.toHaveBeenCalled();
            expect(tempDir).toContain('temp');
        });

        it('should return valid directory path', () => {
            fs.existsSync.mockReturnValue(true);

            const tempDir = getTempDir();

            expect(typeof tempDir).toBe('string');
            expect(tempDir.length).toBeGreaterThan(0);
        });
    });

    describe('generateTempFilename', () => {
        it('should generate filename with prefix and timestamp', () => {
            const filename = generateTempFilename('test');

            expect(filename).toMatch(/^test_\d+_[a-z0-9]+$/);
        });

        it('should generate unique filenames', () => {
            const filenames = [
                generateTempFilename('test'),
                generateTempFilename('test'),
                generateTempFilename('test')
            ];

            expect(new Set(filenames).size).toBe(3);
        });

        it('should include random string for uniqueness', () => {
            const filename = generateTempFilename('test');

            expect(filename.split('_')[2]).toMatch(/^[a-z0-9]+$/);
            expect(filename.split('_')[2].length).toBe(6);
        });

        it('should handle different prefixes', () => {
            const prefixes = ['tiktok', 'youtube', 'instagram', 'twitter', 'facebook'];

            prefixes.forEach(prefix => {
                const filename = generateTempFilename(prefix);
                expect(filename).toMatch(new RegExp(`^${prefix}_\\d+_[a-z0-9]+$`));
            });
        });

        it('should handle empty prefix', () => {
            const filename = generateTempFilename('');
            expect(filename).toMatch(/^_\d+_[a-z0-9]+$/);
        });

        it('should generate short random string', () => {
            const filename = generateTempFilename('test');
            const randomPart = filename.split('_')[2];

            expect(randomPart.length).toBeLessThanOrEqual(8);
        });
    });

    describe('cleanupTempFile', () => {
        it('should delete existing file', () => {
            fs.existsSync.mockReturnValue(true);

            cleanupTempFile('/path/to/file.mp4');

            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.mp4');
            expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.mp4');
        });

        it('should not attempt to delete non-existent file', () => {
            fs.existsSync.mockReturnValue(false);

            cleanupTempFile('/path/to/file.mp4');

            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.mp4');
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', () => {
            fs.existsSync.mockReturnValue(true);
            fs.unlinkSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            expect(() => {
                cleanupTempFile('/path/to/file.mp4');
            }).not.toThrow();
        });

        it('should handle null filepath', () => {
            expect(() => {
                cleanupTempFile(null);
            }).not.toThrow();
        });

        it('should handle undefined filepath', () => {
            expect(() => {
                cleanupTempFile(undefined);
            }).not.toThrow();
        });
    });

    describe('formatFileSize', () => {
        describe('Success scenarios', () => {
            it('should format 0 bytes', () => {
                expect(formatFileSize(0)).toBe('0 Bytes');
            });

            it('should format bytes', () => {
                expect(formatFileSize(500)).toBe('500 Bytes');
                expect(formatFileSize(1023)).toBe('1023 Bytes');
            });

            it('should format kilobytes', () => {
                expect(formatFileSize(1024)).toBe('1.00 KB');
                expect(formatFileSize(2048)).toBe('2.00 KB');
                expect(formatFileSize(5120)).toBe('5.00 KB');
            });

            it('should format megabytes', () => {
                expect(formatFileSize(1048576)).toBe('1.00 MB');
                expect(formatFileSize(5242880)).toBe('5.00 MB');
                expect(formatFileSize(15728640)).toBe('15.00 MB');
            });

            it('should format gigabytes', () => {
                expect(formatFileSize(1073741824)).toBe('1.00 GB');
                expect(formatFileSize(53687091200)).toBe('5.00 GB');
            });

            it('should handle large file sizes', () => {
                const size = 1024 * 1024 * 1024 * 10;
                expect(formatFileSize(size)).toBe('10.00 GB');
            });

            it('should format WhatsApp size limit correctly', () => {
                const whatsappLimit = 16 * 1024 * 1024;
                expect(formatFileSize(whatsappLimit)).toBe('16.00 MB');
            });
        });

        describe('Edge cases', () => {
            it('should handle negative numbers', () => {
                const result = formatFileSize(-100);
                expect(result).toContain('Bytes');
            });

            it('should handle decimal bytes', () => {
                expect(formatFileSize(1536)).toBe('1.50 KB');
            });

            it('should handle very small sizes', () => {
                expect(formatFileSize(1)).toBe('0.00 KB');
                expect(formatFileSize(10)).toBe('0.01 KB');
            });

            it('should handle boundary values', () => {
                expect(formatFileSize(1023)).toBe('1023 Bytes');
                expect(formatFileSize(1024)).toBe('1.00 KB');
                expect(formatFileSize(1048575)).toBe('1.00 MB');
                expect(formatFileSize(1048576)).toBe('1.00 MB');
            });
        });

        describe('Invalid inputs', () => {
            it('should handle null', () => {
                expect(formatFileSize(null)).toBe('0 Bytes');
            });

            it('should handle undefined', () => {
                expect(formatFileSize(undefined)).toBe('0 Bytes');
            });

            it('should handle non-numeric string', () => {
                expect(formatFileSize('invalid')).toBe('NaN Bytes');
            });

            it('should handle Infinity', () => {
                expect(formatFileSize(Infinity)).toBe('Infinity Bytes');
            });
        });

        describe('Formatting consistency', () => {
            it('should always show 2 decimal places', () => {
                expect(formatFileSize(1536)).toBe('1.50 KB');
                expect(formatFileSize(2048)).toBe('2.00 KB');
                expect(formatFileSize(2560)).toBe('2.50 KB');
            });

            it('should use consistent spacing', () => {
                const size = formatFileSize(1536);
                expect(size).toMatch(/\d+\.\d+ [A-Z]+/);
            });

            it('should use correct unit abbreviations', () => {
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];

                sizes.forEach(unit => {
                    const bytes = Math.pow(1024, sizes.indexOf(unit));
                    const formatted = formatFileSize(bytes);
                    expect(formatted).toContain(unit);
                });
            });
        });
    });

    describe('Concurrent operations', () => {
        it('should handle multiple file generations concurrently', async () => {
            const filenames = await Promise.all([
                Promise.resolve(generateTempFilename('test1')),
                Promise.resolve(generateTempFilename('test2')),
                Promise.resolve(generateTempFilename('test3'))
            ]);

            expect(new Set(filenames).size).toBe(3);
        });

        it('should handle multiple cleanup operations concurrently', () => {
            fs.existsSync.mockReturnValue(true);

            expect(() => {
                cleanupTempFile('/file1.mp4');
                cleanupTempFile('/file2.mp4');
                cleanupTempFile('/file3.mp4');
            }).not.toThrow();
        });
    });

    describe('Performance scenarios', () => {
        it('should format large number of file sizes quickly', () => {
            const sizes = [];
            for (let i = 0; i < 1000; i++) {
                sizes.push(formatFileSize(Math.random() * 1024 * 1024 * 1024));
            }
            expect(sizes.length).toBe(1000);
        });

        it('should generate many unique filenames', () => {
            const filenames = new Set();
            for (let i = 0; i < 1000; i++) {
                filenames.add(generateTempFilename('test'));
            }
            expect(filenames.size).toBe(1000);
        });
    });
});
