import * as fs from 'node:fs';
import * as path from 'node:path';
import PropertiesReader = require('properties-reader');
import { CommandResponse, CommandStatus } from './commands';
import { ITaskContext } from './context';
import { ILogger } from './logger';

const OUTPUT_PROPERTIES_PATH = path.join('out', 'jreleaser', 'output.properties');
const SECRET_KEY_TOKENS = ['token', 'password', 'secret', 'key', 'passphrase', 'credential'];
const DEFAULT_OUTPUT_VARIABLE_PREFIX = 'JRELEASER_';

type OutputPropertiesContext = Pick<
  ITaskContext,
  'command' | 'baseDirectory' | 'exportOutputProperties' | 'setVariable'
>;

export function exportOutputPropertiesIfSuccessful(
  response: CommandResponse,
  ctx: OutputPropertiesContext,
  logger: ILogger,
): void {
  if (response.status === CommandStatus.Success) {
    exportOutputProperties(ctx, logger);
  }
}

export function exportOutputProperties(ctx: OutputPropertiesContext, logger: ILogger): void {
  if (!ctx.exportOutputProperties) {
    return;
  }

  if (ctx.command === 'custom') {
    logger.warning(
      'exportOutputProperties is not supported for the custom command because custom arguments may use a different base directory',
    );
    return;
  }

  const outputPropertiesPath = path.resolve(ctx.baseDirectory || process.cwd(), OUTPUT_PROPERTIES_PATH);
  if (!fs.existsSync(outputPropertiesPath)) {
    logger.warning(`JReleaser output properties file was not found: ${outputPropertiesPath}`);
    return;
  }

  let properties: Array<[string, string]>;
  try {
    properties = parseOutputProperties(fs.readFileSync(outputPropertiesPath, 'utf8'));
  } catch (error) {
    logger.warning(`Failed to read JReleaser output properties: ${error.message}`);
    return;
  }

  const exportedNames: string[] = [];
  const exportedNameToKey = new Map<string, string>();
  for (const [key, value] of properties) {
    if (isSecretLikePropertyKey(key)) {
      logger.warning(`Skipping JReleaser output property '${key}' because the key looks secret-like`);
      continue;
    }

    const variableName = normalizeOutputVariableName(key);
    if (variableName === '') {
      logger.warning(`Skipping JReleaser output property '${key}' because it does not produce a valid variable name`);
      continue;
    }

    const existingKey = exportedNameToKey.get(variableName);
    if (existingKey) {
      logger.warning(
        `Skipping JReleaser output property '${key}' because it normalizes to '${variableName}', already used by '${existingKey}'`,
      );
      continue;
    }

    ctx.setVariable(variableName, value, false, true);
    exportedNameToKey.set(variableName, key);
    exportedNames.push(variableName);
  }

  if (exportedNames.length > 0) {
    logger.debug(`Exported JReleaser output variables: ${exportedNames.join(', ')}`);
  }
}

function parseOutputProperties(content: string): Array<[string, string]> {
  const properties: Array<[string, string]> = [];

  PropertiesReader('', 'utf-8')
    .read(content)
    .each((key, value) => {
      if (key !== '') {
        properties.push([key, String(value)]);
      }
    });

  return properties;
}

function normalizeOutputVariableName(key: string, prefix = DEFAULT_OUTPUT_VARIABLE_PREFIX): string {
  const normalizedKey = key
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();

  return normalizedKey === '' ? '' : `${prefix}${normalizedKey}`;
}

function isSecretLikePropertyKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SECRET_KEY_TOKENS.some(token => lowerKey.includes(token));
}
