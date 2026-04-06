/**
 * Parent API Routes
 * Provides endpoints for parent dashboard and reports
 * REQ-6.1.6: System SHALL provide parent dashboard with weekly progress
 */

import express, { Request, Response } from 'express';
import { getParentDashboard, generateDailyReport } from '../services/ParentVoiceBridge';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

const router = express.Router();

/**
 * GET /api/parent/:id/dashboard
 * Get parent dashboard with all children's progress
 * REQ-6.1.6: System SHALL provide parent dashboard with weekly progress
 */
router.get('/:id/dashboard', ValidationMiddleware.parentParam, async (req: Request, res: Response) => {
  try {
    const parentId = req.params.id;

    const dashboard = await getParentDashboard(parentId);

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error('Error fetching parent dashboard:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch parent dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/:id/child/:studentId/report
 * Get daily report for a specific child
 * REQ-6.1.1: System SHALL generate daily reports for each child
 */
router.get('/:id/child/:studentId/report', ValidationMiddleware.parentChildReport, async (req: Request, res: Response) => {
  try {
    const { id: parentId, studentId } = req.params;
    const dateParam = req.query.date as string;

    // Parse date or use today
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const report = await generateDailyReport(studentId, date);

    return res.status(200).json(report);
  } catch (error) {
    console.error('Error generating daily report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate daily report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
