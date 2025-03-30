import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import { DatabaseService } from '../config/db';
import mongoose from 'mongoose';

interface AnalyticsEntry {
  timestamp: Date;
  metadata: {
    deviceId: string;
    data: 0 | 1;
    timestamp: number; // Unix time in milliseconds
  };
}

interface UptimeEntry {
  timestamp: Date;
  metadata: {
    deviceId: string;
    data: "connected" | "disconnected";
    timestamp: number; // Unix time in milliseconds
  };
}

// Configuration
const CONFIG = {
  deviceIds: ['dev_001'],
  startDate: moment('2025-01-01').startOf('day').toISOString(),
  endDate: moment('2025-02-28').endOf('day').toISOString(),
  minHoursPerDay: 12, // Minimum hours the device is operational per day
  maxHoursPerDay: 16, // Maximum hours the device is operational per day
  minDataPointsPerHour: 15, // Minimum analytics data points per hour
  maxDataPointsPerHour: 30, // Maximum analytics data points per hour
  disconnectionProbability: 0.15, // Probability of disconnection event during operational hours
  disconnectionMinDuration: 1, // Minimum disconnection duration in minutes
  disconnectionMaxDuration: 30, // Maximum disconnection duration in minutes
  rebootProbability: 0.3, // Probability that a disconnection is actually a short reboot (< 2 mins)
  outputDir: path.join(process.cwd(), 'src/scripts/data'), // Output directory for JSON files
  databaseUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iot"
};

/**
 * Generates a random integer between min and max (inclusive)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random boolean with specified probability
 */
function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Generates operational hours for a specific day
 * Returns a tuple of [startHour, endHour]
 */
function generateOperationalHours(): [number, number] {
  const startOptions = [6, 7, 8, 9]; // Possible start hours
  const startHour = startOptions[Math.floor(Math.random() * startOptions.length)];
  const operationalHours = getRandomInt(CONFIG.minHoursPerDay, CONFIG.maxHoursPerDay);
  const endHour = Math.min(startHour + operationalHours, 23);
  return [startHour, endHour];
}

/**
 * Generates analytics data for a given device and day
 */
function generateDailyAnalyticsData(
  deviceId: string, 
  day: moment.Moment, 
  operationalPeriods: Array<{start: moment.Moment, end: moment.Moment}>
): AnalyticsEntry[] {
  const result: AnalyticsEntry[] = [];
  operationalPeriods.forEach(period => {
    const periodDuration = moment.duration(period.end.diff(period.start)).asHours();
    const dataPointsInPeriod = getRandomInt(
      Math.floor(periodDuration * CONFIG.minDataPointsPerHour),
      Math.floor(periodDuration * CONFIG.maxDataPointsPerHour)
    );
    const timestamps: moment.Moment[] = [];
    for (let i = 0; i < dataPointsInPeriod; i++) {
      const randomOffset = Math.random() * moment.duration(period.end.diff(period.start)).asMilliseconds();
      timestamps.push(moment(period.start).add(randomOffset, 'milliseconds'));
    }
    timestamps.sort((a, b) => a.valueOf() - b.valueOf());
    const filteredTimestamps: moment.Moment[] = [];
    let lastTimestamp: moment.Moment | null = null;
    for (const timestamp of timestamps) {
      if (!lastTimestamp || timestamp.diff(lastTimestamp, 'minutes') >= 1) {
        filteredTimestamps.push(timestamp);
        lastTimestamp = timestamp;
      }
    }
    filteredTimestamps.forEach(timestamp => {
      const value: 0 | 1 = randomBoolean() ? 1 : 0;
      result.push({
        timestamp: timestamp.toDate(),
        metadata: {
          deviceId,
          data: value,
          timestamp: timestamp.valueOf()
        }
      });
    });
  });
  return result;
}

/**
 * Generate uptime data for a given device and day
 * Returns both uptime entries and operational periods when device was connected
 */
