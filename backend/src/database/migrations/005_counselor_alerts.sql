-- ============================================================================
-- Counselor Alerts Table Migration
-- ============================================================================
-- This migration creates the counselor_alerts table for mental health risk alerts
-- Task 24.4: Implement counselor alert system
-- REQ-3.3.6: System SHALL alert school counselor when risk detected
-- ============================================================================

-- ============================================================================
-- COUNSELOR ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS counselor_alerts (
  alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  alert_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES teachers(teacher_id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_counselor_alerts_student ON counselor_alerts(student_id);
CREATE INDEX idx_counselor_alerts_sent ON counselor_alerts(alert_sent_at DESC);
CREATE INDEX idx_counselor_alerts_acknowledged ON counselor_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX idx_counselor_alerts_resolved ON counselor_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Enable RLS
ALTER TABLE counselor_alerts ENABLE ROW LEVEL SECURITY;

-- Teachers/counselors can see all alerts
CREATE POLICY counselor_alerts_select_teachers ON counselor_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teachers WHERE teacher_id::text = auth.uid()::text
    )
  );

-- Teachers/counselors can update alerts (acknowledge/resolve)
CREATE POLICY counselor_alerts_update_teachers ON counselor_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teachers WHERE teacher_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
