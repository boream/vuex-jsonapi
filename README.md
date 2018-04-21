# vuex-jsonapi
Simple vuex - jsonapi connector.

## Specs:

1. The library should do request to any jsonapi server with configuration files describing models.
The responses should be formatted, for vuex using, as models define. The requests in a same way.

1. The library offer two different APIs: **jsonapi** and **vuex**. Utilities to ease the
use of jsonapi server implementation and **vuex** actions and getters for these entities.

1. Then library should accept configuration objects in this way:
```javascript
/* ********    MODULO OPERATION **************/
const operationConf = {
  type: 'node--operation',
  attributes: {
    title: {
      type: 'string',
      required: true,
      isArray: false,
      name: 'title',
    }
    ,
  },
  relationships: {
    pledges: {
      type: 'node--pledge',
      required: false,
      isArray: true,
      name: 'pledges',
    },
  }
};

const moduleOperation = {
  baseUrl: 'url',
  name: 'pledges',
  entities: [operationConf],
};

/* ***************   MODULO PLEDGE ***********/
const burdenConf = {
  type: 'node--burden',
  attributes: {
    title: {
      type: 'string',
      required: true,
      isArray: false,
      name: 'title',
    }
    ,
  },
  relationships: { }
};

const plegdeConf = {
  type: 'node--pledge',
  attributes: {
    title: {
      type: 'string',
      required: true,
      isArray: false,
      name: 'title',
    }
    ,
  },
  relationships: {
    burdens: {
      type: 'node--burden',
      required: false,
      isArray: true,
      name: 'burdens',
    },
  }
};

const modulePledge = {
  baseUrl: 'url',
  name: 'pledges',
  entities: [burdenConf, plegdeConf],
};

/* ****************** Register ******/
import { vuexAdapter, jsonapiAdapter } from 'vuex-jsonapi';
import store from './store';

// You can use this object to perform http requests against jsonapi server.
const operationJsonapiService = jsonapiAdapter.createService(moduleOperation);

// You can use this object to initialize a vuex module. If you pass in a jsonapiService
// then the module should perform http request when several actions are dispatched.
const operationVuexModule = vuexAdapter.createModule(moduleOperation, operationJsonapiService);

store.registerModule(operationVuexModule);

```

### vuexAdapter API
The **vuexModule** created with `vuexAdapter.createModule` function should return a valid
object to initialize a new vue store module. 

For example, if you try with 

* `const operationVuexModule = vuexAdapter.createModule(moduleOperation)`

it should return:

```
{
    state: {
        operation: {
            ids: [],
            entities: {},
        },
    },
    mutations: {
        CLEAR_MODULE,
        UPSERT_ENTITY,
        REMOVE_ENTITY,
    },
    actions: {
        clearModuleAction,
        upsertOperationAction,
        removeOperationAction,
    },
    getters: {
        // TODO find where to place getById, find, etc.
    },
}

``` 

You can try something more complicated:
```javascript
import { vuexAdapter, jsonapiAdapter } from 'vuex-jsonapi';

const pledgeService = jsonapiAdapter.createService(modulePledge);
const pledgeVuexModule = vuexAdapter.createModule(modulePledge, pledgeService);
```
`pledgeVuexModule` should return:

```
{
    state: {
        pledge: {
            ids: [],
            entities: {},
        },
        burden: {
            ids: [],
            entities: {},
        },
    },
    mutations: {
        CLEAR_MODULE,
        UPSERT_ENTITY,
        REMOVE_ENTITY,
    },
    actions: {
        clearModuleAction,
        upsertPledgeAction,
        removePledgeAction,
        upsertBurdenAction,
        removeBurdenAction,
    },
    getters: {
        // TODO find where to place getById, find, etc.
    },
}
```
In this case, when the library performs the `upsert`s or `remove`s actions, then library should
use the *jsonapiAdapter* service to do the appropriate http requests.

### jsonapiAdapter API

The **jsonapiService** created with `jsonapiAdapter.createService` function 
has the following structure:

```
{
 fetch(id) // fetch entity by id
 fetchAll() // fetch all entities
 create(payload) //create entity
 update(payload) // update entity
 upsert(payload) // update or create entity
 remove(id) //remove entity from colection    
}
```

1. **jsonapiService#fetch** 
1. **jsonapiService#fetchAll** 
1. **jsonapiService#create** 
1. **jsonapiService#update** 
1. **jsonapiService#remove** 


## Future

1. Prefetch related models.
1. Mode cache.
1. Enable Offline.
1. Extensibility: Middlewares for processing and formatting. Middlewares 
for Authentications models. Create vuex modules with customs properties, mutations,
actions and getters.

## Authors
Alejandro Garrido / Alejandro Manjón
Boream
