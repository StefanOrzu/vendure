import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { compile } from '../utils/compiler.js';
import { debugLogger, noopLogger } from '../utils/logger.js';

// #4807 — a config or plugin which imports a .json file must still compile, because
// the compiler copies the JSON into the output alongside the emitted .js files.
describe('compiling a config which imports .json files', () => {
    for (const module of ['commonjs', 'esm'] as const) {
        it(`should include imported JSON in ${module} mode`, { timeout: 60_000 }, async () => {
            const tempDir = join(__dirname, `./__temp/json-${module}`);
            await rm(tempDir, { recursive: true, force: true });

            const result = await compile({
                outputPath: tempDir,
                vendureConfigPath: join(__dirname, 'fixtures-json', 'vendure-config.ts'),
                logger: process.env.LOG ? debugLogger : noopLogger,
                module,
            });

            // The JSON imported directly by the config, and the one imported
            // transitively by the plugin, both have to reach the output.
            expect(JSON.parse(await readFile(join(tempDir, 'config-data.json'), 'utf-8'))).toEqual({
                foo: 'bar',
            });
            expect(
                JSON.parse(
                    await readFile(join(tempDir, 'my-plugin', 'src', 'plugin-data.json'), 'utf-8'),
                ),
            ).toEqual({ sheetId: 'abc123' });

            // The loaded config proves the JSON was readable at runtime, not just copied.
            expect(result.vendureConfig.customFields?.Product?.[0].name).toBe('bar');
        });
    }
});
