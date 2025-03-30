import Analytics from "../models/Analytics";
import moment from "moment";

interface HourlyAnalyticsResult {
  dataByHour: number[];
  net: number;
  avg: number;
  busiestHour: number;
}

export const getHourlyAnalytics = async (
  deviceId: string,
  startDate?: moment.Moment,
  endDate?: moment.Moment
): Promise<HourlyAnalyticsResult> => {
  // Build query based on parameters
  const query: any = { "metadata.deviceId": deviceId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate.toDate();
    if (endDate) query.timestamp.$lte = endDate.toDate();
  }

  // Get all analytics data for the specified device and time range
  const analyticsData = await Analytics.find(query);

  // Initialize hourly data counters
  const dataByHour: number[] = Array(24).fill(0);
  
  // Process each data point to count by hour
  analyticsData.forEach((item) => {
    const hour = moment(item.timestamp).hour();
    dataByHour[hour]++;
  });
  
  // Calculate total data count
  const net = analyticsData.length;
  
  // Calculate average per hour (total / 24 hours)
  const avg = net / 24;
  
  // Find the busiest hour (hour with maximum data)
  let busiestHour = 0;
  let maxCount = dataByHour[0];
  
  for (let i = 1; i < 24; i++) {
    if (dataByHour[i] > maxCount) {
      maxCount = dataByHour[i];
      busiestHour = i;
    }
  }
  
  return {
    dataByHour,
    net,
    avg,
    busiestHour
  };
};