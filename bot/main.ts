import { Telegraf } from 'telegraf';
import axios from 'axios';
import { normalizeUrl, urlKey, fetchPageTitle } from './services/site.js';
import { config } from './config.js';
import { searchDefinition } from './services/dictionary.js';
import { addDefinitionViaGitHubAPI, addSeedViaGitHubAPI, addPhotoViaGitHubAPI, addSiteViaGitHubAPI, getSitesFromGitHub } from './services/git.js';

type Session = {
  state?: 'waiting-term' | 'confirm' | 'edit' | 'waiting-seed' | 'confirm-seed' | 'photo-desc' | 'photo-tags' | 'site-url' | 'site-title' | 'site-desc';
  seed?: string;
  site?: { url: string; title?: string; detected?: string | null };
  photo?: { fileId: string; ext: string; description?: string };
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
  await ctx.reply('🌿 Bot de Definiciones activo.\nUsá /add para agregar una palabra o /semilla para guardar una idea.\nUsá /sitio para sumar un sitio web a la lista.\nMandame una foto para subirla a la galería.');
});

bot.command('help', async (ctx) => {
  await ctx.reply('/add - Agregar palabra\n/semilla - Guardar una idea para escribir después\n(enviá una foto) - Subirla a la galería\n/sitio - Agregar un sitio a \"Voy a tener suerte\"\n/cancelar - Cancelar lo que estés haciendo\n/help - Ayuda');
});

bot.command('add', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  s.state = 'waiting-term';
  s.pending = undefined;
  await ctx.reply('📝 Escribí el término que querés agregar:');
});

bot.command('semilla', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  s.state = 'waiting-seed';
  s.pending = undefined;
  await ctx.reply('🌱 Escribí tu idea (la primera línea será el título):');
});

bot.command('sitio', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  s.state = 'site-url';
  s.site = undefined;
  await ctx.reply('🎲 Mandame la URL del sitio:');
});

bot.command('cancelar', async (ctx) => {
  if (ctx.from?.id) sessions.delete(ctx.from.id);
  await ctx.reply('🚫 Cancelado.');
});

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // límite de descarga de la Bot API

async function startPhoto(ctx: any, fileId: string, ext: string) {
  const s = getSession(ctx);
  if (!s) return;
  if (s.state === 'photo-desc' || s.state === 'photo-tags') {
    await ctx.reply('📸 Primero terminá la foto anterior (o /cancelar). Mandá las fotos de a una.');
    return;
  }
  s.photo = { fileId, ext };
  s.state = 'photo-desc';
  await ctx.reply('📸 Foto recibida. Escribí la descripción:');
}

bot.on('photo', async (ctx) => {
  // Telegram manda varias resoluciones; la última es la más grande (comprimida, siempre jpg)
  const sizes = ctx.message.photo;
  await startPhoto(ctx, sizes[sizes.length - 1].file_id, 'jpg');
});

// Foto enviada "como archivo": conserva la calidad original
bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const ext = (doc.file_name?.split('.').pop() || '').toLowerCase();
  if (!doc.mime_type?.startsWith('image/') || !IMAGE_EXTS.includes(ext)) {
    await ctx.reply('❌ Solo puedo subir imágenes (jpg, png, gif o webp).');
    return;
  }
  if ((doc.file_size || 0) > MAX_FILE_BYTES) {
    await ctx.reply('❌ La imagen pesa más de 20 MB, que es el máximo que permite Telegram para bots.');
    return;
  }
  await startPhoto(ctx, doc.file_id, ext === 'jpeg' ? 'jpg' : ext);
});

