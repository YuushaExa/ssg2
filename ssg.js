const fs = require('fs').promises;
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const partialsDir = path.join(__dirname, 'partials');
const publicDir = path.join(__dirname, 'public');

// Enhanced helper functions with more concise error handling
const readFile = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Read error: ${filePath} - ${err.message}`);
  }
};

const writeFile = async (filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (err) {
    throw new Error(`Write error: ${filePath} - ${err.message}`);
  }
};

const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw new Error(`Dir creation failed: ${dirPath} - ${err.message}`);
  }
};

// More efficient partial loading with parallel processing
const loadPartials = async () => {
  const partialMap = {
    base: 'base.html',
    head: 'head.html',
    header: 'header.html',
    footer: 'footer.html',
    aside: 'aside.html',
    index: 'index.html',
    404: '404.html',
  };

  const loadTasks = Object.entries(partialMap).map(async ([key, file]) => {
    const content = await readFile(path.join(partialsDir, file));
    return { key, content };
  });

  const results = await Promise.all(loadTasks);
  return results.reduce((acc, { key, content }) => ({ ...acc, [key]: content }), {});
};

// Optimized template replacement using single regex pass
const compileTemplate = (partials, mainContent) => {
  return partials.base.replace(
    /\{\{(head|header|footer|aside|main)\}\}/g,
    (_, key) => ({
      head: partials.head,
      header: partials.header,
      footer: partials.footer,
      aside: partials.aside,
      main: mainContent,
    })[key] || ''
  );
};

// Unified page generation function
const generatePage = async (partials, content, outputFile) => {
  const compiled = compileTemplate(partials, content);
  await writeFile(path.join(publicDir, outputFile), compiled);
  console.log(`Generated: ${outputFile}`);
};

// Streamlined model processing
const processModels = async (partials) => {
  try {
    const models = await fs.readdir(modelsDir);
    await Promise.all(models.map(async (modelFile) => {
      const content = await readFile(path.join(modelsDir, modelFile));
      await generatePage(partials, content, modelFile);
    }));
  } catch (err) {
    throw new Error(`Model processing failed: ${err.message}`);
  }
};

// Main execution flow
const runSSG = async () => {
  try {
    await ensureDir(publicDir);
    const partials = await loadPartials();
    
    await Promise.all([
      processModels(partials),
      generatePage(partials, partials.index, 'index.html'),
      generatePage(partials, partials['404'], '404.html'),
    ]);

    console.log('SSG build successful!');
  } catch (err) {
    console.error(`Build error: ${err.message}`);
    process.exit(1);
  }
};

runSSG();
