/**
 * Sends a plain-text message to a user via the Telegram Bot API. Best-effort:
 * failures are logged but never thrown, so a notification issue never breaks
 * the admin action that triggered it (the user may have blocked the bot, etc).
 */
export async function sendTelegramMessage(telegramId: string | number, text: string): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Telegram sendMessage failed:", res.status, body);
    }
  } catch (err) {
    console.error("Telegram sendMessage error:", err);
  }
}
