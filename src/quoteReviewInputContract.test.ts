import { describe, expect, it } from 'vitest'
import { reviewInputValueProps } from './quoteReviewInput'

describe('quote review input contract', () => {
  it('preserves typed trailing spaces in the DOM binding while canonical normalization rerenders', () => {
    const props = reviewInputValueProps('Changement ')
    expect(props).toEqual({ defaultValue: 'Changement ' })
    expect('value' in props).toBe(false)
  })
})
