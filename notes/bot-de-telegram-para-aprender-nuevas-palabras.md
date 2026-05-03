---
title: Bot de Telegram para aprender nuevas palabras
tags: [public, tutorial, tech]
estado: "🌱 semilla"
created: 2026-05-03
updated: 2026-05-03

---

# Bot de Telegram para aprender nuevas palabras

**Estado:** 🌿 brote

Hace algunos años, en unas vacaciones con una amiga en San Bernardo, recuperé el hábito de comprar revistitas de juegos de palabras y crucigramas. Desde entonces, me preguntó *Cómo puede alguien retener esta información ultra específica?*

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

Necesitamos una función para extraer el texto de Wiktionary:

**fetchWiktionaryWikitext**

```TypeScript

async function fetchWiktionaryWikitext(term: string):
 Promise<string | null> {
  const url = `https://es.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1`;

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

Es necesario idear varias funciones para limpiar el texto. Si vemos cómo son las salidas crudas de Wikidictionary, encontramos algo así:

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
Para nuestro propósito, quisiéramos algo más resumido, así que usamos distintas funciones. 

**normalizeText**

Esta función reemplaza espacios múltiples, saca carácteres raros, y elimina espacios al principio y al final

```TypeScript
function normalizeText(text: string): string {
      return text
    .replace(/\s+/g, ' ')
    .replace(/^[:;,\-–—]+\s*/, '')
    .trim();
}
```

**replaceUsefulTemplates**

Esta función quita algunos de los templates que usa el motor de MediaWiki, por ejemplo: {{uso|coloquial}}. Para eso detecta las llaves {}, separa el contenido y decide cuáles le sirven. 

```TypeScript
function replaceUsefulTemplates(text: string): string {
  return text.replace(/\{\{([^{}]+)\}\}/g, (_match, inner) => {
    const parts = String(inner)
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return '';
    }

    const name = parts[0].toLowerCase();
    const args = parts.slice(1);

    const passthroughTemplates = new Set([
      'plm',
      'csem',
      'l',
      't',
      'uso',
      'ámbito',
      'ambito',
      'sinónimo',
      'sinonimo',
      'hiperónimo',
      'hiperonimo',
    ]);

    if (passthroughTemplates.has(name)) {
      return args[0] || '';
    }

    return '';
  });
}
```

**cleanWikiText**

La última función encadena las otras dos y también elimina referencias, formatos y HTML. 

```TypeScript
function cleanWikiText(text: string): string {
  return normalizeText(
    replaceUsefulTemplates(
      text
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/'''+/g, '')
        .replace(/''/g, '')
    )
  );
}
```

**extractDefinitionFromWikitext**

Esta es la función que decide qué usar aplicando todas las otras. Para eso, recorre línea por línea, detecta cuándo empieza la sección en español, identifica qué líneas contienen definiciones, limpia el contenido y devuelve la primera que encuentra.


```TypeScript
function extractDefinitionFromWikitext(wikitext: string): string | null {
  const lines = wikitext.split(/\r?\n/);

  const spanishSectionHeaderRegex = /^==\s*\{\{lengua\|es\}\}\s*==$/i;
  const definitionLineRegex = /^;\s*\d+\s*:?\s*(.*)$/;

  let inSpanishSection = false;
  let fallbackDefinition: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (spanishSectionHeaderRegex.test(line)) {
      inSpanishSection = true;
      continue;
    }

    if (!inSpanishSection) {
      continue;
    }

    const sectionHeaderMatch = line.match(/^===+\s*.*\s*===+$/);
    if (sectionHeaderMatch && !/^===\s*\{\{sustantivo|^===\s*\{\{adjetivo|^===\s*\{\{verbo|^===\s*\{\{adverbio|^===\s*\{\{interjección|^===\s*\{\{interjeccion/i.test(line)) {
      continue;
    }

    const definitionMatch = line.match(definitionLineRegex);
    if (!definitionMatch) {
      continue;
    }

    const cleaned = cleanWikiText(definitionMatch[1]);
    if (!cleaned) {
      continue;
    }

    if (!fallbackDefinition) {
      fallbackDefinition = cleaned;
    }

    return cleaned;
  }

  return fallbackDefinition;
}
```

Con todo esto, se hace la función principal:

**searchDefinition**

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

A través de 