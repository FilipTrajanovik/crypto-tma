import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is not set");
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    "Welcome to your Crypto Wallet. Tap the button below to open your wallet.",
    Markup.inlineKeyboard([Markup.button.webApp("Open Wallet", APP_URL)])
  );
});

bot.command("wallet", (ctx) => {
  ctx.reply(
    "Open your wallet:",
    Markup.inlineKeyboard([Markup.button.webApp("Open Wallet", APP_URL)])
  );
});

bot.command("support", (ctx) => {
  ctx.reply("For support with deposits, withdrawals, or fund releases, please describe your issue here and our team will follow up.");
});

bot.launch().then(() => {
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
