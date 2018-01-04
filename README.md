# Attadux

An implementation of the [modular redux proposal](https://github.com/erikras/ducks-modular-redux), forked from the [extensible-duck](https://github.com/investtools/extensible-duck) implementation with added features to support state machines and object validators (using the [spected](https://github.com/25th-floor/spected) tool). Attadux depends only on [Ramda](http://ramdajs.com) (or on libraries which only depend on Ramda) and also provides [an alternate implementation (in Ramda, of course) of Reselect's `createSelector()` function](https://twitter.com/sharifsbeat/status/891001130632830976).

# Installation

```
npm install attadux
```

# Usage

```javascript
const dux = new Duck({/* options */})
```

## Options

When instantiating a `Duck` you'll pass a single prop, which is just an `Object` containing one or more of the following props:

* __namespace__ - (__required__) A `String` value representing the module/application you are building (ie, `todo-app`)
* __store__ - (__required__) A `String` value corresponding to a particular section of the Redux store (should match whatever you would normally name your reducer in your `combineReducers()`)
* __types__ - An `Array` of `String` values which represent the actions you intend to create and dispatch throughout your application (don't worry about making the string too long/unique; your action types will all be formatted automatically as `<namespace>/<store>/MY_ACTION_TYPE`, which should prevent collisions)
* __consts__ - An `Object` (or a `Function` returning one) containing any simple primitive-ish values that your application may use (and which do not fall into any of the other categories of props to feed into your Duck instance). Mostly this will be `String`, `Number` and other simple values (`Date`, `RegExp`, `Boolean`). Even an `Array` is an acceptable prop to place inside the consts. Arrays are converted into an `Object` whose values match the values from your array, but whose keys are stringified representations of the values. Only `Date`, `String`, `Number`, `Boolean` or `RegExp` are acceptable in your array, in part because their stringified value will still be unique.
* __reducer__ - A `Function` that modifies/re-shapes your store in response to a specific type of action dispatched in your application. You can write your reducer in the way you've always written them in Redux, but with the added benefit of the Duck instance is provided as the third prop (the first two props provided to any Redux reducer are always `state` and `action`, respectively). You can leverage `types`, state `machines`, `consts` or anything else on your Duck instance, which (hopefully) makes the code you write simpler or more powerful.
* __initialState__ - Usually an `Object` (or a `Function` returning one). Sometimes people demonstrate examples where the initialState of the Redux store is a primitive value, but certainly isn't as common. This represents the initial condition you want this section of your Redux store to have.
* __selectors__ - An `Object` of scalar functions (or a `Function` returning an `Object` of them) returning a single value from the Redux store (no matter how deeply nested). Most often you use these for the first argument to the Redux `connect()` function, which maps the store to your component's props. These functions are memoized for performance and it's become common to leverage a tool like [Reselect](https://github.com/reactjs/reselect) to facilitate this process, however a simple, copycat version of Reselect's `createSelector()` function ([implemented in Ramda](https://twitter.com/sharifsbeat/status/891001130632830976)) is provided for your use (it's a named export you can import directly from `attadux`)
* __machines__ - An `Object` of `Object`s (but nothing nested deeper than that second `Object`). Each of those nested objects is a possible "state" for your component (or your application as a whole, if you want to use just one state machine to cover the entire app). Your component (or app) can be in only one state at a time and that "current state" is a `String` value that will be automatically populated when your dispatched Redux action forces a change to a different state. For the nested object: the key is the unique name for that state and the value (which is an object) contains all the transitions to which that state is allowed to change. When representing those allowed state transitions the key must match a Redux action `type` (ie, "LOGIN_USER_SUCCESSFUL", "LOGIN_USER_ERROR", etc.) and the value must match a the name of one of the other states defined for that machine. State machines may be a little confusing the first time you encounter the topic (and specifically how you might graft it into your Redux ecosystem), but the author of the [stent](https://github.com/krasimir/stent) library wrote up a [great article](http://krasimirtsonev.com/blog/article/managing-state-in-javascript-with-state-machines-stent) which might help clarify how state machines could work in JavaScript. However Attadux has not implemented state machines using Stent nor have state machines been grafted into Redux in the way that author or others have attempted. The [redux-machine](https://github.com/mheiber/redux-machine) library is the closest to the way state machines have been implemented in Attadux, which just sets a "status" prop to represent the current/new state whenever your reducer is invoked.
* __creators__ - An `Object` of action-creator functions (or a `Function` returning an `Object` of them) which return a plain 'old JavaScript `Object` representing the action to be dispatched to your reducer(s). It must contain a `type` prop.
* __validators__ - An `Object` of "validators" (or a `Function` returning an `Object` of them). This feature requires some explanation, as it is not part of the boilerplate developers are accustomed to in Redux application. The simplest use for a validator is to use it in your `reduxForm()` function call (if you do use [redux-form](https://github.com/erikras/redux-form)) and it will return an object where valid and invalid values are represented with `true` and and `Array` of error messages, respectively. This feature leverages an outstanding, simple library called [spected](https://github.com/25th-floor/spected). Spected is a simple, small, yet powerful tool (built using only [Ramda](https://ramdajs.com)) and it curries your validation schema. Which means you can extract that curried validator from the Duck instance and run it as often as you wish against any input that must match your schema. Also, the author of spected built a form validation library on top of spected, called [Revalidation](https://github.com/25th-floor/revalidation) which you can leverage instead of Redux Form, if you find its API to be more suited to how you compose front-end components.
* __validationLevel__ - If you have set your __validators__ and you've named any of them to match a redux action type, they will be applied in the middleware chain to validate the action's payload according to one of four possible strategies:
    * `LOG` - will always pass through a dispatched action but will append a `validationErrors` prop to the payload if any validations fail
    * `PRUNE` - will always pass through a dispatched action but will remove any invalid fields from the payload
    * `CANCEL` (default) - stops the middleware chain when validations fail on a dispatched action
    * `STRICT` - will only pass validated payloads whose action types are listed as inputs for the _current_ state of a given state machine

Also, if you wish to track machine states on a prop other than `states` (at the root of the `initialState` object), provide an alternate value for the `stateMachinesPropName` prop (defaults to 'states'). This value can be any one of the following:

* a single string value representing the prop name to place at the root of the `initialState` object (ie, 'status')
* an array of string values representing a nested path (ie, ['user', 'login', 'currentState']
* a single dot-separated string value representing the nested path (ie, 'user.login.currentState')

## Middleware

The middleware currently has one purpose, to validate any of the dispatched redux actions. You can, of course, use validators for many things - like user form input - but if you give a validator the same name as a redux action type, then you can use it to validate a redux action. All you need to do (aside from naming your validator appropriately) is apply the attadux middleware when you configure your redux store.

```javascript
import {createStore, applyMiddleware} from 'redux'
import {validatorMiddleware} from 'attadux'

import initialState from './initialState'
import reducers from './reducers'

export default createStore(
    reducers,
    initialState,
    applyMiddleware(validatorMiddleware)
)
```

## State Machines & Validators

The main difference between this library and the [extensible-duck](https://github.com/investtools/extensible-duck) predecessor is the addition of support for State Machines and Validators. These can be used in the obvious way (extracting them from the duck instance and using them manually in your reducer(s)) but they can _also_ be used in a unique, almost automatic manner whenever your reducer processes a dispatched action. To be used in such a manner means Attadux makes a couple of assumptions about your Redux store (but if those assumptions mismatch the way you write your Redux application you can use them manually in the manner mentioned above). It's expected that the `state` passed into your reducer is an object, and in all but the rarest and simplest cases this is how your store is shaped anyway. It's also expected that the state machine can represent the "current state" somewhere in your Redux store (the machine itself is not kept there) and by default Attadux will set a prop called `states` (which is an `Object` whose values are the "current state" representation for each of your named state machines).
