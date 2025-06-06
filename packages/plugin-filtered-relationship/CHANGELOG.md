# [2.8.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.7.0...plugin-filtered-relationship@2.8.0) (2025-05-12)


### Features

* **rpc:** improve communication protocol ([#130](https://github.com/ForestAdmin/forestadmin-experimental/issues/130)) ([490585e](https://github.com/ForestAdmin/forestadmin-experimental/commit/490585eae26cde776d423f66b3bcf079fbbbb637))

# [2.7.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.6.0...plugin-filtered-relationship@2.7.0) (2025-04-16)


### Bug Fixes

* **agent-tester:** fix type for isRequired ([#134](https://github.com/ForestAdmin/forestadmin-experimental/issues/134)) ([95d0c2c](https://github.com/ForestAdmin/forestadmin-experimental/commit/95d0c2ca9428cc9a5be2ccded9d5ef2e250958b5))
* **rpc datasource:** handle basic SA form ([#135](https://github.com/ForestAdmin/forestadmin-experimental/issues/135)) ([1c687d3](https://github.com/ForestAdmin/forestadmin-experimental/commit/1c687d339ae102b0c986159b417d6b7e15fab63a))


### Features

* **agent-tester:** add isRequired getter on action fields ([#133](https://github.com/ForestAdmin/forestadmin-experimental/issues/133)) ([a6778af](https://github.com/ForestAdmin/forestadmin-experimental/commit/a6778af0af30445aaa0c837d6318f0bfa4f601da))

# [2.6.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.5.0...plugin-filtered-relationship@2.6.0) (2025-04-08)


### Bug Fixes

* **filtered relationship:** now work with collection with different pk type ([2f18851](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f18851e688109e49c5f92e468f003779a330e99))


### Features

* add openapi-agent ([#132](https://github.com/ForestAdmin/forestadmin-experimental/issues/132)) ([195b584](https://github.com/ForestAdmin/forestadmin-experimental/commit/195b584970f6c88675d193c5ad0bda7db5f11c72))

# [2.5.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.4.0...plugin-filtered-relationship@2.5.0) (2025-03-24)


### Bug Fixes

* **agent nodejs testing:** action enum field check ([#128](https://github.com/ForestAdmin/forestadmin-experimental/issues/128)) ([997644a](https://github.com/ForestAdmin/forestadmin-experimental/commit/997644a75b1bc95d6201acc099cfe49072951240))
* **agent-tester:** fix mock server ([#127](https://github.com/ForestAdmin/forestadmin-experimental/issues/127)) ([ab1983d](https://github.com/ForestAdmin/forestadmin-experimental/commit/ab1983d5ed8854f901658f382e241b1f5f12bf17))
* change enum function name ([ce0323e](https://github.com/ForestAdmin/forestadmin-experimental/commit/ce0323ee0dcb0e7cca5e56d8c64244275ca91d14))
* release datasource-rpc ([2135d1e](https://github.com/ForestAdmin/forestadmin-experimental/commit/2135d1ecbecd3b4172e0ef02d43f5a061fd2625b))


### Features

* **filtered relationship:** add option to select origin key target ([#131](https://github.com/ForestAdmin/forestadmin-experimental/issues/131)) ([37b0d38](https://github.com/ForestAdmin/forestadmin-experimental/commit/37b0d383ffdebb560357c4039f1dd13167e8480e))

# [2.4.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.3.0...plugin-filtered-relationship@2.4.0) (2025-01-16)


### Features

* **rpc-agent:** allow rpc spaghetti ([#126](https://github.com/ForestAdmin/forestadmin-experimental/issues/126)) ([40a18f3](https://github.com/ForestAdmin/forestadmin-experimental/commit/40a18f3fb3168cb1db63a633bbcf2743ba987859))

# [2.3.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.2.0...plugin-filtered-relationship@2.3.0) (2025-01-02)


### Features

* **datasource hubspot:** enable pagination ([#124](https://github.com/ForestAdmin/forestadmin-experimental/issues/124)) ([533e754](https://github.com/ForestAdmin/forestadmin-experimental/commit/533e754771519046b83d1cd6958aa1dd34d4e660))
* **ds-elasticsearch:** support for native query sql [breaking] ([#125](https://github.com/ForestAdmin/forestadmin-experimental/issues/125)) ([3c371f4](https://github.com/ForestAdmin/forestadmin-experimental/commit/3c371f4c2e59252c545bff0689f5f6f69b0e4fbd))

# [2.2.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.1.0...plugin-filtered-relationship@2.2.0) (2024-12-04)


### Bug Fixes

* allow bottleneck config ([#121](https://github.com/ForestAdmin/forestadmin-experimental/issues/121)) ([1b8c5fb](https://github.com/ForestAdmin/forestadmin-experimental/commit/1b8c5fbc9ee67cf3551d7880217023276e62ecfb))
* **datasource hubspot:** return empty record when api throw 404 ([#123](https://github.com/ForestAdmin/forestadmin-experimental/issues/123)) ([cc321a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/cc321a0294e38a46a057b0698d2c35c1ac394364))
* force release because the previous fails ([#117](https://github.com/ForestAdmin/forestadmin-experimental/issues/117)) ([c876afc](https://github.com/ForestAdmin/forestadmin-experimental/commit/c876afc55f885f26d424b72da3f45a7802a15c06))
* return the field when id is not provided when using getFormFieldAction ([#118](https://github.com/ForestAdmin/forestadmin-experimental/issues/118)) ([b3b9a1e](https://github.com/ForestAdmin/forestadmin-experimental/commit/b3b9a1ec663b440f29d58cd9dd1f160509186dca))


### Features

* allow user to test any agent stack (python, nodeJs, php, ruby) ([#119](https://github.com/ForestAdmin/forestadmin-experimental/issues/119)) ([da7b9a7](https://github.com/ForestAdmin/forestadmin-experimental/commit/da7b9a7e9fcbb5fc647bd230b5a0f4d4cc26858c))
* improve the readme and improve function naming ([#122](https://github.com/ForestAdmin/forestadmin-experimental/issues/122)) ([150ce74](https://github.com/ForestAdmin/forestadmin-experimental/commit/150ce7498b4d5087d95b66e44afe983717e0d710))

# [2.1.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@2.0.0...plugin-filtered-relationship@2.1.0) (2024-10-31)


### Bug Fixes

* **cd:** datasource hubspot translation ([64d0bff](https://github.com/ForestAdmin/forestadmin-experimental/commit/64d0bffbec9547c3dd2a0104e0ab940ff1d79040))
* **datasource hubspot:** change log on introspection ([6669e5f](https://github.com/ForestAdmin/forestadmin-experimental/commit/6669e5fb07200a7952537cfb87c84eeab97471b7))
* **datasource hubspot:** warn typo ([4f80fb1](https://github.com/ForestAdmin/forestadmin-experimental/commit/4f80fb13d65cd79c8bf0ae8c50ded878ce8a3e21))
* when there are many records to pass to the targeted action  ([#115](https://github.com/ForestAdmin/forestadmin-experimental/issues/115)) ([ebbcbb1](https://github.com/ForestAdmin/forestadmin-experimental/commit/ebbcbb1d9d9c3c1733703553c35864360282fdb4))


### Features

* **agent-tester:** allow user to test the layout  ([#116](https://github.com/ForestAdmin/forestadmin-experimental/issues/116)) ([28871a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/28871a0b10d470cd9d853a51bdb410b44bdac450))

# [2.0.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/plugin-filtered-relationship@1.0.4...plugin-filtered-relationship@2.0.0) (2024-10-22)


### Bug Fixes

* **agent-nodejs-testing:** add missing support to unit testable agent ([#106](https://github.com/ForestAdmin/forestadmin-experimental/issues/106)) ([403c48d](https://github.com/ForestAdmin/forestadmin-experimental/commit/403c48d0bdbdbd4c5f7cefa3347a89bcb78416cd))
* **agent-nodejs-testing:** peer dependency issues ([#107](https://github.com/ForestAdmin/forestadmin-experimental/issues/107)) ([460ec91](https://github.com/ForestAdmin/forestadmin-experimental/commit/460ec919538f7aa678bc79fc9d60cbf051fba297))
* **cd:** it should behave correctly ([#110](https://github.com/ForestAdmin/forestadmin-experimental/issues/110)) ([02d7d2f](https://github.com/ForestAdmin/forestadmin-experimental/commit/02d7d2f3624d08be1432faac4a422f315e60f34f))
* **datasource hubspot:** fix release ([d4b49e5](https://github.com/ForestAdmin/forestadmin-experimental/commit/d4b49e58de8a03896678402026f2389338299144))
* **datasource-rpc:** follow improvment of rpc-agent creation ([c65fea5](https://github.com/ForestAdmin/forestadmin-experimental/commit/c65fea549d560c644026b52b1d1ebf5c290f2eed))
* deployment ([#109](https://github.com/ForestAdmin/forestadmin-experimental/issues/109)) ([2f887e0](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f887e06f6aaf6eef02c9dc85b3872f877b947a7))
* **elasticsearch:** avoid sorting on _id internal field ([#101](https://github.com/ForestAdmin/forestadmin-experimental/issues/101)) ([9670989](https://github.com/ForestAdmin/forestadmin-experimental/commit/967098923b59f0ce8bd5be096d78d74cfda46fc3))
* **forestadmin-experimental:** force a new release  ([#108](https://github.com/ForestAdmin/forestadmin-experimental/issues/108)) ([f723ddd](https://github.com/ForestAdmin/forestadmin-experimental/commit/f723ddd2b7f9627fb2e05e85d9fa8b300e54cc78))
* improve plugin experience ([#113](https://github.com/ForestAdmin/forestadmin-experimental/issues/113)) ([7ce2843](https://github.com/ForestAdmin/forestadmin-experimental/commit/7ce2843eaddeb1b8ee79b6f9a605eb7231b26dd3))
* improve rpc-agent creation ([d4cc51e](https://github.com/ForestAdmin/forestadmin-experimental/commit/d4cc51ecb925612a4b98bebaf6e9774c9fe67b2e))
* publish datasource-rpc ([5a3dde3](https://github.com/ForestAdmin/forestadmin-experimental/commit/5a3dde382a297afd078b86bd5276e6bcf2dac88c))
* release datasource-rpc ([8d2a70a](https://github.com/ForestAdmin/forestadmin-experimental/commit/8d2a70afe6f99546fdaa2c7d9b1930a0e3721a26))
* release datasource-rpc ([fc3bff7](https://github.com/ForestAdmin/forestadmin-experimental/commit/fc3bff7a9e5b60af027205a139299530d1114233))
* release rpc-agent ([32ff962](https://github.com/ForestAdmin/forestadmin-experimental/commit/32ff9620546da71d4957d9f142f42954c8277a13))
* rpc action ([717b59f](https://github.com/ForestAdmin/forestadmin-experimental/commit/717b59f12ddd3497057d502c9b535b056d3beb24))
* sorting behaviour improvement do not throw on _id sorting just ignores it ([#105](https://github.com/ForestAdmin/forestadmin-experimental/issues/105)) ([69dfeb3](https://github.com/ForestAdmin/forestadmin-experimental/commit/69dfeb38f6bfbce8f8ffa3a6f182c805563546da))


### chore

* **datasource-elasticsearch:** upgrade es to 8.15.0 ([#99](https://github.com/ForestAdmin/forestadmin-experimental/issues/99)) ([994cf85](https://github.com/ForestAdmin/forestadmin-experimental/commit/994cf85ff8c815a97ae19ac23fd8a5581a9216b6))


### Features

* add id/label in action form fields ([#111](https://github.com/ForestAdmin/forestadmin-experimental/issues/111)) ([bc1d794](https://github.com/ForestAdmin/forestadmin-experimental/commit/bc1d7940931eb8adc29986e8382708cf7ce6b26b))
* add rpc-agent and datasource-rpc packages ([#89](https://github.com/ForestAdmin/forestadmin-experimental/issues/89)) ([0562f9f](https://github.com/ForestAdmin/forestadmin-experimental/commit/0562f9f62b02a7dfdc5686ac516e9b3092921eed))
* add translation hubspot datasource ([#98](https://github.com/ForestAdmin/forestadmin-experimental/issues/98)) ([c18f3a0](https://github.com/ForestAdmin/forestadmin-experimental/commit/c18f3a0542c4fd7b1f321446ef1cb260d0b04cb9))
* **datasource-rpc:** handle datasource api chart ([6a370c6](https://github.com/ForestAdmin/forestadmin-experimental/commit/6a370c6707eccb0173b3538b0e33d4b764b2ee4d))
* **elasticsearch:** release support of v8 ([#102](https://github.com/ForestAdmin/forestadmin-experimental/issues/102)) ([c6f101c](https://github.com/ForestAdmin/forestadmin-experimental/commit/c6f101ca4c2a9f9d7e51218bae59c5e56886886c))
* **elasticsearch:** release support of v8 and drop support of v7 ([#104](https://github.com/ForestAdmin/forestadmin-experimental/issues/104)) ([bb348b1](https://github.com/ForestAdmin/forestadmin-experimental/commit/bb348b1749518a8e85570c9fb1f7e812a31b4774))
* **rename-all-fields:** add a new plugin to rename all fields automatically ([#112](https://github.com/ForestAdmin/forestadmin-experimental/issues/112)) ([7939dc2](https://github.com/ForestAdmin/forestadmin-experimental/commit/7939dc2b4f4ffcc58e28f8b2a8117bcce58f033d))
* **rpc-agent:** handle datasource api chart ([64b7956](https://github.com/ForestAdmin/forestadmin-experimental/commit/64b795699c24a39af21eecabe36900c86df96d0a))


### BREAKING CHANGES

* **elasticsearch:** Support elasticsearch v8 and remove support of v7
* **datasource-elasticsearch:** Support elasticsearch v8 and remove support of v7
Co-authored-by: Thenkei <morganperre@gmail.com>
