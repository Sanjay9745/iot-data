import { EventEmitter } from "events";

class MyEmitter extends EventEmitter {}

const eventEmitter = new MyEmitter();

export default eventEmitter;
