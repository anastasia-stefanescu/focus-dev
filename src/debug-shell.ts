import repl from 'repl';
import * as cache from './Cache/node-cache/node-cache';

const r = repl.start('> ');
r.context.cache = cache;
console.log('Debug shell started');
