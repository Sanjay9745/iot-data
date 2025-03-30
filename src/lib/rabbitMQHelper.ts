import * as amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

class RabbitMQHelper {
    private static instance: RabbitMQHelper;
    private connection: any = null;
    private channel: amqp.Channel | null = null;
    private connecting: boolean = false;
    private consumers: Map<string, (msg: amqp.ConsumeMessage | null) => void> = new Map();
    
    private constructor() {}
    
    public static getInstance(): RabbitMQHelper {
        if (!RabbitMQHelper.instance) {
            RabbitMQHelper.instance = new RabbitMQHelper();
        }
        return RabbitMQHelper.instance;
    }
    
  async getConnection(): Promise<amqp.Connection> {
        if (!this.connection) {
            this.connection = await amqp.connect(RABBITMQ_URL);
            console.log("RabbitMQ connected");
            this.connection.on("error", (err: Error) => {
                console.error("RabbitMQ connection error:", err);
                this.connection = null;
            });

            process.once("SIGINT", async () => {
                if (this.connection) await this.connection.close();
                process.exit(0);
            });
        }
        return this.connection;
    }
    
    private async getChannel(): Promise<amqp.Channel> {
        if (!this.channel) {
            const connection: any = await this.getConnection();
            this.channel = await connection.createChannel();
            this.channel?.on("error", (err: Error) => {
                console.error("RabbitMQ channel error:", err);
                this.channel = null;
            });

            // Re-register consumers if channel was recreated
            if (this.consumers.size > 0) {
                const channel = this.channel; // Store in local variable to ensure type safety
                for (const [queue, callback] of this.consumers.entries()) {
                    await channel?.consume(queue, callback);
                }
            }
        }
        if (!this.channel) {
            throw new Error("Failed to create RabbitMQ channel");
        }
        return this.channel;
    }
    
    public async publishToQueue<T>(queue: string, message: T): Promise<void> {
        try {
            if (this.connecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.publishToQueue(queue, message);
            }
            
            this.connecting = true;
            const channel = await this.getChannel();
            await channel.assertQueue(queue, { durable: true });
            
            channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
            this.connecting = false;
        } catch (error) {
            this.connecting = false;
            console.error("🚨 RabbitMQ Publish Error:", error);
            this.channel = null;
        }
    }

    public async consumeFromQueue<T = any>(
        queue: string, 
        onMessage: (message: T) => Promise<void> | void,
        options: amqp.Options.AssertQueue = { durable: true }
    ): Promise<void> {
        try {
            if (this.connecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.consumeFromQueue(queue, onMessage, options);
            }

            this.connecting = true;
            const channel = await this.getChannel();
            await channel.assertQueue(queue, options);

            const callback = async (msg: amqp.ConsumeMessage | null): Promise<void> => {
                if (!msg) return;
                
                try {
                    const content = JSON.parse(msg.content.toString()) as T;
                    await Promise.resolve(onMessage(content));
                    channel.ack(msg);
                } catch (err) {
                    console.error(`🚨 Error processing message from [${queue}]:`, err);
                    // Nack the message if processing fails
                    channel.nack(msg, false, false);
                }
            };

            // Store the consumer callback for reconnection scenarios
            this.consumers.set(queue, callback);
            
            await channel.consume(queue, callback);
            this.connecting = false;
        } catch (error) {
            this.connecting = false;
            console.error("🚨 RabbitMQ Consume Error:", error);
            this.channel = null;
        }
    }
}

export const rabbitmqHelper = RabbitMQHelper.getInstance();

export const publishToQueue = <T>(queue: string, message: T): Promise<void> => 
    rabbitmqHelper.publishToQueue(queue, message);

export const consumeFromQueue = <T = any>(
    queue: string, 
    onMessage: (message: T) => Promise<void> | void,
    options?: amqp.Options.AssertQueue
): Promise<void> => 
    rabbitmqHelper.consumeFromQueue(queue, onMessage, options);
