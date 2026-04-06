/**
 * Chat Route - AI conversation endpoint
 * 
 * This route uses the Provider Abstraction Layer to remain vendor-agnostic.
 * The actual AI provider (AWS Bedrock, OpenAI, etc.) is determined by the
 * AI_PROVIDER environment variable and instantiated through ProviderRegistry.
 * 
 * Enhanced with parallel image generation: When the AI response contains visual
 * content, images are generated in parallel and returned with the response.
 */

import express from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { ImageDetector } from '../utils/imageDetector.js';
import { knowledgeGraph } from '../services/KnowledgeGraph.js';
import { ConfusionDetector } from '../services/ConfusionDetector.js';
import { PrerequisiteDetector } from '../services/PrerequisiteDetector.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

export const chatRouter = express.Router();

chatRouter.post('/', ValidationMiddleware.chatMessage, async (req, res) => {
  try {
    const { message, context, studentId = 'demo_student' } = req.body;

    // Get student profile for personalized teaching
    const profile = knowledgeGraph.getProfile(studentId);
    const personalizedContext = knowledgeGraph.getPersonalizedContext(studentId);

    // Detect confusion in student's message
    const confusionSignals = ConfusionDetector.detectConfusion(message, context?.split('\n') || []);
    const confusionScore = ConfusionDetector.calculateConfusionScore(confusionSignals);
    
    if (confusionScore > 60) {
      console.log(`😕 High confusion detected (${confusionScore}%) - adjusting teaching approach`);
      knowledgeGraph.recordConfusion(studentId, message);
    }

    // Check prerequisites for the topic
    const topic = PrerequisiteDetector.extractTopic(message);
    const studentMasteries = new Map(
      Array.from(profile.conceptMasteries.entries()).map(([id, m]) => [id, m.masteryLevel])
    );
    const prerequisiteCheck = PrerequisiteDetector.checkPrerequisites(topic, studentMasteries);

    // Build enhanced system prompt with student context
    const systemPrompt = `You are Haru, a professional AI teacher. Your role is to:
- Explain concepts clearly and step-by-step
- Use simple language first, then provide deeper explanations
- ALWAYS reference visual aids (say "look at the image" or "see the diagram" in your response)
- Emphasize important points using phrases like "important:", "key point:", "remember:"
- Warn about common mistakes using phrases like "careful:", "avoid:", "common error:"
- Be friendly, patient, and encouraging
- Structure your responses with clear paragraphs and bullet points when appropriate

CRITICAL: Always mention "look at the image" or "see the diagram" at least once in your response to trigger image generation.

${personalizedContext}

${confusionSignals.length > 0 ? ConfusionDetector.generateTeachingAdjustment(confusionSignals) : ''}

${!prerequisiteCheck.readyToLearn ? PrerequisiteDetector.generatePrerequisitePrompt(prerequisiteCheck) : ''}

Format your response as teaching content that will be displayed on the left side of the screen.

${context ? `\nPrevious conversation:\n${context}` : ''}`;

    // Get AI provider from registry (vendor-agnostic)
    const aiProvider = await ProviderRegistry.getAIProvider();

    // Call provider through contract interface
    const response = await aiProvider.chat(message, systemPrompt);

    console.log('🔍 Analyzing response for visual content...');
    console.log(`📝 Response preview: ${response.text.substring(0, 200)}...`);

    // FORCE IMAGE GENERATION FOR DEBUGGING
    const needsImages = true; // ImageDetector.needsImages(response.text);
    console.log(`🎨 Visual content detected: ${needsImages} (FORCED FOR DEBUG)`);
    
    let generatedImages: string[] = [];

    if (needsImages) {
      console.log('🎨 Visual content detected - generating images in parallel');
      
      // FORCE 3 TEST IMAGES FOR DEBUGGING
      const imagePrompts = [
        { prompt: `${message} - visual representation`, priority: 10 },
        { prompt: `diagram showing ${message}`, priority: 9 },
        { prompt: `illustration of ${message}`, priority: 8 }
      ];
      console.log(`📸 FORCED ${imagePrompts.length} image prompts for debugging:`, imagePrompts);
      
      if (imagePrompts.length > 0) {
        console.log(`📸 Generating ${imagePrompts.length} images:`, imagePrompts.map(p => p.prompt));
        
        // Get image provider
        const imageProvider = await ProviderRegistry.getImageProvider();
        console.log('✅ Image provider loaded');
        
        // Generate all images in parallel (non-blocking)
        const imagePromises = imagePrompts.map(({ prompt }) => 
          imageProvider.generate(prompt).catch(error => {
            console.error(`Failed to generate image for "${prompt}":`, error);
            return null; // Return null on error, filter out later
          })
        );

        // Wait for all images to complete
        const results = await Promise.all(imagePromises);
        generatedImages = results.filter((url): url is string => url !== null);
        
        console.log(`✅ Generated ${generatedImages.length} images successfully:`);
        generatedImages.forEach((url, i) => console.log(`   ${i + 1}. ${url.substring(0, 80)}...`));
      } else {
        console.log('⚠️ No image prompts extracted despite visual content detection');
      }
    } else {
      console.log('ℹ️ No visual content detected - skipping image generation');
    }

    console.log(`📤 Sending response with ${generatedImages.length} images`);
    
    // Record this interaction in knowledge graph
    knowledgeGraph.recordSession(
      studentId,
      5, // Approximate duration (will be updated by frontend)
      [topic],
      1,
      confusionScore > 60,
      confusionSignals.length,
      {} // Mastery gains will be tracked separately
    );

    res.json({
      response: response.text,
      images: generatedImages,
      metadata: {
        confusionDetected: confusionScore > 60,
        prerequisitesNeeded: !prerequisiteCheck.readyToLearn,
        missingPrerequisites: prerequisiteCheck.missingPrerequisites,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});
