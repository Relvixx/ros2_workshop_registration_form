// Resolves the `@/` path alias + extensionless TS relatives for plain-node self-tests.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", specifier.slice(2));
    const file = path.extname(base) ? base : `${base}.ts`;
    return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    try {
      const parent = fileURLToPath(context.parentURL);
      const abs = path.resolve(path.dirname(parent), specifier);
      if (existsSync(`${abs}.ts`)) {
        return { url: pathToFileURL(`${abs}.ts`).href, shortCircuit: true };
      }
    } catch {
      /* fall through */
    }
  }
  return next(specifier, context);
}
