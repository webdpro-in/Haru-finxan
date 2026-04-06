// Neo4j Concept Connections - Cross-Subject Relationships and Real-World Applications
// This migration adds 50+ connections between concepts across subjects
// Supports REQ-2.8.1 through REQ-2.8.5

// ============================================
// CROSS-SUBJECT CONNECTIONS
// ============================================

// Math → Physics Connections
MATCH (math:Concept {conceptId: 'math_ratios'}), (physics:Concept {conceptId: 'phy_motion'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Ratios are used to calculate speed (distance/time ratio)',
  strength: 0.9,
  gradeLevel: 7,
  surprisingFactor: 0.3
}]->(physics);

MATCH (math:Concept {conceptId: 'math_algebra_basics'}), (physics:Concept {conceptId: 'phy_force'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Algebraic equations model force relationships (F=ma)',
  strength: 0.95,
  gradeLevel: 9,
  surprisingFactor: 0.4
}]->(physics);

MATCH (math:Concept {conceptId: 'math_trigonometry'}), (physics:Concept {conceptId: 'phy_force'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Trigonometry resolves forces into components on inclined planes',
  strength: 0.85,
  gradeLevel: 10,
  surprisingFactor: 0.5
}]->(physics);

MATCH (math:Concept {conceptId: 'math_quadratic_equations'}), (physics:Concept {conceptId: 'phy_motion'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Quadratic equations describe projectile motion paths',
  strength: 0.9,
  gradeLevel: 10,
  surprisingFactor: 0.6
}]->(physics);

MATCH (math:Concept {conceptId: 'math_calculus_basics'}), (physics:Concept {conceptId: 'phy_motion'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Calculus derivatives give velocity from position, acceleration from velocity',
  strength: 1.0,
  gradeLevel: 11,
  surprisingFactor: 0.7
}]->(physics);

// Math → Chemistry Connections
MATCH (math:Concept {conceptId: 'math_ratios'}), (chem:Concept {conceptId: 'chem_reactions'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Stoichiometric ratios determine reactant proportions in chemical equations',
  strength: 0.9,
  gradeLevel: 10,
  surprisingFactor: 0.5
}]->(chem);

MATCH (math:Concept {conceptId: 'math_percentages'}), (chem:Concept {conceptId: 'chem_reactions'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Percentage yield and percentage composition calculations',
  strength: 0.85,
  gradeLevel: 10,
  surprisingFactor: 0.3
}]->(chem);

MATCH (math:Concept {conceptId: 'math_algebra_basics'}), (chem:Concept {conceptId: 'chem_periodic_table'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'Algebraic patterns in periodic table (atomic number sequences, electron configurations)',
  strength: 0.7,
  gradeLevel: 10,
  surprisingFactor: 0.8
}]->(chem);

// Math → Biology Connections
MATCH (math:Concept {conceptId: 'math_percentages'}), (bio:Concept {conceptId: 'bio_genetics'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Genetic probability calculations (Punnett squares show percentage inheritance)',
  strength: 0.9,
  gradeLevel: 10,
  surprisingFactor: 0.4
}]->(bio);

MATCH (math:Concept {conceptId: 'math_ratios'}), (bio:Concept {conceptId: 'bio_genetics'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Mendelian ratios (3:1, 9:3:3:1) predict offspring traits',
  strength: 0.95,
  gradeLevel: 10,
  surprisingFactor: 0.5
}]->(bio);

MATCH (math:Concept {conceptId: 'math_fractions'}), (bio:Concept {conceptId: 'bio_cells'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Cell division fractions: mitosis creates 1/2 genetic material per daughter cell',
  strength: 0.6,
  gradeLevel: 8,
  surprisingFactor: 0.4
}]->(bio);

// Physics → Chemistry Connections
MATCH (physics:Concept {conceptId: 'phy_energy'}), (chem:Concept {conceptId: 'chem_reactions'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'Chemical reactions involve energy changes (exothermic/endothermic)',
  strength: 0.95,
  gradeLevel: 10,
  surprisingFactor: 0.3
}]->(chem);

MATCH (physics:Concept {conceptId: 'phy_electricity'}), (chem:Concept {conceptId: 'chem_atoms'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'Electricity is the flow of electrons, which are parts of atoms',
  strength: 0.9,
  gradeLevel: 10,
  surprisingFactor: 0.6
}]->(chem);

MATCH (physics:Concept {conceptId: 'phy_force'}), (chem:Concept {conceptId: 'chem_atoms'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'Electromagnetic forces hold atoms together and cause chemical bonding',
  strength: 0.85,
  gradeLevel: 10,
  surprisingFactor: 0.7
}]->(chem);

// Physics → Biology Connections
MATCH (physics:Concept {conceptId: 'phy_energy'}), (bio:Concept {conceptId: 'bio_photosynthesis'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Photosynthesis converts light energy into chemical energy',
  strength: 1.0,
  gradeLevel: 7,
  surprisingFactor: 0.5
}]->(bio);

MATCH (physics:Concept {conceptId: 'phy_electricity'}), (bio:Concept {conceptId: 'bio_cells'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'Nerve cells transmit electrical signals for communication',
  strength: 0.8,
  gradeLevel: 10,
  surprisingFactor: 0.8
}]->(bio);

