import express from 'express'
import ssr from './ssr'
import criticalCss from './criticalCss'
import dynamicRendering from './dynamicRendering'
import {hooksFactory} from './hooksFactory'
import TYPES from '../hooks-types'
import basicAuth from 'express-basic-auth'
import path from 'path'
import fs from 'fs'
import jsYaml from 'js-yaml'
import parseDomain from 'parse-domain'
import compression from 'compression'

let ssrConf
try {
  const spaConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  )
  const {config = {}} = spaConfig
  ssrConf = config['sui-ssr'] || {}
} catch (e) {
  ssrConf = {}
}

const app = express()

app.set('x-powered-by', false)

// Read public env vars from public-env.yml file and make them available for
// middlewares by adding them to app.locals
try {
  const publicEnvFile = fs.readFileSync(
    path.join(process.cwd(), 'public-env.yml'),
    'utf8'
  )
  app.locals.publicEnvConfig = jsYaml.safeLoad(publicEnvFile)
} catch (err) {
  app.locals.publicEnvConfig = {}
}

// Read early-flush config.
// true: will flush before getInitialProps() was called favoring TTFB
// false: will flush after getInitialProps() was called
const EARLY_FLUSH_DEFAULT = true
app.locals.earlyFlush =
  typeof ssrConf.earlyFlush !== 'undefined'
    ? ssrConf.earlyFlush
    : EARLY_FLUSH_DEFAULT

// Error pages usage
// false: will try to load 4xx / 5xx pages
// true: will return index.html for any error
const LOAD_SPA_ON_404_DEFAULT = false
app.locals.loadSPAOnNotFound =
  typeof ssrConf.loadSPAOnNotFound !== 'undefined'
    ? ssrConf.loadSPAOnNotFound
    : LOAD_SPA_ON_404_DEFAULT

const {PORT = 3000, AUTH_USERNAME, AUTH_PASSWORD} = process.env
const runningUnderAuth = AUTH_USERNAME && AUTH_PASSWORD
const AUTH_DEFINITION = {
  users: {[AUTH_USERNAME]: AUTH_PASSWORD},
  challenge: true
}
;(async () => {
  const hooks = await hooksFactory()

  app.get('/_health', (req, res) =>
    res.status(200).json({uptime: process.uptime()})
  )

  app.use(compression())
  app.use(hooks[TYPES.LOGGING])
  runningUnderAuth && app.use(basicAuth(AUTH_DEFINITION))
  app.use(express.static('statics'))
  app.use(express.static('public', {index: false}))

  app.use(hooks[TYPES.APP_CONFIG_SETUP])

  ssrConf.forceWWW &&
    app.use((req, res, next) => {
      const parsedUrl = parseDomain(req.hostname, {
        customTlds: /localhost|\.local/
      })
      !parsedUrl || parsedUrl.tld === 'localhost' // eslint-disable-line
        ? next()
        : parsedUrl.subdomain
          ? next()
          : res.redirect(
              `${req.protocol}://www.` + req.headers.host + req.url,
              301
            )
    })

  app.get('*', [
    criticalCss(ssrConf.criticalCSS),
    dynamicRendering(ssr, ssrConf.dynamicsURLS)
  ])

  app.use(hooks[TYPES.NOT_FOUND])
  app.use(hooks[TYPES.INTERNAL_ERROR])

  app.listen(PORT, () => console.log(`Server up & runnig port ${PORT}`)) // eslint-disable-line
})()
