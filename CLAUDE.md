# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

YAYSON is a library for serializing and reading [JSON API](http://jsonapi.org) data in JavaScript. It supports both ESM and CommonJS, has zero dependencies, and works in browsers and Node.js 20+.

## Commands

```bash
npm test              # Run all tests with mocha/tsx
npm run build         # Build with tsdown (outputs to build/)
npm run lint          # Run tsc, eslint, and prettier concurrently
npm run format        # Format code with prettier
npm run test:build    # Test the built CJS/ESM outputs
tsc --noEmit          # Type check only (don't use npx)
```

Run a single test file:

```bash
mocha test/yayson/presenter.ts
```

## Architecture

### Entry Points

- `src/yayson.ts` - Main entry, exports default `yayson()` factory returning `{ Store, Presenter, Adapter }`
- `src/legacy.ts` - Legacy JSON API format support, exports default `yayson()` returning `{ Store, Presenter, Adapter }`

### Core Components

**Presenter** (`src/yayson/presenter.ts`)

- Factory function `createPresenter(adapter)` returns a Presenter class
- Serializes JS objects/Sequelize models to JSON API format
- Subclasses define `static type`, `relationships()`, `attributes()`
- Access static properties via `this.constructor.type/adapter`

**Store** (`src/yayson/store.ts`)

- Parses JSON API documents, resolves relationships
- Supports schema validation with Zod-like schemas (requires `parse`/`safeParse` methods)
- Generic `Store<S>` for type inference from schema registry

**LegacyStore** (`src/yayson/legacy-store.ts`)

- Handles pre-1.0 JSON API format with type mapping
- Same schema validation support as Store

**Adapters** (`src/yayson/adapter.ts`, `src/yayson/adapters/`)

- Abstract data access (get properties, get id)
- Default adapter for plain objects, Sequelize adapter for ORM models

### Type System

Types in `src/yayson/types.ts`:

- `SchemaRegistry` - Maps type names to schemas
- `InferModelType<S, T>` - Infers TypeScript type from schema registry
- `PresenterConstructor/Instance` - Presenter class and instance types

### Build Output

Dual CJS/ESM builds via tsdown:

- `build/yayson.{cjs,mjs}` - Main entry
- `build/legacy.{cjs,mjs}` - Legacy entry
- Type declarations included
