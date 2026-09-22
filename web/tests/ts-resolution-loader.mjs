import { access } from "node:fs/promises";
import { constants } from "node:fs";

const extensions = [".ts", ".tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || !context.parentURL) throw error;

    const baseUrl = new URL(specifier, context.parentURL);
    for (const extension of extensions) {
      const candidate = new URL(`${baseUrl.href}${extension}`);
      try {
        await access(candidate, constants.F_OK);
        return nextResolve(candidate.href, context);
      } catch {
        // Try the next TypeScript extension.
      }
    }
    throw error;
  }
}
