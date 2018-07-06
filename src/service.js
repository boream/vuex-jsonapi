import _ from 'lodash';

function keepTrying(httpService, query, accum = []) {
  const promise = httpService.get(query);
  return promise
    .then((res) => {
      accum.push(promise);
      if ('links' in res.data && 'next' in res.data.links) {
        return keepTrying(httpService, res.data.links.next, accum);
      }
      return Promise.all(accum);
    });
}

/**
 *
 * @param httpService
 * @param entity
 * @param responseProcessor
 * @param formatter
 * @param url
 * @returns {Promise<T>}
 */
export function doCreate(httpService, entity, responseProcessor, formatter, url) {
  return httpService.post(`${url}`, { data: formatter(entity) })
    .then(res => responseProcessor(res));
}

/**
 * @param httpService
 * @param entity
 * @param responseProcessor
 * @param formatter
 * @param url
 * @returns {Promise<T>}
 */
export function doUpdate(httpService, entity, responseProcessor, formatter, url) {
  return httpService.patch(`${url}/${entity.id}`, { data: formatter(entity) })
    .then(res => responseProcessor(res));
}

/**
 * @param query Query is type of object {
    [GroupName: String]: {
      conjunction: 'string',
      memberOf: 'string'
    }
    [FilterName: String]: {
      operator: 'string',
      value: 'any | any[]',
      modelName: 'string',
      path: 'string',
      memberOf: 'string',
      parent: 'string',
      parentProperty: 'string"
     }
   };
 GroupName: Name for a group of filters.
 conjunction: Type of Conjuction { AND | OR }. Required.
 memberOf: Name of the parent group for this group. Optional.
 FilterName: Name for the filter.
 operator: Type of operator. { =, <, >, <>, IN, NOT IN, BETWEEN, ... } Required.
 value: Value for the filter. Required Object | Array.
 modelName: Name of the field in the local side model. Only use when you want perform a local search with this field.
 path: Path to field in entity. Optional.
 memberOf: Filter group name for this filter. Optional.
 parent: If this filter apply on parent entity. When it is set, path should point to exact
 entity path from parent entity. You cannot use modelName property with this property. Default false.
 parentProperty: Entity property name in parent entity relationship. Only use when parent property is used.
 */
export function doFetch(httpService, query, processor, queryBuilder, localSearch) {
  const promises = [];
  const resolvedStrings = queryBuilder(query);

  if (resolvedStrings.entity !== '') {
    promises.push(keepTrying(httpService, resolvedStrings.entity));
  }
  if (resolvedStrings.parents.length > 0) {
    resolvedStrings.parents.forEach(queryStr => promises.push(httpService.get(queryStr)));
  }
  return Promise.all(promises).then((results) => {
    // entity responses
    let index = 0;
    const finalResponse = [];
    const entitiesResponse = {};
    if (resolvedStrings.entity !== '') {
      if (Array.isArray(results[index]) && results[index].length > 0) {
        const responses = _.flatten(results[index]);
        responses.forEach((res) => {
          if (Array.isArray(res.data.data)) {
            res.data.data.forEach((entity) => {
              finalResponse.push(entity);
              entitiesResponse[entity.id] = processor(entity);
            });
          } else if (results[index]) {
            finalResponse.push(res.data.data);
            entitiesResponse[res.data.data.id] = processor(res.data.data);
          }
        });
      }
      index += 1;
    }
    // entity parents responses
    const parents = [];
    if (Array.isArray(resolvedStrings.parents) && resolvedStrings.parents.length > 0) {
      while (index < results.length) {
        // parents.push(...results[index].data.data);
        parents.push(..._.differenceWith(results[index].data.data, parents, (arrVal, othVal) => arrVal.id !== othVal.id));
        if (Array.isArray(results[index].data.included)) {
          // eslint-disable-next-line no-loop-func
          results[index].data.included.forEach((entity) => {
            if (!entitiesResponse[entity.id]) {
              const entityWithParent = processor(entity);
              entityWithParent.parentSearched = {
                id: results[index].data.id,
                type: results[index].data.type,
              };
              entitiesResponse[entity.id] = entityWithParent;
              finalResponse.push(entity);
            }
          });
        }
        index += 1;
      }
    }
    return {
      entities: localSearch(entitiesResponse, query),
      parents: parents.map(val => ({ id: val.id, type: val.type })),
    };
  });
}

export function doRemove(httpService, entity, url) {
  return httpService.delete(`${url}/${entity.id}`);
}
