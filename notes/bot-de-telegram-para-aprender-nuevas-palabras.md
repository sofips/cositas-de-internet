---
title: Bot de Telegram para aprender nuevas palabras
tags: [public, tutorial, tech]
estado: "🌳 árbol"
created: 2026-05-03
updated: 2026-05-17

---

# Bot de Telegram para aprender nuevas palabras

**Estado:** 🌳 árbol

Hace algunos años, en unas vacaciones con una amiga en San Bernardo, recuperé el hábito de comprar revistitas de juegos de palabras y crucigramas. Desde entonces, me preguntó *Cómo puedo acordarme de estas palabras raras que aparecen en todos los crucigramas?*

Con esto en mente, junto con el sueño de algún día ser participante de Pasapalabra, agregué a este humilde jardín el widget **Palabra del día** que debería llamarse **Palabras que aprendo haciendo crucigramas** y que puede verse en el [inicio](https://sofips.github.io/cositas-de-internet/). Hoy, quiero ir un paso más allá, y e intentar automatizar la carga de palabras.

Actualmente, la forma en la que funciona es a través de un diccionario (`.json`) en el que las palabras se cargan con su definición y en algunos casos una fuente.

```python
  {
    "term": "Crisálida",
    "definition": "fase intermedia y el estado inactivo (\"pupa\" o \"ninfa\") en la metamorfosis de insectos.",
    "source": null
  },
```

 Mi idea es que al aprender una nueva palabra, pueda usar un bot de telegram para agregarla a la lista y que la definición se busque automáticamente de alguna fuente. 

 ## Implementación

Ayudándome con Copilot para hacerlo, quiero crear un bot que agrega palabras al archivo `definitions.json`. Voy a usar [Wiktionary](https://es.wiktionary.org/wiki/Wikcionario:Portada) como fuente. Así, el objetivo final es que el bot extraiga la definición de allí, permita editarla y la guarde en el repo usando la API de GitHub para que GitHub Actions reconstruya el sitio posteriormente.

 ### Paso 1: Set-up del servidor

 Voy a usar un [servidor casero hosteado en una Conectar Igualdad](https://eventol.flisol.org.ar/events/flisol-cordoba-2025/activity/625/). Mientras escribo esto, estoy manifestando no romperlo en el proceso.

Este jardín usa `Node.js` y [npm](https://nodejs.org/learn/getting-started/an-introduction-to-the-npm-package-manager), un gestor de paquetes para Node.js. La forma en la que yo lo entiendo (que puede ser muy distinta de la correcta) es: "Una fuente para descargar funcionalidades tipo *Play Store* para sitios web que funcionan con Node.js". Espero en algún momento ampliar sobre esto. 

Lo primero que hay que hacer entonces, es chequear si el server tiene instalados `node` y `npm`. En mi caso no los tenía, así que instalé

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Para que todo sea seguro agregué un usuario más al servidor y cree las carpetas ahí:

```bash
sudo adduser --system --group --home /opt/cositas-bot botdefs
sudo mkdir -p /opt/cositas-bot/app
sudo chown -R botdefs:botdefs /opt/cositas-bot
```
Esto trae un pequeño inconveniente que es que tengo que moverme intermitentemente entre el root y el usuario que gestiona el bot, usando `sudo chown -R botdefs:botdefs /opt/cositas-bot` voy cambiando quién es el dueño de ese directorio.

Después instalé git y cloné el repo con este jardín en ese directorio:

```bash
sudo mkdir -p /opt/cositas-bot
sudo apt install -y git
# clonamos desde el repo al directorio `/opt/cositas-bot/app`
sudo git clone https://github.com/sofips/cositas-de-internet.git /opt/cositas-bot/app
# transferimos ownership
sudo chown -R botdefs:botdefs /opt/cositas-bot
```

También hay que instalar algunas dependencias de servicios desde `npm`

Las dependencias necesarias son:
- Telegraf: se usa para crear bots de Telegram
- Axios: se usa para hacer requests HTTP, o sea, hablar con servicios externos como un diccionario online.
- dotenv: para manejar variables de entorno (ej: acceder a claves y variables sensibles locales.)

Eso lo hacemos con `npm install axios dotenv telegraf`. Con esto ya tenemos las principales dependencias instaladas.

 ### Paso 2: Archivos de ejecución del bot

Ahora, vamos a pasar a crear el bot. Para eso creamos otro directorio:

```bash
mkdir /opt/cositas-bot/app/bot
```

### Extracción de palabras y definiciones (`dictionary.ts`)

En primer lugar, vamos a crear el archivo que define la funcionalidad principal del bot llamado `dictionary.ts`. Este script será el encargado de buscar las definiciones de las palabras online. Para eso, toma un término, consulta una fuente externa, limpia el texto y devuelve un resultado listo. 

Veamos cómo se construye parte por parte:

Primero, importamos `axios` que se usa para hacer requests HTTP, es decir, buscar algo afuera. En este caso, lo usaremos para consultar Wiktionary que será nuestra fuente de definiciones.

```TypeScript
import axios from 'axios';
```

Luego, definimos el formato de salida que queremos, este se basa en la estructura de `definitions.json` que es el archivo del que actualmente toma las palabras el widget.

```TypeScript
export interface DictionaryResult {
  term: string;
  definition: string;
  source: string | null;
}
```

Necesitamos una función para extraer el texto de Wiktionary, **fetchWiktionaryWikitext** define la fuente y algunas normalizaciones del texto accedido.

```TypeScript

async function fetchWiktionaryWikitext(term: string):
 Promise<string | null> {
  const url = `https://es.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1`;

  // acá usamos axios para acceder a la url definida anteriormente

  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'cositas-bot/1.0',
    },
  });

  const pages = response.data?.query?.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    return null;
  }

  const page = pages[0];
  if (!page || page.missing) {
    return null;
  }

  const revision = page.revisions?.[0];
  const content =
    revision?.slots?.main?.content ??
    revision?.content ??
    '';

  return typeof content === 'string' && content.trim() ? content : null;
}
```

Es necesario idear varias funciones para limpiar el texto resultante. Si vemos cómo son las salidas crudas de Wikictionary, encontramos algo así:

```
== {{lengua|es}} ==
{{pron-graf}}

