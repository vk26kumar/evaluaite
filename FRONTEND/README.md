# AI-EvaluAIte frontend

React 19 + Vite single-page app. See the [project README](../README.md) for setup, configuration and deployment.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to http://localhost:5000
npm run lint
npm run build    # outputs dist/
```

## Structure

```
src/
  styles/      design tokens (light "paper" and dark "chalkboard" themes), base and shared component styles
  context/     auth session, theme and toast providers
  lib/         API client, formatting, storage and image-compression helpers
  components/  app shell, route guards, form field, feedback states, red-pen SVG marks
  pages/       landing, auth, evaluate (new evaluation), report, history, slides, whiteboard
```
