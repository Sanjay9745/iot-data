import UptimeData, { IUptimeData } from "../models/UptimeData";
import moment from "moment";

interface DeviceStateChange {
  timestamp: string;
  state: "connected" | "disconnected";
  duration: number; // Duration in milliseconds
}
export const getDeviceStateChanges = async (
  deviceId: string,
  startDate: moment.Moment,
  endDate: moment.Moment
): Promise<DeviceStateChange[]> => {
    // Get one record before start date to establish initial state
    const initialRecord = await UptimeData.findOne({
      "metadata.deviceId": deviceId,
      timestamp: { $lte: startDate.toDate() }
    }).sort({ timestamp: -1 });

    let startRecord: IUptimeData | null = null;
    if (initialRecord) {
      startRecord = new UptimeData({
        timestamp: startDate.toDate(),
        metadata: {
          deviceId: initialRecord.metadata.deviceId,
          data: initialRecord.metadata.data,
          timestamp: startDate.unix(),
        }
      });
    }
    
    // Get all records within the date range
    const uptimeData = await UptimeData.find({
      "metadata.deviceId": deviceId,
      timestamp: { $gt: startDate.toDate(), $lte: endDate.toDate() },
    }).sort({ timestamp: 1 });
    
    // Combine the results, adding initialRecord if it exists
    const allRecords = startRecord && initialRecord 
      ? [startRecord, ...uptimeData]
      : uptimeData;
      
    const stateChanges: DeviceStateChange[] = [];
    let previousState: "connected" | "disconnected" | null = null;
    let previousTimestamp: moment.Moment | null = null;
    
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      if (!record) continue;
      
      const currentState = record.metadata.data as "connected" | "disconnected";
      const currentTimestamp = moment(record.timestamp);
      
      // Calculate duration since the previous state
      if (previousTimestamp && previousState) {
        const durationMs = currentTimestamp.diff(previousTimestamp);
        
        // Only add a state change if the state actually changed
        if (currentState !== previousState) {
          stateChanges.push({
            timestamp: previousTimestamp.toISOString(),
            state: previousState,
            duration: durationMs
          });
        }
      }
      
      // Update for next iteration
      previousState = currentState;
      previousTimestamp = currentTimestamp;
    }
    
    // Add the final state if we have data
    if (previousState && previousTimestamp) {
      const finalDuration = endDate.diff(previousTimestamp); // Keep in milliseconds
      stateChanges.push({
        timestamp: previousTimestamp.toISOString(),
        state: previousState,
        duration: finalDuration
      });
    }

    return stateChanges;
};