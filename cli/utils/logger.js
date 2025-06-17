/**
 * 日志工具
 */

const chalk = require('chalk');

class Logger {
  constructor() {
    this.prefix = '[miniprogram-ci]';
  }

  info(message, ...args) {
    console.log(chalk.blue(this.prefix), message, ...args);
  }

  success(message, ...args) {
    console.log(chalk.green(this.prefix), chalk.green('✓'), message, ...args);
  }

  warn(message, ...args) {
    console.warn(chalk.yellow(this.prefix), chalk.yellow('⚠'), message, ...args);
  }

  error(message, ...args) {
    console.error(chalk.red(this.prefix), chalk.red('✗'), message, ...args);
  }

  debug(message, ...args) {
    if (process.env.DEBUG) {
      console.log(chalk.gray(this.prefix), chalk.gray('[DEBUG]'), message, ...args);
    }
  }

  progress(message) {
    process.stdout.write(chalk.blue(this.prefix) + ' ' + message + '...\r');
  }

  clearProgress() {
    process.stdout.write('\r\x1b[K');
  }
}

module.exports = new Logger();
