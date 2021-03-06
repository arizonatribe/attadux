# Ruddy

Modularized state-management tools for modern front-end applications. With it you can manage dispatched messages in a clean and predictable way - for either small or large scale projects.

## Modularized Boilerplate for State Management

When working on front-end applications you spend a good amount of time (maybe even sometimes the majority of it) interacting with data sources. There's alway various validation and re-shaping operations that are needed and you often have to manage larger structures of JSON with centralized "stores". Getting data funneled through that entire pipeline in a clean and performant way that can used at-scale is an enormous challenge.

Tools like [Redux](https://github.com/reactjs/redux) can help to manage state in large scale applications that have larger datasets. It introduced a middleware chain to the front-end that mirrors the way back-end developers apply middleware to inbound http requests. All front-end state gets placed into a centralized "store" that is connected to the front-end components - if you're using [react-redux](https://github.com/reactjs/react-redux) - via the framework's "context api". When users interact with the components it causes "Actions" to be dispatched into the Redux middleware chain, at the end of which it may change the state of the store. There are a myriad of tools that can be applied to this middleware chain and it's extremely easy to write your own.

This library is one of those attempts and it is itself part of a chain of ideas floating around the React and Redux communities - but is not limited to just that ecosystem, as the topic of state management is the broader focus of this library. Several years back Erik Rasmussen (the author of [Redux Form](https://github.com/erikras/redux-form)) [suggested an approach to managing Redux boilerplate](https://github.com/erikras/ducks-modular-redux) so that the component itself would be more reusable across applications. He found himself often copying and pasting from a predicable template of boilerplate code, and suggested some modularization patterns to help avoid the pitfalls. The Ruby and Java ecosystems have their names own names for modules and he suggested a name from the last syllable of Redux, so "ducks" are now a (somewhat) common way to refer to these modularized bundles of Redux boilerplate.

Several implementations of his proposal are available in the Redux ecosystem, [one in particular is extensible](https://github.com/investtools/extensible-duck) and provides the entire module to any function you write within it (your Reducers, Selectors, Action Creators all have access to their own parent object). With it you can work with fully namespaced types without having to type out long `Strings` all the time. This now feels even more familiar as popular libraries like GraphQL and their server-side implementations heavily use a context object where your individual resolves can have access on each inbound request.

Ruddy is forked from that library and adds several pieces on top of that to create a full middleware (micro-framework) solution. It adds tools like state machines, web workers, rich form validations, action enhancers, action multipliers, action throttling/debouncing/depth-limiting, you can validate and coerce actions to a certain schema in a syntax that most closely resembles working with objects. How you compose Objects (functional or object-oriented) is however you choose, Ruddy just provides the relevant tools for working with Objects (actions) dispatched into a middleware chain.

### Inspirations and/or Dependencies

* [modular redux proposal](https://github.com/erikras/ducks-modular-redux) - Inspired the creation of `extensible-duck`
* [Extensible-Duck](https://github.com/investtools/extensible-duck) - Ruddy is a fork of it
* [Spected](https://github.com/25th-floor/spected) - A great syntax for applying a bunch of validation rules (works well with [Redux Form](https://github.com/erikras/redux-form) or [Formik](https://github.com/jaredpalmer/formik)
* [Shapey](https://github.com/arizonatribe/shapey) - A syntax for composing object transformations on "spec" objects (used in Ruddy's action enhancers)
* [Ramda](https://github.com/erikras/ramda) - A suite of functions for common operations in JavaScript (the main dependency of Ruddy, Spected and Shapey), and similar to Lodash or Underscore. With it you can [essentially get Re-Select for free](https://twitter.com/sharifsbeat/status/891001130632830976).

# Installation

```
npm install ruddy
```

# Usage

```javascript
import {createDuck} from 'ruddy'

const dux = createDuck({/* options */})
```

## Options

When instantiating a `Duck` you'll pass a single prop, which is just an `Object` containing one or more of the following props:

* __namespace__ - (__required__) A `String` value representing the module/application you are building (ie, `todo-app`)
* __store__ - (__required__) A `String` value corresponding to a particular section of the Redux store (should match whatever you would normally name your reducer in your `combineReducers()`)
* __types__ - An `Array` of `String` values which represent the actions you intend to create and dispatch throughout your application (don't worry about making the string too long/unique; your action types will all be formatted automatically as `<namespace>/<store>/MY_ACTION_TYPE`, which should prevent collisions)
* __consts__ - An `Object` (or a `Function` returning one) containing any simple primitive-ish values that your application may use (and which do not fall into any of the other categories of props to feed into your Duck instance). Mostly this will be `String`, `Number` and other simple values (`Date`, `RegExp`, `Boolean`). Even an `Array` is an acceptable prop to place inside the consts. Arrays are converted into an `Object` whose values match the values from your array, but whose keys are stringified representations of the values. Only `Date`, `String`, `Number`, `Boolean` or `RegExp` are acceptable in your array, in part because their stringified value will still be unique.
* __reducer__ - A `Function` that modifies/re-shapes your store in response to a specific type of action dispatched in your application. You can write your reducer in the way you've always written them in Redux, but with the added benefit of the Duck instance is provided as the third prop (the first two props provided to any Redux reducer are always `state` and `action`, respectively). You can leverage `types`, state `machines`, `consts` or anything else on your Duck instance, which (hopefully) makes the code you write simpler or more powerful.
* __initialState__ - Usually an `Object` (or a `Function` returning one). Sometimes people demonstrate examples where the initialState of the Redux store is a primitive value, but certainly isn't as common. This represents the initial condition you want this section of your Redux store to have.
* __selectors__ - An `Object` of scalar functions (or a `Function` returning an `Object` of them) returning a single value from the Redux store (no matter how deeply nested). Most often you use these for the first argument to the Redux `connect()` function, which maps the store to your component's props. These functions are memoized for performance and it's become common to leverage a tool like [Reselect](https://github.com/reactjs/reselect) to facilitate this process, however a simple, copycat version of Reselect's `createSelector()` function ([implemented in Ramda](https://twitter.com/sharifsbeat/status/891001130632830976)) is provided for your use (it's a named export you can import directly from `ruddy`)
* __machines__ - An `Object` of `Object`s (but nothing nested deeper than that second `Object`). Each of those nested objects is a possible "state" for your component (or your application as a whole, if you want to use just one state machine to cover the entire app). Your component (or app) can be in only one state at a time and that "current state" is a `String` value that will be automatically populated when your dispatched Redux action forces a change to a different state. For the nested object: the key is the unique name for that state and the value (which is an object) contains all the transitions to which that state is allowed to change. When representing those allowed state transitions the key must match a Redux action `type` (ie, "LOGIN_USER_SUCCESSFUL", "LOGIN_USER_ERROR", etc.) and the value must match a the name of one of the other states defined for that machine. State machines may be a little confusing the first time you encounter the topic (and specifically how you might graft it into your Redux ecosystem), but the author of the [stent](https://github.com/krasimir/stent) library wrote up a [great article](http://krasimirtsonev.com/blog/article/managing-state-in-javascript-with-state-machines-stent) which might help clarify how state machines could work in JavaScript. However Ruddy has not implemented state machines using Stent nor have state machines been grafted into Redux in the way that author or others have attempted. The [redux-machine](https://github.com/mheiber/redux-machine) library is the closest to the way state machines have been implemented in Ruddy, which just sets a "status" prop to represent the current/new state whenever your reducer is invoked.
* __creators__ - An `Object` of action-creator functions (or a `Function` returning an `Object` of them) which return a plain 'old JavaScript `Object` representing the action to be dispatched to your reducer(s). It must contain a `type` prop.
* __enhancers__ - An `Object` of action-enhancer functions (or a `Function` returning an `Object` of them) which return a plain 'old JavaScript `Object` representing the action to be modified prior to hitting the reducers (in the Redux middleware chain). These enhancers are generic enough that you don't have to use them in Redux, as then simply modify an object containing (at least) a `type` prop The syntax for writing the enhancers is to define (what looks like) just an object whose keys represent names of props on the original action or new ones to be created on it. You can use the enhancer function to modify existing props (formatting, etc.) or create new props from existing ones. The values you set on the enhancer function's spec object are usually functions that make those modifications to existing props (or creates new ones), however you can also set values that are _not_ functions, which will cause them be be passed right through onto the modified object. See [shapey](https://github.com/arizonatribe/shapey) for further examples on this type of API. One last caveat to these Action enhancers is that you don't (and shouldn't usually) set a `type` prop on the enhancer function's spec object, however if you _do_ so, the behavior of the enhancer changes to create a new object with _only_ the fields you named in the spec object (the default behavior of the enhancer function is to _merge_ the result of the enhancement back onto the original action).
* __multipliers__ - An `Object` of action-multiplying functions (or a `Function` returning an `Object` of them) which return an Array of one or more plain 'old JavaScript `Object`. One action in and one or more (new ones) are created from it. Again, either a single new object to create (from input passed in) or many new objects to create from it. When using this in Redux middleware, you can apply a fanout behavior to a dispatched Redux action (ie, in response to some kind of "post login" action, you can create several new actions to go an retrieve one-time lookup data, new that the user is authenticated). You even have access to enhancements for the new objects, as each new object you spec out can have a function as one of its props, which will follow the same re-shaping logic as discussed for the __enhancers__.
* __effects__ - An `Array` of `Arrays` that contain 2 to 4 items per Array which are compiled into an effect handler. The schema for these 2 to 4 items is specific: the first item is used to match a Redux action, the second is the actual effect creating function you wish to apply to the Redux action, and the third and fourth items are the optional success & error handling functions. Similar to Redux Saga, Redux Offline and other Redux middleware libraries, the intent of an effect handler is to sandbox the "impure" (but completely normal/necessary) portions of the middleware chain that cause effects that may succeed or fail. Most commonly this means making asynchronous request to external APIs for data fetching and mutation, but it can entail many tasks that can't be classified as pure functions. So the `Array` of ["predicate", "effect handler", "success handler", "error handler"] gets compiled into a single function that is applied to every Redux action coming through the middleware chain. If an action does _not_ match the predicate, this compiled effect creating function just passes the action through, unaltered (basically it's an identity function in that case). If the action _does_ match the predicate, the effect creating function is applied to the action, and the success or failure of that operation is routed into the appropriate success handler or error handler. The default success handler will take the output of the effect handler and merge it into a new Redux action (unless the result is _not_ and `Object`, in which case it will be placed onto a prop called "payload") and the new `type` prop will be the same as the original action but with `_SUCCESS` appended to it (if you follow the somewhat standard naming suffix for effect creating actions of either `_REQUEST` or `_EFFECT`, that suffix will be removed too). Similar to this default success handler the default error handler will append `_ERROR` to the new action it creates when the effect fails, and the cause of the failure will be placed onto a prop called "error". Again, you can override the default success or error handlers by providing your own. Also, the pattern/predicate you must supply as the first item in the effect `Array` can be either (a) a string (which should be the exact name of a particular Redux Action type), (b) a regular expression (which will be matched against a Redux Action type), or (c) a function (which receives the entire action as its single argument and returns a `Boolean` value). Similar to Redux Saga, the original action is always passed into any custom success and/or error handler you provide as the _last_ argument.
* __queries__ - An `Object` whose values are an `Array` of 2 values `[Function, String]` (similar to the format for _validators_). In this case the function operates on the string value of the query itself. If you use GraqphQL queries, the first arg would be just the instance of a function (could even be a third-party lib, like the `gql` function from the `graphql-tools` and the `react-apollo` packages). The second arg would be the string template literal that constitutes the query. The last param is always the actual `String` value of the query.
    query itself. When two params are passed into the query builder The first param is defaults to identity when it isn't provided
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

The middleware currently has one purpose, to validate any of the dispatched redux actions. You can, of course, use validators for many things - like user form input - but if you give a validator the same name as a redux action type, then you can use it to validate a redux action. All you need to do (aside from naming your validator appropriately) is apply the ducks middleware when you configure your redux store.

```javascript
//store.js

import {createStore, applyMiddleware} from 'redux'
import createMiddleware from 'ruddy'

import initialState from './initialState'
import reducers from './reducers'
import allDucks from './ducks'

export default createStore(
    reducers,
    initialState,
    applyMiddleware(createMiddleware(allDucks))
)
```

And to create the "row" of ducks (very similar to `combineReducers()` for your Redux reducers:

```javascript
// ducks.js

import {createRow} from 'ruddy'
import authDuck from './components/auth/duck'
import products from './components/products/duck'
import customers from './components/customers/duck'
import ordersDuck from './components/orders/duck'

export default createRow(authDuck, products, customers, orders)
```

__Note__: It doesn't matter what alias you give your duck when importing, because `createRow()` will use the `.store` prop from each duck (which is a String) to format the row as:

```
{auth, products, customers, orders}
```

## State Machines & Validators

The main difference between this library and the [extensible-duck](https://github.com/investtools/extensible-duck) predecessor is the addition of support for State Machines and Validators. These can be used in the obvious way (extracting them from the duck instance and using them manually in your reducer(s)) but they can _also_ be used in a unique, almost automatic manner whenever your reducer processes a dispatched action. To be used in such a manner means Ruddy makes a couple of assumptions about your Redux store (but if those assumptions mismatch the way you write your Redux application you can use them manually in the manner mentioned above). It's expected that the `state` passed into your reducer is an object, and in all but the rarest and simplest cases this is how your store is shaped anyway. It's also expected that the state machine can represent the "current state" somewhere in your Redux store (the machine itself is not kept there) and by default Ruddy will set a prop called `states` (which is an `Object` whose values are the "current state" representation for each of your named state machines).