// Chemistry → Biology Connections
MATCH (chem:Concept {conceptId: 'chem_atoms'}), (bio:Concept {conceptId: 'bio_cells'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'related',
  description: 'All living cells are made of atoms (carbon, hydrogen, oxygen, nitrogen)',
  strength: 0.9,
  gradeLevel: 9,
  surprisingFactor: 0.4
}]->(bio);

MATCH (chem:Concept {conceptId: 'chem_reactions'}), (bio:Concept {conceptId: 'bio_photosynthesis'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'application',
  description: 'Photosynthesis is a chemical reaction: 6CO2 + 6H2O → C6H12O6 + 6O2',
  strength: 1.0,
  gradeLevel: 10,
  surprisingFactor: 0.6
}]->(bio);

// ============================================
// REAL-WORLD APPLICATION CONNECTIONS
// ============================================

// Math Applications
MATCH (math:Concept {conceptId: 'math_percentages'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Shopping discounts, sales tax, interest rates, test scores',
  strength: 1.0,
  gradeLevel: 6,
  surprisingFactor: 0.1
}]->(math);

MATCH (math:Concept {conceptId: 'math_ratios'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Cooking recipes, map scales, currency exchange, mixing paint colors',
  strength: 0.95,
  gradeLevel: 6,
  surprisingFactor: 0.2
}]->(math);

MATCH (math:Concept {conceptId: 'math_algebra_basics'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Calculating phone plan costs, budgeting monthly expenses, predicting savings',
  strength: 0.9,
  gradeLevel: 7,
  surprisingFactor: 0.3
}]->(math);

MATCH (math:Concept {conceptId: 'math_linear_equations'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Uber pricing (base fare + per-km rate), gym membership plans',
  strength: 0.95,
  gradeLevel: 8,
  surprisingFactor: 0.4
}]->(math);

MATCH (math:Concept {conceptId: 'math_quadratic_equations'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Designing satellite dishes, calculating optimal pricing for maximum profit',
  strength: 0.8,
  gradeLevel: 10,
  surprisingFactor: 0.7
}]->(math);

MATCH (math:Concept {conceptId: 'math_trigonometry'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'GPS navigation, architecture (roof angles), video game graphics',
  strength: 0.9,
  gradeLevel: 10,
  surprisingFactor: 0.6
}]->(math);

MATCH (math:Concept {conceptId: 'math_calculus_basics'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Self-driving cars (calculating optimal braking), stock market predictions',
  strength: 0.85,
  gradeLevel: 11,
  surprisingFactor: 0.8
}]->(math);

// Physics Applications
MATCH (physics:Concept {conceptId: 'phy_motion'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Sports analytics (cricket ball speed), traffic speed cameras',
  strength: 0.9,
  gradeLevel: 7,
  surprisingFactor: 0.3
}]->(physics);

MATCH (physics:Concept {conceptId: 'phy_force'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Car safety (airbags reduce force), sports equipment design',
  strength: 0.85,
  gradeLevel: 9,
  surprisingFactor: 0.4
}]->(physics);

MATCH (physics:Concept {conceptId: 'phy_gravity'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Satellite orbits, roller coaster design, space missions',
  strength: 0.9,
  gradeLevel: 9,
  surprisingFactor: 0.6
}]->(physics);

MATCH (physics:Concept {conceptId: 'phy_energy'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Solar panels, electric vehicles, hydroelectric dams',
  strength: 1.0,
  gradeLevel: 9,
  surprisingFactor: 0.3
}]->(physics);

MATCH (physics:Concept {conceptId: 'phy_electricity'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Smartphone charging, home wiring, electric grid management',
  strength: 1.0,
  gradeLevel: 10,
  surprisingFactor: 0.2
}]->(physics);

// Chemistry Applications
MATCH (chem:Concept {conceptId: 'chem_atoms'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Medical imaging (radioactive isotopes), carbon dating ancient artifacts',
  strength: 0.8,
  gradeLevel: 9,
  surprisingFactor: 0.7
}]->(chem);

MATCH (chem:Concept {conceptId: 'chem_periodic_table'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Smartphone screens (rare earth elements), battery technology (lithium)',
  strength: 0.85,
  gradeLevel: 10,
  surprisingFactor: 0.8
}]->(chem);

MATCH (chem:Concept {conceptId: 'chem_reactions'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Baking (chemical leavening), fireworks, rust prevention',
  strength: 0.95,
  gradeLevel: 10,
  surprisingFactor: 0.4
}]->(chem);

// Biology Applications
MATCH (bio:Concept {conceptId: 'bio_cells'})
CREATE (bio)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Cancer treatment (targeting cell division), stem cell therapy',
  strength: 0.9,
  gradeLevel: 8,
  surprisingFactor: 0.6
}]->(bio);

MATCH (bio:Concept {conceptId: 'bio_photosynthesis'})
CREATE (bio)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'Vertical farming, biofuel production, oxygen generation in space stations',
  strength: 0.85,
  gradeLevel: 7,
  surprisingFactor: 0.7
}]->(bio);

