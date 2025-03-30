import { consumeFromQueue, rabbitmqHelper } from "./lib/rabbitMQHelper";
import redisClient, { connectRedis } from "./config/redis";
import Analytics from "./models/Analytics";
import { connectDB } from "./config/db";
import Device from "./models/Device";
import UptimeData from "./models/UptimeData";
import moment from "moment";

async function initialize() {
	await connectDB();
	await connectRedis();

	await rabbitmqHelper.getConnection();
	consumeFromQueue("rmq-tcp-data", (data: any) => {
		processTcpData(data);
	});
	setInterval(processScheduledUptimeData, 120000); // Every 2 minutes
}

initialize().catch(err => {
	console.error("Failed to initialize consumer:", err);
	process.exit(1);
});

const processTcpData = async (data: any) => {
	try {
		if (!data || !data.deviceId || data.value === undefined || !data.timestamp) {
			console.error('Invalid data received:', data);
			return;
		}

		const deviceId = data.deviceId;

		try {
			await redisClient.rPush(`tcp-data:${deviceId}`, JSON.stringify(data));
			const count = await redisClient.lLen(`tcp-data:${deviceId}`);

			if (count >= 15) {
				const storedDataArray = await redisClient.lRange(`tcp-data:${deviceId}`, 0, -1);

				if (storedDataArray && storedDataArray.length > 0) {
					const parsedData = storedDataArray.map(item => {
						try {
							const parsedItem = JSON.parse(item);
							return {
								timestamp: new Date(parsedItem.timestamp),
								metadata: {
									deviceId: parsedItem.deviceId,
									data: parsedItem.value === 1 ? 1 : 0,
									timestamp: Number(parsedItem.timestamp)
								}
							};
						} catch (parseError) {
							console.error('Error parsing item:', item, parseError);
							return null;
						}
					}).filter(item => item !== null);

					if (parsedData.length > 0) {
						await Analytics.insertMany(parsedData);
						await redisClient.del(`tcp-data:${deviceId}`);
						console.log(`Processed ${parsedData.length} records for device ${deviceId}`);
					}
				}
			}
		} catch (redisError) {
			console.error(`Redis operation failed for device ${deviceId}:`, redisError);
		}
	} catch (error) {
		console.error('Error processing TCP data:', error);
	}
}


const processScheduledUptimeData = async () => {
	try {
		console.log("Starting scheduled uptime data processing...");

		// Get all registered devices
		const devices = await Device.find({});
		console.log(`Processing uptime for ${devices.length} devices`);

		const twoMinutesAgo = moment().subtract(2, 'minutes').toDate();

		for (const device of devices) {
			try {
				const deviceId = device.deviceId;

				// Get the latest uptime record for this device
				const latestUptime = await UptimeData.findOne({
					"metadata.deviceId": deviceId
				}).sort({ timestamp: -1 });

				const recentAnalytics = await Analytics.find({
					"metadata.deviceId": deviceId,
					timestamp: { $gte: twoMinutesAgo }
				}).sort({ timestamp: -1 });

				let currentStatus = "disconnected";

				if (recentAnalytics && recentAnalytics.length > 0) {
					const counts = recentAnalytics.reduce((acc, record) => {
						const value = record.metadata.data;
						if (value === 0) {
							acc.zeros += 1;
						} else if (value === 1 || value === "1") {
							acc.ones += 1;
						}
						return acc;
					}, { zeros: 0, ones: 0 });

					if (counts.ones > counts.zeros) {
						currentStatus = "connected";
					} else {
						currentStatus = "disconnected";
					}

					console.log(`Device ${deviceId}: Found ${recentAnalytics.length} data points - ${counts.ones} ones, ${counts.zeros} zeros`);
				}

				const lastStatus = latestUptime?.metadata.data;

				if (!lastStatus || lastStatus !== currentStatus) {
					console.log(`Device ${deviceId} status changed from ${lastStatus || 'unknown'} to ${currentStatus}`);

					await UptimeData.create({
						timestamp: moment().toDate(),
						metadata: {
							deviceId,
							data: currentStatus,
							timestamp: moment().unix()
						}
					});
				}
			} catch (deviceError) {
				console.error(`Error processing device ${device.deviceId}:`, deviceError);
			}
		}

		console.log("Completed scheduled uptime data processing");
	} catch (error) {
		console.error("Error in scheduled uptime processing:", error);
	}
}