import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./QuoteImportSheet.tsx', import.meta.url), 'utf8')

describe('quote review input contract', () => {
  it('keeps review inputs uncontrolled so typed spaces survive normalization rerenders', () => {
    expect(source).toContain('defaultValue={getFieldValue(quote, issue.field)}')
    expect(source).not.toContain('value={getFieldValue(quote, issue.field)}')
    expect(source).toContain('onChange={event => changeIssue(issue, event.target.value)}')
  })
})
