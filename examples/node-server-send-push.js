// Пример Node.js сервера для отправки push-уведомлений
// npm install express web-push

const express = require('express');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// ⚠️ ИСПОЛЬЗУЙТЕ ВАШИ РЕАЛЬНЫЕ КЛЮЧИ ИЗ .vapid_private_key.txt!
const VAPID_PUBLIC_KEY = 'BC4vcf_6Ze_7AUPAL23NDpfPZkq64wlSKcVWwKFdnAP6qgzsBU45kb-gbA_eP-rvoXIp2EEz_o2i-r65XdtsZF8';
const VAPID_PRIVATE_KEY = 'rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI';

// Настройка VAPID
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Замените на ваш email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Функция для отправки push-уведомлений семье
 */
async function sendPushNotification(familyId, title, body, icon, data) {
  try {
    // Получаем все подписки для семьи
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('family_id', familyId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for family:', familyId);
      return { success: true, sent: 0 };
    }

    let successCount = 0;
    let failCount = 0;

    // Отправляем уведомления каждой подписке
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        };

        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'babycare-notification',
          requireInteraction: false,
          data: data || {}
        });

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Push sent to user: ${subscription.user_id}`);
        successCount++;

      } catch (error) {
        console.error(`Failed to send push to ${subscription.user_id}:`, error);
        failCount++;

        // Удаляем невалидную подписку
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('family_id', familyId)
            .eq('user_id', subscription.user_id);
        }
      }
    }

    return {
      success: true,
      sent: successCount,
      failed: failCount,
      total: subscriptions.length
    };

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * API endpoint для отправки уведомлений
 */
app.post('/api/send-push', async (req, res) => {
  const { familyId, title, body, icon, data } = req.body;

  if (!familyId || !title || !body) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const result = await sendPushNotification(familyId, title, body, icon, data);
  res.json(result);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test endpoint: POST http://localhost:${PORT}/api/send-push`);
});

module.exports = { sendPushNotification };

