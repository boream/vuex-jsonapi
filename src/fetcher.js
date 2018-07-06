import _ from 'lodash';

/* FETCH with FILTERS */

const EQUAL_OPERATOR = '=';
const NOT_EQUAL_OPERATOR = '<>';
const BIGGER_THAN_OPERATOR = '>';
const BIGGER_EQUAL_THAN_OPERATOR = '>=';
const SMALL_THAN_OPERATOR = '<';
const SMALL_EQUAL_THAN_OPERATOR = '<=';
const STARTS_WITH_OPERATOR = 'STARTS_WITH';
const CONTAINS_OPERATOR = 'CONTAINS';
// const ENDS_WITH_OPERATOR = 'ENDS_WITH';
const IN_OPERATOR = 'IN';
const NOT_IN_OPERATOR = 'NOT IN';
const BETWEEN_OPERATOR = 'BETWEEN';
const NOT_BETWEEN_OPERATOR = 'NOT BETWEEN';
const IS_NULL_OPERATOR = 'IS NULL';
const IS_NOT_NULL_OPERATOR = 'IS NOT NULL';


const AND_CONJUCTION = 'AND';
// const OR_CONJUCTION = 'OR';


/* *********** Server Fetching functions **************************** */

function calculateValueStr(operator, value, valueSchema) {
  let valueStr;
  if (operator === IN_OPERATOR || operator === NOT_IN_OPERATOR) {
    if (Array.isArray(value) && value.length > 0) {
      value.forEach((v) => {
        if (!valueStr) {
          valueStr = `${valueSchema}[]=${v}`;
        } else {
          valueStr += `&${valueSchema}[]=${v}`;
        }
      });
    }
  } else if (operator === BETWEEN_OPERATOR || operator === NOT_BETWEEN_OPERATOR) {
    if (Array.isArray(value) && value.length === 2) {
      value.forEach((v) => {
        if (!valueStr) {
          valueStr = `${valueSchema}[]=${v}`;
        } else {
          valueStr += `&${valueSchema}[]=${v}`;
        }
      });
    }
  } else if (operator === IS_NULL_OPERATOR || operator === IS_NOT_NULL_OPERATOR) {
    return '';
  } else {
    valueStr = `${valueSchema}=${value}`;
  }
  return `&${valueStr}`;
}

function doEntity(query) {
  let entity = {};
  const entityGroups = {};
  if ('id' in query && query.id !== '' && query.id !== 'dummy') {
    entity = query.id;
  } else {
    _.forOwn(query, (filter, filterName) => {
      if (_.has(filter, 'path') && !_.has(filter, 'parent')) {
        const genericFilter = {
          path: `filter[${filterName}-filter][condition][path]=`,
          operator: `filter[${filterName}-filter][condition][operator]=`,
          value: `filter[${filterName}-filter][condition][value]`,
          memberOf: `filter[${filterName}-filter][condition][memberOf]=`,
        };
        const pathStr = `${genericFilter.path}${filter.path}`;
        const operatorStr = `${genericFilter.operator}${filter.operator}`;
        const valueStr = calculateValueStr(filter.operator, filter.value, genericFilter.value);
        if (typeof valueStr === 'string') {
          if (_.has(filter, 'memberOf') && filter.memberOf && filter.memberOf !== '') {
            const memberOfStr = `${genericFilter.memberOf}${filter.memberOf}-group`;
            entity[filterName] = `${pathStr}&${operatorStr}${valueStr}&${memberOfStr}`;
            entityGroups[filter.memberOf] = true;
          } else {
            entity[filterName] = `${pathStr}&${operatorStr}${valueStr}`;
          }
        }
      }
    });
  }
  return { entity, entityGroups };
}

