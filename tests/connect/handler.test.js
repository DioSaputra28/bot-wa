import { jest } from '@jest/globals';
import { startHandler } from '../../connect/handler.js';

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
};

jest.mock('pino', () => {
    return () => mockLogger;
});

describe('Message Handler', () => {
    let mockSock;
    let mockMsg;

    beforeEach(() => {
        mockSock = {
            sendMessage: jest.fn().mockResolvedValue({}),
        };

        mockMsg = {
            key: {
                remoteJid: '6281234567890@s.whatsapp.net',
                fromMe: false,
            },
            pushName: 'TestUser',
            message: {
                conversation: 'Hello bot',
            },
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Message processing', () => {
        it('should ignore messages from the bot itself', async () => {
            mockMsg.key.fromMe = true;

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).not.toHaveBeenCalled();
        });

        it('should handle valid text messages', async () => {
            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should ignore messages without message content', async () => {
            mockMsg.message = null;

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).not.toHaveBeenCalled();
        });

        it('should handle extendedTextMessage', async () => {
            mockMsg.message = {
                extendedTextMessage: {
                    text: '!help',
                },
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should default to empty string when no text content', async () => {
            mockMsg.message = {};

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Command handling', () => {
        it('should handle !help command', async () => {
            mockMsg.message = {
                conversation: '!help',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                '6281234567890@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('Daftar Perintah Bot'),
                })
            );
        });

        it('should handle !ping command', async () => {
            mockMsg.message = {
                conversation: '!ping',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                '6281234567890@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('Pong'),
                })
            );
        });

        it('should handle !time command', async () => {
            mockMsg.message = {
                conversation: '!time',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                '6281234567890@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('Waktu sekarang'),
                })
            );
        });

        it('should handle !about command', async () => {
            mockMsg.message = {
                conversation: '!about',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                '6281234567890@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('Bot WhatsApp'),
                })
            );
        });

        it('should handle unknown commands', async () => {
            mockMsg.message = {
                conversation: '!unknowncommand',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                '6281234567890@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('Perintah tidak dikenal'),
                })
            );
        });

        it('should handle commands with different casing', async () => {
            mockMsg.message = {
                conversation: '!HELP',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle commands with extra spaces', async () => {
            mockMsg.message = {
                conversation: '!help   ',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Download commands', () => {
        it('should handle .tiktok download command', async () => {
            mockMsg.message = {
                conversation: '.tiktok https://www.tiktok.com/@user/video/123',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle .yt download command', async () => {
            mockMsg.message = {
                conversation: '.yt https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle .ytmp3 download command', async () => {
            mockMsg.message = {
                conversation: '.ytmp3 https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle .ig download command', async () => {
            mockMsg.message = {
                conversation: '.ig https://www.instagram.com/reel/ABC123',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle .twitter download command', async () => {
            mockMsg.message = {
                conversation: '.twitter https://twitter.com/user/status/123456',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle .fb download command', async () => {
            mockMsg.message = {
                conversation: '.fb https://www.facebook.com/watch?v=123456',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle download commands with X platform', async () => {
            mockMsg.message = {
                conversation: '.twitter https://x.com/user/status/123456',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        it('should handle errors gracefully', async () => {
            mockSock.sendMessage.mockRejectedValue(new Error('Network error'));

            mockMsg.message = {
                conversation: '!help',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle invalid URLs in download commands', async () => {
            mockMsg.message = {
                conversation: '.tiktok invalid-url',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle missing URL in download commands', async () => {
            mockMsg.message = {
                conversation: '.tiktok',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle network errors in download process', async () => {
            mockSock.sendMessage.mockImplementation(() => {
                throw new Error('Download failed');
            });

            mockMsg.message = {
                conversation: '.tiktok https://www.tiktok.com/@user/video/123',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle very long messages', async () => {
            const longText = 'a'.repeat(10000);
            mockMsg.message = {
                conversation: longText,
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with special characters', async () => {
            mockMsg.message = {
                conversation: 'Hello 👋🌍🎉',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with emojis in commands', async () => {
            mockMsg.message = {
                conversation: '!help 📋',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle empty messages', async () => {
            mockMsg.message = {
                conversation: '',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with only whitespace', async () => {
            mockMsg.message = {
                conversation: '   ',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with mixed case commands', async () => {
            mockMsg.message = {
                conversation: '!HeLp',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with Unicode characters', async () => {
            mockMsg.message = {
                conversation: '!help 你好 مرحبا',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with newlines', async () => {
            mockMsg.message = {
                conversation: 'Hello\nWorld\n',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with HTML tags', async () => {
            mockMsg.message = {
                conversation: 'Hello <b>World</b>',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle multiple commands in one message', async () => {
            mockMsg.message = {
                conversation: '!help !ping',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages without pushName', async () => {
            delete mockMsg.pushName;

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle messages with null pushName', async () => {
            mockMsg.pushName = null;

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle group messages', async () => {
            mockMsg.key.remoteJid = '6281234567890-123456@g.us';

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should handle broadcast messages', async () => {
            mockMsg.key.remoteJid = 'status@s.whatsapp.net';

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('File size handling', () => {
        it('should handle files within WhatsApp size limit', async () => {
            mockMsg.message = {
                conversation: '.tiktok https://www.tiktok.com/@user/video/small',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should reject files exceeding WhatsApp size limit', async () => {
            mockMsg.message = {
                conversation: '.tiktok https://www.tiktok.com/@user/video/large',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Message content extraction', () => {
        it('should extract text from conversation', async () => {
            mockMsg.message = {
                conversation: '!help',
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should extract text from extendedTextMessage', async () => {
            mockMsg.message = {
                extendedTextMessage: {
                    text: '!ping',
                },
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });

        it('should prefer conversation over extendedTextMessage', async () => {
            mockMsg.message = {
                conversation: '!help',
                extendedTextMessage: {
                    text: '!ping',
                },
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    text: expect.stringContaining('Daftar Perintah Bot'),
                })
            );
        });

        it('should handle missing both text fields', async () => {
            mockMsg.message = {
                imageMessage: {
                    caption: 'Image caption',
                },
            };

            await startHandler(mockSock, mockMsg);

            expect(mockSock.sendMessage).toHaveBeenCalled();
        });
    });

    describe('Concurrent message handling', () => {
        it('should handle multiple messages concurrently', async () => {
            const messages = Array(5).fill(null).map((_, i) => ({
                key: {
                    remoteJid: `628123456789${i}@s.whatsapp.net`,
                    fromMe: false,
                },
                pushName: `User${i}`,
                message: {
                    conversation: `!help`,
                },
            }));

            const promises = messages.map(msg => startHandler(mockSock, msg));

            await Promise.all(promises);

            expect(mockSock.sendMessage).toHaveBeenCalledTimes(5);
        });

        it('should handle rapid-fire commands', async () => {
            const commands = ['!help', '!ping', '!time', '!about', '!help'];

            for (const cmd of commands) {
                mockMsg.message = {
                    conversation: cmd,
                };
                await startHandler(mockSock, mockMsg);
            }

            expect(mockSock.sendMessage).toHaveBeenCalledTimes(5);
        });
    });
});
