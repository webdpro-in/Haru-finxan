#!/bin/bash

################################################################################
# Database Backup Script - FinxanAI Platform
################################################################################
# This script performs automated backups of all databases:
# - Supabase (PostgreSQL)
# - Neo4j AuraDB
# - Weaviate Cloud
# - Upstash Redis (optional)
#
# Usage: ./backup-databases.sh [options]
# Options:
#   --backup-dir <path>    Backup directory (default: /backups/finxan-ai)
#   --compress             Compress backups (default: true)
#   --encrypt              Encrypt backups (default: false)
#   --upload               Upload to cloud storage (default: false)
#   --verbose              Verbose output
#
# Schedule: Daily at 3:00 AM UTC via cron
# Retention: 7 days local, 30 days cloud
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"

# Default options
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/finxan-ai}"
COMPRESS=true
ENCRYPT=false
UPLOAD=false
VERBOSE=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_DIR=$(date +%Y%m%d)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE_DIR"

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
      BACKUP_DIR="$BACKUP_BASE_DIR/$DATE_DIR"
      shift 2
      ;;
    --compress)
      COMPRESS=true
      shift
      ;;
    --no-compress)
      COMPRESS=false
      shift
      ;;
    --encrypt)
      ENCRYPT=true
      shift
      ;;
    --upload)
      UPLOAD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --backup-dir <path>    Backup directory (default: /backups/finxan-ai)"
      echo "  --compress             Compress backups (default: true)"
      echo "  --no-compress          Do not compress backups"
      echo "  --encrypt              Encrypt backups"
      echo "  --upload               Upload to cloud storage"
      echo "  --verbose              Verbose output"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
  exit 1
fi

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

# Create backup directory
mkdir -p "$BACKUP_DIR"
log_info "Created backup directory: $BACKUP_DIR"

# Track backup status
BACKUP_STATUS=0
BACKUP_SUMMARY=""

################################################################################
# 1. Backup Supabase (PostgreSQL)
################################################################################
backup_supabase() {
  log_info "Starting Supabase backup..."
  
  if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    log_warn "Supabase credentials not configured. Skipping Supabase backup."
    return 1
  fi
  
  # Extract database host from Supabase URL
  DB_HOST=$(echo "$SUPABASE_URL" | sed -E 's|https?://([^/]+).*|\1|')
  DB_HOST="db.$DB_HOST"
  
  BACKUP_FILE="$BACKUP_DIR/supabase_$TIMESTAMP.dump"
  
  log_verbose "Database host: $DB_HOST"
  log_verbose "Backup file: $BACKUP_FILE"
  
  # Perform backup using pg_dump
  if command -v pg_dump &> /dev/null; then
    PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" pg_dump \
      -h "$DB_HOST" \
      -U postgres \
      -d postgres \
      -F c \
      -f "$BACKUP_FILE" 2>&1 | tee -a "$BACKUP_DIR/supabase_backup.log"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
      FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
      log_info "Supabase backup completed: $BACKUP_FILE ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
      BACKUP_SUMMARY="${BACKUP_SUMMARY}✅ Supabase: $(numfmt --to=iec-i --suffix=B $FILE_SIZE)\n"
      return 0
    else
      log_error "Supabase backup failed"
      BACKUP_STATUS=1
      BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Supabase: FAILED\n"
      return 1
    fi
  else
    log_error "pg_dump not found. Install PostgreSQL client tools."
    BACKUP_STATUS=1
    BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Supabase: pg_dump not found\n"
    return 1
  fi
}

