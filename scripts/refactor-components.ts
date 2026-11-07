// scripts/refactor-components.ts
// ---------------------------------------------------------------
// This script refactors Angular components that currently inline their
// templates into separate .component.html files and ensures a matching
// .component.scss file exists. It also renames the TypeScript file to
// <name>.component.ts and updates all imports (including lazy‑loaded routes
// and spec files).
// ---------------------------------------------------------------

import { promises as fs } from "fs";
import * as path from "path";

async function main() {
  // Use the current working directory as the project root.
  const srcRoot = path.resolve(process.cwd(), "src", "app");
  const tsFiles = await findFiles(srcRoot, /\.ts$/);

  // ---------- 1️⃣ locate components with inline template ----------
  const componentInfos: {
    filePath: string;
    name: string; // e.g. “pos”
    folder: string; // absolute folder of the component
    className: string; // exported class name
    template: string; // raw HTML
    hasStyleUrl: boolean; // already had styleUrls?
    relFolder: string; // path relative to srcRoot (e.g. "features/pos")
  }[] = [];

  for (const file of tsFiles) {
    const content = await fs.readFile(file, "utf8");
    const componentMatch = /@Component\(\{([\s\S]*?)\}\)/m.exec(content);
    if (!componentMatch) continue; // not a component

    const decoratorBody = componentMatch[1];
    const templateMatch = /template\s*:\s*`([\s\S]*?)`/.exec(decoratorBody);
    if (!templateMatch) continue; // already external template

    const classMatch = /export\s+class\s+(\w+)/.exec(content);
    if (!classMatch) continue;

    const name = path.basename(file, ".ts"); // e.g. “pos"
    const folder = path.dirname(file);
    const className = classMatch[1];
    const template = templateMatch[1];
    const hasStyleUrl = /styleUrls?\s*:/.test(decoratorBody);
    const relFolder = path.relative(srcRoot, folder).split(path.sep).join("/"); // forward slashes

    componentInfos.push({ filePath: file, name, folder, className, template, hasStyleUrl, relFolder });
  }

  // ---------- 2️⃣ write HTML files ----------
  for (const info of componentInfos) {
    const htmlPath = path.join(info.folder, `${info.name}.component.html`);
    await fs.writeFile(htmlPath, info.template.trimStart(), "utf8");
    console.log(`✅  created ${path.relative(srcRoot, htmlPath)}`);
  }

  // ---------- 3️⃣ ensure SCSS files ----------
  for (const info of componentInfos) {
    const scssPath = path.join(info.folder, `${info.name}.component.scss`);
    try {
      await fs.access(scssPath);
    } catch {
      await fs.writeFile(scssPath, "/* component‑scoped SCSS – currently empty */\n", "utf8");
      console.log(`✅  created empty ${path.relative(srcRoot, scssPath)}`);
    }
  }

  // ---------- 4️⃣ rename TS files ----------
  for (const info of componentInfos) {
    const newPath = path.join(info.folder, `${info.name}.component.ts`);
    await fs.rename(info.filePath, newPath);
    console.log(`✅  renamed ${path.relative(srcRoot, info.filePath)} → ${path.relative(srcRoot, newPath)}`);
    info.filePath = newPath; // update for later rewriting
  }

  // ---------- 5️⃣ rewrite decorators ----------
  for (const info of componentInfos) {
    let content = await fs.readFile(info.filePath, "utf8");

    // replace inline template with templateUrl
    content = content.replace(/template\s*:\s*`[\s\S]*?`/, `templateUrl: './${info.name}.component.html'`);

    // replace or add styleUrls pointing to the new .scss file
    if (info.hasStyleUrl) {
      content = content.replace(/styleUrls?\s*:\s*\[[^\]]*\]/, `styleUrls: ['./${info.name}.component.scss']`);
    } else {
      // Insert styleUrls before the closing brace of @Component({ ... })
      content = content.replace(/@Component\(\{([\s\S]*?)(\}\))/,
        (_, before, after) => {
          const insertion = `  styleUrls: ['./${info.name}.component.scss'],`;
          const lines = before.split("\n");
          const closingIdx = lines.findIndex((l: string) => /^\s*\}\s*$/.test(l));
          if (closingIdx === -1) {
            return `@Component({\n${before}\n${insertion}\n${after}`;
          } else {
            lines.splice(closingIdx, 0, insertion);
            return `@Component({\n${lines.join("\n")}\n${after}`;
          }
        }
      );
    }

    await fs.writeFile(info.filePath, content, "utf8");
    console.log(`✅  updated decorator in ${path.relative(srcRoot, info.filePath)}`);
  }

  // ---------- 6️⃣ update imports ----------
  // Build map: old import path -> new import path (both relative to srcRoot)
  const importMap = new Map<string, string>();
  for (const info of componentInfos) {
    const oldSimple = `./${info.name}`;
    const newSimple = `./${info.name}.component`;
    importMap.set(oldSimple, newSimple);

    const oldFull = `./${info.relFolder}/${info.name}`;
    const newFull = `./${info.relFolder}/${info.name}.component`;
    importMap.set(oldFull, newFull);
  }

  const allTs = await findFiles(srcRoot, /\.ts$/);
  for (const f of allTs) {
    let txt = await fs.readFile(f, "utf8");
    let changed = false;
    for (const [oldImp, newImp] of importMap) {
      const re = new RegExp('([\'"`])' + escapeRegExp(oldImp) + '([\'"`])', 'g');
      if (re.test(txt)) {
        txt = txt.replace(re, `$1${newImp}$2`);
        changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(f, txt, "utf8");
      console.log(`✅  rewrote imports in ${path.relative(srcRoot, f)}`);
    }
  }

  console.log("\n🎉  Refactor complete!  Run the app (npm run dev) and the tests (npm test) to verify everything still works.");
}

// ---------------------------------------------------------------
// Helper utilities
async function findFiles(dir: string, regex: RegExp): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFiles(full, regex)));
    } else if (regex.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
