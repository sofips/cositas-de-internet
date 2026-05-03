import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { searchDefinition } from './services/dictionary.js';
import { addDefinitionViaGitHubAPI } from './services/git.js';

type Session = {
  state?: 'waiting-term' | 'confirm' | 'edit';
  pending?: { term: string; definition: string; source?: string | null };
};

const bot = new Telegraf(config.telegram.token);
const sessions = new Map<number, Session>();

function getSession(ctx: any) {
  const id = ctx.from?.id;
  if (!id) return null;
  if (!sessions.has(id)) sessions.set(id, {});
  return sessions.get(id)!;
}

bot.use(async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id) return;
  if (id !== config.telegram.adminId) {
    await ctx.reply('❌ No tienes acceso. Solo el admin puede usar este bot.');
    return;
  }
  return next();
});

bot.command('start', async (ctx) => {
  await ctx.reply('🌿 Bot de Definiciones activo.\nUsá /add para agregar una palabra.');
});

bot.command('help', async (ctx) => {
  await ctx.reply('/add - Agregar palabra\n/help - Ayuda');
});

bot.command('add', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  s.state = 'waiting-term';
  s.pending = undefined;
  await ctx.reply('📝 Escribí el término que querés agregar:');
});

// text handler
bot.on('text', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  const text = ctx.message.text.trim();

  if (s.state === 'waiting-term') {
    await ctx.reply(\`🔍 Buscando definición para "\${text}"...\`);
    const res = await searchDefinition(text);
    if (!res) {
      await ctx.reply('❌ No encontré definición. Podés escribir la definición manualmente o intentar otro término.\nEscribila ahora o /add para empezar de nuevo.');
      s.state = 'edit';
      s.pending = { term: text, definition: '', source: null };
      return;
    }
    s.pending = res;
    s.state = 'confirm';

    await ctx.replyWithHTML(
      \`<b>Término:</b> \${res.term}\n<b>Definición:</b> \${res.definition}\n<b>Fuente:</b> \${res.source || '—'}\`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirmar', callback_data: 'confirm_def' }, { text: '❌ Rechazar', callback_data: 'reject_def' }],
            [{ text: '✏️ Editar', callback_data: 'edit_def' }],
          ],
        },
      }
    );
    return;
  }

  if (s.state === 'edit' && s.pending) {
    // treat message as edited definition
    s.pending.definition = text;
    s.state = 'confirm';
    await ctx.replyWithHTML(
      \`Edición guardada:\\n<b>\${s.pending.term}</b> — \${s.pending.definition}\`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirmar', callback_data: 'confirm_def' }, { text: '❌ Rechazar', callback_data: 'reject_def' }],
          ],
        },
      }
    );
    return;
  }

  // otherwise ignore / guide
  await ctx.reply('Usá /add para iniciar el flujo o /help para ayuda.');
});

// callbacks
bot.action('confirm_def', async (ctx) => {
  const s = getSession(ctx);
  if (!s?.pending) {
    await ctx.reply('Sesión expirada. Usá /add para empezar de nuevo.');
    return;
  }
  await ctx.reply('💾 Guardando en GitHub...');
  const success = await addDefinitionViaGitHubAPI(s.pending);
  if (success.ok) {
    await ctx.reply(\`✨ Palabra "\${s.pending.term}" agregada. Se publicará en ~1-2 minutos.\`);
  } else if (success.reason === 'exists') {
    await ctx.reply('ℹ️ Esa palabra ya existe en el diccionario.');
  } else {
    await ctx.reply('❌ Error al guardar. Revisá los logs en el servidor.');
  }
  sessions.delete(ctx.from!.id);
});

bot.action('reject_def', async (ctx) => {
  const s = getSession(ctx);
  sessions.delete(ctx.from!.id);
  await ctx.reply('❌ Operación cancelada.');
});

bot.action('edit_def', async (ctx) => {
  const s = getSession(ctx);
  if (!s || !s.pending) {
    await ctx.reply('Sesión expirada. Usá /add para empezar.');
    return;
  }
  s.state = 'edit';
  await ctx.reply('✏️ Escribí la definición corregida:');
});

bot.launch({ polling: true });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 Bot iniciado (polling).');
