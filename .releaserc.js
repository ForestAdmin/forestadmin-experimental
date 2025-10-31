module.exports = {
  branches: [
    'main',
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          // Example: `type(scope): subject [force release]`
          { subject: '*\\[force release\\]*', release: 'patch' },
          // Example: `type(scope): subject [force-release]`
          { subject: '*\\[force-release\\]*', release: 'patch' },
        ],
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: false, // Disable semantic-release npm publish, use npm CLI instead
      },
    ],
    [
      '@semantic-release/exec',
      {
        publishCmd: 'npm publish --provenance --access public',
      },
    ],
    [
      '@semantic-release/git',
      {
        message: 'chore(release): ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}',
      },
    ]
  ],
};
