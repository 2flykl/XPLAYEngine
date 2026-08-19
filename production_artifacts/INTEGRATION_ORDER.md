# Integration Order

V14 is designed as an all-in-one layer that includes the critical V13 runtime/backend files.

Recommended order if V9–V12 are already in the repo:
1. paste V14 on top
2. let V14 overwrite matching V13/runtime files
3. integrate BeastOrchestrator into the existing create/build pipeline
4. set VITE_XPLAY_API_BASE_URL when the XPLAY backend is deployed
5. rebuild
6. create a completely fresh screenshot test
7. QA all 10 built-in PLXs plus one generated Screenshot -> Game PLX

Do not test using a stale manifest from an earlier generation.
