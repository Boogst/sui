import PropTypes from 'prop-types'
import React, {useEffect, useState} from 'react'
import Markdown from './Markdown'
import {tryRequireMarkdown} from '../tryRequire'

export default function MarkdownFile({file, params}) {
  const [content, setContent] = useState(null)

  useEffect(
    function() {
      tryRequireMarkdown({...params, file}).then(setContent)
      import('./markdown.css') // eslint-disable-line
    },
    [params, file]
  )

  return content && <Markdown content={content} />
}

MarkdownFile.displayName = 'MarkdownFile'
MarkdownFile.propTypes = {
  params: PropTypes.object,
  file: PropTypes.string
}
