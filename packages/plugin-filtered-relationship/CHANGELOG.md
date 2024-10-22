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
