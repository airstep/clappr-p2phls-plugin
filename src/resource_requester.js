// Copyright 2014 Flávio Ribeiro <flavio@bem.tv>.
// All rights reserved.
// Use of this source code is governed by a Apache
// license that can be found in the LICENSE file.

import { BaseObject } from 'clappr'
import CDNRequester from './cdn_requester'
import P2PManager from './p2p_manager'
import Settings from './settings'
import { _ } from 'underscore'

export default class ResourceRequester extends BaseObject {
  constructor(params) {
    super()
    //this.cdnRequester = new CDNRequester()
    this.p2pManager = new P2PManager(params)
    this.isInitialBuffer = true
    this.decodingError = false
    this.lowBuffer = Settings.lowBufferLength
    this.onDVR = false
  }

  requestResource(resource, bufferLength, callback) {
    this.resource = resource
    this.callback = callback
    if (this.avoidP2P() || bufferLength < this.lowBuffer || _.size(this.p2pManager.swarm.utils.contributors) === 0) {
      this.requestToCDN()
    } else {
      this.requestToP2P()
    }
  }

  avoidP2P() {
    return _.some([this.onDVR, this.decodingError, this.isInitialBuffer])
  }

  requestToCDN() {
    this.cdnRequester.requestResource(this.resource, this.callback)
  }

  requestToP2P() {
    this.p2pManager.requestResource(this.resource, this.callback, this.requestToCDN.bind(this))
  }
}
