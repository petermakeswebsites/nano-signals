import { $source } from './source.ts'
import { expect, test } from 'vitest'

test('source creates with default value', () => {
    const source = $source('test123')
    expect(source.value).toEqual('test123')
})
