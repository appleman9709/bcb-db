/**
 * Скрипт для генерации VAPID ключей
 * 
 * Запуск:
 * node generate-vapid.js
 */

const crypto = require('crypto')

// Generate VAPID keys
const curve = crypto.createECDH('prime256v1')
curve.generateKeys()

const publicKey = curve.getPublicKey()
const privateKey = curve.getPrivateKey()

// Convert to URL-safe base64
function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

const vapidPublicKey = base64URLEncode(publicKey)
const vapidPrivateKey = base64URLEncode(privateKey)

console.log('\n=======================================')
console.log('VAPID Keys Generated:')
console.log('=======================================\n')
console.log('Public Key (87 characters):')
console.log(vapidPublicKey)
console.log(`\nLength: ${vapidPublicKey.length}`)
console.log('\nPrivate Key (43 characters):')
console.log(vapidPrivateKey)
console.log(`\nLength: ${vapidPrivateKey.length}`)
console.log('\n=======================================\n')

console.log('Copy this to your .env file:')
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidPublicKey}\n`)

console.log('For Vercel, add these Environment Variables:')
console.log(`VAPID_PUBLIC_KEY=${vapidPublicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`)
console.log('VAPID_SUBJECT=mailto:noreply@babycare.app\n')


















