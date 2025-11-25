import { readdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const appRoot = path.join(projectRoot, 'src', 'app');

const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.angular']);
const codeExtensions = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

const tsFiles = await collectFiles(appRoot, file => file.endsWith('.ts'));
const convertedNames = [];

for (const file of tsFiles) {
  if (file.endsWith('.spec.ts')) {
    continue;
  }

  let source = await readFile(file, 'utf8');
  if (!source.includes('@Component') || !source.includes('templateUrl')) {
    continue;
  }

  const templateMatch = /([ \t]*)templateUrl:\s*['"](.+?)['"],?/m.exec(source);
  if (!templateMatch) {
    continue;
  }

  const templateIndent = templateMatch[1];
  const templateRelative = templateMatch[2];
  const templatePath = path.resolve(path.dirname(file), templateRelative);
  const templateContent = await readFile(templatePath, 'utf8');
  const escapedTemplate = escapeForTemplate(templateContent);
  const templateReplacement = `${templateIndent}template: \`\n${escapedTemplate}\n${templateIndent}\`,`;
  source = source.replace(templateMatch[0], templateReplacement);

  const styleMatch = /([ \t]*)styleUrl:\s*['"](.+?)['"],?/m.exec(source);
  if (styleMatch) {
    const styleIndent = styleMatch[1];
    const styleRelative = styleMatch[2];
    const stylePath = path.resolve(path.dirname(file), styleRelative);
    const styleContent = await readFile(stylePath, 'utf8');
    const escapedStyle = escapeForTemplate(styleContent);
    const styleReplacement = `${styleIndent}styles: [\`\n${escapedStyle}\n${styleIndent}\`],`;
    source = source.replace(styleMatch[0], styleReplacement);
    await rm(stylePath, { force: true });
  }

  await rm(templatePath, { force: true });

  const parsed = path.parse(file);
  const baseName = parsed.name;
  let targetPath = file;
  if (!parsed.name.endsWith('.component')) {
    targetPath = path.join(parsed.dir, `${parsed.name}.component${parsed.ext}`);
    await rename(file, targetPath);
  }

  await writeFile(targetPath, source);
  convertedNames.push(baseName);
}

if (convertedNames.length) {
  const codeFiles = await collectFiles(projectRoot, file => codeExtensions.has(path.extname(file)));
  const patterns = convertedNames
    .filter((value, index, array) => array.indexOf(value) === index)
    .map(name => ({
      name,
      regex: new RegExp(`(?<!\\.component)/${escapeRegExp(name)}(?=['"])`, 'g'),
      replacement: `/${name}.component`
    }));

  for (const file of codeFiles) {
    let text = await readFile(file, 'utf8');
    let updated = text;
    for (const { regex, replacement } of patterns) {
      updated = updated.replace(regex, replacement);
    }
    if (updated !== text) {
      await writeFile(file, updated);
    }
  }
}

function escapeForTemplate(value) {
  return value.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

async function collectFiles(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }
      const childPath = path.join(dir, entry.name);
      results.push(...await collectFiles(childPath, predicate));
    } else if (entry.isFile()) {
      const filePath = path.join(dir, entry.name);
      if (predicate(filePath)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
