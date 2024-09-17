# [2.0.0](https://github.com/ForestAdmin/forestadmin-experimental/compare/rpc-agent@1.1.1...rpc-agent@2.0.0) (2024-09-17)


### Bug Fixes

* **agent-nodejs-testing:** add missing support to unit testable agent ([#106](https://github.com/ForestAdmin/forestadmin-experimental/issues/106)) ([403c48d](https://github.com/ForestAdmin/forestadmin-experimental/commit/403c48d0bdbdbd4c5f7cefa3347a89bcb78416cd))
* **agent-nodejs-testing:** peer dependency issues ([#107](https://github.com/ForestAdmin/forestadmin-experimental/issues/107)) ([460ec91](https://github.com/ForestAdmin/forestadmin-experimental/commit/460ec919538f7aa678bc79fc9d60cbf051fba297))
* **cd:** it should behave correctly ([#110](https://github.com/ForestAdmin/forestadmin-experimental/issues/110)) ([02d7d2f](https://github.com/ForestAdmin/forestadmin-experimental/commit/02d7d2f3624d08be1432faac4a422f315e60f34f))
* **datasource-rpc:** follow improvment of rpc-agent creation ([c65fea5](https://github.com/ForestAdmin/forestadmin-experimental/commit/c65fea549d560c644026b52b1d1ebf5c290f2eed))
* deployment ([#109](https://github.com/ForestAdmin/forestadmin-experimental/issues/109)) ([2f887e0](https://github.com/ForestAdmin/forestadmin-experimental/commit/2f887e06f6aaf6eef02c9dc85b3872f877b947a7))
* **elasticsearch:** avoid sorting on _id internal field ([#101](https://github.com/ForestAdmin/forestadmin-experimental/issues/101)) ([9670989](https://github.com/ForestAdmin/forestadmin-experimental/commit/967098923b59f0ce8bd5be096d78d74cfda46fc3))
* **forestadmin-experimental:** force a new release  ([#108](https://github.com/ForestAdmin/forestadmin-experimental/issues/108)) ([f723ddd](https://github.com/ForestAdmin/forestadmin-experimental/commit/f723ddd2b7f9627fb2e05e85d9fa8b300e54cc78))
* sorting behaviour improvement do not throw on _id sorting just ignores it ([#105](https://github.com/ForestAdmin/forestadmin-experimental/issues/105)) ([69dfeb3](https://github.com/ForestAdmin/forestadmin-experimental/commit/69dfeb38f6bfbce8f8ffa3a6f182c805563546da))


### chore

* **datasource-elasticsearch:** upgrade es to 8.15.0 ([#99](https://github.com/ForestAdmin/forestadmin-experimental/issues/99)) ([994cf85](https://github.com/ForestAdmin/forestadmin-experimental/commit/994cf85ff8c815a97ae19ac23fd8a5581a9216b6))


### Features

* **elasticsearch:** release support of v8 ([#102](https://github.com/ForestAdmin/forestadmin-experimental/issues/102)) ([c6f101c](https://github.com/ForestAdmin/forestadmin-experimental/commit/c6f101ca4c2a9f9d7e51218bae59c5e56886886c))
* **elasticsearch:** release support of v8 and drop support of v7 ([#104](https://github.com/ForestAdmin/forestadmin-experimental/issues/104)) ([bb348b1](https://github.com/ForestAdmin/forestadmin-experimental/commit/bb348b1749518a8e85570c9fb1f7e812a31b4774))


### BREAKING CHANGES

* **elasticsearch:** Support elasticsearch v8 and remove support of v7
* **datasource-elasticsearch:** Support elasticsearch v8 and remove support of v7
Co-authored-by: Thenkei <morganperre@gmail.com>
