#!/usr/bin/env node

const {getSpawnPromise} = require('@s-ui/helpers/cli')
const path = require('path')
const fs = require('fs')

/** In order to ensure this could work on postinstall script and also manually
 * we neet to check if INIT_CWD is available and use it instead cwd
 * as on postinstall the cwd will change
 */
const {INIT_CWD} = process.env
const cwd = INIT_CWD || process.cwd()
const pkgPath = path.join(cwd, 'package.json')

const DEFAULT_PKG_FIELD = 'scripts'
const HUSKY_VERSION = '4.2.5'

installHuskyIfNotInstalled()
  .then(function() {
    addToPackageJson('lint', 'sui-lint js && sui-lint sass')
    addToPackageJson('pre-commit', 'sui-precommit run', 'hooks')
    removeFromPackageJson('precommit')
  })
  .catch(function(err) {
    log(err.message)
    log('sui-precommit installation has FAILED.')
    process.exit(1)
  })

function log(...args) {
  /* eslint-disable no-console */
  args[0] = '[sui-precommit] ' + args[0]
  console.log(...args)
}

/**
 * Read package.json file
 * @returns {object} Package.json content in JSON format
 */
function readPackageJson() {
  return JSON.parse(fs.readFileSync(pkgPath, {encoding: 'utf8'}))
}

/**
 * Add script on package.json where command was executed
 * @param  {string}  name   script name
 * @param  {string}  script command to execute
 * @param  {string?}  field  field where the script must be added
 **/
function addToPackageJson(name, script, field = DEFAULT_PKG_FIELD) {
  const pkg = readPackageJson()
  pkg[field] = pkg[field] || {}

  pkg[field][name] = script
  log(`Writing "${name}" on "${field}"...`)

  writePackageJson(pkg)
}

/**
 * Add script on package.json where command was executed
 * @param  {string}  name   script name
 * @param  {string}  field  field where the script is
 **/
function removeFromPackageJson(name, field = DEFAULT_PKG_FIELD) {
  const pkg = readPackageJson()
  pkg[field] = pkg[field] || {}

  const {[name]: remove, ...rest} = pkg[field]
  pkg[field] = rest
  log(`"${name}" removed from "${field}". Writing changes...`)

  writePackageJson(pkg)
}

/**
 * Write package.json file where command was executed
 * @param {object} pkg New package content to be write on the file
 */
function writePackageJson(pkg) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), {encoding: 'utf8'})
}

/**
 * Install husky on project
 * @return {Promise<number>}
 */
function installHuskyIfNotInstalled() {
  if (!isHuskyInstalled()) {
    log('husky will be installed to allow git hook integration with node')
    return getSpawnPromise(
      'npm',
      ['install', `husky@${HUSKY_VERSION}`, '--save-dev', '--save-exact'],
      {cwd}
    )
  } else {
    return Promise.resolve(0)
  }
}

/**
 * Get if husky is already installed with the expected version
 * @return {Boolean}
 */
function isHuskyInstalled() {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, {encoding: 'utf8'}))
  const huskyDependency = pkg.devDependencies && pkg.devDependencies.husky
  return huskyDependency === HUSKY_VERSION
}
