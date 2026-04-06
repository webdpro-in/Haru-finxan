// Neo4j Seed Data - Initial Concept Nodes and Prerequisites
// This script populates the knowledge graph with educational concepts

// ============================================
// MATHEMATICS CONCEPTS
// ============================================

// Grade 1-3: Basic Math
CREATE (numbers:Concept {
  conceptId: 'math_numbers_basic',
  conceptName: 'Numbers and Counting',
  subject: 'math',
  grade: 1,
  difficulty: 1,
  estimatedLearningTime: 30,
  ncertChapter: 'Class 1 - Chapter 1'
});

CREATE (addition:Concept {
  conceptId: 'math_addition_basic',
  conceptName: 'Addition',
  subject: 'math',
  grade: 1,
  difficulty: 2,
  estimatedLearningTime: 45,
  ncertChapter: 'Class 1 - Chapter 3'
});

CREATE (subtraction:Concept {
  conceptId: 'math_subtraction_basic',
  conceptName: 'Subtraction',
  subject: 'math',
  grade: 2,
  difficulty: 2,
  estimatedLearningTime: 45,
  ncertChapter: 'Class 2 - Chapter 2'
});

CREATE (multiplication:Concept {
  conceptId: 'math_multiplication_basic',
  conceptName: 'Multiplication',
  subject: 'math',
  grade: 3,
  difficulty: 3,
  estimatedLearningTime: 60,
  ncertChapter: 'Class 3 - Chapter 4'
});

CREATE (division:Concept {
  conceptId: 'math_division_basic',
  conceptName: 'Division',
  subject: 'math',
  grade: 3,
  difficulty: 3,
  estimatedLearningTime: 60,
  ncertChapter: 'Class 3 - Chapter 5'
});

// Grade 4-6: Intermediate Math
CREATE (fractions:Concept {
  conceptId: 'math_fractions',
  conceptName: 'Fractions',
  subject: 'math',
  grade: 4,
  difficulty: 4,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 4 - Chapter 6'
});

CREATE (decimals:Concept {
  conceptId: 'math_decimals',
  conceptName: 'Decimals',
  subject: 'math',
  grade: 5,
  difficulty: 4,
  estimatedLearningTime: 75,
  ncertChapter: 'Class 5 - Chapter 8'
});

CREATE (percentages:Concept {
  conceptId: 'math_percentages',
  conceptName: 'Percentages',
  subject: 'math',
  grade: 6,
  difficulty: 5,
  estimatedLearningTime: 60,
  ncertChapter: 'Class 6 - Chapter 7'
});

CREATE (ratios:Concept {
  conceptId: 'math_ratios',
  conceptName: 'Ratios and Proportions',
  subject: 'math',
  grade: 6,
  difficulty: 5,
  estimatedLearningTime: 75,
  ncertChapter: 'Class 6 - Chapter 12'
});

// Grade 7-8: Pre-Algebra
CREATE (integers:Concept {
  conceptId: 'math_integers',
  conceptName: 'Integers',
  subject: 'math',
  grade: 7,
  difficulty: 5,
  estimatedLearningTime: 60,
  ncertChapter: 'Class 7 - Chapter 1'
});

CREATE (algebra_basics:Concept {
  conceptId: 'math_algebra_basics',
  conceptName: 'Algebraic Expressions',
  subject: 'math',
  grade: 7,
  difficulty: 6,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 7 - Chapter 12'
});

CREATE (linear_equations:Concept {
  conceptId: 'math_linear_equations',
  conceptName: 'Linear Equations',
  subject: 'math',
  grade: 8,
  difficulty: 6,
  estimatedLearningTime: 120,
  ncertChapter: 'Class 8 - Chapter 2'
});

// Grade 9-10: High School Math
CREATE (quadratic_equations:Concept {
  conceptId: 'math_quadratic_equations',
  conceptName: 'Quadratic Equations',
  subject: 'math',
  grade: 10,
  difficulty: 7,
  estimatedLearningTime: 150,
  ncertChapter: 'Class 10 - Chapter 4'
});

CREATE (trigonometry:Concept {
  conceptId: 'math_trigonometry',
  conceptName: 'Trigonometry',
  subject: 'math',
  grade: 10,
  difficulty: 8,
  estimatedLearningTime: 180,
  ncertChapter: 'Class 10 - Chapter 8'
});

