//TODO:
//1、分级 level限制写入 已实现
//2、更改transport 已实现
//3、错误捕获 handleExceptions exitOnError 已实现  异步
//4、输出颜色 (暂不）
//2、console/file/upload多通道 已实现
//3、file rotate 已实现 
import { Transform } from 'stream';
import { ConsoleTransport } from './transport';
import { Transport } from './transport';
import { ExceptionHandlers } from './exceptionHandler';
import { formatDate } from '../../utils/time';

enum levels {
  error = 0,
  warn = 1,
  info = 2,
  debug = 3,
}
export interface LoggerOptions {
  transports?: { [key: string]: Transport };
  level?: string;
  format?: Function;
  defaultMeta?: Object;
  exceptionHandlers?: Transport[];
  exitOnError?: Function | Boolean;
}
export class Logger extends Transform {
  transports: { [key: string]: Transport } = {};
  level?: string;
  levels = levels;
  format?: Function;
  defaultMeta?: Object;
  exceptions?: ExceptionHandlers;
  exitOnError?: Function | Boolean;
  prevTime?: Number;
  constructor(options: LoggerOptions) {
    super();
    this.configure(options);
    this._initTransports(options.transports);
  }
  configure(options: LoggerOptions) {
    this.defaultMeta = options.defaultMeta || this.defaultMeta || {};
    this.exitOnError = options.exitOnError || this.exitOnError || true;
    this.format = options.format || this.format || undefined;
    this.level = options.level || this.level || 'info';
    //错误处理
    if (options.exceptionHandlers) {
      this.exceptions = new ExceptionHandlers(this);
      this.exceptions.handle(options.exceptionHandlers);
    }
  }
  private _initTransports(
    transportsOpt: { [key: string]: Transport } | undefined,
  ) {
    let transports = transportsOpt || {
      console: new ConsoleTransport({}),
    };
    if (transports && typeof transports === 'object') {
      for (let i in transports) {
        this.addTransport(i, transports[i]);
      }
    }
  }
  _transform(
    info: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    try {
      this.push(info);
    } catch (ex) {
      throw ex;
    } finally {
      callback();
    }
  }
  log(msg: any, type: string, ...args: any[]) {
    const curr = new Date();
    // const currNum = Number(curr);
    // const ms = this.prevTime ? currNum - Number(this.prevTime) : 0;
    // this.prevTime = currNum;
    let info = {};
    if (msg instanceof Error) {
      info = Object.assign({}, this.defaultMeta, {
        level: type,
        timeStamp: formatDate(curr, 'yyyy-MM-dd HH:mm:ss'),
        message: msg.message,
        stack: msg.stack,
        ...args,
      });
    } else {
      info = Object.assign({}, this.defaultMeta, {
        level: type,
        timeStamp: formatDate(curr, 'yyyy-MM-dd HH:mm:ss'),
        message: msg,
        ...args,
      });
    }
    // if (type === 'debug') {
    //   info['diff'] = ms;
    // }
    this.write(JSON.stringify(info));
  }
  addTransport(name: string, transport: Transport | undefined | null | false) {
    if (this.transports[name]) {
      this.unpipe(this.transports[name] as Transport);
      delete this.transports[name];
    }
    if (!transport) {
      return;
    }
    if (transport instanceof Transport) {
      this.transports[name] = transport;
      this.pipe(transport);
    } else {
      throw new Error('transport needs extends base class [Transport]');
    }
  }
  clear() {
    this.unpipe();
    this.transports = {};
  }
}
