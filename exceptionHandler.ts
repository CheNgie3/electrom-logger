import { Logger } from "./logger"
import { Transport } from './transport';
import { formatDate } from '../../utils/time';

export class ExceptionHandlers{
  handlers:Transport[];
  logger:Logger;

  constructor(logger:Logger) {
    this.logger=logger;
    this.handlers = [];
  }

  handle(handlers:Transport[]|Transport) {
    
    if (Array.isArray(handlers)) {
        handlers.forEach(handler =>this._addHandler(handler));
    }
    else this._addHandler(handlers);

    process.on('uncaughtException', err => {
      this.errorHandler('uncaughtException', err)
    });
    process.on('unhandledRejection', err => {
      this.errorHandler('unhandledRejection', err)
    });
  }
  _addHandler(handler:Transport){
    if(handler instanceof Transport){
      if(!handler.format && this.logger.format){
        handler.format=this.logger.format;
      }
      handler.levels=this.logger.levels;
      this.handlers.push(handler);
    }
  }
  clear() {
    this.handlers = [];
  }
  errorHandler(type:string,err:Error) {
    const info=this.getAllInfo(type,err)
    let doExit = typeof this.logger.exitOnError === 'function'
    ? this.logger.exitOnError(err)
    : this.logger.exitOnError;
    let timeout:NodeJS.Timeout;

    function gracefulExit() {
      console.log(`has a process ${type},exit gracefully`)
      if (doExit) {
        if (timeout) {
          clearTimeout(timeout);
        }
        process.exit(1);
      }
    }
    //todo:修改为异步
    this.handlers.forEach((handler)=>{
      handler.write(JSON.stringify(info));
    })
    // if (!this.handlers || this.handlers.length === 0) {
    //   return process.nextTick(gracefulExit);
    // }

    // asyncForEach(this.handlers, (handler, next) => {
    //   // const done = one(next);

    //   // function onDone(event) {
    //   //   console.log("onDone",event)
    //   //   return () => {
    //   //     done();
    //   //   };
    //   // }
    //   // handler.once('finish', onDone('finished'));
    //   // handler.once('error', onDone('error'));

    // }, () => doExit && gracefulExit());


    if (doExit) {
      timeout = setTimeout(gracefulExit, 3000);
    }
  }
  getAllInfo(type:string,err:Error) {
    let { message } = err;
    if (!message && typeof err === 'string') {
      message = err;
    }
    return {
      level: 'error',
      message: [
        `${type}: ${(message || '(no error message)')}`,
        err.stack || '  No stack trace'
      ].join('\n'),
      stack: err.stack,
      timeStamp: formatDate(new Date(),'yyyy-MM-dd HH:mm:ss'),
    };
}
  
}
