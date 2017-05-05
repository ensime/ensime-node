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

  it('should parse scala notes', () => {
    const input = `
        (:scala-notes (:is-full nil :notes ((:file "/Users/viktor/dev/projects/kostbevakningen/src/main/scala/se/kostbevakningen/model/record/Ingredient.scala" :msg "missing
        arguments for method test in object Ingredient; follow this method with \`_' if you want to treat it as a partially applied function" :severity error :beg 4138 :end 4142 :line 105 :col 3))))
    `

    const result = sexpToJObject(readFromString(input))
    expect(result[':scala-notes'][':notes'].length).toBe(1)
  })
})