CREATE (calculus_basics:Concept {
  conceptId: 'math_calculus_basics',
  conceptName: 'Introduction to Calculus',
  subject: 'math',
  grade: 11,
  difficulty: 9,
  estimatedLearningTime: 240,
  ncertChapter: 'Class 11 - Chapter 13'
});

// ============================================
// SCIENCE CONCEPTS
// ============================================

// Biology
CREATE (cells:Concept {
  conceptId: 'bio_cells',
  conceptName: 'Cell Structure and Function',
  subject: 'biology',
  grade: 8,
  difficulty: 5,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 8 - Chapter 8'
});

CREATE (photosynthesis:Concept {
  conceptId: 'bio_photosynthesis',
  conceptName: 'Photosynthesis',
  subject: 'biology',
  grade: 7,
  difficulty: 6,
  estimatedLearningTime: 75,
  ncertChapter: 'Class 7 - Chapter 1'
});

CREATE (genetics:Concept {
  conceptId: 'bio_genetics',
  conceptName: 'Heredity and Evolution',
  subject: 'biology',
  grade: 10,
  difficulty: 7,
  estimatedLearningTime: 120,
  ncertChapter: 'Class 10 - Chapter 9'
});

// Physics
CREATE (motion:Concept {
  conceptId: 'phy_motion',
  conceptName: 'Motion and Speed',
  subject: 'physics',
  grade: 7,
  difficulty: 5,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 7 - Chapter 13'
});

CREATE (force:Concept {
  conceptId: 'phy_force',
  conceptName: 'Force and Laws of Motion',
  subject: 'physics',
  grade: 9,
  difficulty: 6,
  estimatedLearningTime: 120,
  ncertChapter: 'Class 9 - Chapter 9'
});

CREATE (gravity:Concept {
  conceptId: 'phy_gravity',
  conceptName: 'Gravitation',
  subject: 'physics',
  grade: 9,
  difficulty: 7,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 9 - Chapter 10'
});

CREATE (energy:Concept {
  conceptId: 'phy_energy',
  conceptName: 'Work and Energy',
  subject: 'physics',
  grade: 9,
  difficulty: 6,
  estimatedLearningTime: 105,
  ncertChapter: 'Class 9 - Chapter 11'
});

CREATE (electricity:Concept {
  conceptId: 'phy_electricity',
  conceptName: 'Electricity',
  subject: 'physics',
  grade: 10,
  difficulty: 7,
  estimatedLearningTime: 150,
  ncertChapter: 'Class 10 - Chapter 12'
});

// Chemistry
CREATE (atoms:Concept {
  conceptId: 'chem_atoms',
  conceptName: 'Atoms and Molecules',
  subject: 'chemistry',
  grade: 9,
  difficulty: 6,
  estimatedLearningTime: 90,
  ncertChapter: 'Class 9 - Chapter 3'
});

CREATE (periodic_table:Concept {
  conceptId: 'chem_periodic_table',
  conceptName: 'Periodic Classification',
  subject: 'chemistry',
  grade: 10,
  difficulty: 7,
  estimatedLearningTime: 120,
  ncertChapter: 'Class 10 - Chapter 5'
});

CREATE (chemical_reactions:Concept {
  conceptId: 'chem_reactions',
  conceptName: 'Chemical Reactions',
  subject: 'chemistry',
  grade: 10,
  difficulty: 7,
  estimatedLearningTime: 135,
  ncertChapter: 'Class 10 - Chapter 1'
});

// ============================================
// PREREQUISITE RELATIONSHIPS
// ============================================

