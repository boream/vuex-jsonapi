export const AjdConf = {
  name: 'ajd',
  type: 'node--ajd',
  attributes: {
    title: {
      type: 'string',
      required: true,
      isArray: false,
      name: 'title'
    },
    comunidad: {
      type: 'string',
      required: false,
      isArray: false,
      name: 'ajd_comunidad'
    },
    valor: {
      type: 'string',
      required: false,
      isArray: false,
      name: 'ajd_valor'
    }
  },
  relationships: {}
};

