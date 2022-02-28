import path from 'path';
import { app } from 'electron';
import {
  FileTransport,
  ConsoleTransport,
  Transport,
  UploadTransport,
  UploadTransportOptions,
} from './transport';
import { Logger } from './logger';

const loggerPath = app.getPath('logs');

interface UCFLoggerConfig {
  level?: string;
  maxSize?: number;
  format?: () => string;
}
function LoggerConfigGenerator() {
  const defaultTransports = {
    console: new ConsoleTransport({}),
    file: new FileTransport({
      filename: path.join(loggerPath, 'ucf3-%DATE%.log'),
    }),
  };
  const loggerFormat = function ({
    level,
    message,
    timeStamp,
    stack = '',
    diff = '',
  }: any) {
    let fomatString = `${timeStamp} [${level}] ${message} ${stack}`;
    if (diff !== '') {
      fomatString = fomatString + `+${diff}ms`;
    }
    return fomatString;
  };
  let exceptionHandlers: Transport[] = [
    new FileTransport({
      filename: path.join(loggerPath, 'ucf3-exceptions.log'),
    }),
  ];
  if (process.env.NODE_ENV !== 'production') {
    exceptionHandlers.push(new ConsoleTransport({}));
  }

  return {
    transports: defaultTransports,
    format: loggerFormat,
    level: 'info',
    exceptionHandlers,
  };
}

const logger = new Logger(LoggerConfigGenerator());

async function log(msg: any, type = 'info', ...args: any[]) {
  logger.log(msg, type, ...args);
}
async function info(msg: any) {
  log(msg, 'info');
}
async function debug(msg: any) {
  log(msg, 'debug');
}
async function warn(msg: any) {
  log(msg, 'warn');
}
async function error(msg: any) {
  log(msg, 'error');
}
function getTransports() {
  return logger.transports;
}
function addTransport(
  name: string,
  transport: Transport | undefined | null | false,
) {
  logger.addTransport(name, transport);
}
//_config={level='warn',format,defalutMeta,exitOnError}
async function config(_config: UCFLoggerConfig = {}) {
  logger.configure(_config);
}
//可配置传输后,该方法可省略
//options={url,method,headers,profileSet,uploadFormat,bodyFormat,level,size,timeSpan}
async function submitTo(options: UploadTransportOptions) {
  logger.addTransport('upload', new UploadTransport(options));
}

export default {
  loggerPath,
  log,
  info,
  debug,
  warn,
  error,
  config,
  submitTo,
  getTransports,
  addTransport,
};
