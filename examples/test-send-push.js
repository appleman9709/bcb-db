// Простой скрипт для тестирования отправки push-уведомлений
// node examples/test-send-push.js

const { sendPushNotification } = require('./node-server-send-push');

async function test() {
  console.log('Testing push notification sending...\n');

  // Замените на реальный ID семьи
  const familyId = 1; // Ваш family_id
  
  const result = await sendPushNotification(
    familyId,
    'Тестовое уведомление',
    'Это тест push-уведомлений для BabyCare Dashboard! 🎉',
    '/icons/icon-192x192.png',
    { test: true }
  );

  console.log('\nResult:', result);
}

test().catch(console.error);

