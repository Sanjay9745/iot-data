import Analytics from "../models/Analytics";
import UptimeData from "../models/UptimeData";
import moment from "moment";

interface DayData {
  date: string;
  count: number;
}

interface OverallReport {
  analytics: {
    total: number;
    average: number;
    busiestDays: DayData[];
    quietestDays: DayData[];
  };
  uptime: {
    total: string;
    totalMilliseconds: number;
    percentage: number;
  };
  downtime: {
    total: string;
    totalMilliseconds: number;
    percentage: number;
  };
  reboots: number;
}

// Helper function to format milliseconds to readable time
const formatDuration = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hours`;
  } else {
    return `${hours} hours, ${minutes} minutes`;
  }
};

export const generateOverallReport = async (
  deviceId: string,
  startDate?: moment.Moment,
  endDate?: moment.Moment
): Promise<OverallReport> => {
  // Default to current date if endDate not provided
  const effectiveEndDate = endDate || moment();
  // Default to 30 days ago if startDate not provided
  const effectiveStartDate = startDate || moment().subtract(30, 'days');
  if (!effectiveStartDate.isValid() || !effectiveEndDate.isValid()) {
    throw new Error("Invalid date format. Please use YYYY-MM-DD format.");
  }
  // Calculate the number of days in the date range
  const daysDifference = effectiveEndDate.diff(effectiveStartDate, 'days') + 1;
  
  // Build base query for both collections
  const baseQuery: any = { 
    "metadata.deviceId": deviceId,
    "timestamp": {
      $gte: effectiveStartDate.toDate(),
      $lte: effectiveEndDate.toDate()
    } 
  };

  // ------------------- Analytics Data Calculations -------------------
  // Get analytics data from DB
  const analyticsData = await Analytics.find(baseQuery);
  
  // Calculate total analytics data points
  const totalAnalyticsCount = analyticsData.length;
  
  // Calculate average per day
  const averagePerDay = totalAnalyticsCount / daysDifference;
  
  // Group analytics data by day
  const analyticsByDay = new Map<string, number>();
  analyticsData.forEach(item => {
    const day = moment(item.timestamp).format('YYYY-MM-DD');
    analyticsByDay.set(day, (analyticsByDay.get(day) || 0) + 1);
  });
  
  // Convert to array for sorting
  const daysArray: DayData[] = Array.from(analyticsByDay.entries()).map(([date, count]) => ({ date, count }));
  
  // Sort for busiest (descending) and quietest (ascending) days
  const sortedDays = [...daysArray].sort((a, b) => b.count - a.count);
  const busiestDays = sortedDays.slice(0, 3);
  const quietestDays = [...daysArray].sort((a, b) => a.count - b.count).slice(0, 3);
  
  // ------------------- Uptime/Downtime Calculations -------------------
  // Get uptime data from DB sorted by timestamp
  const uptimeData = await UptimeData.find(baseQuery).sort({ timestamp: 1 });
  
  let totalUptime = 0;
  let totalDowntime = 0;
  let rebootCount = 0;
  
  // Process uptime data to calculate durations
  if (uptimeData.length > 0) {
    let prevState = uptimeData[0].metadata.data;
    let prevTimestamp = moment(uptimeData[0].timestamp);
    
    for (let i = 1; i < uptimeData.length; i++) {
      const currentData = uptimeData[i];
      const currentState = currentData.metadata.data;
      const currentTimestamp = moment(currentData.timestamp);
      
      // Only process if state changed
      if (currentState !== prevState) {
        const duration = currentTimestamp.diff(prevTimestamp);
        
        // Add to appropriate counter
        if (prevState === "connected") {
          totalUptime += duration;
        } else {
          // Check if it's a reboot (less than 2 minutes)
          if (duration < 120000) {
            rebootCount++;
          }
          totalDowntime += duration;
        }
        
        // Update previous state and timestamp
        prevState = currentState;
        prevTimestamp = currentTimestamp;
      }
    }
    
    // Handle the last state to current time
    const finalDuration = effectiveEndDate.diff(prevTimestamp);
    if (prevState === "connected") {
      totalUptime += finalDuration;
    } else {
      totalDowntime += finalDuration;
    }
  }
  
  // Calculate percentages
  const totalTime = totalUptime + totalDowntime;
  const uptimePercentage = totalTime > 0 ? (totalUptime / totalTime) * 100 : 0;
  const downtimePercentage = totalTime > 0 ? (totalDowntime / totalTime) * 100 : 0;
  
  // ------------------- Construct the final report -------------------
  return {
    analytics: {
      total: totalAnalyticsCount,
      average: parseFloat(averagePerDay.toFixed(2)),
      busiestDays,
      quietestDays
    },
    uptime: {
      total: formatDuration(totalUptime),
      totalMilliseconds: totalUptime,
      percentage: parseFloat(uptimePercentage.toFixed(1))
    },
    downtime: {
      total: formatDuration(totalDowntime),
      totalMilliseconds: totalDowntime,
      percentage: parseFloat(downtimePercentage.toFixed(1))
    },
    reboots: rebootCount
  };
};
