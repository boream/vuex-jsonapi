import _ from 'lodash';
import { localSearch } from './fetcher';

export function selectId(entities, id) {
  if (_.isObjectLike(entities)) {
    return _.clone(entities[id]);
  }
  return null;
}

export function selectIds(entities, ids) {
  const returnedEntities = [];
  if (_.isObjectLike(entities) && Array.isArray(ids)) {
    ids.forEach((id) => {
      if (entities[id]) {
        returnedEntities.push(_.clone(entities[id]));
      }
    });
  }
  return returnedEntities;
}

export function search(entities, payload) {
  return localSearch(entities, payload);
}

export default {
  methods: {
    selectId,
    selectIds,
    search,
  },
};
