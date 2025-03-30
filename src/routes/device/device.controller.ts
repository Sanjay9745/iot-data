import { Request, Response } from "express";
import eventEmitter from "../../lib/eventEmitter";
import Analytics from "../../models/Analytics";
import UptimeData from "../../models/UptimeData";
import { getHourlyAnalytics } from "../../services/analyticsService";
import { getDeviceStateChanges } from "../../services/uptimeService";
import { generateOverallReport } from "../../services/reportService";
import moment from "moment";
import Device from "../../models/Device";

export const deviceController = {
  createDevice: async (req: Request, res: any) => {
    try {
      const { deviceId , name, status } = req.body;
      
      if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }
      
      // Check if device already exists
      const existingDevice = await Device.findOne({ deviceId });
      if (existingDevice) {
        return res.status(400).json({ error: "Device already exists" });
      }

      const newDevice = new Device({ deviceId, status , name });
      await newDevice.save();
      
      return res.status(201).json({ 
        message: "Device created successfully",
        device: newDevice
      });
    } catch (error) {
      console.error("Error creating device:", error);
      return res.status(500).json({ error: "Failed to create device" });
    }
  },
  postDeviceData: async (req: Request, res: Response) => {
    const { deviceId, metric, value, timestamp } = req.body;

    if (!deviceId || !metric || value === undefined || !timestamp) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const data = { deviceId, metric, value, timestamp };

    try {
      // Emit event for the queue
      eventEmitter.emit("data", data);
      
      // Store data in appropriate database based on metric type
      if (metric === "status") {
        // Handle uptime data (connected/disconnected status)
        const statusValue = value === 1 ? "connected" : "disconnected";
        await UptimeData.create({
          timestamp: moment(timestamp).toDate(),
          metadata: {
            deviceId,
            data: statusValue,
            timestamp: Number(timestamp)
          }
        });
      } else if (metric === "analytics") {
        // Handle analytics data (0/1 values)
        await Analytics.create({
          timestamp: moment(timestamp).toDate(),
          metadata: {
            deviceId,
            data: value === 1 ? 1 : 0,
            timestamp: Number(timestamp)
          }
        });
      }

      res.json({ message: "Data received, and stored successfully!" });
    } catch (error) {
      console.error("Error saving device data:", error);
      res.status(500).json({ error: "Failed to process data" });
    }
  },

  // Get analytics data with optional filtering
  getAnalytics: async (req: Request, res: Response) => {
    try {
      const { deviceId, startDate, endDate } = req.query;
      
      const query: any = {};
      
      // Add device filter if provided
      if (deviceId) {
        query["metadata.deviceId"] = deviceId;
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = moment(startDate as string).toDate();
        }
        if (endDate) {
          query.timestamp.$lte = moment(endDate as string).toDate();
        }
      }
      
      const analyticsData = await Analytics.find(query)
        .sort({ timestamp: -1 })
        .limit(req.query.limit ? parseInt(req.query.limit as string) : 100);
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ error: "Failed to retrieve analytics data" });
    }
  },

  // Get uptime data with optional filtering
  getUptimeData: async (req: Request, res: Response) => {
    try {
      const { deviceId, startDate, endDate } = req.query;
      
      const query: any = {};
      
      // Add device filter if provided
      if (deviceId) {
        query["metadata.deviceId"] = deviceId;
      }
      
      // Add date range filter if provided
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = moment(startDate as string).toDate();
        }
        if (endDate) {
          query.timestamp.$lte = moment(endDate as string).toDate();
        }
      }
      
      const uptimeData = await UptimeData.find(query)
        .sort({ timestamp: -1 })
        .limit(req.query.limit ? parseInt(req.query.limit as string) : 100);
      
      res.json(uptimeData);
    } catch (error) {
      console.error("Error fetching uptime data:", error);
      res.status(500).json({ error: "Failed to retrieve uptime data" });
    }
  },

  // Get hourly analytics statistics
  getHourlyAnalytics: async (req: Request, res: Response) => {
    try {
      const { deviceId, startDate, endDate } = req.query;
      
      if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }
      
      const startDateTime = startDate ? moment(startDate as string) : undefined;
      const endDateTime = endDate ? moment(endDate as string) : undefined;
      
      const hourlyStats = await getHourlyAnalytics(
        deviceId as string,
        startDateTime,
        endDateTime
      );
      
      res.json(hourlyStats);
    } catch (error) {
      console.error("Error fetching hourly analytics:", error);
      res.status(500).json({ error: "Failed to retrieve hourly analytics data" });
    }
  },

  // Get device state changes
  getStateChanges: async (req: Request, res: Response) => {
    try {
      const { deviceId, startDate, endDate } = req.query;
      
      if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Both start and end dates are required" });
      }
      if (!moment(startDate as string).isValid() || !moment(endDate as string).isValid()) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      const startDateTime = moment(startDate as string);
      const endDateTime =  moment(endDate as string);
    
      const stateChanges = await getDeviceStateChanges(
        deviceId as string,
        startDateTime,
        endDateTime
      );
      
      res.json(stateChanges);
    } catch (error) {
      console.error("Error fetching device state changes:", error);
      res.status(500).json({ error: "Failed to retrieve device state changes" });
    }
  },

  // Get overall device report
  getDeviceReport: async (req: Request, res: Response) => {
    try {
      const { deviceId, startDate, endDate } = req.query;
      
      if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }
      
      if (!startDate && !endDate) {
        return res.status(400).json({ error: "At least one date filter is required" });
        }

        if (!moment(startDate as string).isValid() || !moment(endDate as string).isValid()) {
          return res.status(400).json({ error: "Invalid date format" });
        }
      const startDateTime = startDate ? moment(startDate as string) : undefined;
      const endDateTime = endDate ? moment(endDate as string) : undefined;
      
      const report = await generateOverallReport(
        deviceId as string,
        startDateTime,
        endDateTime
      );
      
      res.json(report);
    } catch (error) {
      console.error("Error generating device report:", error);
      res.status(500).json({ error: "Failed to generate device report" });
    }
  },
  postDeviceDataRMQ: async (req: Request, res: Response) => {
    const { deviceId, value, timestamp } = req.body;

    if (!deviceId || value === undefined || !timestamp) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const data = { deviceId, value, timestamp };

    try {
      // Emit event for the queue
      eventEmitter.emit("tcp-data", data);
      res.json({ message: "Data received and stored successfully!" });
    } catch (error) {
      console.error("Error saving device data:", error);
      res.status(500).json({ error: "Failed to process data" });
    }
  }
};

export default deviceController;