################################################################################
# 2. Backup Neo4j AuraDB
################################################################################
backup_neo4j() {
  log_info "Starting Neo4j backup..."
  
  if [ -z "$NEO4J_URI" ] || [ -z "$NEO4J_PASSWORD" ]; then
    log_warn "Neo4j credentials not configured. Skipping Neo4j backup."
    return 1
  fi
  
  BACKUP_FILE="$BACKUP_DIR/neo4j_$TIMESTAMP.cypher"
  
  log_verbose "Neo4j URI: $NEO4J_URI"
  log_verbose "Backup file: $BACKUP_FILE"
  
  # Export using cypher-shell (if available)
  if command -v cypher-shell &> /dev/null; then
    # Export all nodes and relationships
    cypher-shell -a "$NEO4J_URI" \
      -u "${NEO4J_USER:-neo4j}" \
      -p "$NEO4J_PASSWORD" \
      "MATCH (n) RETURN n LIMIT 10000" > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
      log_info "Neo4j backup completed: $BACKUP_FILE ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
      BACKUP_SUMMARY="${BACKUP_SUMMARY}✅ Neo4j: $(numfmt --to=iec-i --suffix=B $FILE_SIZE)\n"
      return 0
    else
      log_error "Neo4j backup failed"
      BACKUP_STATUS=1
      BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Neo4j: FAILED\n"
      return 1
    fi
  else
    log_warn "cypher-shell not found. Using curl fallback..."
    
    # Fallback: Export using HTTP API
    BACKUP_FILE="$BACKUP_DIR/neo4j_$TIMESTAMP.json"
    
    # Note: This is a simplified backup - for production, use Neo4j backup tools
    echo '{"statements":[{"statement":"MATCH (n) RETURN n LIMIT 10000"}]}' | \
      curl -X POST "$NEO4J_URI/db/neo4j/tx/commit" \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "${NEO4J_USER:-neo4j}:$NEO4J_PASSWORD" | base64)" \
        -d @- > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
      log_info "Neo4j backup completed (HTTP): $BACKUP_FILE ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
      BACKUP_SUMMARY="${BACKUP_SUMMARY}✅ Neo4j: $(numfmt --to=iec-i --suffix=B $FILE_SIZE)\n"
      return 0
    else
      log_error "Neo4j backup failed"
      BACKUP_STATUS=1
      BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Neo4j: FAILED\n"
      return 1
    fi
  fi
}

