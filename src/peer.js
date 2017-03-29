// Copyright 2014 Flávio Ribeiro <flavio@bem.tv>.
// All rights reserved.
// Use of this source code is governed by a Apache
// license that can be found in the LICENSE file.
import {Log as log, BaseObject} from 'clappr'

import Storage from './storage'
import UploadHandler from './upload_handler'
import PlaybackInfo from './playback_info'
import md5 from './md5'

export default class Peer extends BaseObject {
  constructor(params) {
    super()
    this.storage = Storage.getInstance()
    this.ident = params.ident
    this.swarm = params.swarm
    this.dataChannel = params.dataChannel
    this.dataChannel.on("data", (data) => this.messageReceived(data))
    this.uploadHandler = UploadHandler.getInstance()
    this.playbackInfo = PlaybackInfo.getInstance()
    this.score = 1000
    this.late = 0
    this.active = false
    this.sendPing()
  }

  sendPing() {
    this.pingSent = Date.now()
    this.dataChannel.send("ping$$" + (new Array(2 * 1024)).join("x"))
  }

  sendPong() {
    this.dataChannel.send("pong$$")
  }

  pongReceived() {
    var rtt = Date.now() - this.pingSent
    this.active = true
    this.score -= Math.ceil(rtt / 100)
    log.info('join: ' + this.ident + " (rtt: " + rtt + ")")
  }

  sendSatisfy(resource) {
    if (this.storage.contain(resource)) {
      if (this.uploadHandler.getSlot(this.ident)) {
        var content = this.storage.getItem(resource)
        content = md5(content) + content
        this.send('satisfy', resource, content)
        this.playbackInfo.updateChunkStats('p2psent')
      } else {
        log.warn("cannot send satisfy, no upload slot available")
        this.send("busy", resource)
      }
    } else {
      this.send('choke', resource)
    }
  }

  interestedReceived(resource) {
    if (this.storage.contain(resource)) {
      if (this.uploadHandler.getSlot(this.ident)) {
        this.send('contain', resource)
      } else {
        this.send('busy', resource)
      }
    } else {
      this.send("choke", resource)
    }
  }

  messageReceived(data) {
    var [command, resource, content] = data.split("$")
    switch (command) {
      case 'interested':
        this.interestedReceived(resource)
        break
      case 'contain':
        this.swarm.containReceived(this, resource)
        break
      case 'request':
        this.sendSatisfy(resource)
        break
      case 'choke':
        this.swarm.chokeReceived(resource)
        break
      case 'satisfy':
        var md5Header = content.slice(0, 32)
        var realContent = content.slice(32)
        if (content.length > 0 && md5Header === md5(realContent)) {
          log.info("received satisfy, md5 ok")
          this.swarm.satisfyReceived(this, resource, realContent)
        } else {
          log.warn("error receiving segment")
        }
        break
      case 'busy':
        this.swarm.busyReceived(this)
        break
      case 'ping':
        this.sendPong()
        break
      case 'pong':
        this.pongReceived(this)
        break
    }
  }

  send(command, resource, content='') {
    var message = this.mountMessage(command, resource, content)
    this.dataChannel.send(message)
  }

  mountMessage(command, resource, content) {
    var msg = command + "$" + resource + "$"
    if (content) {
      msg = msg + content
    }
    return msg
  }
}
