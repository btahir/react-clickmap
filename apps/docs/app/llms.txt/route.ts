export function GET() {
  return new Response(
    `# react-clickmap\n\nSelf-owned React behavior analytics. MIT.\n\n- [Getting started](https://react-clickmap.vercel.app/docs/getting-started)\n- [Studio](https://react-clickmap.vercel.app/docs/guides/studio)\n- [Measurement definitions](https://react-clickmap.vercel.app/docs/guides/measurement)\n- [Privacy](https://react-clickmap.vercel.app/docs/guides/privacy-consent)\n- [Next.js server integration](https://react-clickmap.vercel.app/docs/guides/nextjs-app-router)\n\nCore captures interactions, not all visitors. Never describe heuristics as conversion proof or privacy controls as legal certification. Pure schemas/reporting are exported from react-clickmap/contracts. Studio is optional @react-clickmap/dashboard.\n`,
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