=== Etimología ===
{{etimología|onomatopeya}}

=== {{sustantivo femenino|es}} ===
{{es.sust}}

;1: Pequeña bola de [[aire]] o gas que se forma dentro de un líquido y asciende a la superficie, o que se forma en el aire rodeado de una finísima película de líquido.
;2: Lugar absolutamente [[estéril]] y cerrado, para aislar a un enfermo que carece de defensas inmunológicas contra los gérmenes.

;3 {{csem|economía}}: Efecto por el cual, mediante [[especulación]] con los [[precio]]s y la [[oferta]] de algún bien, se crea una sensación irreal de [[desarrollo]] económico.

=== Locuciones ===
* [[niño burbuja]]: Niño que vive absolutamente aislado en un lugar estéril, por carecer de defensas y sistema inmune contra los gérmenes.
* [[nivel de burbuja]]: Nivel en el que una burbuja en un líquido permite establecer la línea horizontal.
* [[vivir en una burbuja]]: Vivir protegido, separado e ignorante del mundo real.

=== Información adicional ===
{{derivad|burbuja|burbujear|burbujeante}}.

=== Véase también ===
{{w}}

=== Traducciones ===
{{trad-arriba}}
{{t|de|t1=Blase|g1=f}}
{{t|cs|t1=bublina|g1=f}}
{{t|sk|t1=bublina|g1=f}}
{{t|eu|a1=1-3|t1=burbuila}}
{{t|fr|a1=1-3|t1=bulle}}
{{t|en|a1=1-3|t1=bubble}}
{{t|it|a1=1-3|t1=bolla|g1=f}}
{{t|nl|t1=belletje|g1=n|t2=blaasje|g2=n|t3=luchtbel|g3=c}}
{{trad-abajo}}

== Referencias y notas ==
<references />
--- RAW WIKITEXT END ---
```

Para nuestro propósito, quisiéramos algo más resumido, así que usamos distintas funciones, todas están disponibles [acá](https://github.com/sofips/cositas-de-internet/blob/main/bot/services/dictionary.ts).

**normalizeText**: Esta función reemplaza espacios múltiples, saca carácteres raros, y elimina espacios al principio y al final

**replaceUsefulTemplates**: Esta función quita algunos de los templates que usa el motor de MediaWiki, por ejemplo: {{uso|coloquial}}. Para eso detecta las llaves {}, separa el contenido y decide cuáles le sirven. 

**cleanWikiText**: La última función encadena las otras dos y también elimina referencias, formatos y HTML. 

**extractDefinitionFromWikitext**: Esta es la función clave que decide qué usar aplicando todas las otras. Para eso, recorre línea por línea, detecta cuándo empieza la sección en español, identifica qué líneas contienen definiciones, limpia el contenido y devuelve la primera definición que encuentra.


Con todo esto, se hace la función principal **searchDefinition**:

```TypeScript

