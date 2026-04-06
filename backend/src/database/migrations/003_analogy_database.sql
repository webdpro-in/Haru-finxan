-- ============================================================================
-- Analogy Switching Engine - Database Schema
-- ============================================================================
-- This migration creates tables for the Analogy Switching Engine
-- REQ-2.4.1: System SHALL maintain database of 50+ analogies per concept
-- REQ-2.4.2: System SHALL track which analogies have been used per student
-- ============================================================================

-- ============================================================================
-- ANALOGIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analogies (
  analogy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  analogy_text TEXT NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  subject TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analogies_concept ON analogies(concept_id);
CREATE INDEX idx_analogies_grade ON analogies(grade_level);
CREATE INDEX idx_analogies_subject ON analogies(subject);

-- ============================================================================
-- STUDENT ANALOGY USAGE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_analogy_usage (
  usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  analogy_id UUID NOT NULL REFERENCES analogies(analogy_id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  was_helpful BOOLEAN,
  confusion_resolved BOOLEAN,
  UNIQUE(student_id, analogy_id)
);

CREATE INDEX idx_usage_student_concept ON student_analogy_usage(student_id, concept_id);
CREATE INDEX idx_usage_analogy ON student_analogy_usage(analogy_id);
CREATE INDEX idx_usage_timestamp ON student_analogy_usage(used_at DESC);

-- ============================================================================
-- POPULATE ANALOGIES - MATHEMATICS
-- ============================================================================

-- Concept: Fractions (50+ analogies)
INSERT INTO analogies (concept_id, concept_name, analogy_text, grade_level, difficulty, subject) VALUES
('math_fractions', 'Fractions', 'Like cutting a pizza into equal slices - 1/4 means one slice out of four equal pieces', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like sharing chocolate bars with friends - if you have 3/4, you have 3 pieces out of 4', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like filling a water bottle - 1/2 full means half the bottle has water', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a clock face - 15 minutes is 1/4 of an hour', 4, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like dividing a cake at a birthday party - everyone gets an equal fraction', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like measuring ingredients for cooking - 1/2 cup of flour', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a progress bar on your phone - 3/4 charged means almost full', 5, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like dividing money - if you have ₹100 and spend 1/4, you spent ₹25', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a fuel gauge in a car - 1/2 tank means half full', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like sharing pencils in class - 2/5 means 2 pencils out of 5 total', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a basketball game - 3/4 of the game is done means one quarter left', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like dividing a chocolate bar into squares - each square is a fraction', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a pie chart showing data - each slice is a fraction of the whole', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like measuring distance - 1/2 kilometer is 500 meters', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a deck of cards - 1/4 of the deck is 13 cards', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a movie runtime - if 2/3 is over, 1/3 remains', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like dividing a garden into sections - each section is a fraction', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a battery indicator - 1/4 battery means low power', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like splitting a sandwich - 1/2 for you, 1/2 for your friend', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a ruler divided into centimeters - each mark is a fraction of the whole', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a music playlist - 3/10 songs played means 7 more to go', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like dividing homework problems - if you finish 2/5, you have 3/5 left', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a glass of juice - 3/4 full means one more quarter to fill', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a parking lot - if 1/3 of spaces are taken, 2/3 are free', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a bookshelf - if 2/5 of books are read, 3/5 remain', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a soccer match - 1/2 time means halftime break', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like dividing a rope into equal parts - each part is a fraction', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a thermometer - 1/2 way between 0 and 100 is 50', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a pizza delivery - if 3/8 slices are left, 5/8 were eaten', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a school day - 2/6 periods done means 4/6 remaining', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a bag of marbles - 1/5 red means one red marble for every five total', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a train journey - 3/4 complete means almost at destination', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a coloring book - 1/2 colored means half the pages are done', 3, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a video game level - 4/5 complete means almost finished', 5, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a box of crayons - 2/8 broken means 6/8 still work', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a calendar month - 1/4 of the month is about one week', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a swimming pool - 2/3 full means one more third to fill', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a test with 20 questions - answering 1/4 means 5 questions done', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a fruit basket - 3/10 apples means 3 apples out of 10 fruits', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a race track - 1/2 lap means halfway around', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a savings goal - if you have 3/5 saved, you need 2/5 more', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a building with floors - 2/10 floors is the same as 1/5', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a recipe that serves 4 - using 1/2 the recipe serves 2 people', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a phone storage - 7/8 used means almost full', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a concert - 5/6 of seats filled means almost sold out', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a garden hose - 1/3 of the water used means 2/3 remains', 4, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a notebook - 4/5 pages used means one section left', 5, 'easy', 'math'),
('math_fractions', 'Fractions', 'Like a bus route - 2/7 stops completed means 5 more to go', 5, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a tower of blocks - 3/12 blocks is the same as 1/4', 6, 'medium', 'math'),
('math_fractions', 'Fractions', 'Like a treasure map - 1/2 of the journey means halfway to treasure', 4, 'easy', 'math');

-- Concept: Photosynthesis (50+ analogies)
INSERT INTO analogies (concept_id, concept_name, analogy_text, grade_level, difficulty, subject) VALUES
('science_photosynthesis', 'Photosynthesis', 'Like a solar panel converting sunlight into electricity for your home', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a factory that uses sunlight as fuel to make food', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like cooking food using sunlight as the heat source', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like charging a battery with sunlight - plants charge themselves with energy', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a kitchen where water and air are ingredients, sunlight is the stove, and sugar is the meal', 6, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like breathing in reverse - we breathe out CO2, plants breathe it in and give us oxygen', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a power plant that runs on sunshine instead of coal', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a magic trick where invisible air and water become visible food', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a restaurant where the chef is chlorophyll and the menu is glucose', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a recycling center - takes waste CO2 and makes useful oxygen', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a vending machine - insert sunlight, water, and CO2, get sugar and oxygen', 6, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green energy generator that never runs out of fuel', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a bakery where sunlight bakes carbon dioxide and water into sugar', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a chemical laboratory inside every leaf', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a tiny sun-powered food printer in each plant cell', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like plants eating sunlight for breakfast', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a construction site where sunlight is the worker building sugar molecules', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a water filter that also makes food - takes in dirty air, gives clean oxygen', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green paint factory - chlorophyll is the paint that captures sunlight', 6, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a savings account - plants save energy from sunlight as sugar', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a converter that changes light energy into chemical energy', 8, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant breathing in what we breathe out, and vice versa', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a miniature power station in every green leaf', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a smoothie blender - mix sunlight, water, and CO2 to make plant food', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a solar calculator that makes its own energy', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green machine that cleans the air while making food', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a chemical equation: sunlight + water + CO2 = sugar + oxygen', 8, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant gym where chloroplasts are the workout machines', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a natural air purifier that also feeds itself', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green energy revolution happening in every garden', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant pharmacy making medicine (glucose) from simple ingredients', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a light-powered assembly line building sugar molecules', 8, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green battery that recharges itself every sunny day', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant kitchen with chlorophyll as the chef', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a carbon dioxide vacuum cleaner that gives oxygen as exhaust', 6, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a natural partnership between plants and animals - we exchange gases', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green pigment trap that catches sunlight like a net catches fish', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant superpower - making food from thin air and light', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a biological solar farm in your backyard', 8, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green chemistry lab that never needs electricity', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant breathing in pollution and breathing out fresh air', 5, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a molecular construction project building glucose brick by brick', 8, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green energy miracle that feeds the entire food chain', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant using sunlight as a tool to build its own food', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a natural carbon capture system that also produces oxygen', 8, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green factory with no pollution - only clean oxygen output', 6, 'easy', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant converting light waves into chemical bonds', 9, 'hard', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a biological battery charger powered by the sun', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a green alchemist turning light into life', 7, 'medium', 'science'),
('science_photosynthesis', 'Photosynthesis', 'Like a plant using water as raw material and sunlight as the manufacturing process', 8, 'hard', 'science');

-- Concept: Electricity (50+ analogies)
INSERT INTO analogies (concept_id, concept_name, analogy_text, grade_level, difficulty, subject) VALUES
('physics_electricity', 'Electricity', 'Like water flowing through pipes - electrons flow through wires', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like cars on a highway - electrons are the cars, wires are the road', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a crowd of people moving through a hallway', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a river flowing downhill - electricity flows from high voltage to low', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a water pump pushing water through pipes - battery pushes electrons through wires', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like marbles rolling through a tube', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a bicycle chain - each link pushes the next one', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a conveyor belt carrying packages - the belt is the wire, packages are electrons', 6, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a water wheel - flowing water (current) turns the wheel (motor)', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a train on tracks - the train is electricity, tracks are the circuit', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like pressure in a water hose - voltage is the pressure pushing electrons', 8, 'hard', 'physics'),
('physics_electricity', 'Electricity', 'Like a slide at a playground - electrons slide from high to low potential', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a closed loop race track - electricity needs a complete circuit', 6, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a waterfall - the height is voltage, the amount of water is current', 8, 'hard', 'physics'),
('physics_electricity', 'Electricity', 'Like a rope being pulled - each part moves when you pull one end', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a domino chain - one electron pushes the next', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a garden hose - narrow hose (high resistance) slows water flow', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a battery being a hill and electrons rolling down', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a merry-go-round - electrons go in circles in a circuit', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water fountain - pump (battery) pushes water (electrons) up and around', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like traffic flow - more cars (current) means more congestion (heat)', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a seesaw - voltage is the height difference between two sides', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a bucket brigade - each person (atom) passes the bucket (electron)', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a ski lift - continuously moving electrons in a loop', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water slide - gravity (voltage) pulls you (electrons) down', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a hamster wheel - continuous circular motion', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a fire hose - high pressure (voltage) shoots water (current) far', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a toll road - resistance is like toll booths slowing traffic', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a water park lazy river - slow steady flow of electrons', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a chain reaction - one electron bumps the next', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a circular running track - electrons run in loops', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water tower - stored energy (voltage) ready to flow', 8, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a pinball machine - electrons bounce through the circuit', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a mountain stream - flows naturally from high to low', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a revolving door - continuous circular movement', 5, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water mill - flowing current turns the wheel', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a pipeline - electrons flow through the conductor pipe', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a roller coaster - potential energy (voltage) becomes kinetic energy (current)', 8, 'hard', 'physics'),
('physics_electricity', 'Electricity', 'Like a spiral slide - electrons spiral through coiled wires', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water clock - steady flow measures time', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a canal system - controlled flow of electrons', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a siphon - once started, flow continues automatically', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a water turbine - current spins the generator', 8, 'hard', 'physics'),
('physics_electricity', 'Electricity', 'Like a pneumatic tube - electrons shoot through the wire', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a blood circulation system - continuous flow through the body (circuit)', 8, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a water jet - high voltage creates a strong stream', 7, 'medium', 'physics'),
('physics_electricity', 'Electricity', 'Like a gondola lift - electrons carried along the wire', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a water channel - guides the flow in one direction', 6, 'easy', 'physics'),
('physics_electricity', 'Electricity', 'Like a pressure cooker - voltage is the pressure, current is the steam', 8, 'hard', 'physics'),
('physics_electricity', 'Electricity', 'Like a wave pool - electrons move in waves through the conductor', 8, 'hard', 'physics');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Total analogies inserted: 150 (50 per concept for 3 concepts)
-- Run this query to verify:
-- SELECT concept_name, COUNT(*) as analogy_count 
-- FROM analogies 
-- GROUP BY concept_name;
