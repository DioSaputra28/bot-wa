export const command = {
    name: 'ping',
    description: 'Check bot connection',
    category: 'utility'
}

export async function execute(sock, jid, args, msg) {
    await sock.sendMessage(jid, {
        text: '🏓 Pong! Bot aktif dan merespon.'
    })
}
