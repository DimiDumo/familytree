# Family Tree

A family tree application built with SvelteKit, Tailwind CSS, and DaisyUI.

## Tech Stack

- **Svelte 5** - Latest version with runes-based reactivity
- **SvelteKit** - Full-stack framework for Svelte
- **Tailwind CSS v4** - Utility-first CSS framework (using Vite plugin)
- **DaisyUI v5** - Tailwind CSS component library

## Project Structure

```
familytree/
├── src/
│   ├── app.css              # Global styles with Tailwind + DaisyUI imports
│   ├── app.d.ts             # TypeScript declarations
│   ├── app.html             # HTML template
│   ├── lib/
│   │   ├── assets/
│   │   │   └── favicon.svg  # App favicon
│   │   └── index.ts         # Library exports
│   └── routes/
│       ├── +layout.svelte   # Root layout (imports app.css)
│       └── +page.svelte     # Home page with welcome screen
├── static/
│   └── robots.txt
├── package.json
├── svelte.config.js         # SvelteKit configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite config with Tailwind plugin
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run check
```

## Styling

Tailwind CSS is configured via the Vite plugin in `vite.config.ts`. Global styles are in `src/app.css`:

```css
@import "tailwindcss";
@plugin "daisyui";
```

DaisyUI provides pre-built components like `btn`, `hero`, `card`, etc. that can be used with Tailwind utility classes.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
