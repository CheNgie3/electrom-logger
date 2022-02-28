// 'use strict';
import { app, net } from 'electron';
import { Transport, TransportOptions } from './transport';

interface UploadTransportOptions extends TransportOptions {
  url: string;
  method?: string;
  headers?: { [key: string]: string };
  timeSpan?: number;
  size?: number;
  bodyFormat?: Function;
  profileSet?: Object;
}
class UploadTransport extends Transport {
  private uploadQueue: string[];
  url: string;
  method: string;
  headers: { [key: string]: string };
  private _timeSpan?: number = undefined;
  size: number;
  bodyFormat: Function;
  private timeInterval: NodeJS.Timeout | null = null;
  profileSet: Object;

  constructor(options: UploadTransportOptions) {
    super(options);
    this.uploadQueue = [];
    this.url = options.url;
    this.profileSet = options.profileSet || {};
    this.format = options.format || this._defaultUploadFormat;
    this.bodyFormat =
      typeof options.bodyFormat === 'function'
        ? options.bodyFormat
        : this._defaultBodyFormat;
    this.method = options.method || 'post';
    this.headers = options.headers || {
      'Content-Type': 'application/json',
    };
    this.timeSpan = options.timeSpan || undefined; //单位ms
    this.size = options.size || 50; //单位b

    //监听窗口关闭消息，关闭时发送所有日志缓存
    app.on('will-quit', () => {
      clearTimeout(this.timeInterval!);
      this.timeInterval = null;
      this.forceUpload();
    });
  }
  public set timeSpan(time: number | undefined) {
    if (this.timeInterval) {
      clearTimeout(this.timeInterval);
      this.timeInterval = null;
    }
    if (time && Number.isInteger(time)) {
      this._timeSpan = time;
      this.timeInterval = setTimeout(() => {
        this._observeTime();
      }, this._timeSpan); //定时
    }
  }
  public get timeSpan() {
    return this._timeSpan;
  }
  private _observeTime() {
    try {
      this.forceUpload();
      clearTimeout(this.timeInterval!);
      this.timeInterval = setTimeout(() => {
        this._observeTime();
      }, this._timeSpan);
    } catch (e) {
      console.log('_observeTime', e);
    }
  }
  log(info: string, callback: () => {}) {
    this.uploadQueue.push(info);
    this._upload();

    if (callback) {
      setImmediate(callback);
    }
  }
  forceUpload() {
    this._upload(true);
  }
  private _upload(timeout = false) {
    const _uploadQueue = [...this.uploadQueue],
      _length = _uploadQueue.length;
    let _size = 0;
    if (_length < 1) return;
    if (!timeout) {
      _uploadQueue.map((str = '') => {
        _size += Buffer.byteLength(str.toString());
      });
      if (_size < this.size) return;
    }
    this.uploadQueue.splice(0, _length); //性能?
    this._fetch(_uploadQueue)
      .then((res) => {
        console.log('success', res.msg);
        // this.emit('logged', _uploadQueue);
      })
      .catch((e) => {
        console.log('error', e);
        // this.emit('warn', e);
        //this.uploadQueue = [...this.uploadQueue, ..._uploadQueue] //发送失败的日志重新加入缓存队列
      });
  }
  private _fetch(_uploadQueue: string[]) {
    let body = this.bodyFormat(_uploadQueue, this);
    return this.fetchByNet(this.url, {
      method: this.method,
      body: body,
      headers: this.headers,
    });
  }
  private async fetchByNet(
    url: string,
    options: {
      method: string;
      headers: { [key: string]: string };
      body: string;
    },
  ) {
    await app.whenReady();
    const request = net.request({
      url,
      method: options.method,
    });
    if (options.headers)
      Object.keys(options.headers).forEach((h) => {
        request.setHeader(h, options.headers[h]);
      });
    if (options.body) request.write(options.body);
    return await new Promise((resolve, reject) => {
      let result = Buffer.from([]);
      let data = '';
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          result = Buffer.concat([result, chunk]);
        });
        response.on('end', () => {
          data = result.toString();
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });
        response.on('error', (error) => {
          reject(error);
        });
      });
      request.on('error', (error) => {
        reject(error);
      });
      request.end();
    });
  }
  private _defaultUploadFormat(info: any) {
    return info.message;
  }
  private _defaultBodyFormat(data: string[], self: UploadTransport) {
    return JSON.stringify({ ...self.profileSet, errorLogs: data });
  }
}

export { UploadTransportOptions, UploadTransport };
