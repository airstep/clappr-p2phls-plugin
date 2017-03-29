// Copyright 2014 Flávio Ribeiro <flavio@bem.tv>.
// All rights reserved.
// Use of this source code is governed by a Apache
// license that can be found in the LICENSE file.

import Settings from './settings'
import { _ } from 'underscore'
import { Log as log } from 'clappr'

export default class Storage {
  constructor() {
    this.keys = []
    this.chunks = {}
    this.CHUNK_REGEX = /(.*.ts|.*.aac).*?/
  }

  setItem(key, value) {
    var normalizedKey = key.match(this.CHUNK_REGEX)[1]
    if (_.has(this.chunks, normalizedKey)) {
      log.warn("already have this chunk on storage: " + normalizedKey)
    } else {
      this.keys.push(normalizedKey)
      this.chunks[normalizedKey] = value
      this.updateSize()
    }
  }

  get size() {
    return this.keys.length
  }

  updateSize() {
    if (this.size > Settings.maxStorageChunks) {
      this.removeOlderItem()
    }
  }

  removeOlderItem() {
    var key = this.keys.splice(0, 1)[0]
    delete this.chunks[key]
  }

  getItem(key) {
    var normalizedKey = key.match(this.CHUNK_REGEX)[1]
    return this.chunks[normalizedKey]
  }

  contain(key) {
    var normalizedKey = key.match(this.CHUNK_REGEX)[1]
    return _.contains(this.keys, normalizedKey)
  }

  static getInstance() {
    if (this._instance === undefined) {
      this._instance = new this();
    }
    return this._instance;
  }  
}