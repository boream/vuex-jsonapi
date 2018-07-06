import _ from 'lodash';
import { DateTime } from 'luxon';

/* FORMATTERS */

function doAttributesFormat(model, name, value, conf) {
  if (conf.type === 'string' || conf.type === 'integer' || conf.type === 'boolean') {
    model[name] = value;
  } else if (conf.type === 'float') {
    if (!value) {
      model[name] = 0;
    } else {
      model[name] = value;
    }
  } else if (conf.type === 'date') {
    model[name] = DateTime.fromISO(value).toISODate();
  } else if (conf.type === 'datetime') {
    model[name] = DateTime.fromISO(value).setLocale('es').toFormat("yyyy-MM-dd'T'HH:mm:ss");
  } else {
    model[name] = value;
  }
}

function doAttributesArrayFormat(model, name, value, conf) {
  if (conf.isArray && Array.isArray(value)) {
    if (!Array.isArray(model[name])) {
      model[name] = [];
    }
    value.forEach((v, index) => doAttributesFormat(model[name], index, v, conf));
  } else {
    doAttributesFormat(model, name, value, conf);
  }
}

function formatAttributeValueFactory(conf) {
  if (_.isObjectLike(conf.type)) {
    return (attributes, value) => {
      if (conf.isArray && Array.isArray(value)) {
        value.forEach((childValues) => {
          const serverValues = [];
          const serverValue = {};
          _.forOwn(conf.type, (childConf, childKey) => {
            const childValue = childValues[childKey];
            doAttributesArrayFormat(serverValue, childConf.name, childValue, childConf);
          });
          serverValues.push(serverValue);
          doAttributesArrayFormat(attributes, conf.name, serverValues, conf);
        });
      } else {
        const serverValue = {};
        _.forOwn(conf.type, (childConf, childKey) => {
          const childValue = value[childKey];
          doAttributesArrayFormat(serverValue, childConf.name, childValue, childConf);
        });
        doAttributesArrayFormat(attributes, conf.name, serverValue, conf);
      }
    };
  }
  return (attributes, value) => doAttributesArrayFormat(attributes, conf.name, value, conf);
}

function formatAttributeFactory(conf) {
  const required = (value) => {
    if (!value) {
      const error = `Not ${conf.name} and it is required!`;
      throw error;
    }
  };
  if (conf.required) {
    return (modelToSave, value) => {
      required(value);
      return formatAttributeValueFactory(conf)(modelToSave, value);
    };
  }
  return (modelToSave, value) => formatAttributeValueFactory(conf)(modelToSave, value);
}

function formatRelationshipFactory(conf) {
  const required = (value) => {
    if (!value) {
      const error = `Not ${conf.name} and it is required!`;
      throw error;
    }
  };
  const resolveId = (value) => {
    if (_.isObjectLike(value) && _.has(value, 'id') && _.isString(value.id)) {
      return value.id;
    }
    return value;
  };
  const resolveType = (value, confType) => {
    if (_.isObjectLike(value) && _.has(value, 'type') && _.isString(value.type)) {
      return value.type;
    }
    return confType;
  };
  if (conf.required) {
    if (conf.isArray) {
      return (modelToSave, thoseArray) => {
        required(thoseArray);
        const data = thoseArray.map(value => ({ id: resolveId(value), type: resolveType(value, conf.type) }));
        modelToSave[conf.name] = { data };
      };
    }
    return (modelToSave, value) => {
      required(value);
      modelToSave[conf.name] = { data: { id: resolveId(value), type: resolveType(value, conf.type) } };
    };
  }
  if (conf.isArray) {
    return (modelToSave, thoseArray) => {
      const data = thoseArray.map(value => ({ id: resolveId(value), type: resolveType(value, conf.type) }));
      modelToSave[conf.name] = { data };
    };
  }
  return (modelToSave, value) => {
    modelToSave[conf.name] = { data: { id: resolveId(value), type: resolveType(value, conf.type) } };
  };
}

function formatFactory(conf) {
  const formatAttributesFactories = {};
  _.forOwn(conf.attributes, (value, key) => {
    formatAttributesFactories[key] = formatAttributeFactory(value);
  });
  const formatRelationshipsFactories = {};
  _.forOwn(conf.relationships, (value, key) => {
    formatRelationshipsFactories[key] = formatRelationshipFactory(value);
  });
  return { formatAttributesFactories, formatRelationshipsFactories };
}

export default function formatExecutor(modelInstance, conf) {
  const id = 'id' in modelInstance && modelInstance.id !== '' && modelInstance.id !== 'dummy' ?
    modelInstance.id : undefined;
  const type = (_.has(modelInstance, 'type') && _.isString(modelInstance.type) && modelInstance.type !== '') ?
    modelInstance.type : conf.type;
  const serverInstance = {
    id,
    type,
    attributes: {},
    relationships: {}
  };
  const formatters = formatFactory(conf);
  if (!_.isEmpty(formatters.formatAttributesFactories)) {
    _.forOwn(formatters.formatAttributesFactories, (formatter, key) => {
      formatter(serverInstance.attributes, modelInstance[key]);
    });
  }
  if (!_.isEmpty(formatters.formatRelationshipsFactories)) {
    _.forOwn(formatters.formatRelationshipsFactories, (formatter, key) => {
      if (modelInstance[key]) {
        formatter(serverInstance.relationships, modelInstance[key]);
      }
    });
  }
  return serverInstance;
}