MATCH (bio:Concept {conceptId: 'bio_genetics'})
CREATE (bio)-[:CONNECTS_TO {
  connectionType: 'realWorld',
  description: 'DNA testing (ancestry, paternity), genetic disease screening, GMO crops',
  strength: 1.0,
  gradeLevel: 10,
  surprisingFactor: 0.5
}]->(bio);

// ============================================
// SURPRISING CONNECTIONS
// ============================================

// Music and Math
MATCH (math:Concept {conceptId: 'math_fractions'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Musical notes are fractions: half note = 1/2, quarter note = 1/4',
  strength: 0.7,
  gradeLevel: 4,
  surprisingFactor: 0.9
}]->(math);

MATCH (math:Concept {conceptId: 'math_ratios'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Musical harmony uses ratios: octave = 2:1, perfect fifth = 3:2',
  strength: 0.75,
  gradeLevel: 6,
  surprisingFactor: 0.95
}]->(math);

// Art and Math
MATCH (math:Concept {conceptId: 'math_ratios'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Golden ratio (1.618) appears in famous paintings and architecture',
  strength: 0.7,
  gradeLevel: 6,
  surprisingFactor: 0.9
}]->(math);

MATCH (math:Concept {conceptId: 'math_trigonometry'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Computer graphics and animation use trigonometry for rotation and curves',
  strength: 0.85,
  gradeLevel: 10,
  surprisingFactor: 0.85
}]->(math);

// Sports and Physics
MATCH (physics:Concept {conceptId: 'phy_motion'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Cricket spin bowling uses Magnus effect (physics of rotating objects)',
  strength: 0.8,
  gradeLevel: 7,
  surprisingFactor: 0.9
}]->(physics);

MATCH (physics:Concept {conceptId: 'phy_force'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Swimming faster requires reducing drag force, not just pushing harder',
  strength: 0.75,
  gradeLevel: 9,
  surprisingFactor: 0.85
}]->(physics);

// Cooking and Chemistry
MATCH (chem:Concept {conceptId: 'chem_reactions'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Caramelization is a chemical reaction (sugar molecules breaking down)',
  strength: 0.8,
  gradeLevel: 10,
  surprisingFactor: 0.9
}]->(chem);

MATCH (chem:Concept {conceptId: 'chem_atoms'})
CREATE (chem)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Popcorn popping is water molecules turning to steam inside kernels',
  strength: 0.7,
  gradeLevel: 9,
  surprisingFactor: 0.85
}]->(chem);

// Nature and Math
MATCH (math:Concept {conceptId: 'math_ratios'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Fibonacci sequence appears in sunflower spirals and pinecone patterns',
  strength: 0.65,
  gradeLevel: 6,
  surprisingFactor: 1.0
}]->(math);

// Social Media and Math
MATCH (math:Concept {conceptId: 'math_percentages'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Instagram engagement rates are percentages (likes/followers × 100)',
  strength: 0.9,
  gradeLevel: 6,
  surprisingFactor: 0.7
}]->(math);

MATCH (math:Concept {conceptId: 'math_algebra_basics'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'YouTube algorithm uses algebraic formulas to rank videos',
  strength: 0.75,
  gradeLevel: 7,
  surprisingFactor: 0.8
}]->(math);

// Gaming and Math
MATCH (math:Concept {conceptId: 'math_percentages'})
CREATE (math)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Game drop rates (loot boxes) are percentages: 5% legendary, 20% rare',
  strength: 0.95,
  gradeLevel: 6,
  surprisingFactor: 0.75
}]->(math);

MATCH (physics:Concept {conceptId: 'phy_motion'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Video game physics engines simulate realistic motion and collisions',
  strength: 0.9,
  gradeLevel: 7,
  surprisingFactor: 0.8
}]->(physics);

// Weather and Science
MATCH (physics:Concept {conceptId: 'phy_energy'}), (chem:Concept {conceptId: 'chem_reactions'})
CREATE (physics)-[:CONNECTS_TO {
  connectionType: 'surprising',
  description: 'Lightning is both a physics phenomenon (electricity) and chemistry (ozone creation)',
  strength: 0.8,
  gradeLevel: 10,
  surprisingFactor: 0.9
}]->(chem);

// ============================================
// BIDIRECTIONAL CONNECTIONS
// ============================================

// Create reverse connections for better graph traversal
MATCH (a:Concept)-[r:CONNECTS_TO]->(b:Concept)
WHERE NOT EXISTS((b)-[:CONNECTS_TO]->(a))
CREATE (b)-[:CONNECTS_TO {
  connectionType: r.connectionType,
  description: r.description,
  strength: r.strength,
  gradeLevel: r.gradeLevel,
  surprisingFactor: r.surprisingFactor,
  bidirectional: true
}]->(a);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

CREATE INDEX connection_type_index IF NOT EXISTS FOR ()-[r:CONNECTS_TO]-() ON (r.connectionType);
CREATE INDEX connection_grade_index IF NOT EXISTS FOR ()-[r:CONNECTS_TO]-() ON (r.gradeLevel);

