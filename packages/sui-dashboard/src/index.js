const fg = require('fast-glob')

const flat = arr => [].concat(...arr)

module.exports.stats = async ({repositories, root, dry}) => {
  const suiComponents = fg
    .sync([
      `${root}/sui-components/components/**/package.json`,
      '!**/node_modules/**'
    ])
    .map(path => require(path).name)

  const componentsInstalled = flat(
    repositories.map(repo => [
      `${root}/${repo}/node_modules/@s-ui/*`,
      `${root}/${repo}/node_modules/@schibstedspain/*`
    ])
  )

  const dirs = fg.sync(componentsInstalled, {onlyDirectories: true})

  const statsSUIComponentUsedInProjects = suiComponents.reduce(
    (acc, component) => {
      acc[component] = dirs
        .filter(dir => dir.includes(component))
        .map(dir =>
          dir.replace(root, '').replace(/(?<repo>[a-z|-]+)\/.*/, '$<repo>')
        )
      return acc
    },
    {}
  )

  const statsSUIComponentUsedByProjects = repositories.reduce((acc, repo) => {
    acc[repo] = dirs
      .filter(dir => dir.includes(repo))
      .filter(dir => suiComponents.some(sui => dir.includes(sui)))
      .map(dir => dir.replace(/^.+(?<comp>@[a-z|-]+\/[a-z|-]+$)/, '$<comp>'))
    return acc
  }, {})

  const partialStats = {
    statsSUIComponentUsedInProjects,
    statsSUIComponentUsedByProjects,
    suiStats: {
      totalSUIComponents: Object.keys(statsSUIComponentUsedInProjects).length,
      totalReusedSUIComponents: Object.values(
        statsSUIComponentUsedInProjects
      ).reduce((acc, list) => (acc += list.length), 0),
      maxPossible:
        Object.keys(statsSUIComponentUsedInProjects).length *
        repositories.length
    }
  }

  return {
    ...partialStats,
    suiStats: {
      ...partialStats.suiStats,
      percentage:
        Math.ceil(
          (partialStats.suiStats.totalSUIComponents * 100) /
            partialStats.suiStats.maxPossible
        ) + '%'
    }
  }
}
