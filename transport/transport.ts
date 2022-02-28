import { Writable, WritableOptions } from 'stream';
import { Logger } from '../logger';

interface TransportOptions extends WritableOptions {
  level?: string;
  format?: Function;
  log?: (info: any, callback: any) => any;
  name?: string;
}
class Transport extends Writable {
  name: string;
  levels: any;
  level?: string;
  format?: Function;
  private parent: Logger | null = null;

  constructor(options: TransportOptions) {
    super({ ...options, objectMode: true });
    this.name = options.name || 'Transport';
    this.format = options.format || undefined;
    this.level = options.level || undefined;
    this.once('pipe', (logger: Logger) => {
      this.levels = logger.levels;
      this.parent = logger;
    });
    this.once('unpipe', (src) => {
      if (src === this.parent) {
        this.parent = null;
      }
    });
  }
  log(info: any, callback = () => {}) {
    console.log('trasport info', info);
  }
  _write(
    info: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    info = JSON.parse(info);
    const level = this.level || (this.parent && this.parent.level) || 'info';
    const format =
      this.format || (this.parent && this.parent.format) || this._defaultFormat;

    if (!level || this.levels[level] >= this.levels[info['level']]) {
      if (info && !format) {
        return this.log(info, callback);
      }
      let errState;
      let transformed;
      try {
        transformed = format!(info);
      } catch (err) {
        errState = err;
      }
      if (errState || !transformed) {
        callback();
        if (errState) throw errState;
        return;
      }
      return this.log(transformed, callback);
    }
    return callback(null);
  }
  private _defaultFormat(info: any) {
    if (typeof info === 'object') {
      return JSON.stringify(info);
    } else {
      return info.toString();
    }
  }
}

export { TransportOptions, Transport };
