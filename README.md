# forestadmin-experimental

You can now use the `forest-experimental` repository to create plugins that will be automagically published on npm.

With the implemented strategy, you can benefit from a lot of default behavior, but still benefit from some high level of customizations in all those steps.

## NX

This repository is using NX to manage the monorepo. You can find more information about NX here: https://nx.dev/

With NX, you can run `npx nx affected -t lint test build` to run the lint, test & build task locally. `nx affected` will only trigger those steps for the packages that were modified.

As the repository is meant to ease the publication of experimental features, all the following CI/CD scripts **aren't** required.

## How to use the CI/CD pipeline 

### You want to run test?

Just add `"test": "jest"` in your package.json file. Jest is already installed in the workspace folder, so no need to add it manually in your package.
You'll also most likely need to copy/paste a `jest.config.ts` from another plugin or datasource to be fully setup.

### You want some lint?

Just add `"lint": "eslint src"` in your package.json and you should be good to go.
Eslint is already installed in the workspace folder, so no need to add it manually in your package. It should be already setup with the usual `agent-nodejs` rules.

### You want to publish to npm?

Just add `"publish:package": "semantic-release"` in your package.json. Semantic release is already installed in the workspace folder, so no need to add it manually in your package.
You'll also need to copy paste a `.releaserc.js` from another plugin or datasource to be fully setup.


## Plugins & datasources available


The repository is a sort of sandbox where we can experiment new features, new plugins, new datasources, etc.

This can be a good source of examples for the community.

[datasource-elasticsearch](https://github.com/ForestAdmin/forestadmin-experimental/tree/main/packages/datasource-elasticsearch)

[datasource-hubspot](https://github.com/ForestAdmin/forestadmin-experimental/tree/main/packages/datasource-hubspot)

[live-demo-blocker](https://github.com/ForestAdmin/forestadmin-experimental/tree/main/packages/live-demo-blocker)

[plugin-gcs](https://github.com/ForestAdmin/forestadmin-experimental/tree/main/packages/plugin-gcs)

[scaffold-agent](https://github.com/ForestAdmin/forestadmin-experimental/tree/main/packages/scaffold-agent)

