/* globals describe, test, expect */

import configureStore from 'redux-mock-store'
import dataDispatch, { listenFor, DATA_TREE_ID } from '../../src'

/**
 * Import Tests
 */

describe('Library exports', () => {
  test('Functions are exported', () => {
    expect(require('../../index').default).toBeInstanceOf(Function)
    expect(require('../../index').listenFor).toBeInstanceOf(Function)
    expect(require('../../index').dataDispatch).toBeInstanceOf(Function)
    expect(require('../../index').DATA_TREE_ID).not.toBeUndefined()
  })
})

/**
 * Test objects
 */
function reducer (state = {}, action) {
  switch (action.type) {
    case 'foo':
      return Object.assign({}, state, { a: 1 })
    default:
      return state
  }
}

const payload = {
  entities: {
    users: { 1: 'foo', 2: 'bar', 3: 'baz' },
    repos: {
      1848: { owner: 1, name: 'spring' },
      1574: { owner: 3, name: 'flower' },
      1003: { owner: 2, name: 'waterfall' }
    }
  }
}

const _action = (type, payload) => ({
  [DATA_TREE_ID]: true,
  type,
  payload
})

const mockStore = configureStore([dataDispatch])

/**
 * Tests
 */

describe('listenFor', () => {
  test('it throws TypeError when key is not a string', () => {
    function withNumber () { listenFor(4) }
    function withBoolean () { listenFor(true) }
    function withObject () { listenFor({}) }
    function withArray () { listenFor({}) }
    function withSymbol () { listenFor(Symbol('foo')) }
    expect(withNumber).toThrowError(TypeError)
    expect(withBoolean).toThrowError(TypeError)
    expect(withObject).toThrowError(TypeError)
    expect(withArray).toThrowError(TypeError)
    expect(withSymbol).toThrowError(TypeError)
  })

  test('it returns a function when given a key and reducer', () => {
    expect(listenFor('key')(reducer)).toBeInstanceOf(Function)
  })

  test('reducer is unaffected', () => {
    const _reducer = listenFor('key')(reducer)
    expect(_reducer({}, { type: '' })).toEqual({})
    expect(_reducer({}, { type: 'foo' })).toEqual({ a: 1 })
    expect(_reducer({ b: 2 }, { type: 'foo' })).toEqual({ a: 1, b: 2 })
  })

  test('dataTree actions update state when called with the right key', () => {
    const _reducer = listenFor('key')(reducer)
    const key = Symbol.for('dataTree.key')
    expect(_reducer(
      {},                     // state
      _action(key, payload))  // action
    ).toEqual({ entities: payload })
    expect(_reducer(
      { _x: 5 },              // state
      _action(key, payload))  // action
    ).toEqual({ entities: payload, _x: 5 })
  })

  test('dataTree actions do not update state when called with the wrong key', () => {
    const _reducer = listenFor('key')(reducer)
    const key = Symbol.for('otherKey')
    expect(_reducer({}, _action(key, payload))).toEqual({})
    expect(_reducer({ _x: 5 }, _action(key, payload))).toEqual({ _x: 5 })
  })
})

describe('setupTree', () => {
  test('TypeError thrown when redux dependency values are not functions or strings', () => {
    // Set up redux tree
    const store = mockStore({})
    // Create action
    const action = {
      type: 'FOO',
      meta: {
        deps: { user: 5 }
      }
    }
    // Send action
    expect(() => store.dispatch(action)).toThrowError(TypeError)
  })

  test('TypeError thrown when deps key is not an object', () => {
    // Initialise mockstore with empty state
    const store = mockStore({})
    const action = {
      type: 'FOO',
      payload,
      meta: {
        deps: 'foo'
      }
    }
    // Send erroneous action
    expect(() => store.dispatch(action)).toThrowError(TypeError)
  })

  test('it dispatches dependent actions correctly with string dependency', () => {
    // Initialise mockstore with empty state
    const store = mockStore({})
    const action = {
      type: 'FOO',
      payload,
      meta: {
        deps: { user: 'payload.entities.users' }
      }
    }
    const depAction = {
      type: Symbol.for('dataTree.user'),
      payload: payload.entities.users
    }
    // Send action (use .objectContaining to avoid checking symbols)
    store.dispatch(action)
    expect(store.getActions()).toEqual(
      expect.arrayContaining([ expect.objectContaining(depAction), expect.objectContaining(action) ])
    )
  })

  test('it dispatches dependent actions correctly with function dependency', () => {
    // Initialise mockstore with empty state
    const store = mockStore({})
    const action = {
      type: 'FOO',
      payload,
      meta: {
        deps: { user: action => action.payload.entities.users }
      }
    }
    const depAction = {
      type: Symbol.for('dataTree.user'),
      payload: payload.entities.users
    }
    // Send action (use .objectContaining to avoid checking symbols)
    store.dispatch(action)
    expect(store.getActions()).toEqual(
      expect.arrayContaining([ expect.objectContaining(depAction), expect.objectContaining(action) ])
    )
  })

  test('it creates dependent actions that have DATA_TREE_ID property', () => {
    // Initialise mockstore with empty state
    const store = mockStore({})
    const action = {
      type: 'FOO',
      payload,
      meta: {
        deps: { user: action => action.payload.entities.users }
      }
    }
    // Send action (use object containing to avoid checking symbols)
    store.dispatch(action)
    // Should contain an action that has DATA_TREE_ID
    expect(store.getActions()).toEqual(
      expect.arrayContaining([ expect.objectContaining({
        [DATA_TREE_ID]: true,
        type: Symbol.for('dataTree.user')
      }) ])
    )
  })

  test('it dispatches the original action last', () => {
    // Initialise mockstore with empty state
    const store = mockStore({})
    const action = {
      type: 'FOO',
      payload,
      meta: {
        deps: { user: 'payload.entities.users' }
      }
    }
    // Send action (use object containing to avoid checking symbols)
    store.dispatch(action)
    // Should contain an action that has DATA_TREE_ID
    expect(store.getActions().slice(-1)[0]).toEqual(action)
  })
})