function doParents(query) {
  const parents = {};
  const parentsReferences = {};
  const parentsGroups = {};
  _.forOwn(query, (filter, filterName) => {
    if (_.has(filter, 'path') && _.has(filter, 'parent') && _.has(filter, 'parentProperty')) {
      const genericFilter = {
        path: `filter[${filterName}-filter][condition][path]=`,
        operator: `filter[${filterName}-filter][condition][operator]=`,
        value: `filter[${filterName}-filter][condition][value]`,
        memberOf: `filter[${filterName}-filter][condition][memberOf]=`,
      };
      const pathStr = `${genericFilter.path}${filter.path}`;
      const operatorStr = `${genericFilter.operator}${filter.operator}`;
      const valueStr = calculateValueStr(filter.operator, filter.value, genericFilter.value);
      if (!parents[filter.parent]) {
        parents[filter.parent] = `${pathStr}&${operatorStr}${valueStr}`;
        parentsReferences[filter.parent] = [filter.parentProperty];
      } else {
        parents[filter.parent] += `&${pathStr}&${operatorStr}${valueStr}`;
      }
      const exist = parentsReferences[filter.parent].indexOf(filter.parentProperty) > -1;
      if (!exist) {
        parentsReferences[filter.parent].push(filter.parentProperty);
      }
      if (_.has(filter, 'memberOf') && filter.memberOf && filter.memberOf !== '') {
        const memberOfStr = `${genericFilter.memberOf}${filter.memberOf}-group`;
        if (!parents[filter.parent]) {
          parents[filter.parent] = `${pathStr}&${operatorStr}${valueStr}&${memberOfStr}`;
        } else {
          parents[filter.parent] += `&${pathStr}&${operatorStr}${valueStr}&${memberOfStr}`;
        }
        if (!_.has(parentsGroups, filter.memberOf)) {
          parentsGroups[filter.memberOf] = {};
        }
        parentsGroups[filter.memberOf][filter.parent] = true;
      }
      parentsReferences[filter.parent] = filter.parentProperty;
    }
  });
  return { parents, parentsGroups, parentsReferences };
}

function createGroups(query, entityGroups, parentsGroups) {
  const queryWithMainGroup = _.merge({}, query, {
    main: {
      conjunction: AND_CONJUCTION,
      memberOf: null,
    },
  });
  const entity = {};
  const fromParents = {};
  _.forOwn(queryWithMainGroup, (value, name) => {
    if (_.has(value, 'conjunction')) {
      if (entityGroups[name] || parentsGroups[name]) {
        const conjunction = value.conjunction || AND_CONJUCTION;
        const memberOf = value.memberOf || null;
        const template = `filter[${name}-group][group]`;
        entity[name] = `${template}[conjunction]=${conjunction}`;
        if (parentsGroups[name]) {
          _.forOwn(parentsGroups[name], (pvalue, parentName) => {
            if (!fromParents[parentName]) {
              fromParents[parentName] = `${template}[conjunction]=${conjunction}`;
            } else {
              fromParents[parentName] += `&${template}[conjunction]=${conjunction}`;
            }
          });
        }
        if (memberOf) {
          if (parentsGroups[name]) {
            _.forOwn(parentsGroups[name], (pvalue, parentName) => {
              fromParents[parentName] += `&filter[${name}-group][group][memberOf]=${memberOf}`;
            });
          }
          entity[name] += `&filter[${name}-group][group][memberOf]=${memberOf}-group`;
        }
      }
    }
  });
  let fromEntity = '';
  _.forOwn(entity, (group) => {
    if (fromEntity === '') {
      fromEntity = group;
    } else {
      fromEntity += `&${group}`;
    }
  });
  return { fromEntity, fromParents };
}

export function createRoutes(type) {
  const paths = type.split('--');
  let partialUrl = '';
  paths.forEach((path) => {
    partialUrl = partialUrl.concat(`/${path}`);
  });
  return partialUrl;
}

function queryFactory(query, conf) {
  const urls = [];
  const { entity, entityGroups } = doEntity(query);
  const { parents, parentsGroups, parentsReferences } = doParents(query);
  const groups = createGroups(query, entityGroups, parentsGroups);
  const entityName = conf.name;
  if (!_.isEmpty(groups.fromEntity)) {
    urls.push(`${createRoutes(conf.type)}?${groups.fromEntity}&`);
  } else if (_.isString(entity) && entity !== '') {
    urls.push(`${createRoutes(conf.type)}`); // id case
  } else {
    urls.push(`${createRoutes(conf.type)}?`);
  }
  if (!_.isEmpty(parents)) {
    _.forOwn(parents, (value, parentType) => {
      if (!_.isEmpty(groups.fromParents) && _.has(groups.fromParents, parentType)) {
        urls.push(`${createRoutes(parentType)}?${groups.fromParents[parentType]}&`);
      } else {
        urls.push(`${createRoutes(parentType)}?`);
      }
    });
  }
  return { urls, parents, entity, entityName, groups, parentsReferences };
}

