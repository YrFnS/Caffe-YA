# Research best practices for CLAUDE.md and AGENTS.md, then generate optimal files for this project

This command researches what top developers do for CLAUDE.md/AGENTS.md and creates the best possible versions for this specific codebase.

## Phase 1: Research

Launch a subagent to research:
1. Search GitHub for notable CLAUDE.md/AGENTS.md examples using `gh search repos`
2. Fetch and analyze the top examples (TheRealSeanDonahoe/agents-md, forrestchang/andrej-karpathy-skills, wasp-lang/open-saas)
3. Extract the key patterns: non-negotiables, simplicity rules, surgical changes, goal-driven execution
4. Document what top developers include vs skip
5. Pay special attention to Andrej Karpathy's four principles

## Phase 2: Analyze Current Project

Detect and document:
- **Stack**: Read package.json to identify framework, language, key libraries
- **Commands**: npm scripts, build tools, test runners
- **Layout**: src/ structure, test location, config files
- **Existing docs**: Check for Rule.md, DESIGN.md, README.md, docs/
- **Conventions**: Any existing CLAUDE.md, AGENTS.md, or .claude/ files

## Phase 3: Generate CLAUDE.md

Create a concise file (~100-200 lines) with:

1. **Header**: `@AGENTS.md` (import the agents file)

2. **Project Context**:
   - Stack (framework, language, key deps)
   - Commands (dev, build, test, lint, migrate)
   - Layout (source, tests, config)
   - Key Conventions (critical project-specific rules)

3. **Reference to external docs**:
   - If Rule.md exists: "See Rule.md for development rules"
   - If DESIGN.md exists: "See DESIGN.md for design system"
   - Point to these instead of duplicating content

4. **Project Learnings**:
   - Empty section for accumulated corrections
   - Format: "- (empty)" or template line

## Phase 4: Generate AGENTS.md

Create a file following the open standard (~150-250 lines) with:

1. **Non-negotiables** (5 rules that override everything):
   - No flattery, no filler
   - Disagree when you disagree
   - Never fabricate
   - Stop when confused
   - Touch only what you must

2. **Before writing code**:
   - State plan before editing
   - Read files you'll touch
   - Match existing patterns

3. **Simplicity first**:
   - No features beyond what was asked
   - No abstractions for single-use code
   - Rewrite if 200 lines could be 50

4. **Surgical changes**:
   - Don't improve adjacent code
   - Don't refactor things that work
   - Clean up only orphans your changes created

5. **Goal-driven execution**:
   - Transform vague asks into verifiable goals
   - Define success criteria upfront

6. **Verification**:
   - Run actual tests/linters
   - Never report "done" without checking

7. **Communication style**:
   - Direct, not diplomatic
   - Concise by default

8. **When to ask, when to proceed**:
   - Clear framework for ambiguous situations

9. **Self-improvement loop**:
   - Keep under 300 lines
   - Project Learnings section

## Phase 5: Present Output

Show the user:
1. Summary of what was researched
2. The generated CLAUDE.md content
3. The generated AGENTS.md content
4. Ask if they want to apply, tweak, or regenerate

## Key Sources to Reference

- https://github.com/TheRealSeanDonahoe/agents-md (AGENTS.md standard)
- https://github.com/forrestchang/andrej-karpathy-skills (Karpathy's 4 principles)
- https://github.com/wasp-lang/open-saas (best-in-class example)
- https://github.com/drona23/claude-token-efficient (minimal example)