-- ============================================================================
-- FinxanAI Database Schema - Initial Migration
-- ============================================================================
-- This migration creates all core tables for the FinxanAI platform
-- Run this in Supabase SQL Editor or via migration tool
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'ta', 'te', 'bn')),
  classroom_id UUID,
  parent_id UUID,
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  neurodiversity_flags JSONB DEFAULT '[]'::jsonb,
  accessibility_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  streak_days INTEGER DEFAULT 0,
  total_learning_time INTEGER DEFAULT 0 -- in seconds
);

CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_classroom ON students(classroom_id);
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_students_deleted ON students(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- CONCEPT MASTERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS concept_masteries (
  mastery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  last_practiced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (success_rate >= 0 AND success_rate <= 100),
  easiness_factor DECIMAL(3,2) DEFAULT 2.50 CHECK (easiness_factor >= 1.30),
  interval INTEGER DEFAULT 1 CHECK (interval >= 1), -- days
  next_review_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, concept_id)
);

CREATE INDEX idx_masteries_student ON concept_masteries(student_id);
CREATE INDEX idx_masteries_concept ON concept_masteries(concept_id);
CREATE INDEX idx_masteries_review_date ON concept_masteries(next_review_date);
CREATE INDEX idx_masteries_level ON concept_masteries(mastery_level);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  questions_asked INTEGER DEFAULT 0,
  confusion_detected BOOLEAN DEFAULT FALSE,
  confusion_count INTEGER DEFAULT 0,
  cognitive_load_peaks JSONB DEFAULT '[]'::jsonb,
  mastery_gained JSONB DEFAULT '{}'::jsonb,
  emotion_states JSONB DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0
);

CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_sessions_confusion ON sessions(confusion_detected);

-- ============================================================================
-- INTERACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interactions (
  interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_type TEXT NOT NULL CHECK (message_type IN ('student_question', 'haru_response')),
  content TEXT NOT NULL,
  confusion_signals JSONB DEFAULT '[]'::jsonb,
  voice_metrics JSONB,
  response_time INTEGER, -- milliseconds
  question_text TEXT,
  haru_response TEXT,
  response_latency_ms INTEGER,
  was_correct BOOLEAN
);

CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_interactions_student ON interactions(student_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp DESC);

-- ============================================================================
-- ANONYMOUS QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS anonymous_questions (
  question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id_hash TEXT NOT NULL, -- One-way hash for analytics
  classroom_id UUID NOT NULL,
  topic_category TEXT,
  question TEXT NOT NULL,
  question_text_hash TEXT, -- SHA-256 hash
  asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered BOOLEAN DEFAULT FALSE,
  answer TEXT,
  class_id TEXT
);

CREATE INDEX idx_anonymous_classroom ON anonymous_questions(classroom_id);
CREATE INDEX idx_anonymous_category ON anonymous_questions(topic_category);
CREATE INDEX idx_anonymous_answered ON anonymous_questions(answered);

-- ============================================================================
-- LEARNING DNA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_dna (
  dna_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE UNIQUE,
  learning_style TEXT CHECK (learning_style IN ('VISUAL', 'ANALYTICAL', 'STORY-BASED', 'ANALOGY-DRIVEN')),
  prefers_visual BOOLEAN DEFAULT FALSE,
  prefers_analogy BOOLEAN DEFAULT FALSE,
  prefers_formula BOOLEAN DEFAULT FALSE,
  avg_response_latency_ms INTEGER,
  preferred_explanation_style TEXT,
  avg_response_time INTEGER,
  confusion_triggers TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_dna_student ON learning_dna(student_id);

-- ============================================================================
-- MOOD CHECK-INS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mood_checkins (
  checkin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'neutral', 'sad', 'anxious', 'frustrated')),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  notes TEXT,
  anxiety_detected BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mood_student ON mood_checkins(student_id);
CREATE INDEX idx_mood_timestamp ON mood_checkins(timestamp DESC);
CREATE INDEX idx_mood_anxiety ON mood_checkins(anxiety_detected);

-- ============================================================================
-- RISK PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_predictions (
  prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  predicted_outcome TEXT NOT NULL CHECK (predicted_outcome IN ('at_risk', 'needs_attention', 'on_track')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  interventions_recommended TEXT[] DEFAULT ARRAY[]::TEXT[],
  teacher_acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_risk_student ON risk_predictions(student_id);
CREATE INDEX idx_risk_calculated ON risk_predictions(calculated_at DESC);
CREATE INDEX idx_risk_outcome ON risk_predictions(predicted_outcome);

-- ============================================================================
-- CLASSROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS classrooms (
  classroom_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
  subject TEXT NOT NULL,
  teacher_id UUID NOT NULL,
  school_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_school ON classrooms(school_id);

-- ============================================================================
-- TEACHERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teachers (
  teacher_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  school_id UUID,
  voice_clone_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_school ON teachers(school_id);

-- ============================================================================
-- PARENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS parents (
  parent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT NOT NULL,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_parents_phone ON parents(phone);

-- ============================================================================
-- CONSENT RECORDS TABLE (DPDP Compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS consent_records (
  consent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'parent')),
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consent_user ON consent_records(user_id, user_type);
CREATE INDEX idx_consent_purpose ON consent_records(purpose);
CREATE INDEX idx_consent_granted ON consent_records(granted);

-- ============================================================================
-- REFLECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reflections (
  reflection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  most_confusing TEXT,
  how_fixed TEXT,
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 10)
);

CREATE INDEX idx_reflections_student ON reflections(student_id);
CREATE INDEX idx_reflections_session ON reflections(session_id);

-- ============================================================================
-- CONNECTION HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS connection_history (
  connection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  other_concept TEXT NOT NULL,
  other_subject TEXT NOT NULL,
  explanation TEXT NOT NULL,
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_connections_student ON connection_history(student_id);

-- ============================================================================
-- LESSON PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_plans (
  lesson_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
  duration INTEGER NOT NULL, -- minutes
  objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[],
  activities JSONB DEFAULT '[]'::jsonb,
  assessments JSONB DEFAULT '[]'::jsonb,
  generated_by TEXT NOT NULL CHECK (generated_by IN ('ai', 'teacher')),
  teacher_approved BOOLEAN DEFAULT FALSE,
  classroom_id UUID REFERENCES classrooms(classroom_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lesson_plans_classroom ON lesson_plans(classroom_id);
CREATE INDEX idx_lesson_plans_subject ON lesson_plans(subject, grade);

-- ============================================================================
-- STUDENT INSIGHTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_insights (
  insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  finding TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_insights_student ON student_insights(student_id);
CREATE INDEX idx_insights_acknowledged ON student_insights(acknowledged);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_concept_masteries_updated_at
  BEFORE UPDATE ON concept_masteries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_dna_updated_at
  BEFORE UPDATE ON learning_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_masteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

-- Students can only see their own data
CREATE POLICY students_select_own ON students
  FOR SELECT USING (auth.uid()::text = student_id::text);

CREATE POLICY masteries_select_own ON concept_masteries
  FOR SELECT USING (student_id::text IN (
    SELECT student_id::text FROM students WHERE auth.uid()::text = student_id::text
  ));

-- Teachers can see all students in their classrooms
CREATE POLICY teachers_select_classroom_students ON students
  FOR SELECT USING (classroom_id IN (
    SELECT classroom_id FROM classrooms WHERE teacher_id::text = auth.uid()::text
  ));

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================
-- Add sample data for testing if needed

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this query to verify all tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;