function generateDailyuptimedatas(
  deviceId: string,
  day: moment.Moment
): {
  uptimedatas: UptimeEntry[],
  operationalPeriods: Array<{start: moment.Moment, end: moment.Moment}>
} {
  const uptimedatas: UptimeEntry[] = [];
  const operationalPeriods: Array<{start: moment.Moment, end: moment.Moment}> = [];
  const [startHour, endHour] = generateOperationalHours();
  let currentTime = moment(day).hour(startHour).minute(0).second(0);
  const dayEnd = moment(day).hour(endHour).minute(59).second(59);
  let currentState: "connected" | "disconnected" = "connected";
  uptimedatas.push({
    timestamp: currentTime.toDate(),
    metadata: {
      deviceId,
      data: currentState,
      timestamp: currentTime.valueOf()
    }
  });
  let periodStart = moment(currentTime);
  let lastStateChangeTime = moment(currentTime);
  while (currentTime.isBefore(dayEnd)) {
    if (
      currentState === "connected" && 
      randomBoolean(CONFIG.disconnectionProbability)
    ) {
      currentState = "disconnected";
      operationalPeriods.push({
        start: periodStart,
        end: moment(currentTime)
      });
      let disconnectionMinutes: number;
      if (randomBoolean(CONFIG.rebootProbability)) {
        disconnectionMinutes = getRandomInt(1, 2);
      } else {
        disconnectionMinutes = getRandomInt(
          CONFIG.disconnectionMinDuration,
          CONFIG.disconnectionMaxDuration
        );
      }
      if (currentTime.diff(lastStateChangeTime, 'minutes') >= 1) {
        uptimedatas.push({
          timestamp: currentTime.toDate(),
          metadata: {
            deviceId,
            data: currentState,
            timestamp: currentTime.valueOf()
          }
        });
        lastStateChangeTime = moment(currentTime);
      }
      currentTime.add(disconnectionMinutes, 'minutes');
      if (currentTime.isAfter(dayEnd)) {
        break;
      }
      currentState = "connected";
      if (currentTime.diff(lastStateChangeTime, 'minutes') >= 1) {
        uptimedatas.push({
          timestamp: currentTime.toDate(),
          metadata: {
            deviceId,
            data: currentState,
            timestamp: currentTime.valueOf()
          }
        });
        lastStateChangeTime = moment(currentTime);
      }
      periodStart = moment(currentTime);
      currentTime.add(getRandomInt(30, 180), 'minutes');
    } else {
      currentTime.add(getRandomInt(30, 180), 'minutes');
    }
  }
  if (currentState === "connected") {
    operationalPeriods.push({
      start: periodStart,
      end: dayEnd
    });
  }
  const filteredUptimedatas: UptimeEntry[] = [];
  let previousEntry: UptimeEntry | null = null;
  for (const entry of uptimedatas) {
    if (!previousEntry || moment(entry.timestamp).diff(moment(previousEntry.timestamp), 'minutes') >= 1) {
      filteredUptimedatas.push(entry);
      previousEntry = entry;
    }
  }
  return { uptimedatas: filteredUptimedatas, operationalPeriods };
}

/**
 * Main function that generates all data
 */
async function generateIoTData(): Promise<void> {
  console.log('Starting IoT data generation...');
  
  const allAnalyticsData: AnalyticsEntry[] = [];
  const alluptimedatas: UptimeEntry[] = [];
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Generate data for each device
  for (const deviceId of CONFIG.deviceIds) {
    console.log(`Generating data for device: ${deviceId}`);
    
    // For each day in the date range
    let currentDay = moment(CONFIG.startDate);
    while (currentDay.isSameOrBefore(CONFIG.endDate, 'day')) {
      // Generate uptime data first (to know when the device is operational)
      const { uptimedatas, operationalPeriods } = generateDailyuptimedatas(deviceId, currentDay);
      
      // Generate analytics data during operational periods
      const analyticsData = generateDailyAnalyticsData(deviceId, currentDay, operationalPeriods);
      
      // Add to overall collections
      alluptimedatas.push(...uptimedatas);
      allAnalyticsData.push(...analyticsData);
      
      // Move to next day
      currentDay.add(1, 'day');
    }
  }
  
  // Sort all data by timestamp to ensure chronological order
  allAnalyticsData.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
  alluptimedatas.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
  
  console.log(`Generated ${allAnalyticsData.length} analytics entries`);
  console.log(`Generated ${alluptimedatas.length} uptime entries`);
  
  // Write data to JSON files
  const analyticsPath = path.join(CONFIG.outputDir, 'analytics_data.json');
  const uptimePath = path.join(CONFIG.outputDir, 'uptime_data.json');
  
  fs.writeFileSync(analyticsPath, JSON.stringify(allAnalyticsData, null, 2));
  fs.writeFileSync(uptimePath, JSON.stringify(alluptimedatas, null, 2));
  
  console.log(`Analytics data written to: ${analyticsPath}`);
  console.log(`Uptime data written to: ${uptimePath}`);
  
  console.log("\nConnecting to MongoDB and importing data directly...");
  
  try {
    // Connect to database
    await DatabaseService.getInstance().connect();
    console.log("Connected to MongoDB!");
    
    // Define the collections schema
    const analyticsSchema = new mongoose.Schema({
      timestamp: Date,
      metadata: {
        deviceId: String,
        data: Number,
        timestamp: Number
      }
    }, { 
      timeseries: { 
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds'
      }
    });

    const uptimeSchema = new mongoose.Schema({
      timestamp: Date,
      metadata: {
        deviceId: String,
        data: String,
        timestamp: Number
      }
    }, {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds'
      }
    });

    // Check if models are already registered
    let Analytics, UptimeData;
    try {
      Analytics = mongoose.model('Analytics');
    } catch (e) {
      Analytics = mongoose.model('Analytics', analyticsSchema);
    }

    try {
      UptimeData = mongoose.model('UptimeData');
    } catch (e) {
      UptimeData = mongoose.model('UptimeData', uptimeSchema);
    }

    // Clear existing data
    console.log("Clearing existing data...");
    await Analytics.deleteMany({});
    await UptimeData.deleteMany({});

    // Import the data
    console.log("Importing analytics data...");
    await Analytics.insertMany(allAnalyticsData);
    
    console.log("Importing uptime data...");
    await UptimeData.insertMany(alluptimedatas);
    
    console.log("Data import complete!");
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    // Disconnect from the database
    await DatabaseService.getInstance().disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the data generation
generateIoTData().catch(console.error);