export function queryBuilder(query, conf) {
  const { urls, entity, parents, parentsReferences } = queryFactory(query, conf);
// eslint-disable-next-line quote-props
  const resolvedString = { 'entity': '', 'parents': [] };
// eslint-disable-next-line no-nested-ternary
  const id = (typeof entity === 'string') ? entity : (entity && 'id' in entity && entity.id !== '' && entity.id !== 'dummy' ? entity.id : null);
  if (id) { // ID entity search
    resolvedString.entity = `${urls[0]}/${id}`;
  } else if (_.isEmpty(query)) {
    resolvedString.entity = `${urls[0]}`;
  } else if (!_.isEmpty(entity)) {
    let filters = '';
    _.forOwn(entity, (filter) => {
      if (filters === '') {
        filters = filter;
      } else {
        filters += `&${filter}`;
      }
    });
    resolvedString.entity = `${urls[0]}${filters}`;
  }
  if (urls.length > 1) { // Parents search
    let i = 1;
    _.forOwn(parents, (filter, parentName) => {
      const parentUrl = `${urls[i]}`;
      resolvedString.parents.push(`${parentUrl}${filter}&include=${parentsReferences[parentName]}`);
      i += 1;
    });
  }
  return resolvedString;
}

/* *********** Local searching functions **************************** */

function comparate(operator, value, valueServer) {
  if (operator === IN_OPERATOR || operator === NOT_IN_OPERATOR) {
    if (Array.isArray(value) && value.length > 0) {
      let found = false;
      value.forEach((v) => {
        found = _.findIndex(valueServer, vs => v === vs);
      });
      return found;
    }
  } else if (operator === BETWEEN_OPERATOR) {
    if (Array.isArray(value) && value.length === 2) {
      let found = false;
      value.forEach((v) => {
        found = _.findIndex(valueServer, vs => v === vs);
      });
      return found;
    }
  } else if (operator === EQUAL_OPERATOR) {
    return value === valueServer;
  } else if (operator === NOT_EQUAL_OPERATOR) {
    return value !== valueServer;
  } else if (operator === BIGGER_THAN_OPERATOR) {
    return value > valueServer;
  } else if (operator === SMALL_THAN_OPERATOR) {
    return value < valueServer;
  } else if (operator === BIGGER_EQUAL_THAN_OPERATOR) {
    return value >= valueServer;
  } else if (operator === SMALL_EQUAL_THAN_OPERATOR) {
    return value <= valueServer;
  } else if (operator === STARTS_WITH_OPERATOR) {
    return _.startsWith(valueServer, value);
  } else if (operator === CONTAINS_OPERATOR) {
    return _.includes(valueServer, value);
  } else if (operator === IS_NULL_OPERATOR) {
    return _.isNil(valueServer);
  } else if (operator === IS_NOT_NULL_OPERATOR) {
    return !_.isNil(valueServer);
  }
  return false;
}

export function formatGroups(payload) {
  const groups = {
    main: {
      conjunction: 'AND',
      filters: [],
    },
  };
  _.forOwn(payload, (field, conjunctionName) => {
    if (_.has(field, 'conjunction')) {
      if (_.has(field, 'memberOf')) {
        groups[conjunctionName] = Object.assign({}, field, { filters: [] });
      } else {
        groups[conjunctionName] = Object.assign({}, field, { memberOf: 'main', filters: [] });
      }
    }
  });
  _.forOwn(payload, (field) => {
    if (_.has(field, 'modelName')) {
      if (_.has(field, 'memberOf')) {
        groups[field.memberOf].filters.push(field);
      } else {
        groups.main.filters.push(field);
      }
    }
  });
  _.forOwn(groups, (group) => {
    if (_.has(group, 'memberOf')) {
      if (_.has(groups, group.memberOf) && !_.has(group, 'children')) {
        groups[group.memberOf].children = [];
      }
      groups[group.memberOf].children.push(group);
    }
  });
  return groups;
}

export function testEntity(entity, payload, root) {
  if (_.has(root, 'conjunction')) {
    let filterResult = root.conjunction === 'AND';
    if (_.has(root, 'filters')) {
      filterResult = root.filters.length === 0 || root.conjunction === 'AND';
      root.filters.forEach((field) => {
        if (_.has(field, 'parent')) {
          filterResult = true;
        } else {
          const comparateResult = comparate(field.operator, field.value, entity[field.modelName]);
          if (root.conjunction === 'AND') {
            filterResult = comparateResult && filterResult;
          } else {
            filterResult = comparateResult || filterResult;
          }
        }
      });
    }
    if (_.has(root, 'children')) {
      let results;
      if (root.conjunction === 'AND') {
        results = true;
        root.children.forEach((g) => {
          results = testEntity(entity, payload, g) && results;
        });
        filterResult = results && filterResult;
      } else {
        results = false;
        root.children.forEach((g) => {
          results = testEntity(entity, payload, g) || results;
        });
        filterResult = results || filterResult;
      }
    }
    return filterResult;
  }
  return true;
}

export function localSearch(entities, payload) {
  const groups = formatGroups(payload);
  const result = [];
  _.forOwn(entities, (entity) => {
    if (testEntity(entity, payload, groups.main)) {
      result.push(entity);
    }
  });
  return result;
}

