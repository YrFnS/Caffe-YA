# Caffe-YA

Hybrid coffee shop + gaming center POS system built with Next.js 16.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth
- **i18n:** next-intl (Arabic/English)
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start PostgreSQL:**
```bash
docker compose up -d
```

3. **Generate migrations:**
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

4. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/      # UI components
├── features/        # Business logic modules
├── lib/             # DB, auth, utils
└── messages/        # i18n translation files
```

## Documentation

See `planning/phases/` for phase-by-phase implementation details.
