// Copyright 2014 Flávio Ribeiro <flavio@bem.tv>.
// All rights reserved.
// Use of this source code is governed by a Apache
// license that can be found in the LICENSE file.

import { BaseObject, Log as log } from 'clappr'

//import { QuickConnect } from 'rtc-quickconnect'
import { Settings } from './settings'
import { Swarm } from './swarm'
import { _ } from 'underscore'

export default class P2PManager extends BaseObject {
  constructor(params) {
    super()
    this.connectionSettings = {'room': params.swarm, iceServers: Settings.stunServers, debug: false}
    log.info("P2P active, connected to " + Settings.tracker)
    var quickconnect = require('rtc-quickconnect')
    var connection = quickconnect(Settings.tracker, this.connectionSettings)
    //var connection = QuickConnect(Settings.tracker, this.connectionSettings)
    this.swarm = new Swarm()
    this.dataChannel = connection.createDataChannel('bemtv')
    this.setupListerners()
  }

  setupListerners() {
    this.dataChannel.on('channel:opened', (id, dataChannel) => this.onChannelOpened(id, dataChannel))
    this.dataChannel.on('channel:closed', (id, dataChannel) => this.onChannelClosed(id))
  }

  onChannelOpened(id, dataChannel) {
    if (this.swarm.size() <= Settings.maxSwarmSize) {
      this.swarm.addPeer(id, dataChannel)
    } else {
      log.warn("ignoring new peer, maxSwarmSize reached.")
    }
  }

  onChannelClosed(id) {
    this.swarm.removePeer(id)
  }

  requestResource(resource, callbackSuccess, callbackFail) {
    if (_.size(this.swarm.utils.contributors) === 0) {
      callbackFail()
    } else {
      this.swarm.sendInterested(resource, callbackSuccess, callbackFail)
    }
  }
}
