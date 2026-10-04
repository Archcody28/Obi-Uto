import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// Stub React Native-only modules so the app's real data-layer code can run in Node.
const STUBS = {
  "@react-native-async-storage/async-storage": `
let mem = {};
const AsyncStorage = {
  getItem: async (k) => (k in mem ? mem[k] : null),
  setItem: async (k, v) => { mem[k] = String(v); },
  removeItem: async (k) => { delete mem[k]; },
  clear: async () => { mem = {}; },
};
export default AsyncStorage;
`,
  "react-native": `
export const Platform = { OS: "web", select: (o) => o.default ?? o.web ?? o.ios };
export default { Platform };
`,
  debug: `
const noop = () => {};
const makeLogger = () => { const f = noop; f.enabled = false; f.extend = makeLogger; f.log = noop; return f; };
// debug("ns") returns a logger function (matches the real "debug" package contract).
const debugFactory = () => makeLogger();
debugFactory.enabled = false;
export default debugFactory;
export { debugFactory as debug };
`,
};

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) {
    return { url: "stub:" + specifier, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      context.parentURL &&
      (specifier.startsWith("./") || specifier.startsWith("../"))
    ) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const ext of [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.tsx",
        "/index.js",
      ]) {
        const cand = base + ext;
        if (existsSync(cand)) {
          return { url: pathToFileURL(cand).href, shortCircuit: true };
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("stub:")) {
    const name = url.slice(5);
    return { format: "module", source: STUBS[name], shortCircuit: true };
  }
  // App .js/.jsx files use ESM syntax but live in a CommonJS package; force ESM.
  if (
    (url.endsWith(".js") || url.endsWith(".jsx")) &&
    url.includes("/src/")
  ) {
    const src = readFileSync(fileURLToPath(url), "utf8");
    return { format: "module", source: src, shortCircuit: true };
  }
  return nextLoad(url, context);
}
