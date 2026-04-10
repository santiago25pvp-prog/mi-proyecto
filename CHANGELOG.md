# Changelog

## [1.9.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.8.0...v1.9.0) (2026-04-10)


### Features

* feat: refactor and clean up project structure ([132344a](https://github.com/santiago25pvp-prog/mi-proyecto/commit/132344a))
* feat: refactor architecture and decouple database ([247bbf3](https://github.com/santiago25pvp-prog/mi-proyecto/commit/247bbf3))

## [1.8.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.7.0...v1.8.0) (2026-04-10)


### Features

* remove broken opencode automation workflows ([b9ddeff](https://github.com/santiago25pvp-prog/mi-proyecto/commit/b9ddeff31853818e69818816c4f3460f9435a963))
* align admin ingest response handling ([17b8e00](https://github.com/santiago25pvp-prog/mi-proyecto/commit/17b8e00d46239b9bbf5e144a0f31fb488982a36c))

## [1.7.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.6.0...v1.7.0) (2026-04-09)


### Features

* add hot reload, readme and ci workflow ([2cabda6](https://github.com/santiago25pvp-prog/mi-proyecto/commit/2cabda69a83782bf151c5a8acaf51f3c25462ac6))


### Bug Fixes

* regenerate package-lock.json cleanly ([52c8df9](https://github.com/santiago25pvp-prog/mi-proyecto/commit/52c8df968a4c3bf06e7ee2883125d09212f2dcbd))
* remove npm cache from ci ([e0e8213](https://github.com/santiago25pvp-prog/mi-proyecto/commit/e0e82136a16b196437aabbb4d053b133a3797c84))
* use correct action versions in ci workflow ([e16a6b1](https://github.com/santiago25pvp-prog/mi-proyecto/commit/e16a6b12dad06dbfe36d91bc2119049ce099d2fc))

## [1.6.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.5.0...v1.6.0) (2026-04-09)


### Features

* rebuild frontend, consolidate backend and add full test coverage ([3366bfc](https://github.com/santiago25pvp-prog/mi-proyecto/commit/3366bfc2947ca8342cacc8da4766cf38d52713db))
* report partial ingest results ([2fd97ab](https://github.com/santiago25pvp-prog/mi-proyecto/commit/2fd97ab35b75f6c0e03def44b2c5680fe5a10f23))


### Bug Fixes

* lazy init supabase auth provider ([f4669c6](https://github.com/santiago25pvp-prog/mi-proyecto/commit/f4669c6ced6710579371af1cb2f05003426b2694))
* use pageSize for admin documents pagination ([c4dd89a](https://github.com/santiago25pvp-prog/mi-proyecto/commit/c4dd89a94b54731ae03605ae0f1a78290e1f5ce0))

## [1.5.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.4.0...v1.5.0) (2026-04-07)


### Features

* **admin:** implement admin panel and protected routes ([09febff](https://github.com/santiago25pvp-prog/mi-proyecto/commit/09febff70a51e2bc180733c5253841195db5f7d6))
* **chat:** implement ChatInterface and ChatInput ([f5a4726](https://github.com/santiago25pvp-prog/mi-proyecto/commit/f5a472665117a863ca568c5bb184b86655aeb9e4))
* **chat:** implement markdown rendering and streaming API connection ([23d192b](https://github.com/santiago25pvp-prog/mi-proyecto/commit/23d192bdfda81f347ee6b1d6c1c81841966f7e56))
* **chat:** implement RAG chat interface components and streaming logic ([55061b3](https://github.com/santiago25pvp-prog/mi-proyecto/commit/55061b3c87acac8a4c1365cb47d9bfb56e0aafa8))
* **chat:** simplify chat interface for stability ([e05003b](https://github.com/santiago25pvp-prog/mi-proyecto/commit/e05003b02e8df4aa14b29d1fc4c34db45180b212))
* **frontend:** implement auth and protected pages ([c6681c3](https://github.com/santiago25pvp-prog/mi-proyecto/commit/c6681c385d485144a0860f2e4ac0dadd46bc1330))
* implement api client with jwt and rate limit handling ([897cf85](https://github.com/santiago25pvp-prog/mi-proyecto/commit/897cf856bdd66ab4dd90da4aa4c670910f0ed8a4))
* implement auth integration and error handling toasts ([26c76f7](https://github.com/santiago25pvp-prog/mi-proyecto/commit/26c76f7c7f8c9a29b14a9dfcc3c82f468ab2c625))
* implement chat interface components and streaming hook ([9c8fa03](https://github.com/santiago25pvp-prog/mi-proyecto/commit/9c8fa03c72c461739a474be2bdb946c197db093f))
* implement layout with collapsible sidebar ([a4d38ce](https://github.com/santiago25pvp-prog/mi-proyecto/commit/a4d38ce05df1578eea6441119ef1a84c9ecf0f28))
* implement root layout and initial page ([47be310](https://github.com/santiago25pvp-prog/mi-proyecto/commit/47be310b948fb59c59e6c21c6f2c3bc4a0ec5b84))
* implement SPA layout and integrate react-query ([4bddae0](https://github.com/santiago25pvp-prog/mi-proyecto/commit/4bddae08cb37a31b564c962047a4a9560bbce793))
* install and configure nextjs ([7c6db24](https://github.com/santiago25pvp-prog/mi-proyecto/commit/7c6db246a2f59d4be429cd9711a99be8d5ccc61a))
* separate login and register pages ([55f2adb](https://github.com/santiago25pvp-prog/mi-proyecto/commit/55f2adb2d78d83b8db22b6fb80c291cdb79c6519))
* **ui:** initialize shadcn and refactor auth feature structure ([0c3132e](https://github.com/santiago25pvp-prog/mi-proyecto/commit/0c3132ef4865032418d58a2eaa4b90abe11617a7))


### Bug Fixes

* **backend:** normalize created_at in schema migration ([f49d60f](https://github.com/santiago25pvp-prog/mi-proyecto/commit/f49d60fe0cd2d871705c41fe4e8ebc9398c53148))
* **backend:** reconcile embedding schema with Gemini dimensions ([da7fbd1](https://github.com/santiago25pvp-prog/mi-proyecto/commit/da7fbd15462386a295c539a030c378f327246d6a))
* **chat:** update api endpoint to /api/chat ([3c9dbb4](https://github.com/santiago25pvp-prog/mi-proyecto/commit/3c9dbb4cdab4143101accc4790ced5445fd04a04))
* implement UI components and fix dependency issues ([a83115b](https://github.com/santiago25pvp-prog/mi-proyecto/commit/a83115b0d9b221cd46b2fadc469dc72251132c2e))

## [1.4.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.3.0...v1.4.0) (2026-03-16)


### Features

* complete admin panel and JWT authentication ([87fcee9](https://github.com/santiago25pvp-prog/mi-proyecto/commit/87fcee9dea1d02a0ca85542b8ae3faf332172da2))

## [1.3.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.2.0...v1.3.0) (2026-03-16)


### Features

* add rate limiting to API endpoints ([177a6a3](https://github.com/santiago25pvp-prog/mi-proyecto/commit/177a6a30b43541e2a79f843620cc81c8e4b4e268))

## [1.2.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.1.0...v1.2.0) (2026-03-15)


### Features

* add JWT authentication ([fc3f2cc](https://github.com/santiago25pvp-prog/mi-proyecto/commit/fc3f2cc8f3f5f74e78e77b098468662311b7250b))
* protect API endpoints with JWT auth ([6dba0f0](https://github.com/santiago25pvp-prog/mi-proyecto/commit/6dba0f00fe90259d3e21350a4abc0db5453b4501))

## [1.1.0](https://github.com/santiago25pvp-prog/mi-proyecto/compare/v1.0.0...v1.1.0) (2026-03-15)


### Features

* finalize RAG system architecture ([2f41b07](https://github.com/santiago25pvp-prog/mi-proyecto/commit/2f41b075db34b91dd3a36cb6ef8153deb81e2d52))

## 1.0.0 (2026-03-13)


### Features

* agregar endpoint de usuarios ([6793267](https://github.com/santiago25pvp-prog/mi-proyecto/commit/6793267992d04f354f7c8c67b0f74039b456165b))


### Bug Fixes

* update release-please action and inputs ([ed53938](https://github.com/santiago25pvp-prog/mi-proyecto/commit/ed53938e999b8a68be2231c8c1fa5fff4adb73c3))
