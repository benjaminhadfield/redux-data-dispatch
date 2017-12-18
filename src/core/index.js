import { dotCaseToObjectProperty } from '../utils'

export const DATA_TREE_ID = Symbol.for('dataTree.action')

/**
 * Enhances a reducer to respond to dependencies made to `key`.
 * @param {string} key
 * @param {function} reducer
 */
export const listenFor = (key) => {
  if (typeof key !== 'string') throw new TypeError('The dependency key must be a string')
  return (reducer) => {
    return (state, action) => {
      // Check if action is a dependency
      if (
        action.hasOwnProperty(DATA_TREE_ID) &&
        Symbol.for(Symbol.keyFor(action.type)) === Symbol.for(`dataTree.${key}`)
      ) {
        return {
          ...state,
          entities: {
            ...state.entities,
            ...action.payload
          }
        }
      }
      return reducer(state, action)
    }
  }
}

/**
 * Takes an action and a dependency mapping of form:
 * { [name]: action.payload.entities.[entityName] }
 * where [name] must match the key given to connect
 */
export const setupTree = (store) => {
  return function (action, deps = {}) {
    Object.keys(deps).map(key => {
      if (typeof deps[key] !== 'function' && typeof deps[key] !== 'string') {
        throw new TypeError('Dependent reducer values must be either a function or a string, but got ' + typeof deps[key] + ' for ' + key)
      }
    })
    // Dispatch any dependent actions
    Object.keys(deps).map(key => {
      const subAction = {
        [DATA_TREE_ID]: true,
        type: Symbol.for(`dataTree.${key}`),
        payload: typeof deps[key] === 'function'
          ? deps[key](action)
          : dotCaseToObjectProperty(action, deps[key])
      }
      store.dispatch(subAction)
    })
    // Dispatch the original action
    store.dispatch(action)
    // Return the original action
    return action
  }
}
