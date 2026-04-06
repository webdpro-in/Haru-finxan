#!/bin/bash

################################################################################
# Backup Verification Script - FinxanAI Platform
################################################################################
# This script verifies the integrity and completeness of database backups.
# It checks:
# - Backup file existence
# - Backup file size (should be > minimum threshold)
# - Backup age (should be < 24 hours)
# - Backup file integrity (can be extracted/read)
#
# Usage: ./verify-backups.sh [options]
# Options:
#   --backup-dir <path>    Backup directory (default: /backups/finxan-ai)
#   --max-age <hours>      Maximum backup age in hours (default: 24)
#   --min-size <bytes>     Minimum backup size in bytes (default: 1048576)
#   --verbose              Verbose output
#
# Schedule: Daily at 4:00 AM UTC (after backup completes)
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default options
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/finxan-ai}"
MAX_AGE_HOURS=24
MIN_SIZE_BYTES=1048576  # 1 MB
VERBOSE=false
DATE_DIR=$(date +%Y%m%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-dir)
      BACKUP_BASE_DIR="$2"
      shift 2
      ;;
    --max-age)
      MAX_AGE_HOURS="$2"
      shift 2
      ;;
    --min-size)
      MIN_SIZE_BYTES="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --backup-dir <path>    Backup directory (default: /backups/finxan-ai)"
      echo "  --max-age <hours>      Maximum backup age in hours (default: 24)"
      echo "  --min-size <bytes>     Minimum backup size in bytes (default: 1048576)"
      echo "  --verbose              Verbose output"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') - $1"
  fi
}

# Track verification status
VERIFICATION_STATUS=0
VERIFICATION_SUMMARY=""

################################################################################
# Verify backup file
################################################################################
verify_backup_file() {
  local BACKUP_FILE="$1"
  local FILE_TYPE="$2"
  
  log_verbose "Verifying: $BACKUP_FILE"
  
  # Check if file exists
  if [ ! -f "$BACKUP_FILE" ]; then
    log_error "$FILE_TYPE backup file not found: $BACKUP_FILE"
    VERIFICATION_STATUS=1
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File not found\n"
    return 1
  fi
  
  # Check file size
  FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
  
  if [ "$FILE_SIZE" -lt "$MIN_SIZE_BYTES" ]; then
    log_error "$FILE_TYPE backup file too small: $FILE_SIZE bytes (minimum: $MIN_SIZE_BYTES bytes)"
    VERIFICATION_STATUS=1
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File too small ($FILE_SIZE bytes)\n"
    return 1
  fi
  
  log_verbose "$FILE_TYPE file size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE)"
  
  # Check file age
  FILE_MTIME=$(stat -f%m "$BACKUP_FILE" 2>/dev/null || stat -c%Y "$BACKUP_FILE")
  CURRENT_TIME=$(date +%s)
  FILE_AGE_SECONDS=$((CURRENT_TIME - FILE_MTIME))
  FILE_AGE_HOURS=$((FILE_AGE_SECONDS / 3600))
  MAX_AGE_SECONDS=$((MAX_AGE_HOURS * 3600))
  
  if [ "$FILE_AGE_SECONDS" -gt "$MAX_AGE_SECONDS" ]; then
    log_error "$FILE_TYPE backup file too old: $FILE_AGE_HOURS hours (maximum: $MAX_AGE_HOURS hours)"
    VERIFICATION_STATUS=1
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File too old ($FILE_AGE_HOURS hours)\n"
    return 1
  fi
  
  log_verbose "$FILE_TYPE file age: $FILE_AGE_HOURS hours"
  
  # Check file integrity based on type
  case "$FILE_TYPE" in
    "Supabase")
      # Verify PostgreSQL dump file
      if command -v pg_restore &> /dev/null; then
        pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
          log_info "✅ $FILE_TYPE backup verified: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old\n"
          return 0
        else
          log_error "$FILE_TYPE backup file corrupted (pg_restore failed)"
          VERIFICATION_STATUS=1
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File corrupted\n"
          return 1
        fi
      else
        log_warn "pg_restore not found. Skipping integrity check for $FILE_TYPE."
        log_info "✅ $FILE_TYPE backup verified (basic): $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
        VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old (basic check)\n"
        return 0
      fi
      ;;
    
    "Neo4j"|"Weaviate"|"Redis")
      # Verify JSON/text files
      if command -v jq &> /dev/null && [[ "$BACKUP_FILE" == *.json ]]; then
        jq empty "$BACKUP_FILE" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
          log_info "✅ $FILE_TYPE backup verified: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old\n"
          return 0
        else
          log_error "$FILE_TYPE backup file corrupted (invalid JSON)"
          VERIFICATION_STATUS=1
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File corrupted (invalid JSON)\n"
          return 1
        fi
      else
        # Basic check for non-JSON files
        if [ -r "$BACKUP_FILE" ]; then
          log_info "✅ $FILE_TYPE backup verified (basic): $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old (basic check)\n"
          return 0
        else
          log_error "$FILE_TYPE backup file not readable"
          VERIFICATION_STATUS=1
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: File not readable\n"
          return 1
        fi
      fi
      ;;
    
    "Archive")
      # Verify compressed archive
      if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
          log_info "✅ $FILE_TYPE verified: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old\n"
          return 0
        else
          log_error "$FILE_TYPE corrupted (tar extraction failed)"
          VERIFICATION_STATUS=1
          VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}❌ $FILE_TYPE: Archive corrupted\n"
          return 1
        fi
      elif [[ "$BACKUP_FILE" == *.tar.gz.enc ]]; then
        log_info "✅ $FILE_TYPE verified (encrypted): $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
        VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old (encrypted)\n"
        return 0
      fi
      ;;
  esac
  
  # Default: basic verification passed
  log_info "✅ $FILE_TYPE backup verified (basic): $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old"
  VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}✅ $FILE_TYPE: $(numfmt --to=iec-i --suffix=B $FILE_SIZE), $FILE_AGE_HOURS hours old (basic check)\n"
  return 0
}

