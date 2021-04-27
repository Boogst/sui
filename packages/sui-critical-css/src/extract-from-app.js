import extractCSSFromUrl from './extract-css-from-url'
import {createHash} from 'crypto'
import {mkdir, writeFile} from 'fs/promises'
import {join} from 'path'
import {devices} from './config.js'

// TODO: Falta sacar la info por cada device
async function extractCSSFromApp({routes, config = {}}) {
  const manifest = {}
  const {hostname, outputDir = '/critical-css'} = config
  const writeFilesPromises = []

  console.log(join(process.cwd(), outputDir))

  await mkdir(join(process.cwd(), outputDir), {recursive: true})

  for await (const [pathKey, pathOptions] of Object.entries(routes)) {
    console.log({pathKey, pathOptions})

    let urlToExtractCSSFrom
    if (typeof pathOptions === 'string') {
      urlToExtractCSSFrom = pathOptions
    } else {
      urlToExtractCSSFrom = pathOptions.url
    }

    urlToExtractCSSFrom = `${hostname}${urlToExtractCSSFrom}`

    const hash = createHash('md5')
      .update(pathKey)
      .digest('hex')

    const cssFileName = `${hash}.css`

    manifest[pathKey] = cssFileName

    const configForMobileDevice = devices.m

    console.log({configForMobileDevice, urlToExtractCSSFrom})

    const css = await extractCSSFromUrl({
      url: urlToExtractCSSFrom,
      ...configForMobileDevice
    })

    const cssPathFile = join(process.cwd(), outputDir, cssFileName)
    writeFile(cssPathFile, css)
  }

  const manifestPathFile = join(process.cwd(), outputDir, 'critical.json')
  await writeFile(manifestPathFile, JSON.stringify(manifest))

  const results = await Promise.allSettled(writeFilesPromises)
  const errors = results.filter(r => r.status === 'rejected')

  if (errors.length) console.warn('Some files have not been written correctly')
  console.log('All files written')
}

export default extractCSSFromApp
