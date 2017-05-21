import { fromLisp, readFromString } from '../lib/lisp/lisp'
import { arrToJObject, sexpToJObject } from '../lib/lisp/swank-extras'

describe('sexpToJObject', () => {
  it('should parse the problematic part of completion response', () => {

    const input = `
      ((("x" "Int") ("y" "Int")))\
    `
    const lisp = readFromString(input)
    const arr = fromLisp(lisp)

    const result = arrToJObject(arr)

    expect(result[0][0][0]).toBe('x')
    expect(result[0][1][1]).toBe('Int')
  })
})