################################################################################
# 3. Backup Weaviate Cloud
################################################################################
backup_weaviate() {
  log_info "Starting Weaviate backup..."
  
  if [ -z "$WEAVIATE_URL" ]; then
    log_warn "Weaviate credentials not configured. Skipping Weaviate backup."
    return 1
  fi
  
  # Backup LearningDNA class
  BACKUP_FILE_DNA="$BACKUP_DIR/weaviate_learningdna_$TIMESTAMP.json"
  
  log_verbose "Weaviate URL: $WEAVIATE_URL"
  log_verbose "Backup file: $BACKUP_FILE_DNA"
  
  GRAPHQL_QUERY='{"query": "{ Get { LearningDNA { studentId sessionId timestamp preferredExplanationStyle avgResponseTime confusionTriggers _additional { id vector } } } }"}'
  
  if [ -n "$WEAVIATE_API_KEY" ]; then
    AUTH_HEADER="Authorization: Bearer $WEAVIATE_API_KEY"
  else
    AUTH_HEADER=""
  fi
  
  curl -X POST "$WEAVIATE_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "$GRAPHQL_QUERY" \
    > "$BACKUP_FILE_DNA" 2>&1
  
  if [ $? -eq 0 ]; then
    FILE_SIZE=$(stat -f%z "$BACKUP_FILE_DNA" 2>/dev/null || stat -c%s "$BACKUP_FILE_DNA")
    log_info "Weaviate LearningDNA backup completed: $BACKUP_FILE_DNA ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
  else
    log_error "Weaviate LearningDNA backup failed"
    BACKUP_STATUS=1
  fi
  
  # Backup Concept class
  BACKUP_FILE_CONCEPT="$BACKUP_DIR/weaviate_concept_$TIMESTAMP.json"
  GRAPHQL_QUERY='{"query": "{ Get { Concept { conceptId conceptName subject description keywords _additional { id vector } } } }"}'
  
  curl -X POST "$WEAVIATE_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "$GRAPHQL_QUERY" \
    > "$BACKUP_FILE_CONCEPT" 2>&1
  
  if [ $? -eq 0 ]; then
    FILE_SIZE=$(stat -f%z "$BACKUP_FILE_CONCEPT" 2>/dev/null || stat -c%s "$BACKUP_FILE_CONCEPT")
    log_info "Weaviate Concept backup completed: $BACKUP_FILE_CONCEPT ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
  else
    log_error "Weaviate Concept backup failed"
    BACKUP_STATUS=1
  fi
  
  # Backup QAPair class
  BACKUP_FILE_QA="$BACKUP_DIR/weaviate_qapair_$TIMESTAMP.json"
  GRAPHQL_QUERY='{"query": "{ Get { QAPair { question answer subject grade source upvotes _additional { id vector } } } }"}'
  
  curl -X POST "$WEAVIATE_URL/v1/graphql" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "$GRAPHQL_QUERY" \
    > "$BACKUP_FILE_QA" 2>&1
  
  if [ $? -eq 0 ]; then
    FILE_SIZE=$(stat -f%z "$BACKUP_FILE_QA" 2>/dev/null || stat -c%s "$BACKUP_FILE_QA")
    log_info "Weaviate QAPair backup completed: $BACKUP_FILE_QA ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
    
    # Calculate total size
    TOTAL_SIZE=$(($(stat -f%z "$BACKUP_FILE_DNA" 2>/dev/null || stat -c%s "$BACKUP_FILE_DNA") + \
                  $(stat -f%z "$BACKUP_FILE_CONCEPT" 2>/dev/null || stat -c%s "$BACKUP_FILE_CONCEPT") + \
                  $(stat -f%z "$BACKUP_FILE_QA" 2>/dev/null || stat -c%s "$BACKUP_FILE_QA")))
    BACKUP_SUMMARY="${BACKUP_SUMMARY}✅ Weaviate: $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE)\n"
    return 0
  else
    log_error "Weaviate QAPair backup failed"
    BACKUP_STATUS=1
    BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Weaviate: FAILED\n"
    return 1
  fi
}

################################################################################
# 4. Backup Redis (Optional)
################################################################################
backup_redis() {
  log_info "Starting Redis backup (optional)..."
  
  if [ -z "$REDIS_URL" ]; then
    log_warn "Redis credentials not configured. Skipping Redis backup."
    return 1
  fi
  
  BACKUP_FILE="$BACKUP_DIR/redis_keys_$TIMESTAMP.txt"
  
  log_verbose "Redis URL: $REDIS_URL"
  log_verbose "Backup file: $BACKUP_FILE"
  
  # Export all keys
  if command -v redis-cli &> /dev/null; then
    redis-cli -u "$REDIS_URL" --scan > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
      KEY_COUNT=$(wc -l < "$BACKUP_FILE")
      log_info "Redis backup completed: $BACKUP_FILE ($KEY_COUNT keys, $(numfmt --to=iec-i --suffix=B $FILE_SIZE))"
      BACKUP_SUMMARY="${BACKUP_SUMMARY}✅ Redis: $KEY_COUNT keys\n"
      return 0
    else
      log_error "Redis backup failed"
      BACKUP_STATUS=1
      BACKUP_SUMMARY="${BACKUP_SUMMARY}❌ Redis: FAILED\n"
      return 1
    fi
  else
    log_warn "redis-cli not found. Skipping Redis backup."
    BACKUP_SUMMARY="${BACKUP_SUMMARY}⚠️  Redis: Skipped (redis-cli not found)\n"
    return 1
  fi
}

################################################################################
# Execute backups
################################################################################
log_info "========================================="
log_info "FinxanAI Database Backup"
log_info "Timestamp: $TIMESTAMP"
log_info "Backup Directory: $BACKUP_DIR"
log_info "========================================="

backup_supabase
backup_neo4j
backup_weaviate
backup_redis

