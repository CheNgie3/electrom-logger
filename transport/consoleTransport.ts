import {TransportOptions,Transport} from "./transport"
interface ConsoleOptions extends TransportOptions{

}
class ConsoleTransport extends Transport{
    private readonly consoleMethods = {
        context: console,
        error:   console.error,
        warn:    console.warn,
        info:    console.info,
        debug:   console.debug,
        log:     console.log,
    };
    
    constructor(options:ConsoleOptions){
      super(options);
      this.name = options.name || 'console';
    }
    log(info:string, callback = () => {}){
      this.consoleLog(info);
      callback();
    }
    private consoleLog(...args: any[]) {
        var consoleMethod = this.consoleMethods[this.level!] || this.consoleMethods.info;
        consoleMethod.apply(this.consoleMethods.context, args);
    }

}

export {
  ConsoleOptions,
  ConsoleTransport
}