/**
 * WhatsApp Routes
 * Handles Twilio WhatsApp webhook and subscription endpoints
 * REQ-5.2.1: System SHALL integrate with Twilio WhatsApp API
 * REQ-5.2.4: System SHALL handle incoming parent questions
 * REQ-5.2.5: System SHALL support STOP command for unsubscribe
 * REQ-5.2.6: System SHALL verify parent phone numbers
 */

import express from 'express';
import { getWhatsAppBridge } from '../services/WhatsAppBridge.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/whatsapp/webhook
 * Twilio webhook endpoint for incoming WhatsApp messages
 * REQ-5.2.4: System SHALL handle incoming parent questions
 * REQ-5.2.5: System SHALL support STOP command for unsubscribe
 */
router.post('/webhook', async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;

    if (!From || !Body) {
      return res.status(400).json({
        error: 'Missing required fields: From and Body'
      });
    }

    const bridge = getWhatsAppBridge();

    // Handle incoming message
    await bridge.handleIncomingMessage({
      from: From,
      body: Body,
      messageId: MessageSid || 'unknown'
    });

    // Respond with TwiML (Twilio expects this format)
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({
      error: 'Failed to process WhatsApp message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/whatsapp/subscribe
 * Subscribe a parent to WhatsApp daily reports
 * REQ-5.2.6: System SHALL verify parent phone numbers
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { parentId, phoneNumber } = req.body;

    if (!parentId || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields: parentId and phoneNumber'
      });
    }

    // Verify parent exists
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .eq('parent_id', parentId)
      .single();

    if (parentError || !parent) {
      return res.status(404).json({
        error: 'Parent not found'
      });
    }

    // Verify phone number with Twilio
    const bridge = getWhatsAppBridge();
    const isValid = await bridge.verifyPhoneNumber(phoneNumber);

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: 'Phone number could not be verified'
      });
    }

    // Update parent record
    const { error: updateError } = await supabase
      .from('parents')
      .update({
        phone: phoneNumber,
        whatsapp_enabled: true
      })
      .eq('parent_id', parentId);

    if (updateError) {
      throw new Error(`Failed to update parent: ${updateError.message}`);
    }

    // Send welcome message
    try {
      await bridge.sendMessage(
        phoneNumber,
        '📚 Welcome to FinxanAI Daily Reports!\n\n' +
        'You will receive daily updates about your child\'s learning progress.\n\n' +
        'Reply with STOP to unsubscribe at any time.'
      );
    } catch (messageError) {
      console.error('Failed to send welcome message:', messageError);
      // Don't fail the subscription if message fails
    }

    res.json({
      subscribed: true,
      verificationSent: true,
      phoneNumber
    });
  } catch (error) {
    console.error('WhatsApp subscription error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to WhatsApp reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/whatsapp/unsubscribe
 * Unsubscribe a parent from WhatsApp daily reports
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({
        error: 'Missing required field: parentId'
      });
    }

    // Update parent record
    const { data, error: updateError } = await supabase
      .from('parents')
      .update({ whatsapp_enabled: false })
      .eq('parent_id', parentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update parent: ${updateError.message}`);
    }

    if (!data) {
      return res.status(404).json({
        error: 'Parent not found'
      });
    }

    // Send confirmation message if phone number exists
    if (data.phone) {
      try {
        const bridge = getWhatsAppBridge();
        await bridge.sendMessage(
          data.phone,
          'You have been unsubscribed from daily reports. Reply with START to re-subscribe.'
        );
      } catch (messageError) {
        console.error('Failed to send unsubscribe confirmation:', messageError);
        // Don't fail the unsubscription if message fails
      }
    }

    res.json({
      unsubscribed: true,
      parentId
    });
  } catch (error) {
    console.error('WhatsApp unsubscription error:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe from WhatsApp reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/whatsapp/status/:parentId
 * Get WhatsApp subscription status for a parent
 */
router.get('/status/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;

    const { data: parent, error } = await supabase
      .from('parents')
      .select('whatsapp_enabled, phone')
      .eq('parent_id', parentId)
      .single();

    if (error || !parent) {
      return res.status(404).json({
        error: 'Parent not found'
      });
    }

    res.json({
      parentId,
      whatsappEnabled: parent.whatsapp_enabled || false,
      phoneNumber: parent.phone || null
    });
  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({
      error: 'Failed to get WhatsApp status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
