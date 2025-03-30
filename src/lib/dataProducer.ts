import { publishToQueue, rabbitmqHelper } from "./rabbitMQHelper";
import eventEmitter from "./eventEmitter";

export default async () => {
    rabbitmqHelper.getConnection();
    eventEmitter.on("tcp-data", (data: any) => {
        publishToQueue("rmq-tcp-data", data);
    });
};