# System Review & Improvements — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical and important issues found in review, add LLM selector skill (16), clean code comments, add missing real-world scenarios, and standardize the entire system for daily developer use.

**Architecture:** Updates across all 15 existing skills + 1 new skill. No new source code — all changes are to SKILL.md files and docs.

**Scope:** 16 changes total (1 new skill + 4 critical fixes + 10 important fixes + 1 consistency fix)

---

## New: Skill 16-LLM-Selector

Separate skill that recommends which LLM to use based on task complexity. Three generic levels: Rapido (Haiku), Balanceado (Sonnet), Profundo (Opus). Maps each skill to a default level with overrides for complexity. Shows the /model command for the dev to execute.

## Critical Fix 1: Remove all // comments from code blocks in skills 02, 03, 04, 05, 06

Convert file-path comments to markdown headings above code blocks. Remove explanatory comments entirely.

## Critical Fix 2: Orchestrator — Add real-world scenarios

Add pipelines for: refactoring, legacy maintenance, dependency updates, performance debug, bug triage, external code review. Add rejection workflow.

## Critical Fix 3: Reviewer — Explicit rejection workflow

Rejection report always names responsible skill. Orchestrator notified. Flow: reject → orchestrate → fix → re-validate.

## Critical Fix 4: QA — Smoke tests, regression, performance baseline

Add templates for smoke tests, regression checklist, performance baseline comparison.

## Important Fix 1: Standardize handoffs across all skills

Every execution skill gets: Recebe de / Entrega para / Criterios de saida.

## Important Fix 2: Orchestrator ↔ Context Manager protocol

Explicit TaskCreate/TaskUpdate protocol at each pipeline transition.

## Important Fix 3: Backend — Migration strategy

UP/DOWN migrations, zero-downtime checklist, rollback procedure.

## Important Fix 4: Deploy — Blue-green and canary

Templates for blue-green, canary routing, feature flags, expanded health checks.

## Important Fix 5: Copy ↔ SEO — Resolve overlap

Copy owns text, SEO owns optimization. Meta descriptions: Copy drafts, SEO optimizes.

## Important Fix 6: Frontend — Error states

Retry logic, timeout handling, fallback UI, stale data indicator.

## Important Fix 7: Context Manager — Cross-pipeline tracking

Multiple features in parallel, dependency tracking between features.

## Important Fix 8: Documenter — Runbooks

Runbook template, incident playbook template, docs/ops/runbooks/ directory.

## Important Fix 9: Security — Dependency management

MODERATE handling, transitive deps, major version update checklist.

## Important Fix 10: Motion ↔ Frontend integration

Motion adds to existing components, same codebase, clear handoff protocol.
