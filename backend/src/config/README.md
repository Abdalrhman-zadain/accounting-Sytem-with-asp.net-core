# Backend Runtime Config

Use this folder for application-owned runtime configuration code.

What belongs here:

- environment variable parsing and normalization
- config validation helpers
- NestJS config factories
- grouped runtime config such as app, database, auth, and POS settings

What does not belong here:

- tool-discovery files such as `tsconfig.json`, `jest.config.ts`, or `nest-cli.json`
- Prisma schema and seed scripts
- operational runbooks or deployment notes

Suggested future files:

- `app.config.ts`
- `database.config.ts`
- `auth.config.ts`
- `env.validation.ts`
