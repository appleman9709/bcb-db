// Пример Supabase Edge Function для отправки push-уведомлений
// Этот файл должен быть в: supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ⚠️ ЗАПОЛНИТЕ ЭТИ КЛЮЧИ ПРАВИЛЬНО!
const VAPID_PUBLIC_KEY = "BC4vcf_6Ze_7AUPAL23NDpfPZkq64wlSKcVWwKFdnAP6qgzsBU45kb-gbA_eP-rvoXIp2EEz_o2i-r65XdtsZF8"
const VAPID_PRIVATE_KEY = "rduChdV8ux4sYgcjGNrfEuhU782w9f0Jb9N3agTJWfI"

interface PushPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, any>
}

serve(async (req) => {
  try {
    const { familyId, title, body, icon, data }: {
      familyId: number
      title: string
      body: string
      icon?: string
      data?: Record<string, any>
    } = await req.json()

    if (!familyId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Получаем подписки из базы данных
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("family_id", familyId)

    if (subError) {
      console.error("Error fetching subscriptions:", subError)
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found for this family" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    let successCount = 0
    let failCount = 0

    // Отправляем уведомления каждой подписке
    for (const subscription of subscriptions) {
      try {
        // Подготавливаем payload для web-push
        const payload = JSON.stringify({
          title,
          body,
          icon: icon || "/icons/icon-192x192.png",
          data: data || {},
          badge: "/icons/icon-96x96.png",
          tag: "babycare-notification",
          requireInteraction: false
        })

        // Отправляем через fetch (вместо web-push библиотеки)
        // Это упрощенный вариант - для production используйте криптографическую библиотеку
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `vapid t=${VAPID_PUBLIC_KEY}, k=${VAPID_PRIVATE_KEY}`,
            "TTL": "86400"
          },
          body: payload
        })

        if (response.ok || response.status === 201) {
          successCount++
        } else {
          console.error(`Failed to send to ${subscription.user_id}:`, response.statusText)
          failCount++
        }
      } catch (error) {
        console.error(`Error sending to ${subscription.user_id}:`, error)
        failCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: subscriptions.length 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