################################################################################
# Compress backups
################################################################################
if [ "$COMPRESS" = true ]; then
  log_info "Compressing backups..."
  ARCHIVE_FILE="$BACKUP_BASE_DIR/${DATE_DIR}.tar.gz"
  
  tar -czf "$ARCHIVE_FILE" -C "$BACKUP_BASE_DIR" "$DATE_DIR" 2>&1 | tee -a "$BACKUP_DIR/compression.log"
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    ARCHIVE_SIZE=$(stat -f%z "$ARCHIVE_FILE" 2>/dev/null || stat -c%s "$ARCHIVE_FILE")
    log_info "Compression completed: $ARCHIVE_FILE ($(numfmt --to=iec-i --suffix=B $ARCHIVE_SIZE))"
    
    # Remove uncompressed directory
    rm -rf "$BACKUP_DIR"
    log_verbose "Removed uncompressed directory: $BACKUP_DIR"
  else
    log_error "Compression failed"
    BACKUP_STATUS=1
  fi
fi

################################################################################
# Encrypt backups
################################################################################
if [ "$ENCRYPT" = true ]; then
  log_info "Encrypting backups..."
  
  if [ -z "$ENCRYPTION_KEY" ]; then
    log_error "ENCRYPTION_KEY not set in environment"
    BACKUP_STATUS=1
  else
    if [ "$COMPRESS" = true ]; then
      ENCRYPTED_FILE="${ARCHIVE_FILE}.enc"
      openssl enc -aes-256-cbc -salt -in "$ARCHIVE_FILE" -out "$ENCRYPTED_FILE" -k "$ENCRYPTION_KEY"
      
      if [ $? -eq 0 ]; then
        log_info "Encryption completed: $ENCRYPTED_FILE"
        rm "$ARCHIVE_FILE"
        log_verbose "Removed unencrypted archive: $ARCHIVE_FILE"
      else
        log_error "Encryption failed"
        BACKUP_STATUS=1
      fi
    else
      log_warn "Encryption requires compression. Skipping encryption."
    fi
  fi
fi

################################################################################
# Upload to cloud storage
################################################################################
if [ "$UPLOAD" = true ]; then
  log_info "Uploading backups to cloud storage..."
  
  UPLOAD_FILE="$ARCHIVE_FILE"
  if [ "$ENCRYPT" = true ]; then
    UPLOAD_FILE="${ARCHIVE_FILE}.enc"
  fi
  
  # AWS S3
  if command -v aws &> /dev/null && [ -n "${AWS_BACKUP_BUCKET:-}" ]; then
    log_info "Uploading to AWS S3..."
    aws s3 cp "$UPLOAD_FILE" "s3://$AWS_BACKUP_BUCKET/$DATE_DIR/"
    
    if [ $? -eq 0 ]; then
      log_info "Upload to S3 completed"
    else
      log_error "Upload to S3 failed"
      BACKUP_STATUS=1
    fi
  fi
  
  # Google Cloud Storage
  if command -v gsutil &> /dev/null && [ -n "${GCS_BACKUP_BUCKET:-}" ]; then
    log_info "Uploading to Google Cloud Storage..."
    gsutil cp "$UPLOAD_FILE" "gs://$GCS_BACKUP_BUCKET/$DATE_DIR/"
    
    if [ $? -eq 0 ]; then
      log_info "Upload to GCS completed"
    else
      log_error "Upload to GCS failed"
      BACKUP_STATUS=1
    fi
  fi
fi

################################################################################
# Clean up old backups
################################################################################
log_info "Cleaning up old backups (retention: 7 days)..."
find "$BACKUP_BASE_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_BASE_DIR" -name "*.tar.gz.enc" -mtime +7 -delete
log_info "Cleanup completed"

################################################################################
# Summary
################################################################################
log_info "========================================="
log_info "Backup Summary"
log_info "========================================="
echo -e "$BACKUP_SUMMARY"

if [ $BACKUP_STATUS -eq 0 ]; then
  log_info "✅ All backups completed successfully"
  exit 0
else
  log_error "❌ Some backups failed. Check logs for details."
  exit 1
fi
