import { Buffer } from 'buffer';
import process from 'process';
import EventEmitter from 'events';

window.global = window.global ?? window;
window.Buffer = window.Buffer ?? Buffer;
window.process = window.process ?? process;
// @ts-ignore
window.EventEmitter = window.EventEmitter ?? EventEmitter;
