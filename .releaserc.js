module.exports = {
  branches: [
    'main',
  ],
  plugins: [
    [
      '@semantic-release/exec',
      {
        analyzeCommitsCmd:  "./commit-analyser.sh"
      },
    ],
    '@semantic-release/npm',
    [
      '@semantic-release/git',
      {
        message: 'chore(release): ${nextRelease.gitTag} [skip ci]\n\n${nextRelease.notes}',
      },
    ]
  ],
};
