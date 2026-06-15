# Backend composition pattern

## Purpose

Define the default backend architecture pattern for threat-forge-LLM before runtime backend implementation starts.

This document preserves backend patterns that worked in the previous threat-forge project while reintroducing them as clean, governed requirements in the new repository.

## Schema

The default backend dependency flow is:

```text
HTTP controller / route handler
  -> application service
    -> port / interface
      -> infrastructure adapter
```

Concrete dependencies are assembled by a factory or composition root:

```text
factory / composition root
  -> creates concrete adapters
  -> injects them into services
  -> exposes composed services or handlers
```

Backend/API contracts are authoritative documentation sources for public HTTP behavior.

OpenAPI or an equivalent governed HTTP contract is the default canonical external contract for public backend APIs.

JSON Schema is the default canonical external contract for machine-readable reports, payload models, and structured data artifacts.

Zod may be used as runtime validation inside JavaScript or TypeScript implementation code, but it must not become a divergent source of truth.

## Rules

Controllers and route handlers must not instantiate concrete infrastructure adapters directly.

Controllers and route handlers should depend on application services, composed handlers, or factories, not on concrete persistence, filesystem, network, or external-service adapters.

Application services should depend on explicit ports or application boundaries when they need external behavior.

Concrete adapters must live behind infrastructure or adapter boundaries and should be wired in a factory or composition root.

Factory and composition-root files are the approved place for concrete dependency assembly.

Public backend routes must have governed backend/API contracts before or together with implementation.

Backend/API contracts are primary technical documentation for HTTP behavior and must be linked to requirements, capabilities, and future implementation evidence.

JSON Schema contracts are primary technical documentation for structured report and payload data where no HTTP boundary is involved.

Zod schemas may validate runtime objects, request data, response data, and generated reports inside implementation code, but they must be generated from, checked against, or kept aligned with the canonical JSON Schema or OpenAPI contract.

A future deterministic architecture checker must verify the approved backend layering, composition rules, and contract-alignment rules once backend runtime code exists.

Until backend runtime code exists, the backend composition and contract requirements remain accepted but not implemented.
