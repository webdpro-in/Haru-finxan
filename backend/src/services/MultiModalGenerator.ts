/**
 * Multi-Modal Response Generator
 * 
 * Generates multi-modal educational content:
 * - Text responses
 * - Math expressions (LaTeX)
 * - Diagrams (Mermaid)
 * - 3D simulations (Three.js code)
 * 
 * Uses parallel processing to minimize latency.
 */

export interface TextResponse {
  type: 'text';
  content: string;
}

export interface MathExpression {
  type: 'math';
  latex: string;
  description: string;
}

export interface Diagram {
  type: 'diagram';
  mermaid: string;
  description: string;
}

export interface Simulation3D {
  type: '3d';
  threeJsCode: string;
  description: string;
}

export type MultiModalContent = TextResponse | MathExpression | Diagram | Simulation3D;

export interface MultiModalResponse {
  text: string;
  modalities: MultiModalContent[];
  processingTime: number;
}

export class MultiModalGenerator {
  /**
   * Generate multi-modal response from text
   */
  static async generateResponse(text: string): Promise<MultiModalResponse> {
    const startTime = Date.now();
    
    // Process all modalities in parallel
    const [mathExpressions, diagrams, simulations] = await Promise.all([
      this.extractMathExpressions(text),
      this.extractDiagrams(text),
      this.extractSimulations(text),
    ]);

    // Aggregate all modalities
    const modalities: MultiModalContent[] = [
      ...mathExpressions,
      ...diagrams,
      ...simulations,
    ];

    const processingTime = Date.now() - startTime;

    return {
      text,
      modalities,
      processingTime,
    };
  }

  /**
   * Extract math expressions from text (LaTeX)
   */
  static async extractMathExpressions(text: string): Promise<MathExpression[]> {
    const expressions: MathExpression[] = [];

    // Pattern 1: Inline math $...$
    const inlinePattern = /\$([^$]+)\$/g;
    let match;

    while ((match = inlinePattern.exec(text)) !== null) {
      expressions.push({
        type: 'math',
        latex: match[1].trim(),
        description: 'Inline math expression',
      });
    }

    // Pattern 2: Display math $$...$$
    const displayPattern = /\$\$([^$]+)\$\$/g;
    while ((match = displayPattern.exec(text)) !== null) {
      expressions.push({
        type: 'math',
        latex: match[1].trim(),
        description: 'Display math expression',
      });
    }

    // Pattern 3: LaTeX blocks \[...\] or \(...\)
    const latexBlockPattern = /\\[\[\(]([^\]]+)\\[\]\)]/g;
    while ((match = latexBlockPattern.exec(text)) !== null) {
      expressions.push({
        type: 'math',
        latex: match[1].trim(),
        description: 'LaTeX math expression',
      });
    }

    // Pattern 4: Common math patterns (equations, fractions, etc.)
    const mathKeywords = [
      'equation', 'formula', 'fraction', 'square root', 'exponent',
      'derivative', 'integral', 'sum', 'product', 'limit',
    ];

