/**
 * Foundation harness. Deliberately plain: no tokens, no components, no copy that
 * belongs to the marketing module. F-11 themes it, F-12 to F-17 fill it with real
 * components, and F-18 moves it under a locale segment.
 */
export default function HomePage() {
  return (
    <main>
      <h1>Loopnote foundation</h1>
      <p>
        This route exists to prove the shell builds, renders on the server, and deploys.
        It is not the product.
      </p>
      <h2>Wired so far</h2>
      <ul>
        <li>pnpm workspace and Turborepo</li>
        <li>Shared TypeScript, ESLint, and Prettier configuration</li>
        <li>Next.js App Router with React Server Components</li>
      </ul>
      <h2>Still to land in this module</h2>
      <ul>
        <li>Design tokens and 14 base components</li>
        <li>Locale routing for id and en</li>
        <li>Health route and the problem response contract</li>
        <li>Local services, CI, preview deploy, and Sentry</li>
      </ul>
    </main>
  );
}
