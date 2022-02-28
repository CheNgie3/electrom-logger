import path from 'path';
import fs from 'fs';
import os from 'os';
import { TransportOptions, Transport } from './transport';
import { formatDate } from '../../../utils/time';
import { winPath } from '../../../utils/path';

interface FileTransportOptions extends TransportOptions {
  filename: string;
  maxSize?: number;
  isRotate?: boolean;
  datePattern?: string;
  writeOptions?: Object;
}
class FileTransport extends Transport {
  private _filename: string = '';
  private _filePath: string = '';
  private _maxSize: number = 0;
  writeOptions: Object;
  datePattern: string;
  isRotate;
  
  constructor(options: FileTransportOptions) {
    super(options);
    this.name = options.name || 'file';
    this.isRotate = options.isRotate || true;
    this.filename = options.filename || '`logger.%DATE%`';
    this.datePattern = options.datePattern || 'yyyy-MM-dd';
    this.maxSize = options.maxSize || 0;
    this.writeOptions = options.writeOptions || {
      flag: 'a',
      mode: 438, // 0666
      encoding: 'utf8',
    };
  }
  private formatFilename() {
    if (this.isRotate) {
      const reg = /%DATE%/i;
      const date = formatDate(new Date(), this.datePattern);
      this._filePath = this.filename.replace(reg, date);
    }
  }
  log(info: string, callback = () => {}) {
    //获取当前文件
    this.getCurrentFile();
    const stats = fs.statSync(this._filePath);
    const fileSize = stats.size;
    const bytes = Buffer.byteLength(info);
    //如果当前文件maxsize失效，则新开一个文件
    let needLogRotation =
      this.isRotate && this._maxSize > 0 && fileSize + bytes > this._maxSize;
    if (needLogRotation) {
      this.archiveLog();
    }
    this.writeLine(info);
    callback();
    return true;
  }
  /**
   * rotate后将旧文件重命名
   */
  private archiveLog() {
    var oldPath = this._filePath;
    try {
      //修改文件名为 finame(num).ext
      const newpthName = this.unusedFilename(oldPath);
      console.log('newpthName', newpthName);
      fs.renameSync(oldPath, newpthName);
    } catch (e) {
      console.log('Could not rotate log', e);
    }
  }
  private getCurrentFile() {
    //更新文件名中的日期
    this.formatFilename();
    try {
      this.createLogDirIfNotExist(path.dirname(this._filePath));
      fs.writeFileSync(this._filePath, '', { flag: 'a' });
    } catch (e) {
      throw e;
    }
  }
  private writeLine(text: string) {
    text += os.EOL;
    try {
      fs.writeFileSync(this._filePath, text, this.writeOptions);
    } catch (e) {
      throw new Error("Couldn't write to " + this._filePath + '. ' + e.message);
    }
  }
  /**
   * 递归创建文件夹
   * @param dirPath
   */
  private createLogDirIfNotExist(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  /**
   * 检查文件是否存在
   * @param path
   * @returns
   */
  private accessSync(path: string) {
    try {
      fs.accessSync(path);
      return true;
    } catch (_) {
      return false;
    }
  }
  /**
   * 利用柯里化，获得自增后的文件名
   * @param filePath
   * @returns
   */
  private incrementer(filePath: string) {
    let counter = 0;
    return () => {
      let inf = path.parse(filePath);
      const modifier = (filename: string, extension: string) =>
        `${filename}(${++counter})${extension}`;
      return path.join(inf.dir, modifier(inf.name, inf.ext));
    };
  }
  private unusedFilename(filePath: string) {
    const getFilePath = this.incrementer(filePath);
    //如果文件存在，则继续查询自增后的文件是否存在，直到获得未被使用的文件名
    const find = (newFilePath: string):string =>
      this.accessSync(newFilePath) ? find(getFilePath()) : newFilePath;
    return find(filePath);
  }
  public get maxSize() {
    return this._maxSize;
  }
  public set maxSize(size: string | number) {
    if (size && typeof size === 'string') {
      var _s = size.toLowerCase().match(/^((?:0\.)?\d+)([bkmg])$/);  
      if (_s) {
        switch (_s[2]) {
          case 'b':
            this._maxSize = Number(_s[1]);break;
          case 'k':
            this._maxSize = Number(_s[1]) * 1024;break;
          case 'm':
            this._maxSize = Number(_s[1]) * 1024 * 1024;break;
          case 'g':
            this._maxSize = Number(_s[1]) * 1024 * 1024 * 1024;break;
        }
      }
    } else if (size && Number.isInteger(size)) {
      this._maxSize = size as number;
    }
  }
  public set filename(name: string) {
    if (name.trim() === '' || !winPath(this.name)) {
      throw new Error('filetransport needs a valid filename.');
    } else {
      this._filename = this._filePath = name;
    }
  }
  public get filename() {
    return this._filename;
  }
}

export { FileTransportOptions, FileTransport };
