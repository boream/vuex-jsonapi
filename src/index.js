import base from '../../plugins/baseHttp';
import { processExecutor, processResponseExecutor } from './processors';
import formatExecutor from './formatters';
import { createRoutes, queryBuilder, localSearch } from './fetcher';
import { doCreate, doUpdate, doRemove, doFetch } from './service';
import { createGetters, createActions, createEntityState, createMutations } from './store';

export const createUtils = (conf) => {
  const processFunctionName = `process_${conf.name}`;
  const formatFunctionName = `format_${conf.name}`;
  const processResponseFunctionName = `processResponse_${conf.name}`;
  return {
    responseProcessor: res => processResponseExecutor(res, conf, processExecutor),
    formatter: modelInstance => formatExecutor(modelInstance, conf),
    processor: modelInstance => processExecutor(modelInstance, conf),
    queryBuilder: modelInstance => queryBuilder(modelInstance, conf),
    [processFunctionName]: serverInstance => processExecutor(serverInstance, conf),
    [processResponseFunctionName]: res => processResponseExecutor(res, conf, processExecutor),
    [formatFunctionName]: modelInstance => formatExecutor(modelInstance, conf),
  };
};

export const createService = (httpService, conf, baseUrl) => {
  const utils = createUtils(conf);
  return {
    create: entity => doCreate(base, entity, utils.responseProcessor, utils.formatter, baseUrl + createRoutes(conf.type)),
    update: entity => doUpdate(base, entity, utils.responseProcessor, utils.formatter, baseUrl + createRoutes(conf.type)),
    remove: entity => doRemove(base, entity, baseUrl + createRoutes(conf.type)),
    fetch: query => doFetch(base, query, utils.processor, utils.queryBuilder, localSearch),
  };
};

export const createModule = (service, namespaced = false) => {
  const mutations = createMutations();
  const actions = createActions(service);
  const state = createEntityState();
  const getters = createGetters();
  return { namespaced, state, mutations, actions, getters };
};
