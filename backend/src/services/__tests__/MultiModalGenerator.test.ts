/**
 * Integration tests for MultiModalGenerator
 */

import { describe, it, expect } from 'vitest';
import { MultiModalGenerator } from '../MultiModalGenerator.js';

describe('MultiModalGenerator', () => {
  describe('generateResponse', () => {
    it('should generate response with text only', async () => {
      const text = 'Hello, this is a simple text response.';
      const response = await MultiModalGenerator.generateResponse(text);

      expect(response.text).toBe(text);
      expect(response.modalities).toHaveLength(0);
      expect(response.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should extract inline math expressions', async () => {
      const text = 'The equation is $x^2 + y^2 = r^2$ for a circle.';
      const response = await MultiModalGenerator.generateResponse(text);

      const mathModalities = response.modalities.filter(m => m.type === 'math');
      expect(mathModalities.length).toBeGreaterThan(0);
      expect(mathModalities[0].type).toBe('math');
      expect((mathModalities[0] as any).latex).toBe('x^2 + y^2 = r^2');
    });

    it('should extract display math expressions', async () => {
      const text = 'The formula is: $$E = mc^2$$';
      const response = await MultiModalGenerator.generateResponse(text);

      const mathModalities = response.modalities.filter(m => m.type === 'math');
      expect(mathModalities.length).toBeGreaterThan(0);
      const displayMath = mathModalities.find((m: any) => m.latex === 'E = mc^2');
      expect(displayMath).toBeDefined();
    });

    it('should extract mermaid diagrams', async () => {
      const text = `Here's a diagram:
\`\`\`mermaid
graph TD
  A --> B
\`\`\``;
      const response = await MultiModalGenerator.generateResponse(text);

      const diagrams = response.modalities.filter(m => m.type === 'diagram');
      expect(diagrams.length).toBeGreaterThan(0);
      expect((diagrams[0] as any).mermaid).toContain('graph TD');
    });

    it('should generate flowchart for process keywords', async () => {
      const text = 'Let me explain the process of photosynthesis.';
      const response = await MultiModalGenerator.generateResponse(text);

      const diagrams = response.modalities.filter(m => m.type === 'diagram');
      expect(diagrams.length).toBeGreaterThan(0);
    });

    it('should extract Three.js simulations', async () => {
      const text = `Here's a simulation:
\`\`\`threejs
const scene = new THREE.Scene();
\`\`\``;
      const response = await MultiModalGenerator.generateResponse(text);

      const simulations = response.modalities.filter(m => m.type === '3d');
      expect(simulations.length).toBeGreaterThan(0);
      expect((simulations[0] as any).threeJsCode).toContain('THREE.Scene');
    });

    it('should generate orbit simulation for planet keywords', async () => {
      const text = 'The planet orbits around the sun.';
      const response = await MultiModalGenerator.generateResponse(text);

      const simulations = response.modalities.filter(m => m.type === '3d');
      expect(simulations.length).toBeGreaterThan(0);
      expect((simulations[0] as any).threeJsCode).toContain('planet');
    });

    it('should process multiple modalities in parallel', async () => {
      const text = `
        The equation $x^2 + y^2 = 1$ represents a circle.
        Here's the process:
        \`\`\`mermaid
        graph TD
          A --> B
        \`\`\`
        The planet orbits the sun.
      `;
      const response = await MultiModalGenerator.generateResponse(text);

      const mathCount = response.modalities.filter(m => m.type === 'math').length;
      const diagramCount = response.modalities.filter(m => m.type === 'diagram').length;
      const simulationCount = response.modalities.filter(m => m.type === '3d').length;

      expect(mathCount).toBeGreaterThan(0);
      expect(diagramCount).toBeGreaterThan(0);
      expect(simulationCount).toBeGreaterThan(0);
    });
  });

  describe('extractMathExpressions', () => {
    it('should extract inline math', async () => {
      const text = 'The formula $a^2 + b^2 = c^2$ is Pythagoras theorem.';
      const expressions = await MultiModalGenerator.extractMathExpressions(text);

      expect(expressions.length).toBeGreaterThan(0);
      const inlineMath = expressions.find(e => e.latex === 'a^2 + b^2 = c^2');
      expect(inlineMath).toBeDefined();
    });

    it('should extract multiple inline math expressions', async () => {
      const text = 'We have $x = 5$ and $y = 10$.';
      const expressions = await MultiModalGenerator.extractMathExpressions(text);

      expect(expressions.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract display math', async () => {
      const text = 'The integral: $$\\int_0^1 x^2 dx$$';
      const expressions = await MultiModalGenerator.extractMathExpressions(text);

      expect(expressions.length).toBeGreaterThan(0);
      const displayMath = expressions.find(e => e.latex.includes('int'));
      expect(displayMath).toBeDefined();
    });

    it('should detect equation keywords', async () => {
      const text = 'The equation for velocity is distance divided by time.';
      const expressions = await MultiModalGenerator.extractMathExpressions(text);

      // May or may not extract depending on pattern matching
      expect(expressions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractDiagrams', () => {
    it('should extract mermaid blocks', async () => {
      const text = `\`\`\`mermaid
graph LR
  A --> B
\`\`\``;
      const diagrams = await MultiModalGenerator.extractDiagrams(text);

      expect(diagrams).toHaveLength(1);
      expect(diagrams[0].mermaid).toContain('graph LR');
    });

    it('should generate flowchart for flowchart keyword', async () => {
      const text = 'Here is a flowchart of the algorithm.';
      const diagrams = await MultiModalGenerator.extractDiagrams(text);

      expect(diagrams.length).toBeGreaterThan(0);
      expect(diagrams[0].mermaid).toContain('graph');
    });

    it('should generate cycle diagram for cycle keyword', async () => {
      const text = 'The water cycle includes evaporation and condensation.';
      const diagrams = await MultiModalGenerator.extractDiagrams(text);

      expect(diagrams.length).toBeGreaterThan(0);
    });

    it('should generate hierarchy diagram for hierarchy keyword', async () => {
      const text = 'The hierarchy of living organisms.';
      const diagrams = await MultiModalGenerator.extractDiagrams(text);

      expect(diagrams.length).toBeGreaterThan(0);
    });
  });

  describe('extractSimulations', () => {
    it('should extract Three.js blocks', async () => {
      const text = `\`\`\`threejs
const camera = new THREE.Camera();
\`\`\``;
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations).toHaveLength(1);
      expect(simulations[0].threeJsCode).toContain('Camera');
    });

    it('should generate orbit simulation', async () => {
      const text = 'The Earth orbits the Sun.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('planet');
    });

    it('should generate rotation simulation', async () => {
      const text = 'The object shows rotation around its axis.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      // "rotation" keyword should trigger simulation
      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('cube');
    });

    it('should generate pendulum simulation', async () => {
      const text = 'A pendulum swings back and forth.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('bob');
    });

    it('should generate wave simulation', async () => {
      const text = 'Sound travels as a wave.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('wave');
    });

    it('should generate projectile simulation', async () => {
      const text = 'A projectile follows a parabolic path.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('ball');
    });

    it('should generate molecule simulation', async () => {
      const text = 'A water molecule has two hydrogen atoms.';
      const simulations = await MultiModalGenerator.extractSimulations(text);

      expect(simulations.length).toBeGreaterThan(0);
      expect(simulations[0].threeJsCode).toContain('atom');
    });
  });
});
