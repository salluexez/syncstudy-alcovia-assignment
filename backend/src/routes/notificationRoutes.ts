import { Router } from 'express';
import {
  getConfirmCheck,
  getMockSinkLogs,
  postClearMockLogs,
  postConfirm,
  postMockSink
} from '../controllers/notificationController.js';

export const notificationRoutes = Router();

// Mock Notification Sink
notificationRoutes.post('/notifications/mock-sink', postMockSink);

// Fetch in-memory logs for verification
notificationRoutes.get('/notifications/logs', getMockSinkLogs);

// Check if an event was processed
notificationRoutes.get('/notifications/confirm/check', getConfirmCheck);

// Confirm notification dispatch
notificationRoutes.post('/notifications/confirm', postConfirm);

// Clear logs utility
notificationRoutes.post('/notifications/clear-logs', postClearMockLogs);
