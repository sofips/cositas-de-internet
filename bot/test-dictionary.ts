import { searchDefinition } from './services/dictionary.js';

const term = process.argv[2] || 'sapo';

(async () => {
  console.log(`Buscando definición para "${term}"...`);

  const result = await searchDefinition(term);

  if (!result) {
    console.log('No encontrada.');
    process.exit(1);
  }

  console.log('Resultado:');
  console.log(`Término: ${result.term}`);
  console.log(`Definición: ${result.definition}`);
  console.log(`Fuente: ${result.source}`);

  process.exit(0);
})();
