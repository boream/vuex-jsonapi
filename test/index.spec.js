/* global describe, it, before */

import chai from 'chai';
import * as lib from '../lib/json-vuex.js';
import { AjdConf } from './configurations';

chai.expect();

const expect = chai.expect;

const httpService = {
  get: () => Promise.resolve(),
  post: () => Promise.resolve(),
  patch: () => Promise.resolve()
};

let createService;

describe('Given an instance of my jsonapi service', () => {
  before(() => {
    createService = lib.createService(httpService, AjdConf, 'http://api.example.com');
  });
  describe('createService', () => {
    it('should return the jsonapi http service', () => {
      expect(createService).to.not.equal(undefined);
      expect(createService.create).to.not.equal(undefined);
    });
  });
  describe('when I need the jsonapi service', () => {
    it('should has methods', () => {
      expect(lib.createService).to.not.equal(undefined);
      expect(lib.createModule).to.not.equal(undefined);
      expect(lib.selectId).to.not.equal(undefined);
      expect(lib.selectIds).to.not.equal(undefined);
    });
  });
});
