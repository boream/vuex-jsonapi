import Vue from 'vue';
import _ from 'lodash';

const UPDATED = 'updated';
const UPDATING = 'updating';

export const UDPATE_STATUS = 'UDPATE_STATUS';
export const UPSERT_ENTITY = 'upsertEntity';
export const UPDATE_ENTITY_STATUS = 'updateEntityStatus';
export const REMOVE_ENTITY = 'removeEntity';
export const ADD_SEARCHED_ENTITIES = 'addSearchedEntities';

export const UPSERT_ENTITY_ACTION = 'upsertEntityAction';
export const REMOVE_ENTITY_ACTION = 'removeEntityAction';
export const FETCH_ACTION = 'fetchAction';

export const ENTITIES_GETTER = 'entitiesGetter';
export const ENTITIES_ARRAY_GETTER = 'entitiesArrayGetter';
export const STATUS_GETTER = 'statusEntitiesGetter';
export const STATUS_ARRAY_GETTER = 'statusEntitiesArrayGetter';

function createUpsertMutation() {
  return (state, payload) => {
    const { entity } = payload;
    if ('id' in entity && entity.id !== '') {
      Vue.set(state.entities, entity.id, _.cloneDeep(entity));
      const position = state.ids.indexOf(entity.id);
      if (position < 0) {
        state.ids.push(entity.id);
      } else {
        state.ids = state.ids.map(id => id);
      }
    }
  };
}

function createRemoveMutation() {
  return (state, payload) => {
    const { entity } = payload;
    if ('id' in entity && entity.id !== '') {
      const position = state.ids.indexOf(entity.id);
      if (position > -1) {
        Vue.delete(state.entities, entity.id);
        state.ids.splice(position, 1);
      }
    }
  };
}

function createUpdateEntityStatusMutation() {
  return (state, payload) => {
    const { entity, value } = payload;
    if ('id' in entity && entity.id !== '') {
      Vue.set(state.entitiesStatus, entity.id, value);
    }
  };
}

function createUpdateStatusMutation() {
  return (state, payload) => {
    Vue.set(state, 'status', payload);
  };
}

function createAddSearchedEntitiesMutation() {
  return (state, payload) => {
    if (Array.isArray(payload)) {
      const newSearchedEntities = payload.map(e => e.id);
      Vue.set(state, 'searchedEntities', newSearchedEntities);
    }
  };
}


function createUpsertAction(service) {
  return (store, payload) => {
    let promise = null;
    if ('id' in payload && payload.id !== '' && payload.id !== 'dummy') {
      store.commit(UPDATE_ENTITY_STATUS, { entity: payload, value: UPDATING });
      promise = service.update(payload);
    } else {
      promise = service.create(payload);
    }
    return promise
      .then((res) => {
        store.commit(UPDATE_ENTITY_STATUS, { entity: res, value: UPDATED });
        store.commit(UPSERT_ENTITY, { entity: res });
        return res;
      });
  };
}

function createRemoveAction(service) {
  return (store, payload) => service.remove(payload)
    .then(() => store.commit(REMOVE_ENTITY, { entity: payload }));
}

function createFetchAction(service) {
  return (store, payload) => {
    store.commit(UDPATE_STATUS, UPDATING);
    return service.fetch(payload)
      .then((results) => {
        const { entities } = results;
        entities.forEach(res => store.commit(UPSERT_ENTITY, { entity: res }));
        entities.forEach(res => store.commit(UPDATE_ENTITY_STATUS, { entity: res, value: UPDATED }));
        const newIds = entities.map(res => res.id);
        store.commit(UDPATE_STATUS, UPDATED);
        store.commit(ADD_SEARCHED_ENTITIES, newIds);
        return results;
      });
  };
}

function createArrayGetterAction() {
  return state => state.ids.map(id => state.entities[id]);
}

function createEntitiesGetterAction() {
  return state => state.entities;
}

function createStatusArrayGetterAction() {
  return state => state.ids.map(id => state.entitiesStatus[id]);
}

function createStatusEntitiesGetterAction() {
  return state => state.entitiesStatus;
}

export function createEntityState() {
  return {
    status: UPDATING,
    ids: [],
    entities: {},
    entitiesStatus: {},
    searchedEntities: [],
  };
}

export function createMutations() {
  return {
    [UPSERT_ENTITY]: createUpsertMutation(),
    [REMOVE_ENTITY]: createRemoveMutation(),
    [UPDATE_ENTITY_STATUS]: createUpdateEntityStatusMutation(),
    [UDPATE_STATUS]: createUpdateStatusMutation(),
    [ADD_SEARCHED_ENTITIES]: createAddSearchedEntitiesMutation(),
  };
}

export function createActions(service) {
  return {
    [UPSERT_ENTITY_ACTION]: createUpsertAction(service),
    [REMOVE_ENTITY_ACTION]: createRemoveAction(service),
    [FETCH_ACTION]: createFetchAction(service),
  };
}

export function createGetters() {
  return {
    [ENTITIES_GETTER]: createEntitiesGetterAction(),
    [ENTITIES_ARRAY_GETTER]: createArrayGetterAction(),
    [STATUS_GETTER]: createStatusEntitiesGetterAction(),
    [STATUS_ARRAY_GETTER]: createStatusArrayGetterAction(),
  };
}
