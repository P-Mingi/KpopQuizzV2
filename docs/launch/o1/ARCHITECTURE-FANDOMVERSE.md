# FandomVerse: one domain, sub-folders (lane 1, 2026-10-28)

Why Vercel Microfrontends and not a multi-zones rewrite (feasibility checked against the docs and the package source first):
1. Vercel routes `/anime/**` to the `otakuquiz` project inside its own network, in the same request: no rewrite to a `*.vercel.app` URL, so the SSO wall of those URLs (all_except_custom_domains) is never in the way and needs no bypass secret.
2. The `otakuquiz` deployments stay reachable only through fandomverse.org/anime (their own URLs stay protected): nothing is served on two public URLs, and branch previews of both projects are paired by Vercel.
3. The anime build is a plain Next.js app with `basePath: '/anime'`; its pages, `/anime/_next` assets, route handlers, OG routes and public files all live under the one routed prefix `/anime/:path*`.
4. Blocker checked and avoided: the docs say `withMicrofrontends` does not support `basePath`; the reason is its automatic asset prefix (`/vc-ap-<hash>`), so the anime build skips that transform (`skipTransforms: ['assetPrefix', 'rewrites']`, an option of the package) and keeps Next's default asset prefix, which is the base path.
5. kpopquiz.org is not in the group and its build is untouched: the wiring runs only when the site of the build is `hub` or `anime`; the one new dependency is `@vercel/microfrontends` 2.4.1 (exact pin), for the build-time config check and the local proxy.

(The rest of this file is the reference: what each piece does, what the owner sets in Vercel, how to run it locally.)