// Math Prerequisites
MATCH (n:Concept {conceptId: 'math_addition_basic'}), (p:Concept {conceptId: 'math_numbers_basic'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'math_subtraction_basic'}), (p:Concept {conceptId: 'math_addition_basic'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p);

MATCH (n:Concept {conceptId: 'math_multiplication_basic'}), (p:Concept {conceptId: 'math_addition_basic'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'math_division_basic'}), (p:Concept {conceptId: 'math_multiplication_basic'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'math_fractions'}), (p1:Concept {conceptId: 'math_division_basic'}), (p2:Concept {conceptId: 'math_multiplication_basic'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p1),
       (n)-[:REQUIRES {strength: 0.9}]->(p2);

MATCH (n:Concept {conceptId: 'math_decimals'}), (p:Concept {conceptId: 'math_fractions'})
CREATE (n)-[:REQUIRES {strength: 0.8}]->(p);

MATCH (n:Concept {conceptId: 'math_percentages'}), (p1:Concept {conceptId: 'math_fractions'}), (p2:Concept {conceptId: 'math_decimals'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p1),
       (n)-[:REQUIRES {strength: 0.7}]->(p2);

MATCH (n:Concept {conceptId: 'math_ratios'}), (p:Concept {conceptId: 'math_fractions'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p);

MATCH (n:Concept {conceptId: 'math_integers'}), (p:Concept {conceptId: 'math_numbers_basic'})
CREATE (n)-[:REQUIRES {strength: 0.8}]->(p);

MATCH (n:Concept {conceptId: 'math_algebra_basics'}), (p1:Concept {conceptId: 'math_integers'}), (p2:Concept {conceptId: 'math_multiplication_basic'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p1),
       (n)-[:REQUIRES {strength: 0.8}]->(p2);

MATCH (n:Concept {conceptId: 'math_linear_equations'}), (p:Concept {conceptId: 'math_algebra_basics'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'math_quadratic_equations'}), (p:Concept {conceptId: 'math_linear_equations'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'math_trigonometry'}), (p1:Concept {conceptId: 'math_ratios'}), (p2:Concept {conceptId: 'math_algebra_basics'})
CREATE (n)-[:REQUIRES {strength: 0.8}]->(p1),
       (n)-[:REQUIRES {strength: 0.7}]->(p2);

MATCH (n:Concept {conceptId: 'math_calculus_basics'}), (p1:Concept {conceptId: 'math_algebra_basics'}), (p2:Concept {conceptId: 'math_trigonometry'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p1),
       (n)-[:REQUIRES {strength: 0.8}]->(p2);

// Science Prerequisites
MATCH (n:Concept {conceptId: 'bio_photosynthesis'}), (p:Concept {conceptId: 'bio_cells'})
CREATE (n)-[:REQUIRES {strength: 0.7}]->(p);

MATCH (n:Concept {conceptId: 'bio_genetics'}), (p:Concept {conceptId: 'bio_cells'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p);

MATCH (n:Concept {conceptId: 'phy_force'}), (p:Concept {conceptId: 'phy_motion'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'phy_gravity'}), (p:Concept {conceptId: 'phy_force'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p);

MATCH (n:Concept {conceptId: 'phy_energy'}), (p:Concept {conceptId: 'phy_force'})
CREATE (n)-[:REQUIRES {strength: 0.8}]->(p);

MATCH (n:Concept {conceptId: 'phy_electricity'}), (p:Concept {conceptId: 'phy_energy'})
CREATE (n)-[:REQUIRES {strength: 0.7}]->(p);

MATCH (n:Concept {conceptId: 'chem_periodic_table'}), (p:Concept {conceptId: 'chem_atoms'})
CREATE (n)-[:REQUIRES {strength: 1.0}]->(p);

MATCH (n:Concept {conceptId: 'chem_reactions'}), (p1:Concept {conceptId: 'chem_atoms'}), (p2:Concept {conceptId: 'chem_periodic_table'})
CREATE (n)-[:REQUIRES {strength: 0.9}]->(p1),
       (n)-[:REQUIRES {strength: 0.7}]->(p2);

// Cross-subject connections
MATCH (n:Concept {conceptId: 'phy_motion'}), (p:Concept {conceptId: 'math_ratios'})
CREATE (n)-[:REQUIRES {strength: 0.6}]->(p);

MATCH (n:Concept {conceptId: 'phy_electricity'}), (p:Concept {conceptId: 'math_algebra_basics'})
CREATE (n)-[:REQUIRES {strength: 0.5}]->(p);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

CREATE INDEX concept_id_index IF NOT EXISTS FOR (c:Concept) ON (c.conceptId);
CREATE INDEX concept_subject_index IF NOT EXISTS FOR (c:Concept) ON (c.subject);
CREATE INDEX concept_grade_index IF NOT EXISTS FOR (c:Concept) ON (c.grade);

// ============================================
// CONSTRAINTS
// ============================================

CREATE CONSTRAINT concept_id_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.conceptId IS UNIQUE;
