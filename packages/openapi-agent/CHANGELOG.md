# [1.2.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/openapi-agent@1.1.0...openapi-agent@1.2.0) (2025-05-12)


### Features

* **rpc:** improve communication protocol ([#130](https://github.com/ForestAdmin/forestadmin-experimental/issues/130)) ([490585e](https://github.com/ForestAdmin/forestadmin-experimental/commit/490585eae26cde776d423f66b3bcf079fbbbb637))

# [1.1.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/openapi-agent@1.0.0...openapi-agent@1.1.0) (2025-04-16)


### Bug Fixes

* **agent-tester:** fix type for isRequired ([#134](https://github.com/ForestAdmin/forestadmin-experimental/issues/134)) ([95d0c2c](https://github.com/ForestAdmin/forestadmin-experimental/commit/95d0c2ca9428cc9a5be2ccded9d5ef2e250958b5))
* **filtered relationship:** now work with collection with different pk type ([2f18851](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f18851e688109e49c5f92e468f003779a330e99))
* **rpc datasource:** handle basic SA form ([#135](https://github.com/ForestAdmin/forestadmin-experimental/issues/135)) ([1c687d3](https://github.com/ForestAdmin/forestadmin-experimental/commit/1c687d339ae102b0c986159b417d6b7e15fab63a))


### Features

* **agent-tester:** add isRequired getter on action fields ([#133](https://github.com/ForestAdmin/forestadmin-experimental/issues/133)) ([a6778af](https://github.com/ForestAdmin/forestadmin-experimental/commit/a6778af0af30445aaa0c837d6318f0bfa4f601da))

# 1.0.0 (2025-03-24)


### Bug Fixes

* action number field cast to number ([#82](https://github.com/ForestAdmin/forestadmin-experimental/issues/82)) ([06ae858](https://github.com/ForestAdmin/forestadmin-experimental/commit/06ae858af029c494d676c4e1fdf1dd2b3872d3d9))
* add back options to specify live demo user ([2778cfd](https://github.com/ForestAdmin/forestadmin-experimental/commit/2778cfd0369551b4395d8a4730a87a6d12d8f0c7))
* **agent nodejs testing:** action enum field check ([#128](https://github.com/ForestAdmin/forestadmin-experimental/issues/128)) ([997644a](https://github.com/ForestAdmin/forestadmin-experimental/commit/997644a75b1bc95d6201acc099cfe49072951240))
* **agent-node-testing:** fix loading initial state on action form ([#53](https://github.com/ForestAdmin/forestadmin-experimental/issues/53)) ([d327918](https://github.com/ForestAdmin/forestadmin-experimental/commit/d327918e5f757f974f94a091e5e13fdbe52bcc25))
* **agent-nodejs-testing:** add missing support to unit testable agent ([#106](https://github.com/ForestAdmin/forestadmin-experimental/issues/106)) ([403c48d](https://github.com/ForestAdmin/forestadmin-experimental/commit/403c48d0bdbdbd4c5f7cefa3347a89bcb78416cd))
* **agent-nodejs-testing:** allow to test correctly single and bulk action forms ([#70](https://github.com/ForestAdmin/forestadmin-experimental/issues/70)) ([2e0b2e1](https://github.com/ForestAdmin/forestadmin-experimental/commit/2e0b2e1b38370f78200785b89cb78525947bb5b1))
* **agent-nodejs-testing:** bump package version ([#17](https://github.com/ForestAdmin/forestadmin-experimental/issues/17)) ([8fbc5aa](https://github.com/ForestAdmin/forestadmin-experimental/commit/8fbc5aa44dc2e77a5ab4591f546068b53688e9ba))
* **agent-nodejs-testing:** export integration types ([#16](https://github.com/ForestAdmin/forestadmin-experimental/issues/16)) ([1825024](https://github.com/ForestAdmin/forestadmin-experimental/commit/1825024c03e2ed8a2172caeaf7732511bad17dfe))
* **agent-nodejs-testing:** fix export and types ([#18](https://github.com/ForestAdmin/forestadmin-experimental/issues/18)) ([cc033a7](https://github.com/ForestAdmin/forestadmin-experimental/commit/cc033a715516c07a838bd97f4624ed1d4b2cb4f2))
* **agent-nodejs-testing:** fix typos in the readme ([#20](https://github.com/ForestAdmin/forestadmin-experimental/issues/20)) ([61fed7e](https://github.com/ForestAdmin/forestadmin-experimental/commit/61fed7eafb64232c29e57c8fb955914be17bbaf7))
* **agent-nodejs-testing:** peer dependency issues ([#107](https://github.com/ForestAdmin/forestadmin-experimental/issues/107)) ([460ec91](https://github.com/ForestAdmin/forestadmin-experimental/commit/460ec919538f7aa678bc79fc9d60cbf051fba297))
* **agent-nodejs-testing:** potential issue when getting an available port ([#61](https://github.com/ForestAdmin/forestadmin-experimental/issues/61)) ([94d1a0a](https://github.com/ForestAdmin/forestadmin-experimental/commit/94d1a0a2430e1f47b671fcf08f289a71af487bb3))
* **agent-nodejs-testing:** setup code and tests to run tests in parallel ([#54](https://github.com/ForestAdmin/forestadmin-experimental/issues/54)) ([3edaa46](https://github.com/ForestAdmin/forestadmin-experimental/commit/3edaa4657eac3ce658344e094a6a230429275d9e))
* **agent-tester:** fix mock server ([#127](https://github.com/ForestAdmin/forestadmin-experimental/issues/127)) ([ab1983d](https://github.com/ForestAdmin/forestadmin-experimental/commit/ab1983d5ed8854f901658f382e241b1f5f12bf17))
* **agent-testing:** allow user to stop agent when typing or schema are not set ([#78](https://github.com/ForestAdmin/forestadmin-experimental/issues/78)) ([529c575](https://github.com/ForestAdmin/forestadmin-experimental/commit/529c575f2205ceda0a712b87e2389909b2665b64))
* **agent-testing:** export testable agent ([#52](https://github.com/ForestAdmin/forestadmin-experimental/issues/52)) ([fdadde4](https://github.com/ForestAdmin/forestadmin-experimental/commit/fdadde4dd46b88b12cb4d3c012f08dd9cdd34aa4))
* **agent-testing:** make action context optional on execute ([#45](https://github.com/ForestAdmin/forestadmin-experimental/issues/45)) ([e10ced5](https://github.com/ForestAdmin/forestadmin-experimental/commit/e10ced59fba90d71d5d005a80cf7e2595427ac07))
* **agent-testing:** on stop remove the forest schema only when it is generated ([#79](https://github.com/ForestAdmin/forestadmin-experimental/issues/79)) ([5226aad](https://github.com/ForestAdmin/forestadmin-experimental/commit/5226aade03e98410f5777b4bd8ab2ac482fda079))
* allow bottleneck config ([#121](https://github.com/ForestAdmin/forestadmin-experimental/issues/121)) ([1b8c5fb](https://github.com/ForestAdmin/forestadmin-experimental/commit/1b8c5fbc9ee67cf3551d7880217023276e62ecfb))
* build ([af2593f](https://github.com/ForestAdmin/forestadmin-experimental/commit/af2593f7aa31288fe158fd0034b13c8459a835ea))
* **cd:** datasource hubspot translation ([64d0bff](https://github.com/ForestAdmin/forestadmin-experimental/commit/64d0bffbec9547c3dd2a0104e0ab940ff1d79040))
* **cd:** it should behave correctly ([#110](https://github.com/ForestAdmin/forestadmin-experimental/issues/110)) ([02d7d2f](https://github.com/ForestAdmin/forestadmin-experimental/commit/02d7d2f3624d08be1432faac4a422f315e60f34f))
* change archiver to jszip for performance manner ([#12](https://github.com/ForestAdmin/forestadmin-experimental/issues/12)) ([91b8b5d](https://github.com/ForestAdmin/forestadmin-experimental/commit/91b8b5d838644c94584e54ae807dadf2a5700ea0))
* change enum function name ([ce0323e](https://github.com/ForestAdmin/forestadmin-experimental/commit/ce0323ee0dcb0e7cca5e56d8c64244275ca91d14))
* **ci:** release live demo blocker ([#27](https://github.com/ForestAdmin/forestadmin-experimental/issues/27)) ([5bd68ee](https://github.com/ForestAdmin/forestadmin-experimental/commit/5bd68ee6c4d6ab686916cb5687020a6fb698dbf0))
* **ci:** update live-demo-blocker to validate that CI & CD are working ([#26](https://github.com/ForestAdmin/forestadmin-experimental/issues/26)) ([3fc363d](https://github.com/ForestAdmin/forestadmin-experimental/commit/3fc363d882ac043736a0808122ab074573df286f))
* **datasource hubspot:** change log on introspection ([6669e5f](https://github.com/ForestAdmin/forestadmin-experimental/commit/6669e5fb07200a7952537cfb87c84eeab97471b7))
* **datasource hubspot:** fix release ([d4b49e5](https://github.com/ForestAdmin/forestadmin-experimental/commit/d4b49e58de8a03896678402026f2389338299144))
* **datasource hubspot:** return empty record when api throw 404 ([#123](https://github.com/ForestAdmin/forestadmin-experimental/issues/123)) ([cc321a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/cc321a0294e38a46a057b0698d2c35c1ac394364))
* **datasource hubspot:** warn typo ([4f80fb1](https://github.com/ForestAdmin/forestadmin-experimental/commit/4f80fb13d65cd79c8bf0ae8c50ded878ce8a3e21))
* **datasource-rpc:** follow improvment of rpc-agent creation ([c65fea5](https://github.com/ForestAdmin/forestadmin-experimental/commit/c65fea549d560c644026b52b1d1ebf5c290f2eed))
* deployment ([#109](https://github.com/ForestAdmin/forestadmin-experimental/issues/109)) ([2f887e0](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f887e06f6aaf6eef02c9dc85b3872f877b947a7))
* **elasticsearch:** avoid sorting on _id internal field ([#101](https://github.com/ForestAdmin/forestadmin-experimental/issues/101)) ([9670989](https://github.com/ForestAdmin/forestadmin-experimental/commit/967098923b59f0ce8bd5be096d78d74cfda46fc3))
* **elasticsearch:** move to peer dependencies ([a9239db](https://github.com/ForestAdmin/forestadmin-experimental/commit/a9239db89b90623bb65d7cac884e39fbaeb2f3c9))
* **elasticsearch:** move to peer dependencies resolution ([#37](https://github.com/ForestAdmin/forestadmin-experimental/issues/37)) ([6663b4b](https://github.com/ForestAdmin/forestadmin-experimental/commit/6663b4be861af23a9f5194ed2f8c3102446fac51))
* **elasticsearch:** uuid should by filtrable with not equal operator ([#32](https://github.com/ForestAdmin/forestadmin-experimental/issues/32)) ([886c236](https://github.com/ForestAdmin/forestadmin-experimental/commit/886c2366cf62943857f3a8a81355b9c8ce1a201d))
* export live demo options type ([d661c09](https://github.com/ForestAdmin/forestadmin-experimental/commit/d661c0972ba6ea0e98392dad2604c89f6f48813b))
* **filtered relation:** support pk other than Number type ([#96](https://github.com/ForestAdmin/forestadmin-experimental/issues/96)) ([e8c16f5](https://github.com/ForestAdmin/forestadmin-experimental/commit/e8c16f54a7689e9b085ef078eb43e5529e662ff9))
* **filtered relation:** use foreign pk and context to fetch data ([#94](https://github.com/ForestAdmin/forestadmin-experimental/issues/94)) ([9c38ecb](https://github.com/ForestAdmin/forestadmin-experimental/commit/9c38ecbc870c12cd131735274f7f01c1e55df512))
* filteredOneToMany ([#91](https://github.com/ForestAdmin/forestadmin-experimental/issues/91)) ([ba08e77](https://github.com/ForestAdmin/forestadmin-experimental/commit/ba08e77fd3fc88a6bbc1b6301e00514dd6e4ed03))
* fix agent-nodejs-testing release process ([#43](https://github.com/ForestAdmin/forestadmin-experimental/issues/43)) ([c6a7e59](https://github.com/ForestAdmin/forestadmin-experimental/commit/c6a7e5964a8a5159e1f1e327e1e99fa09e398f9e))
* fix build ([949c1d8](https://github.com/ForestAdmin/forestadmin-experimental/commit/949c1d8bb23a90a4d0a0d8c7d9791eea7db28b55))
* fix ci ([e29bb4e](https://github.com/ForestAdmin/forestadmin-experimental/commit/e29bb4eaee96dddc1a7a3e17e58aa4104a4a7a0d))
* fix ci ([0261060](https://github.com/ForestAdmin/forestadmin-experimental/commit/02610600d2e673f62588cd2911cf843b66a5bcce))
* fix ci again ([c7c8032](https://github.com/ForestAdmin/forestadmin-experimental/commit/c7c8032ff861f2cdc37448fd4adc34368e18dbfa))
* fix package version for datasource-es ([a90f745](https://github.com/ForestAdmin/forestadmin-experimental/commit/a90f7458c53ba7daec4af5e58ff0345e44a60d4d))
* fix packages name to put them on [@forestadmin-experimental](https://github.com/forestadmin-experimental) scope ([8399621](https://github.com/ForestAdmin/forestadmin-experimental/commit/839962194f113313c63eeb494081f3ca02a52024))
* fix path ([f1f7981](https://github.com/ForestAdmin/forestadmin-experimental/commit/f1f79818dff3435a194db907ee9bb0c94ed01e48))
* fix readme of es datasource ([356d733](https://github.com/ForestAdmin/forestadmin-experimental/commit/356d733cc658bff982d3bb4c85bf59511eba94dd))
* fix semantic release not preprending packagename on tag ([#28](https://github.com/ForestAdmin/forestadmin-experimental/issues/28)) ([0bdcadd](https://github.com/ForestAdmin/forestadmin-experimental/commit/0bdcadd65bce7500bbe3406b9380b9cc7a1ba03a))
* fix testing publication ([f2c0d3a](https://github.com/ForestAdmin/forestadmin-experimental/commit/f2c0d3aa718bca6786ddd46e124d21c70d5b0496))
* fixing ci ([8950d50](https://github.com/ForestAdmin/forestadmin-experimental/commit/8950d5028bd8b2777bfd45c9ab2851e445b28bf3))
* force release ([#87](https://github.com/ForestAdmin/forestadmin-experimental/issues/87)) ([0f64272](https://github.com/ForestAdmin/forestadmin-experimental/commit/0f64272ea68a57fd76234213467a182e8e7774fb))
* force release because the previous fails ([#117](https://github.com/ForestAdmin/forestadmin-experimental/issues/117)) ([c876afc](https://github.com/ForestAdmin/forestadmin-experimental/commit/c876afc55f885f26d424b72da3f45a7802a15c06))
* **forestadmin-experimental:** force a new release  ([#108](https://github.com/ForestAdmin/forestadmin-experimental/issues/108)) ([f723ddd](https://github.com/ForestAdmin/forestadmin-experimental/commit/f723ddd2b7f9627fb2e05e85d9fa8b300e54cc78))
* **gcs-client:** refresh gcs client to support account rollout ([8115020](https://github.com/ForestAdmin/forestadmin-experimental/commit/8115020fd71390f318f6ab0c26a4b52c497b49be))
* improve plugin experience ([#113](https://github.com/ForestAdmin/forestadmin-experimental/issues/113)) ([7ce2843](https://github.com/ForestAdmin/forestadmin-experimental/commit/7ce2843eaddeb1b8ee79b6f9a605eb7231b26dd3))
* improve rpc-agent creation ([d4cc51e](https://github.com/ForestAdmin/forestadmin-experimental/commit/d4cc51ecb925612a4b98bebaf6e9774c9fe67b2e))
* **lint:** fixed lint on livedemo blocker ([#23](https://github.com/ForestAdmin/forestadmin-experimental/issues/23)) ([eee876e](https://github.com/ForestAdmin/forestadmin-experimental/commit/eee876eb8aabef380deb8a2ec75505880150cbee))
* **plugin-define-enum:** release issue ([#85](https://github.com/ForestAdmin/forestadmin-experimental/issues/85)) ([50af8f8](https://github.com/ForestAdmin/forestadmin-experimental/commit/50af8f8e072effb4d145c1ad21fda5c78931fbf1))
* publish datasource-rpc ([5a3dde3](https://github.com/ForestAdmin/forestadmin-experimental/commit/5a3dde382a297afd078b86bd5276e6bcf2dac88c))
* put gcs key file optional ([3c66757](https://github.com/ForestAdmin/forestadmin-experimental/commit/3c66757bb1a708218df10512729631af62fb4f3d))
* readme for filtered relation ([#92](https://github.com/ForestAdmin/forestadmin-experimental/issues/92)) ([b4fd903](https://github.com/ForestAdmin/forestadmin-experimental/commit/b4fd903606a03e505c47f81a322e9c8f240d6aab))
* release datasource-rpc ([2135d1e](https://github.com/ForestAdmin/forestadmin-experimental/commit/2135d1ecbecd3b4172e0ef02d43f5a061fd2625b))
* release datasource-rpc ([8d2a70a](https://github.com/ForestAdmin/forestadmin-experimental/commit/8d2a70afe6f99546fdaa2c7d9b1930a0e3721a26))
* release datasource-rpc ([fc3bff7](https://github.com/ForestAdmin/forestadmin-experimental/commit/fc3bff7a9e5b60af027205a139299530d1114233))
* release rpc-agent ([32ff962](https://github.com/ForestAdmin/forestadmin-experimental/commit/32ff9620546da71d4957d9f142f42954c8277a13))
* release scaffold ([254dd8d](https://github.com/ForestAdmin/forestadmin-experimental/commit/254dd8da4f9baca413f0849021aebcb01b7508eb))
* return the field when id is not provided when using getFormFieldAction ([#118](https://github.com/ForestAdmin/forestadmin-experimental/issues/118)) ([b3b9a1e](https://github.com/ForestAdmin/forestadmin-experimental/commit/b3b9a1ec663b440f29d58cd9dd1f160509186dca))
* rpc action ([717b59f](https://github.com/ForestAdmin/forestadmin-experimental/commit/717b59f12ddd3497057d502c9b535b056d3beb24))
* **scaffold-agent:** solve bad code generation issues ([#7](https://github.com/ForestAdmin/forestadmin-experimental/issues/7)) ([0ed7577](https://github.com/ForestAdmin/forestadmin-experimental/commit/0ed7577bd87ed3d922f4e80787cf04ac9dbec6c9))
* **scaffold-agent:** use relative path when loading templates ([c897ba5](https://github.com/ForestAdmin/forestadmin-experimental/commit/c897ba5ba15d326f014e8f9d0cf2acb1a579dd7c))
* sorting behaviour improvement do not throw on _id sorting just ignores it ([#105](https://github.com/ForestAdmin/forestadmin-experimental/issues/105)) ([69dfeb3](https://github.com/ForestAdmin/forestadmin-experimental/commit/69dfeb38f6bfbce8f8ffa3a6f182c805563546da))
* **testing:** fix the select in the dropdown ([#69](https://github.com/ForestAdmin/forestadmin-experimental/issues/69)) ([0ae9217](https://github.com/ForestAdmin/forestadmin-experimental/commit/0ae9217ff6caa0c13812f6ba9be58081d1992d5c))
* **testing:** re-add missing methods and remove await ([#68](https://github.com/ForestAdmin/forestadmin-experimental/issues/68)) ([306c11d](https://github.com/ForestAdmin/forestadmin-experimental/commit/306c11de6f805372e53705369f0727fe639d96c2))
* update live-demo-blocker ([#25](https://github.com/ForestAdmin/forestadmin-experimental/issues/25)) ([682b18e](https://github.com/ForestAdmin/forestadmin-experimental/commit/682b18ec33fc317f6a81b71c75194d1a249c98a6))
* update toolkit due to breaking changes ([#15](https://github.com/ForestAdmin/forestadmin-experimental/issues/15)) ([56ff203](https://github.com/ForestAdmin/forestadmin-experimental/commit/56ff2032b46d1c8a26e8e5c1a62f02e0cf1ea1e3))
* upgrade version ([6e25393](https://github.com/ForestAdmin/forestadmin-experimental/commit/6e253933aa1cb121edb07c267f06b25547bf301c))
* use native random port when starting a standalone server ([#86](https://github.com/ForestAdmin/forestadmin-experimental/issues/86)) ([6094044](https://github.com/ForestAdmin/forestadmin-experimental/commit/60940444b1af4c4e30d3c1c931d276de83db01fa))
* when there are many records to pass to the targeted action  ([#115](https://github.com/ForestAdmin/forestadmin-experimental/issues/115)) ([ebbcbb1](https://github.com/ForestAdmin/forestadmin-experimental/commit/ebbcbb1d9d9c3c1733703553c35864360282fdb4))


### chore

* **datasource-elasticsearch:** upgrade es to 8.15.0 ([#99](https://github.com/ForestAdmin/forestadmin-experimental/issues/99)) ([994cf85](https://github.com/ForestAdmin/forestadmin-experimental/commit/994cf85ff8c815a97ae19ac23fd8a5581a9216b6))


### Features

* **action field:** define new function to get radio group field ([#64](https://github.com/ForestAdmin/forestadmin-experimental/issues/64)) ([1383a16](https://github.com/ForestAdmin/forestadmin-experimental/commit/1383a160f1fdba90837c7def19b3991ffa7899d5))
* add count method ([#58](https://github.com/ForestAdmin/forestadmin-experimental/issues/58)) ([568e9b3](https://github.com/ForestAdmin/forestadmin-experimental/commit/568e9b3f8158f2e19ce497547eb19c435eb1d599))
* add gcs plugin and download all smart action ([381a897](https://github.com/ForestAdmin/forestadmin-experimental/commit/381a897cefb4ab380a259f3d884959c708e993e0))
* add id/label in action form fields ([#111](https://github.com/ForestAdmin/forestadmin-experimental/issues/111)) ([bc1d794](https://github.com/ForestAdmin/forestadmin-experimental/commit/bc1d7940931eb8adc29986e8382708cf7ce6b26b))
* add openapi-agent ([#132](https://github.com/ForestAdmin/forestadmin-experimental/issues/132)) ([195b584](https://github.com/ForestAdmin/forestadmin-experimental/commit/195b584970f6c88675d193c5ad0bda7db5f11c72))
* add rpc-agent and datasource-rpc packages ([#89](https://github.com/ForestAdmin/forestadmin-experimental/issues/89)) ([0562f9f](https://github.com/ForestAdmin/forestadmin-experimental/commit/0562f9f62b02a7dfdc5686ac516e9b3092921eed))
* add tool to block live demo user on smart action ([a47b925](https://github.com/ForestAdmin/forestadmin-experimental/commit/a47b925ac0b63a74e31cf2175d9ba083b4e9765f))
* add translation hubspot datasource ([#98](https://github.com/ForestAdmin/forestadmin-experimental/issues/98)) ([c18f3a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/c18f3a0542c4fd7b1f321446ef1cb260d0b04cb9))
* **agent-nodejs-testing:** add library ([#14](https://github.com/ForestAdmin/forestadmin-experimental/issues/14)) ([64c4368](https://github.com/ForestAdmin/forestadmin-experimental/commit/64c436809f99521288d701801d99ae6b43dd6682))
* **agent-nodejs-testing:** add use plugin unit tester ([#63](https://github.com/ForestAdmin/forestadmin-experimental/issues/63)) ([b2124a7](https://github.com/ForestAdmin/forestadmin-experimental/commit/b2124a76d8c02909a063ee982dcfcc50c5e95792))
* **agent-tester:** add benchmark function ([#77](https://github.com/ForestAdmin/forestadmin-experimental/issues/77)) ([108dc7c](https://github.com/ForestAdmin/forestadmin-experimental/commit/108dc7cd9c95b847cd25ede1c8d715feaa1ce8fb))
* **agent-tester:** add objective chart ([#73](https://github.com/ForestAdmin/forestadmin-experimental/issues/73)) ([f79356a](https://github.com/ForestAdmin/forestadmin-experimental/commit/f79356a6a0dab814f00b695c384302d0a5150f6c))
* **agent-tester:** add objective chart ([#74](https://github.com/ForestAdmin/forestadmin-experimental/issues/74)) ([5babf38](https://github.com/ForestAdmin/forestadmin-experimental/commit/5babf38148cee535d68ff3ae86c6a0e3ed89f236))
* **agent-tester:** add percentage chart ([#72](https://github.com/ForestAdmin/forestadmin-experimental/issues/72)) ([34cc0b9](https://github.com/ForestAdmin/forestadmin-experimental/commit/34cc0b9cfe5c91287deb043083a20e924b7bf7f3))
* **agent-tester:** add search method ([#76](https://github.com/ForestAdmin/forestadmin-experimental/issues/76)) ([2b1d70e](https://github.com/ForestAdmin/forestadmin-experimental/commit/2b1d70e0c9e4d04e363d18be3ab18d8ae04f96e1))
* **agent-tester:** add time based chart  ([#75](https://github.com/ForestAdmin/forestadmin-experimental/issues/75)) ([6b31f73](https://github.com/ForestAdmin/forestadmin-experimental/commit/6b31f73633ec8e19a545f1684f5d18c132f72b20))
* **agent-tester:** add update method on collection ([#71](https://github.com/ForestAdmin/forestadmin-experimental/issues/71)) ([fc25bb8](https://github.com/ForestAdmin/forestadmin-experimental/commit/fc25bb8beb27b0b2a47eb93aefce23e993053dac))
* **agent-tester:** allow user to test the layout  ([#116](https://github.com/ForestAdmin/forestadmin-experimental/issues/116)) ([28871a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/28871a0b10d470cd9d853a51bdb410b44bdac450))
* **agent-testing:** add helper to test if condition in action form ([#41](https://github.com/ForestAdmin/forestadmin-experimental/issues/41)) ([d8d494b](https://github.com/ForestAdmin/forestadmin-experimental/commit/d8d494b8a8d92fd231ee9e35c89115588ff47cd7))
* **agent-testing:** add number field helper ([#44](https://github.com/ForestAdmin/forestadmin-experimental/issues/44)) ([58b5f61](https://github.com/ForestAdmin/forestadmin-experimental/commit/58b5f6123ae31c2f15d9e5bf644e7fbaecb7a206))
* **agent-testing:** pass customizer to create factory to simplify UX ([#51](https://github.com/ForestAdmin/forestadmin-experimental/issues/51)) ([e65038a](https://github.com/ForestAdmin/forestadmin-experimental/commit/e65038a3aa121d9e09c74f567114ddf6f0897cf6))
* allow forest fieldschema overrides with elasticsearch ([#33](https://github.com/ForestAdmin/forestadmin-experimental/issues/33)) ([2f638f5](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f638f529beeaf508394cc034ec84eb640ba68ab))
* allow to add tests on search ([e9588e4](https://github.com/ForestAdmin/forestadmin-experimental/commit/e9588e478224d708893eb238505b8a106d93975b))
* allow to add tests on search ([#59](https://github.com/ForestAdmin/forestadmin-experimental/issues/59)) ([e45a7b5](https://github.com/ForestAdmin/forestadmin-experimental/commit/e45a7b5eab3d530212e418451c6c5340fb9c89a8))
* allow user to test any agent stack (python, nodeJs, php, ruby) ([#119](https://github.com/ForestAdmin/forestadmin-experimental/issues/119)) ([da7b9a7](https://github.com/ForestAdmin/forestadmin-experimental/commit/da7b9a7e9fcbb5fc647bd230b5a0f4d4cc26858c))
* **datasource hubspot:** enable pagination ([#124](https://github.com/ForestAdmin/forestadmin-experimental/issues/124)) ([533e754](https://github.com/ForestAdmin/forestadmin-experimental/commit/533e754771519046b83d1cd6958aa1dd34d4e660))
* **datasource-elasticsearch:** add elasticsearch datasource ([0402c24](https://github.com/ForestAdmin/forestadmin-experimental/commit/0402c249a26e9516d257b1f4cacee4a773d37c8f))
* **datasource-elasticsearch:** first commit ([12bb665](https://github.com/ForestAdmin/forestadmin-experimental/commit/12bb6659aaca3b15b89dc3423db33dc87dc65c36))
* **datasource-rpc:** handle datasource api chart ([6a370c6](https://github.com/ForestAdmin/forestadmin-experimental/commit/6a370c6707eccb0173b3538b0e33d4b764b2ee4d))
* **define-enum:** create a plugin for creating enum fields over an existing field ([#83](https://github.com/ForestAdmin/forestadmin-experimental/issues/83)) ([5f8b784](https://github.com/ForestAdmin/forestadmin-experimental/commit/5f8b784dda7a46a7c83a0f380b1841161b33bdb1))
* **define-enum:** create a plugin for creating enum fields over an existing field ([#84](https://github.com/ForestAdmin/forestadmin-experimental/issues/84)) ([c9e8e57](https://github.com/ForestAdmin/forestadmin-experimental/commit/c9e8e57dbfcaa1f49e315f65e87d1c062f066423))
* **ds-elasticsearch:** support for native query sql [breaking] ([#125](https://github.com/ForestAdmin/forestadmin-experimental/issues/125)) ([3c371f4](https://github.com/ForestAdmin/forestadmin-experimental/commit/3c371f4c2e59252c545bff0689f5f6f69b0e4fbd))
* **elasticsearch:** allow to configure count on collection ([#39](https://github.com/ForestAdmin/forestadmin-experimental/issues/39)) ([7bd39c2](https://github.com/ForestAdmin/forestadmin-experimental/commit/7bd39c29129aca64345b45b4f75a5cb3592e2b06))
* **elasticsearch:** bring back eleasticsearch enhanced ([#30](https://github.com/ForestAdmin/forestadmin-experimental/issues/30)) ([27d9ef4](https://github.com/ForestAdmin/forestadmin-experimental/commit/27d9ef47227e92eab18cb3d0b483c1ceb9463317))
* **elasticsearch:** deploy elasticsearch package ([#31](https://github.com/ForestAdmin/forestadmin-experimental/issues/31)) ([b189e60](https://github.com/ForestAdmin/forestadmin-experimental/commit/b189e601d0ea46f86081522c0b2e626a697ce24f))
* **elasticsearch:** release support of v8 ([#102](https://github.com/ForestAdmin/forestadmin-experimental/issues/102)) ([c6f101c](https://github.com/ForestAdmin/forestadmin-experimental/commit/c6f101ca4c2a9f9d7e51218bae59c5e56886886c))
* **elasticsearch:** release support of v8 and drop support of v7 ([#104](https://github.com/ForestAdmin/forestadmin-experimental/issues/104)) ([bb348b1](https://github.com/ForestAdmin/forestadmin-experimental/commit/bb348b1749518a8e85570c9fb1f7e812a31b4774))
* **filtered relationship:** add option to select origin key target ([#131](https://github.com/ForestAdmin/forestadmin-experimental/issues/131)) ([37b0d38](https://github.com/ForestAdmin/forestadmin-experimental/commit/37b0d383ffdebb560357c4039f1dd13167e8480e))
* **gcs:** add plugin to display bucket files and manage bulk download ([8cf34ad](https://github.com/ForestAdmin/forestadmin-experimental/commit/8cf34ad1fa3fb504a43c5be06748be5128f7fecc))
* **hubspot:** add hubspot datasource ([3edc175](https://github.com/ForestAdmin/forestadmin-experimental/commit/3edc175164297c49fe899782bbf207c307fc029c))
* **hubspot:** add hubspot datasource ([a351fd6](https://github.com/ForestAdmin/forestadmin-experimental/commit/a351fd6aa5bd458f0999dbff452f8b00bfc84ceb))
* improve the readme and improve function naming ([#122](https://github.com/ForestAdmin/forestadmin-experimental/issues/122)) ([150ce74](https://github.com/ForestAdmin/forestadmin-experimental/commit/150ce7498b4d5087d95b66e44afe983717e0d710))
* more testable action fields ([#81](https://github.com/ForestAdmin/forestadmin-experimental/issues/81)) ([eddcadb](https://github.com/ForestAdmin/forestadmin-experimental/commit/eddcadb07317bdd4390910cb55fec395b00e0e7e))
* mv async to action getter to improve the syntaxes ([#67](https://github.com/ForestAdmin/forestadmin-experimental/issues/67)) ([a7df8c9](https://github.com/ForestAdmin/forestadmin-experimental/commit/a7df8c9e85c7643b9f7f9fd7ed1baf1faac5e6de))
* **plugin:** new filtered relationship plugin ([#90](https://github.com/ForestAdmin/forestadmin-experimental/issues/90)) ([0b8f37e](https://github.com/ForestAdmin/forestadmin-experimental/commit/0b8f37ee6e2d21f492db8b089a5e1101f37c9eed))
* **rename-all-fields:** add a new plugin to rename all fields automatically ([#112](https://github.com/ForestAdmin/forestadmin-experimental/issues/112)) ([7939dc2](https://github.com/ForestAdmin/forestadmin-experimental/commit/7939dc2b4f4ffcc58e28f8b2a8117bcce58f033d))
* **rpc-agent:** allow rpc spaghetti ([#126](https://github.com/ForestAdmin/forestadmin-experimental/issues/126)) ([40a18f3](https://github.com/ForestAdmin/forestadmin-experimental/commit/40a18f3fb3168cb1db63a633bbcf2743ba987859))
* **rpc-agent:** handle datasource api chart ([64b7956](https://github.com/ForestAdmin/forestadmin-experimental/commit/64b795699c24a39af21eecabe36900c86df96d0a))
* **scaffold-agent:** add tool to scaffold new agents ([#6](https://github.com/ForestAdmin/forestadmin-experimental/issues/6)) ([a7244b8](https://github.com/ForestAdmin/forestadmin-experimental/commit/a7244b8fe081101ff87dfc45390b2cdae500a6ba))
* **testing:** add create method and replaceFieldWriting example ([#57](https://github.com/ForestAdmin/forestadmin-experimental/issues/57)) ([a3707da](https://github.com/ForestAdmin/forestadmin-experimental/commit/a3707dad48ccabca8cea6205ea7f48e4e89aa668))
* **testing:** add more integration testing capabilities ([#65](https://github.com/ForestAdmin/forestadmin-experimental/issues/65)) ([99dc217](https://github.com/ForestAdmin/forestadmin-experimental/commit/99dc21779893ce05e987a1fec6391b6e08361b01))
* **testing:** feat add value chart and distribution chart ([#56](https://github.com/ForestAdmin/forestadmin-experimental/issues/56)) ([16eef34](https://github.com/ForestAdmin/forestadmin-experimental/commit/16eef349d4b097d0a768fa63fb83876338783da9))


### Performance Improvements

* **elasticsearch:** use bulk capability to improve performances ([#36](https://github.com/ForestAdmin/forestadmin-experimental/issues/36)) ([882d8be](https://github.com/ForestAdmin/forestadmin-experimental/commit/882d8bed19bdea6212534a22292d489fc0e984ae))


### BREAKING CHANGES

* **elasticsearch:** Support elasticsearch v8 and remove support of v7
* **datasource-elasticsearch:** Support elasticsearch v8 and remove support of v7
Co-authored-by: Thenkei <morganperre@gmail.com>
* collection->action MUST be awaited to ease action form fields testing
