import _ from 'lodash';
import { DateTime } from 'luxon';


/* PROCESSORS */

function doAttributesProcess(model, name, value, conf) {
  if (conf.type === 'string' || conf.type === 'integer' || conf.type === 'boolean') {
    model[name] = value;
  } else if (conf.type === 'float') {
    if (!value) {
      model[name] = 0;
    } else {
      model[name] = value;
    }
  } else if (conf.type === 'date') {
    model[name] = DateTime.fromSQL(value).toISODate();
  } else if (conf.type === 'datetime') {
    model[name] = DateTime.fromISO(value).setLocale('es').toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
  } else {
    model[name] = value;
  }
}

function doAttributesArrayProcess(model, name, value, conf) {
  if (conf.isArray && Array.isArray(value)) {
    if (!Array.isArray(model[name])) {
      model[name] = [];
    }
    value.forEach(v => doAttributesProcess(model[name], name, v, conf));
  } else {
    doAttributesProcess(model, name, value, conf);
  }
}


function doRelationshipProcess(model, name, value, isArray = false) {
  if (isArray) {
    if (!Array.isArray(model[name])) {
      model[name] = [];
    }
    model[name].push(value);
  } else {
    model[name] = value;
  }
}

function processAttributeFactory(modelName, conf) {
  if (_.isObjectLike(conf.type)) {
    return (model, value) => {
      const modelAttribute = {};
      _.forOwn(conf.type, (childConfig, childKey) => {
        const serverValue = value[childConfig.name];
        doAttributesArrayProcess(modelAttribute, childKey, serverValue, childConfig);
      });
      doAttributesArrayProcess(model, modelName, modelAttribute, conf);
    };
  }
  return (model, value) => doAttributesArrayProcess(model, modelName, value, conf);
}

function processRelationshipValueFactory(modelName, isArray = false) {
  return (model, value) => {
    if (value) {
      doRelationshipProcess(model, modelName, value.id, isArray);
    }
  };
}

function processRelationshipFactory(modelName, conf) {
  if (conf.isArray) {
    return (model, thoseArray) => thoseArray.map(elem => processRelationshipValueFactory(modelName, true)(model, elem));
  }
  return (model, value) => processRelationshipValueFactory(modelName)(model, value);
}

function processFactory(conf) {
  const processAttributesFactories = {};
  _.forOwn(conf.attributes, (value, key) => {
    processAttributesFactories[value.name] = processAttributeFactory(key, value);
  });
  const processRelationshipsFactories = {};
  _.forOwn(conf.relationships, (value, key) => {
    processRelationshipsFactories[value.name] = processRelationshipFactory(key, value);
  });
  return { processAttributesFactories, processRelationshipsFactories };
}

export function processExecutor(serverInstance, conf) {
  const { attributes, relationships, id, type } = serverInstance;
  const modelToReturn = { id, type };
  const processors = processFactory(conf);
  if (attributes) {
    _.forOwn(processors.processAttributesFactories, (processor, key) => {
      processor(modelToReturn, attributes[key]);
    });
  }
  if (relationships) {
    _.forOwn(processors.processRelationshipsFactories, (processor, key) => {
      if (relationships[key]) {
        processor(modelToReturn, relationships[key].data);
      }
    });
  }
  return modelToReturn;
}

export function processResponseExecutor(res, conf, executor) {
  if (_.has(res, ['data']) && _.has(res.data, 'data')) {
    if (_.isArray(res.data.data)) {
      return res.data.data.map(elem => executor(elem, conf));
    }
    return executor(res.data.data, conf);
  }
  return executor(res.data.data, conf);
}
