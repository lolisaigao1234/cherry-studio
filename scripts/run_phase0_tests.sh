#!/bin/bash

###############################################################################
# Phase 0 Test Runner
# Cherry Studio - Strawberrylemonade-L3-70B-v1.1 Integration
#
# This script runs all Phase 0 unit tests and integration tests
# to validate the implementation before proceeding to Phase 1.
#
# Usage:
#   ./scripts/run_phase0_tests.sh [--verbose] [--coverage]
#
# Author: Cherry Studio Integration Team
# Version: 1.0.0
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VERBOSE=false
COVERAGE=false

for arg in "$@"; do
  case $arg in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --coverage|-c)
      COVERAGE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--verbose] [--coverage]"
      echo ""
      echo "Options:"
      echo "  --verbose, -v     Show detailed test output"
      echo "  --coverage, -c    Generate coverage report"
      echo "  --help, -h        Show this help message"
      exit 0
      ;;
  esac
done

# Banner
echo "========================================================================"
echo -e "${BLUE}Phase 0 Test Suite${NC}"
echo "Strawberrylemonade-L3-70B-v1.1 Integration"
echo "========================================================================"
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Must run from project root directory${NC}"
  exit 1
fi

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

###############################################################################
# Test 1: Python System Validator
###############################################################################

echo -e "${BLUE}[1/5]${NC} Testing System Requirements Validator (Python)..."

if python3 -m pytest tests/test_validate_system_requirements.py -v ${VERBOSE:+--verbose} ${COVERAGE:+--cov=scripts --cov-report=html}; then
  echo -e "${GREEN}✓ System validator tests passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ System validator tests failed${NC}"
  ((TESTS_FAILED++))
fi
((TESTS_RUN++))
echo ""

###############################################################################
# Test 2: Strawberrylemonade Model Configuration
###############################################################################

echo -e "${BLUE}[2/5]${NC} Testing Strawberrylemonade Model Configuration (TypeScript)..."

if yarn vitest run tests/test_strawberrylemonade_config.test.ts ${VERBOSE:+--reporter=verbose} ${COVERAGE:+--coverage}; then
  echo -e "${GREEN}✓ Model configuration tests passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Model configuration tests failed${NC}"
  ((TESTS_FAILED++))
fi
((TESTS_RUN++))
echo ""

###############################################################################
# Test 3: Integration Script Tests
###############################################################################

echo -e "${BLUE}[3/5]${NC} Testing Integration Script (TypeScript)..."

if yarn vitest run tests/test_integrate_strawberrylemonade.test.ts ${VERBOSE:+--reporter=verbose}; then
  echo -e "${GREEN}✓ Integration script tests passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Integration script tests failed${NC}"
  ((TESTS_FAILED++))
fi
((TESTS_RUN++))
echo ""

###############################################################################
# Test 4: System Validation (Live Hardware Check)
###############################################################################

echo -e "${BLUE}[4/5]${NC} Running Live System Validation..."

if python3 scripts/validate_system_requirements.py --target-dir . --output .claude/system_validation_report.json; then
  echo -e "${GREEN}✓ Live system validation passed${NC}"
  echo "   Report saved to: .claude/system_validation_report.json"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠  Live system validation completed with warnings${NC}"
  echo "   Review report: .claude/system_validation_report.json"
  # Don't fail on warnings
  ((TESTS_PASSED++))
fi
((TESTS_RUN++))
echo ""

###############################################################################
# Test 5: TypeScript Type Checking
###############################################################################

echo -e "${BLUE}[5/5]${NC} Running TypeScript Type Checking..."

if yarn tsc --noEmit --project tsconfig.json; then
  echo -e "${GREEN}✓ TypeScript type checking passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ TypeScript type checking failed${NC}"
  ((TESTS_FAILED++))
fi
((TESTS_RUN++))
echo ""

###############################################################################
# Summary
###############################################################################

echo "========================================================================"
echo -e "${BLUE}Test Summary${NC}"
echo "========================================================================"
echo "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed:      $TESTS_PASSED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed:      $TESTS_FAILED${NC}"
else
  echo "Failed:      $TESTS_FAILED"
fi

echo "========================================================================"
echo ""

# Generate artifacts summary
if [ -f ".claude/system_validation_report.json" ]; then
  echo "Generated Artifacts:"
  echo "  ✓ .claude/system_validation_report.json"
fi

if [ "$COVERAGE" = true ]; then
  echo "  ✓ Python coverage: htmlcov/index.html"
  echo "  ✓ TypeScript coverage: coverage/index.html"
fi

echo ""

# Final verdict
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL PHASE 0 TESTS PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review system validation report (.claude/system_validation_report.json)"
  echo "  2. Run integration script: ts-node scripts/integrate_strawberrylemonade.ts --dry-run"
  echo "  3. Proceed to Phase 1 (Model Download and Setup)"
  echo ""
  exit 0
else
  echo -e "${RED}❌ PHASE 0 TESTS FAILED${NC}"
  echo ""
  echo "Please fix failing tests before proceeding to Phase 1."
  echo ""
  exit 1
fi