export async function searchDefinition(term: string): Promise<DictionaryResult | null> {
  try {
    const wikitext = await fetchWiktionaryWikitext(term);
    if (!wikitext) {
      return null;
    }

    const definition = extractDefinitionFromWikitext(wikitext);
    if (!definition) {
      return null;
    }

    return {
      term,
      definition,
      source: `https://es.wiktionary.org/wiki/${encodeURIComponent(term)}`,
    };
  } catch (error: any) {
    console.error('searchDefinition error:', error?.message || error);
    return null;
  }
}
```

> Lo poco que sé de TypeScript: `const` define valores fijos del sistema, `function` encapsula lógica, `async` permite trabajar con operaciones que tardan como requests HTTP, y `export` expone la función principal para que otros archivos (como el bot) puedan usarla.

### Orquestación del bot

A través del archivo [main.ts](https://github.com/sofips/cositas-de-internet/blob/main/bot/main.ts) se orquesta todo el funcionamiento del bot.

```TypeScript
import { Telegraf } from 'telegraf'; \\telegram bot
import { config } from './config.js'; \\variables de entorno
import { searchDefinition } from './services/dictionary.js'; \\función para buscar en Wiktionary
import { addDefinitionViaGitHubAPI } from './services/git.js'; \\función para hacer push a GitHub
```

Primero lo inicializamos usando Telegraf:

```TypeScript
const bot = new Telegraf(config.telegram.token);
```

Tenemos que mapear de alguna forma el estado del flujo en que nos encontramos. Para ello, lxs usuarixs tienen una sesión con: en qué paso están y qué palabra se está procesando.

```TypeScript
const sessions = new Map<number, Session>();
```

Luego se definen los comandos, que puede aceptar el bot:
```TypeScript
bot.command('start', ...)
bot.command('help', ...)
bot.command('add', ...)
```
El comando `/add` cambia el estado, haciendo que a partir de ahí el bot espere una palabra: `s.state = 'waiting-term';`. 

Cuando la recibe, llama a `searchDefinition`. 

Si encuentra la definición, muestra término, definición y fuente. Además, muestra botones para confirmar, rechazar y editar.

Si no encuentra o pedimos editar, cambia de estado a `s.state = 'edit'` y recibe el siguiente mensaje como definición. 

Las acciones se gestionan con botones interactivos. Por ejemplo, para el botón de confirmación tenemos: `bot.action('confirm_def', ...)` y eso será lo que dispare: 
`await addDefinitionViaGitHubAPI(s.pending);` que vive en el archivo `git.ts` (encargado de interactuar con git).

Para lanzar el bot, se utiliza `bot.launch()`

Acá se puede ver un ejemplo de flujo.

Usuario: /add
Bot:    "Escribí el término..."
Usuario: "serendipia"
Bot:    "🔍 Buscando..."
Bot:    "Término: serendipia
         Definición: descubrimiento valioso que se produce de manera accidental o casual...
         [✅ Confirmar] [❌ Rechazar] [✏️ Editar]"
Usuario: [✅ Confirmar]
Bot:    "💾 Guardando en GitHub..."
Bot:    "✨ Palabra 'serendipia' agregada. Se publicará en ~1-2 minutos."
        (en GitHub: nuevo commit en definitions.json)
        (en tu sitio: palabra aparece en "Palabra del día" en ~2 min)

### Configuración

Las claves (Telegram, GitHub, etc.) se cargan desde variables de entorno usando `config.ts`, para no exponer datos sensibles en el código. 

Para obtener un Token de Bot de Telegram hay que crear un bot con @BotFather y utilizar el comando `\newbot` y para obtener tu ID podés usar @userinfobot.


### Último paso: dejar el bot corriendo en el servidor

Hasta ahora el bot ya puede buscar palabras y guardar cambios en GitHub. Pero si quiero que siga vivo aunque cierre la terminal o reinicie la máquina, necesito dejarlo corriendo como un servicio del sistema.

Para eso uso `systemd`, que es el mecanismo de Linux para administrar servicios en segundo plano. En este caso, `systemd` va a:

- arrancar el bot automáticamente cuando prende el servidor
- reiniciarlo si se cae
- mantenerlo corriendo sin depender de una sesión SSH abierta

El archivo del servicio queda así:

```ini
[Unit]
Description=Bot de Telegram para definiciones
After=network.target

[Service]
Type=simple
User=botdefs
WorkingDirectory=/opt/cositas-bot/app
EnvironmentFile=/opt/cositas-bot/config/bot.env
ExecStart=/usr/bin/node /opt/cositas-bot/app/node_modules/.bin/tsx /opt/cositas-bot/app/bot/main.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

Después de crear el archivo, hay que recargar systemd, activar el servicio y arrancarlo:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cositas-bot
sudo systemctl restart cositas-bot
sudo systemctl status cositas-bot
```

Con esto el bot queda persistente en el servidor y se vuelve a levantar solo si reinicio la máquina.


El código completo está en [este repo](https://github.com/sofips/cositas-de-internet/tree/main/bot).