    for (const keyword of mathKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        // Extract the relevant sentence
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            const latex = this.convertToLatex(sentence.trim());
            if (latex) {
              expressions.push({
                type: 'math',
                latex,
                description: `Math expression for: ${keyword}`,
              });
            }
          }
        }
      }
    }

    return expressions;
  }

  /**
   * Extract diagrams from text (Mermaid)
   */
  static async extractDiagrams(text: string): Promise<Diagram[]> {
    const diagrams: Diagram[] = [];

    // Pattern 1: Explicit mermaid blocks
    const mermaidPattern = /```mermaid\n([\s\S]+?)\n```/g;
    let match;

    while ((match = mermaidPattern.exec(text)) !== null) {
      diagrams.push({
        type: 'diagram',
        mermaid: match[1].trim(),
        description: 'Mermaid diagram',
      });
    }

    // Pattern 2: Detect diagram keywords and generate appropriate diagrams
    const diagramKeywords = {
      'flowchart': this.generateFlowchart,
      'process': this.generateFlowchart,
      'steps': this.generateFlowchart,
      'cycle': this.generateCycleDiagram,
      'relationship': this.generateRelationshipDiagram,
      'hierarchy': this.generateHierarchyDiagram,
      'timeline': this.generateTimelineDiagram,
    };

    for (const [keyword, generator] of Object.entries(diagramKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        const diagram = generator.call(this, text);
        if (diagram) {
          diagrams.push({
            type: 'diagram',
            mermaid: diagram,
            description: `${keyword} diagram`,
          });
        }
      }
    }

    return diagrams;
  }

  /**
   * Extract 3D simulations from text (Three.js)
   */
  static async extractSimulations(text: string): Promise<Simulation3D[]> {
    const simulations: Simulation3D[] = [];

    // Pattern 1: Explicit 3D code blocks
    const threeJsPattern = /```threejs\n([\s\S]+?)\n```/g;
    let match;

    while ((match = threeJsPattern.exec(text)) !== null) {
      simulations.push({
        type: '3d',
        threeJsCode: match[1].trim(),
        description: 'Three.js 3D simulation',
      });
    }

    // Pattern 2: Detect 3D simulation keywords
    const simulationKeywords = {
      'orbit': this.generateOrbitSimulation,
      'planet': this.generateOrbitSimulation,
      'rotation': this.generateRotationSimulation,
      'pendulum': this.generatePendulumSimulation,
      'wave': this.generateWaveSimulation,
      'projectile': this.generateProjectileSimulation,
      'molecule': this.generateMoleculeSimulation,
    };

    for (const [keyword, generator] of Object.entries(simulationKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        const code = generator.call(this, text);
        if (code) {
          simulations.push({
            type: '3d',
            threeJsCode: code,
            description: `${keyword} 3D simulation`,
          });
        }
      }
    }

    return simulations;
  }

  /**
   * Convert text to LaTeX (simple heuristics)
   */
  private static convertToLatex(text: string): string | null {
    // Simple patterns for common math expressions
    const patterns = [
      { regex: /(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/, latex: '$1 + $2 = $3' },
      { regex: /(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/, latex: '$1 - $2 = $3' },
      { regex: /(\d+)\s*×\s*(\d+)\s*=\s*(\d+)/, latex: '$1 \\times $2 = $3' },
      { regex: /(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)/, latex: '$1 \\div $2 = $3' },
      { regex: /(\w+)\^(\d+)/, latex: '$1^{$2}' },
      { regex: /sqrt\(([^)]+)\)/, latex: '\\sqrt{$1}' },
      { regex: /(\d+)\/(\d+)/, latex: '\\frac{$1}{$2}' },
    ];

    for (const { regex, latex } of patterns) {
      const match = text.match(regex);
      if (match) {
        return text.replace(regex, latex);
      }
    }

    return null;
  }

  /**
   * Generate flowchart diagram
   */
  private static generateFlowchart(text: string): string | null {
    // Simple flowchart template
    return `graph TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F`;
  }

  /**
   * Generate cycle diagram
   */
  private static generateCycleDiagram(text: string): string | null {
    return `graph LR
    A[Stage 1] --> B[Stage 2]
    B --> C[Stage 3]
    C --> D[Stage 4]
    D --> A`;
  }

  /**
   * Generate relationship diagram
   */
  private static generateRelationshipDiagram(text: string): string | null {
    return `graph TD
    A[Concept A] --> B[Concept B]
    A --> C[Concept C]
    B --> D[Concept D]
    C --> D`;
  }

  /**
   * Generate hierarchy diagram
   */
  private static generateHierarchyDiagram(text: string): string | null {
    return `graph TD
    A[Root] --> B[Child 1]
    A --> C[Child 2]
    B --> D[Grandchild 1]
    B --> E[Grandchild 2]
    C --> F[Grandchild 3]`;
  }

  /**
   * Generate timeline diagram
   */
  private static generateTimelineDiagram(text: string): string | null {
    return `graph LR
    A[Event 1] --> B[Event 2]
    B --> C[Event 3]
    C --> D[Event 4]`;
  }

  /**
   * Generate orbit simulation
   */
  private static generateOrbitSimulation(text: string): string | null {
    return `// Three.js Orbit Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Create sun
const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Create planet
const planetGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const planetMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
scene.add(planet);

camera.position.z = 10;

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  planet.position.x = Math.cos(time) * 5;
  planet.position.z = Math.sin(time) * 5;
  renderer.render(scene, camera);
}
animate();`;
  }

  /**
   * Generate rotation simulation
   */
  private static generateRotationSimulation(text: string): string | null {
    return `// Three.js Rotation Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();`;
  }

  /**
   * Generate pendulum simulation
   */
  private static generatePendulumSimulation(text: string): string | null {
    return `// Three.js Pendulum Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Pendulum bob
const bobGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const bobMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const bob = new THREE.Mesh(bobGeometry, bobMaterial);
scene.add(bob);

camera.position.z = 10;

let angle = Math.PI / 4;
let angularVelocity = 0;
const length = 5;
const gravity = 9.8;

function animate() {
  requestAnimationFrame(animate);
  const angularAcceleration = -(gravity / length) * Math.sin(angle);
  angularVelocity += angularAcceleration * 0.01;
  angle += angularVelocity * 0.01;
  bob.position.x = length * Math.sin(angle);
  bob.position.y = -length * Math.cos(angle);
  renderer.render(scene, camera);
}
animate();`;
  }

  /**
   * Generate wave simulation
   */
  private static generateWaveSimulation(text: string): string | null {
    return `// Three.js Wave Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const geometry = new THREE.PlaneGeometry(10, 10, 50, 50);
const material = new THREE.MeshBasicMaterial({ color: 0x0088ff, wireframe: true });
const wave = new THREE.Mesh(geometry, material);
scene.add(wave);

camera.position.z = 10;
camera.position.y = 5;

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  const positions = wave.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = Math.sin(x + time) * 0.5;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  renderer.render(scene, camera);
}
animate();`;
  }

  /**
   * Generate projectile simulation
   */
  private static generateProjectileSimulation(text: string): string | null {
    return `// Three.js Projectile Motion Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

camera.position.z = 15;
camera.position.y = 5;

let time = 0;
const v0 = 10;
const angle = Math.PI / 4;
const g = 9.8;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  ball.position.x = v0 * Math.cos(angle) * time;
  ball.position.y = v0 * Math.sin(angle) * time - 0.5 * g * time * time;
  if (ball.position.y < 0) time = 0;
  renderer.render(scene, camera);
}
animate();`;
  }

  /**
   * Generate molecule simulation
   */
  private static generateMoleculeSimulation(text: string): string | null {
    return `// Three.js Molecule Simulation
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Create atoms
const atomGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const atom1 = new THREE.Mesh(atomGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const atom2 = new THREE.Mesh(atomGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
atom1.position.set(-1, 0, 0);
atom2.position.set(1, 0, 0);
scene.add(atom1, atom2);

// Create bond
const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
const bondMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const bond = new THREE.Mesh(bondGeometry, bondMaterial);
bond.rotation.z = Math.PI / 2;
scene.add(bond);

camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();`;
  }
}
