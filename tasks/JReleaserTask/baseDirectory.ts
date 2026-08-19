import * as path from 'node:path';
import { parseArgumentLine } from './commands/abstractCommand';
import { ITaskContext } from './context';

type BaseDirectoryArgumentStatus = 'none' | 'valid' | 'invalid';

type BaseDirectoryArgument = {
  status: BaseDirectoryArgumentStatus;
  value: string;
};

const INVALID_BASEDIR_MESSAGE = 'The --basedir/-b argument must include a non-empty value.';

type BaseDirectoryContext = Pick<
  ITaskContext,
  'command' | 'arguments' | 'baseDirectory' | 'configFile'
>;

const CONFIG_FILE_COMMANDS = new Set([
  'announce',
  'assemble',
  'catalog',
  'changelog',
  'checksum',
  'config',
  'deploy',
  'download',
  'fullRelease',
  'package',
  'prepare',
  'publish',
  'release',
  'sign',
  'templateEval',
  'upload',
]);
const BASE_DIRECTORY_OPTION_COMMANDS = new Set([...CONFIG_FILE_COMMANDS, 'init', 'templateGenerate']);

function assertValidBaseDirectoryArgument(argument: BaseDirectoryArgument): void {
  if (argument.status === 'invalid') {
    throw new Error(INVALID_BASEDIR_MESSAGE);
  }
}

function getBaseDirectoryArgument(argString: string): BaseDirectoryArgument {
  const result: BaseDirectoryArgument = { status: 'none', value: '' };
  const args = parseArgumentLine(argString || '');
  const setValue = (value: string | undefined): void => {
    const trimmedValue = trimValue(value);
    if (trimmedValue === '') {
      result.status = 'invalid';
      result.value = '';
    } else if (result.status !== 'invalid') {
      result.status = 'valid';
      result.value = trimmedValue;
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--basedir' || arg === '-b') {
      setValue(args[++i]);
    } else if (arg.startsWith('--basedir=')) {
      setValue(arg.substring('--basedir='.length));
    } else if (arg.startsWith('-b') && arg.length > 2) {
      setValue(arg.charAt(2) === '=' ? arg.substring(3) : arg.substring(2));
    }
  }

  return result;
}

export function getOutputPropertiesBaseDirectory(ctx: BaseDirectoryContext): string {
  const argumentBaseDirectory = getBaseDirectoryArgument(ctx.arguments);
  assertValidBaseDirectoryArgument(argumentBaseDirectory);
  if (argumentBaseDirectory.status === 'valid') {
    return argumentBaseDirectory.value;
  }

  if (BASE_DIRECTORY_OPTION_COMMANDS.has(trimValue(ctx.command))) {
    const baseDirectoryOptionValue = trimValue(ctx.baseDirectory);
    if (baseDirectoryOptionValue !== '') {
      return baseDirectoryOptionValue;
    }
  }

  const environmentBaseDirectory = trimValue(process.env['JRELEASER_BASEDIR']);
  if (environmentBaseDirectory !== '') {
    return environmentBaseDirectory;
  }

  return getImplicitBaseDirectory(ctx);
}

function getImplicitBaseDirectory(ctx: BaseDirectoryContext): string {
  const configFile = trimValue(ctx.configFile);
  if (CONFIG_FILE_COMMANDS.has(trimValue(ctx.command)) && configFile !== '') {
    return path.dirname(path.resolve(configFile));
  }

  return process.cwd();
}

function trimValue(value: String | string): string {
  return value ? String(value).trim() : '';
}