bot.on('text', async (ctx) => {
  const s = getSession(ctx);
  if (!s) return;
  const text = ctx.message.text.trim();

  if (s.state === 'site-url') {
    const url = normalizeUrl(text);
    if (!url) {
      await ctx.reply('❌ Esa URL no parece válida. Probá de nuevo (ej: https://ejemplo.com) o /cancelar.');
      return;
    }
    try {
      const { sites } = await getSitesFromGitHub();
      if (sites.some(x => urlKey(x.url) === urlKey(url))) {
        await ctx.reply('ℹ️ Ese sitio ya está en la lista.');
        s.state = undefined;
        return;
      }
    } catch (err: any) {
      console.error('Sites check error:', err?.message || err);
    }
    await ctx.reply('🔍 Buscando el título...');
    const detected = await fetchPageTitle(url);
    s.site = { url, detected };
    s.state = 'site-title';
    await ctx.reply(
      detected
        ? `Título detectado: "${detected}"\nMandá "." para usarlo, o escribí otro título.`
        : 'No pude leer el título de la página. Escribilo vos:'
    );
    return;
  }

  if (s.state === 'site-title' && s.site) {
    if (text === '.' && s.site.detected) {
      s.site.title = s.site.detected;
    } else if (text === '.') {
      await ctx.reply('No hay título detectado, escribilo vos:');
      return;
    } else {
      s.site.title = text;
    }
    s.state = 'site-desc';
    await ctx.reply('📝 Ahora una descripción corta:');
    return;
  }

  if (s.state === 'site-desc' && s.site?.title) {
    const { url, title } = s.site;
    await ctx.reply('💾 Guardando en GitHub...');
    const r = await addSiteViaGitHubAPI(
      { url, title, description: text },
      (x) => urlKey(x.url) === urlKey(url)
    );
    if (r.ok) {
      await ctx.reply(`🎲 Sitio "${title}" agregado. Se publicará en ~1-2 minutos.`);
    } else if (r.reason === 'exists') {
      await ctx.reply('ℹ️ Ese sitio ya está en la lista.');
    } else {
      await ctx.reply('❌ Error al guardar. Revisá los logs en el servidor.');
    }
    s.state = undefined;
    s.site = undefined;
    return;
  }

  if (s.state === 'photo-desc' && s.photo) {
    s.photo.description = text;
    s.state = 'photo-tags';
    await ctx.reply('🏷️ Ahora los tags, separados por coma (o "-" para ninguno). Ej: Mendoza, vacaciones');
    return;
  }

  if (s.state === 'photo-tags' && s.photo?.description) {
    const { fileId, ext, description } = s.photo;
    const tags = text === '-' ? [] : text.split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.some(t => t.toLowerCase() === 'foto')) tags.push('foto');

    await ctx.reply('⬆️ Subiendo foto a GitHub...');
    try {
      const link = await ctx.telegram.getFileLink(fileId);
      const img = await axios.get(link.href, { responseType: 'arraybuffer' });
      const r = await addPhotoViaGitHubAPI(Buffer.from(img.data), ext, description!, tags);

      if (r.ok) {
        await ctx.reply(`📸 Foto agregada como ${r.file}. Se publicará en ~1-2 minutos.`);
      } else if (r.reason === 'metadata') {
        await ctx.reply(`⚠️ La imagen se subió (${r.file}) pero falló guardar descripción y tags. Agregalos a mano en public/images/gallery.json.`);
      } else {
        await ctx.reply('❌ Error al subir la foto. Revisá los logs en el servidor.');
      }
    } catch (err: any) {
      console.error('Photo error:', err?.message || err);
      await ctx.reply('❌ No pude descargar la foto desde Telegram. Probá de nuevo.');
    }
    s.state = undefined;
    s.photo = undefined;
    return;
  }

  if (s.state === 'waiting-seed') {
    s.seed = text;
    s.state = 'confirm-seed';
    await ctx.reply('🌱 ¿Querés mostrar esta semilla en el sitio?', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🌍 Pública', callback_data: 'seed_public' },
          { text: '🔒 Privada', callback_data: 'seed_private' },
        ]],
      },
    });
    return;
  }

  if (s.state === 'waiting-term') {
    await ctx.reply(`🔍 Buscando definición para "${text}"...`);
    const res = await searchDefinition(text);

    if (!res) {
      await ctx.reply(
        '❌ No encontré definición. Podés escribir la definición manualmente o intentar otro término.\nEscribila ahora o /add para empezar de nuevo.'
      );
      s.state = 'edit';
      s.pending = { term: text, definition: '', source: null };
      return;
    }

    s.pending = res;
    s.state = 'confirm';

    await ctx.replyWithHTML(
      `<b>Término:</b> ${res.term}\n<b>Definición:</b> ${res.definition}\n<b>Fuente:</b> ${res.source || '—'}`,
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
    s.pending.definition = text;
    s.state = 'confirm';

    await ctx.replyWithHTML(
      `Edición guardada:\n<b>${s.pending.term}</b> — ${s.pending.definition}`,
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

  await ctx.reply('Usá /add para iniciar el flujo o /help para ayuda.');
});

bot.action('confirm_def', async (ctx) => {
  const s = getSession(ctx);
  if (!s?.pending) {
    await ctx.reply('Sesión expirada. Usá /add para empezar de nuevo.');
    return;
  }

  await ctx.reply('💾 Guardando en GitHub...');
  const success = await addDefinitionViaGitHubAPI(s.pending);

  if (success.ok) {
    await ctx.reply(`✨ Palabra "${s.pending.term}" agregada. Se publicará en ~1-2 minutos.`);
  } else if (success.reason === 'exists') {
    await ctx.reply('ℹ️ Esa palabra ya existe en el diccionario.');
  } else {
    await ctx.reply('❌ Error al guardar. Revisá los logs en el servidor.');
  }

  sessions.delete(ctx.from!.id);
});

async function plantSeed(ctx: any, visible: boolean) {
  const s = getSession(ctx);
  if (!s?.seed) {
    await ctx.reply('Sesión expirada. Usá /semilla para empezar de nuevo.');
    return;
  }
  await ctx.reply('💾 Plantando semilla...');
  const r = await addSeedViaGitHubAPI(s.seed, visible);
  if (r.ok) {
    await ctx.reply(
      visible
        ? `🌱 Semilla guardada en notes/${r.slug}.md y visible en el sitio en ~1-2 minutos.`
        : `🌱 Semilla guardada en notes/${r.slug}.md (privada, no se publica).`
    );
  } else {
    await ctx.reply('❌ Error al guardar la semilla. Revisá los logs en el servidor.');
  }
  s.state = undefined;
  s.seed = undefined;
}

bot.action('seed_public', (ctx) => plantSeed(ctx, true));
bot.action('seed_private', (ctx) => plantSeed(ctx, false));

bot.action('reject_def', async (ctx) => {
  const s = getSession(ctx);
  if (ctx.from?.id) sessions.delete(ctx.from.id);
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

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 Bot iniciado (polling).');