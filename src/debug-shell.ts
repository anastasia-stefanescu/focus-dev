import repl from 'repl';
import * as cache from './LocalStorage/local_storage_node-cache';

const r = repl.start('> ');
r.context.cache = cache;
console.log('Debug shell started');