################################################################################
# Find and verify backups
################################################################################
log_info "========================================="
log_info "FinxanAI Backup Verification"
log_info "Date: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "Backup Directory: $BACKUP_BASE_DIR"
log_info "Max Age: $MAX_AGE_HOURS hours"
log_info "Min Size: $(numfmt --to=iec-i --suffix=B $MIN_SIZE_BYTES)"
log_info "========================================="

# Check if backup directory exists
if [ ! -d "$BACKUP_BASE_DIR" ]; then
  log_error "Backup directory not found: $BACKUP_BASE_DIR"
  exit 1
fi

# Find latest archive file
LATEST_ARCHIVE=$(find "$BACKUP_BASE_DIR" -name "*.tar.gz" -o -name "*.tar.gz.enc" | sort -r | head -n 1)

if [ -n "$LATEST_ARCHIVE" ]; then
  log_info "Found archive: $LATEST_ARCHIVE"
  verify_backup_file "$LATEST_ARCHIVE" "Archive"
else
  log_warn "No archive file found. Checking individual backup files..."
  
  # Find latest backup directory
  LATEST_BACKUP_DIR=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "20*" | sort -r | head -n 1)
  
  if [ -z "$LATEST_BACKUP_DIR" ]; then
    log_error "No backup files found in $BACKUP_BASE_DIR"
    exit 1
  fi
  
  log_info "Checking backup directory: $LATEST_BACKUP_DIR"
  
  # Verify Supabase backup
  SUPABASE_BACKUP=$(find "$LATEST_BACKUP_DIR" -name "supabase_*.dump" | sort -r | head -n 1)
  if [ -n "$SUPABASE_BACKUP" ]; then
    verify_backup_file "$SUPABASE_BACKUP" "Supabase"
  else
    log_warn "Supabase backup not found"
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}⚠️  Supabase: Not found\n"
  fi
  
  # Verify Neo4j backup
  NEO4J_BACKUP=$(find "$LATEST_BACKUP_DIR" -name "neo4j_*" | sort -r | head -n 1)
  if [ -n "$NEO4J_BACKUP" ]; then
    verify_backup_file "$NEO4J_BACKUP" "Neo4j"
  else
    log_warn "Neo4j backup not found"
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}⚠️  Neo4j: Not found\n"
  fi
  
  # Verify Weaviate backups
  WEAVIATE_DNA_BACKUP=$(find "$LATEST_BACKUP_DIR" -name "weaviate_learningdna_*.json" | sort -r | head -n 1)
  if [ -n "$WEAVIATE_DNA_BACKUP" ]; then
    verify_backup_file "$WEAVIATE_DNA_BACKUP" "Weaviate"
  else
    log_warn "Weaviate backup not found"
    VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}⚠️  Weaviate: Not found\n"
  fi
  
  # Verify Redis backup (optional)
  REDIS_BACKUP=$(find "$LATEST_BACKUP_DIR" -name "redis_keys_*.txt" | sort -r | head -n 1)
  if [ -n "$REDIS_BACKUP" ]; then
    verify_backup_file "$REDIS_BACKUP" "Redis"
  else
    log_verbose "Redis backup not found (optional)"
  fi
fi

################################################################################
# Check disk space
################################################################################
log_info "Checking disk space..."

DISK_USAGE=$(df -h "$BACKUP_BASE_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df -h "$BACKUP_BASE_DIR" | awk 'NR==2 {print $4}')

log_info "Disk usage: ${DISK_USAGE}% (${DISK_AVAILABLE} available)"

if [ "$DISK_USAGE" -gt 80 ]; then
  log_warn "Disk usage is high: ${DISK_USAGE}%"
  VERIFICATION_SUMMARY="${VERIFICATION_SUMMARY}⚠️  Disk: ${DISK_USAGE}% used (${DISK_AVAILABLE} available)\n"
else
  log_verbose "Disk usage is acceptable: ${DISK_USAGE}%"
fi

################################################################################
# Summary
################################################################################
log_info "========================================="
log_info "Verification Summary"
log_info "========================================="
echo -e "$VERIFICATION_SUMMARY"

if [ $VERIFICATION_STATUS -eq 0 ]; then
  log_info "✅ All backup verifications passed"
  exit 0
else
  log_error "❌ Some backup verifications failed. Check logs for details."
  
  # Send alert (implement your alerting mechanism here)
  # Examples:
  # - Send email
  # - Post to Slack
  # - Send SMS
  # - Create incident in monitoring system
  
  exit 1
fi
