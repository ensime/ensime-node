// Some parsing utilities, propbably buggy as hell, but works for the use cases I've seen so far
import * as lisp from './lisp'

export function arrToJObject(arr: any): any {
  if (Array.isArray(arr)) {
    const firstElem = arr[0]
    // An array with first element being ":label" is an object and an array of arrays is a real array, no?
    if (isString(firstElem) && firstElem.startsWith(':')) {
      // An object
      return parseObject(arr)
    }
    return parseArray(arr)
  }
  return arr
}

export function sexpToJObject(msg: any): any {
  const arr = lisp.fromLisp(msg) // This arrayifies the lisp cons-list
  return arrToJObject(arr)
}

function isString(item: any): item is string {
  return typeof item === "string";
}

function parseArray(arr: any[]): any {
  return Array.from(arr).map(element => arrToJObject(element));
}

function parseObject(obj: any): any {
  if (obj == null || obj.length === 0) {
    return {}
  }
  const keyValue = obj.splice(0, 2)
  const result = parseObject(obj)
  result[keyValue[0]] = arrToJObject(keyValue[1])
  return result
}
