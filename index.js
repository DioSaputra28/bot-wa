import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import { startHandler } from './connect/handler.js'
import { startServer } from './server/index.js'

const logger = P({ level: 'info' })

let globalSock = null;
let qrCodeData = null;
let connectionStatus = 'connecting';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('storage/auth')

    const sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: true,
        browser: ['bot-wa', 'Chrome', '1.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            qrCodeData = qr;
            connectionStatus = 'qr-ready';
            logger.info('QR Code received and stored');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            connectionStatus = 'disconnected';
            
            if (shouldReconnect) {
                logger.info('Reconnecting...')
                startBot()
            } else {
                logger.error('Connection closed. Please scan QR again.')
                connectionStatus = 'needs-scan';
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            qrCodeData = null;
            logger.info('Connection opened!')
        } else if (connection === 'connecting') {
            connectionStatus = 'connecting';
        }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                await startHandler(sock, msg)
            }
        }
    })

    globalSock = sock;
    return sock
}

startBot()
    .then(() => {
        startServer()
    })
    .catch((error) => {
        logger.error({ error: error.message }, 'Error starting bot')
        process.exit(1)
    })

export function getSocket() { return globalSock; }
export function getQRCode() { return qrCodeData; }
export function getConnectionStatus() { return connectionStatus; }
