// Some parsing utilities, propbably buggy as hell, but works for the use cases I've seen so far
import { fromLisp } from './lisp'

const typeIsArray = value => value
                  && typeof value === 'object'
                  && value instanceof Array
                  && typeof value.length === 'number'
                  && typeof value.splice === 'function'
                  && !value.propertyIsEnumerable('length')

const arrToJObject = x => {

  const parseObject = obj => {
    if (obj == null || obj.length === 0) {
      return {}
    }
    const keyValue = obj.splice(0, 2)
    const result = parseObject(obj)
    result[keyValue[0]] = arrToJObject(keyValue[1])
    return result
  }

  const parseArray = arr => Array.from(arr).map(elem => arrToJObject(elem))

  if (typeIsArray(x)) {
    const firstElem = x[0]
    // An array with first element being ":label" is an object and an array of arrays is a real array, no?
    if (typeof firstElem === 'string' && firstElem.startsWith(':')) {
      // An object
      return parseObject(x)
    }
    return parseArray(x)
  }
  return x
}

const sexpToJObject = msg => {
  const arr = fromLisp(msg) // This arrayifies the lisp cons-list
  return arrToJObject(arr)
}

export { sexpToJObject, arrToJObject };
