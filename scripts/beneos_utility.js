/********************************************************************************* */
import { BeneosCompendiumManager, BeneosCompendiumReset } from "./beneos_compendium.js";

/********************************************************************************* */
const BENEOS_MODULE_NAME = "Beneos Tokens"
const BENEOS_MODULE_ID = "beneostokens_beta"
const BENEOS_DEFAULT_TOKEN_PATH = "beneostokens_data"

let beneosDebug = true
let beneosFadingSteps = 10
let beneosFadingWait = 30
let beneosFadingTime = beneosFadingSteps * beneosFadingWait
let __mask = 0xffffffff

/********************************************************************************* */
export class BeneosUtility {

  /********************************************************************************** */
  static forgeInit() {
    this.beneosBasePath = ""

    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
      this.debugMessage("[BENEOS TOKENS] This process should only be run in Forge.")
      let ForgeVTTuserid = ForgeAPI.getUserId()
      ForgeVTTuserid.then(function (result) {
        this.beneosBasePath = ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + result + "/"
      })
    }
  }

  /********************************************************************************** */
  static registerSettings() {
    if (game.user.isGM) {

      game.settings.registerMenu(BeneosUtility.moduleID(), "beneos-clean-compendium", {
        name: "Empty compendium to re-import all tokens data",
        label: "Reset & Rebuild BeneosTokens Compendiums",
        hint: "Cleanup BeneosTokens compendium and tokens configs",
        scope: 'world',
        config: true,
        type: BeneosCompendiumReset,
        restricted: true
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-datapath", {
        name: "Storage path of tokens assets",
        hint: "Location of tokens and associated datas",
        scope: 'world',
        config: true,
        default: BeneosUtility.getBeneosDataPath(),
        type: String,
        restricted: true
      })

      /*game.settings.register(BeneosUtility.moduleID(), 'beneos-forcefacetoken', {
        name: 'Use face rings instead of animations?',
        default: false,
        type: Boolean,
        scope: 'world',
        config: true,
        hint: 'Whether to use animated ring tokens or not.',
        onChange: value => BeneosUtility.updateSceneTokens()
      })

      game.settings.register(BeneosUtility.moduleID(), 'beneos-json-tokenconfig', {
        name: 'Global JSON config for tokens',
        default: {},
        type: String,
        scope: 'world',
        config: false
      })

      game.settings.register(BeneosUtility.moduleID(), 'beneos-tokenview', {
        name: 'Beneos Token View',
        default: true,
        type: String,
        scope: 'world',
        config: true,
        choices: {
          "top": "Top view",
          "iso": "Iso view"
        },
        hint: 'Define if you want to use top or iso perspective. All automatic animations will be disables in Iso mode.',
        default: "top"
      })*/

      if (game.dnd5e) {
        game.settings.register(BeneosUtility.moduleID(), 'beneos-animations', {
          name: 'Enable Automatic Animations',
          default: true,
          type: Boolean,
          scope: 'world',
          config: true,
          hint: 'Whether to animate automatically Beneos Tokens.'
        });
      }
    }

    game.settings.register(BeneosUtility.moduleID(), "beneos-speed", {
      name: 'Number of spaces walked per second.',
      hint: 'Slower speeds will give better results. Foundry default speed is 10.',
      scope: "world",
      config: true,
      default: 10,
      type: Number
    })
  }

  /********************************************************************************** */
  static init() {
    this.file_cache = {}
    this.tokenview = game.settings.get(BeneosUtility.moduleID(), 'beneos-tokenview')
    this.beneosModule = game.settings.get(BeneosUtility.moduleID(), 'beneos-animations')
    this.tokenDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH
    this.tokenDataPath = BENEOS_DEFAULT_TOKEN_PATH

    this.beneosHealth = []
    this.beneosPreload = []
    this.beneosTokens = {}
    try {
      this.beneosTokens = JSON.parse(game.settings.get(BeneosUtility.moduleID(), 'beneos-json-tokenconfig'))
    }
    catch {
      console.log("JSON loading error !")
      this.beneosTokens = {}
    }
    console.log("Loaded", this.beneosTokens)

    this.m_w = 123456789
    this.m_z = 987654321
    this.seed(Date.now())
  }

  /********************************************************************************** */
  static debugMessage(msg, data) {
    if (BeneosUtility.isDebug()) {
      console.log(msg, data)
    }
  }

  /********************************************************************************** */
  static moduleName() {
    return BENEOS_MODULE_NAME
  }

  /********************************************************************************** */
  static getBeneosDataPath() {
    return this.tokenDataPath + "/"
  }

  /********************************************************************************** */
  static moduleID() {
    return BENEOS_MODULE_ID
  }

  /********************************************************************************** */
  static isDebug() {
    return beneosDebug
  }
  /********************************************************************************** */
  static isBeneosModule() {
    return this.beneosModule
  }

  /********************************************************************************** */
  static getBasePath() {
    if (this.beneosBasePath == undefined || this.beneosBasePath == null || this.beneosBasePath == "") {
      return ""
    }
    return this.beneosBasePath + "/"
  }

  /********************************************************************************** */
  static getFullPathWithSlash() {
    return this.getBasePath() + this.getBeneosDataPath()
  }
  /********************************************************************************** */
  static seed(i) {
    this.m_w = (123456789 + i) & __mask
    this.m_z = (987654321 - i) & __mask
  }

  /********************************************************************************** */
  //Random function better than the default rand.
  static random() {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & __mask
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & __mask
    let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0
    result /= 4294967296
    return result
  }

  /********************************************************************************** */
  static getTokenView() {
    return this.tokenview
  }

  /********************************************************************************** */
  static createToken(token) {
    if (BeneosUtility.checkIsBeneosToken(token)) {
      BeneosUtility.preloadToken(token)
      let tokenData = BeneosUtility.getTokenImageInfo(token.data.img)
      token.data.document.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
      let scaleFactor = this.getScaleFactor(token, token.data.img)
      canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, scale: scaleFactor })])
      setTimeout(function () {
        BeneosUtility.updateToken(token.id, "standing", { forceupdate: true })
      }, 1000)
    }
  }

  /********************************************************************************** */
  //Foundry default get token give errors from time to time. It's better to get them directly from de canvas.
  static getToken(tokenid) {
    for (let i in canvas.tokens.placeables) {
      let token = canvas.tokens.placeables[i]
      if (token !== undefined && ("id" in token) && token.id == tokenid) {
        return token
      }
    }
    return null
  }

  /********************************************************************************** */
  // Checks if the token image is inside the beneos tokens module
  static checkIsBeneosToken(token) {

    if (token.data && token.data.img && token.data.img.includes(this.tokenDataPath)) {
      return true
    }
    return false
  }

  /********************************************************************************** */
  //Retrieves the necessary data from a token in order to be able to fire automatic animations based on the current token image file.
  static getTokenImageInfo(newImage) {

    let apath = newImage.split("/")
    let pathVariant = ""
    if (apath[apath.length - 2] == "iso" || apath[apath.length - 2] == "top") {
      pathVariant = apath[apath.length - 2]
    }
    let filename = apath[apath.length - 1]

    let tokenData = filename.match("([\\d_\\w]+)-([a-z]+)_([a-z_]+).([webpm])")
    let tokenKey = tokenData[1]
    let currentStatus = tokenData[2]
    let variant = tokenData[3]
    variant = (variant == "top_still") ? "top" : variant
    let extension = tokenData[4]
    let tokenPath = this.getFullPathWithSlash() + tokenKey + "/" + pathVariant + "/"

    let dataPath = { tokenPath: tokenPath, currentStatus: currentStatus, tokenKey: tokenKey, variant: variant, extension: extension }
    return dataPath
  }


  /********************************************************************************** */
  //Function that preloads token animations. We need to do it to prevent the "scale not found" error in Foundry
  static preloadToken(token) {
    let tokenData = this.getTokenImageInfo(token.data.img)
    let myToken = this.beneosTokens[tokenData.tokenKey]

    if (!myToken) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found preloadToken " + tokenData.tokenKey)
      return
    }
    if (!myToken[tokenData.variant]) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Variant not found " + tokenData.variant)
      return
    }

    Object.keys(this.beneosTokens[tokenData.tokenKey][tokenData.variant]).forEach(key => {
      let extension = (key == "dead") ? ".webp" : ".webm"
      let finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + this.beneosTokens[tokenData.tokenKey][tokenData.variant][key]["a"] + "_" + tokenData.variant + extension
      if (!this.beneosPreload[finalImage]) {
        this.debugMessage("[BENEOS TOKENS] Preloaded " + finalImage)
        if (extension == ".webp") {
          this.preloadImage(finalImage)
        } else {
          this.preloadVideo(finalImage)
        }
        this.beneosPreload[finalImage] = true
      }
    })
  }

  /********************************************************************************** */
  static preloadImage(finalImage) {
    TextureLoader.loader.loadImageTexture(finalImage)
  }

  /********************************************************************************** */
  static preloadVideo(finalImage) {
    TextureLoader.loader.loadVideoTexture(finalImage)
  }

  /********************************************************************************** */
  //Function to change the token animations
  static async changeAnimation(token, animation, tkscale, tkangle, tkalpha, tkanimtime, bfx, fading) {

    this.debugMessage("[BENEOS TOKENS] Changing to image:" + animation)

    token.data.img = animation
    BeneosUtility.debugMessage("[BENEOS TOKENS] Change animation with scale: " + tkscale)
    await token.document.update({ img: animation, scale: 1.0, rotation: tkangle, data: { img: animation } })
    await token.document.update({ scale: tkscale })
    //token.refresh()
    this.addFx(token, bfx, true)

    if (tkanimtime < 50) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Finished changing animation: " + tkscale)
    } else {
      setTimeout(function () {
        BeneosUtility.debugMessage("[BENEOS TOKENS] Finished changing animation: " + tkscale)
        token.document.update({ img: animation, scale: tkscale, rotation: tkangle, data: { img: animation } })
      }, tkanimtime - 10)
    }
  }

  /********************************************************************************** */
  // Function to add FX from the Token Magic module or from the ones defined in the configuration files.
  static async addFx(token, bfx, replace = true) {
    if (!game.dnd5e) { 
      return 
    }
    if (typeof TokenMagic !== 'undefined') {
      let bpresets = []

      let flag = token.document.getFlag(BeneosUtility.moduleID(), 'variant')
      if (flag != undefined && flag != "Default") {
        let tokenData = this.getTokenImageInfo(token.data.img)
        bfx = bfx.concat(beneosTokens[tokenData.tokenKey]["config"]["variants"][flag])
      }

      $.each(bfx, function (index, value) {
        let bfxid = value
        let effect = TokenMagic.getPreset(bfxid)
        if (effect !== undefined) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Setting Library FX: " + bfxid)
          $.each(effect, function (presetindex, pressetvalue) {
            bpresets.push(pressetvalue)
          });
        } else {
          if (beneosFX[bfxid] !== undefined) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Setting Beneos FX: " + bfxid)
            $.each(beneosFX[bfxid], function (presetindex, pressetvalue) {
              $.each(pressetvalue, function (kid, kidvalue) {
                if (kid.indexOf("eval_") != -1) {
                  let newkid = kid.replace("eval_", "")
                  kidvalue = kidvalue.replace("random()", "BeneosUtility.random()")
                  kidvalue = kidvalue.replace("__BENEOS_DATA_PATH__", BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath())
                  pressetvalue[newkid] = eval(kidvalue)
                };
              });
              bpresets.push(pressetvalue)
            });
          }
        }

      });
      token.TMFXaddFilters(bpresets, replace)
    }
  }

  /********************************************************************************** */
  // Function made for be able to read the action fired and make it compatible with EasyRolls and MIDI-QOL
  static getAction(message, tokenData) {

    let action = null
    let actionType = null
    let checkActionType = true

    if (typeof BetterRolls !== 'undefined') {
      if (message.data.flags == undefined || message.data.flags.betterrolls5e == undefined || message.data.flags.betterrolls5e.entries == undefined) {
        return action
      }
      action = message.data.flags.betterrolls5e.entries[0].title
      checkActionType = false
    } else {
      let tmpaction = message.data.flavor.split(" - ")
      action = tmpaction[0].trim()
      if (message.data.flags.dnd5e != undefined && message.data.flags.dnd5e.roll != undefined) {
        actionType = message.data.flags.dnd5e.roll.type
      } else {
        let flags = message.data.flags
        if (typeof (MidiQOL) !== 'undefined' && flags["midi-qol"] != undefined && flags["midi-qol"].type != undefined) {

          switch (flags["midi-qol"].type) {
            case 1:
              actionType = "hits";
              break
            case 2:
              actionType = "saves";
              break;
            case 3:
              actionType = "attack";
              break;
            case 4:
              actionType = "damage";
              break;
            case 0:
              actionType = "item";
              break;
          }
        } else {
          switch (message.data.type) {
            case 1:
              actionType = "ooc";
              break
            case 2:
              actionType = "ic";
              break;
            case 3:
              actionType = "emote";
              break;
            case 4:
              actionType = "whisper";
              break;
            case 0:
              actionType = "other";
              break;
          }
        }
      }
    }

    let myToken = BeneosUtility.beneosTokens[tokenData.tokenKey][tokenData.variant]
    if (!myToken.hasOwnProperty(action)) {
      return null
    }
    if (checkActionType &&
      myToken[action]["actionType"] &&
      myToken[action]["actionType"] != actionType) {
      return null
    }

    return action
  }

  /********************************************************************************** */
  static firstLetterUpper(mySentence) {
    const words = mySentence.split(" ");
    return words.map((word) => {
      return word[0].toUpperCase() + word.substring(1)
    }).join(" ")
  }

  /********************************************************************************** */
  static getIdleTokens(token) {
    let matchArray = token.data.img.match("(\\d\\d\\d[_\\d\\w]+)")
    let tokenKey = matchArray[0]
    let tokenList = []

    if (tokenKey) {
      let tokenData = this.beneosTokens[tokenKey]
      //console.log("Token", tokenKey, token, tokenData)
      for (let idleImg of tokenData.idleList) {
        let modeName = idleImg.match("(idle_[\\w_]*).web")
        modeName = this.firstLetterUpper(modeName[1].replace(/_/g, ", "))
        tokenList.push({
          "token": this.getFullPathWithSlash() + tokenKey + '/' + tokenKey + "-idle_face_still.webp",
          "name": modeName, 'tokenvideo': idleImg
        })
      }
    }
    return tokenList
  }

  /********************************************************************************** */
  static getScaleFactor(token, newImage) {
    let scaleFactor = token.data.document.getFlag(BeneosUtility.moduleID(), "scalefactor") || 0

    let tokenData = this.getTokenImageInfo(newImage)
    let myToken = this.beneosTokens[tokenData.tokenKey]
    let newScaleFactor = myToken.config.scalefactor
    if (newImage.includes("_top")) {
      if (myToken[tokenData.variant][tokenData.currentStatus]) {
        let s = myToken[tokenData.variant][tokenData.currentStatus].s || 1.0
        newScaleFactor *= s
      }
    }
    if (newScaleFactor != scaleFactor) {
      token.data.document.setFlag(BeneosUtility.moduleID(), "scalefactor", newScaleFactor)
    }
    return newScaleFactor
  }

  /********************************************************************************** */
  static async forceChangeToken(tokenid, newImage) {
    let token = BeneosUtility.getToken(tokenid)
    if (token === null || token == undefined) {
      return
    }
    let tokenData = BeneosUtility.getTokenImageInfo(newImage)
    if (newImage.includes("idle_")) { // Save the lates selected IDLE animation
      token.data.document.setFlag(BeneosUtility.moduleID(), "idleimg", newImage)
    }
    token.data.document.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
    let scaleFactor = this.getScaleFactor(token, newImage)
    await token.document.update({ img: newImage, scale: scaleFactor, rotation: 1.0 })
    //canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: finalimage, scale: 1.0, rotation: 0 })])
    let actor = token.actor
    if (actor && actor.data.type == "character") {
      let actorImage = tokenData.path + "/" + tokenData.tokenKey + "-idle_face" + ".webm"
      actor.update({ 'token.img': actorImage })
    }
    return
  }

  /********************************************************************************** */
  static async forceIdleTokenUpdate(tokenid, newImage) {
    let token = BeneosUtility.getToken(tokenid)
    if (token === null || token == undefined) {
      return
    }
    let tokenData = BeneosUtility.getTokenImageInfo(newImage)
    let scaleFactor = this.getScaleFactor(token, newImage)
    token.data.document.setFlag(BeneosUtility.moduleID(), "idleimg", newImage)
    token.data.document.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
    //console.log("New IDLE image", scaleFactor)
    await token.document.update({ img: newImage, scale: 1.0, rotation: 1.0 })
    if (scaleFactor != 1.0) {
      token.document.update({ scale: scaleFactor })
    }
    /*canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: newImage, scalefactor: scalefactor, rotation: 0 })])
    canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: newImage, scalefactor: scalefactor, rotation: 0 })])*/
  }

  /********************************************************************************** */
  // Main function that allows to control the automatic animations and decide which animations has to be shown.
  static updateToken(tokenid, BeneosUpdateAction, BeneosExtraData) {

    let token = BeneosUtility.getToken(tokenid)
    if (token === null || token == undefined) {
      return
    }

    let actor = token.actor
    if (actor === null || actor == undefined) return
    let actorData = actor.data
    if (actorData === null || actorData == undefined) return
    if (!BeneosUtility.checkIsBeneosToken(token)) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Not Beneos")
      return;
    }

    if (!token.data.img) {
      console.log("No image found!!!!", tokenData, token)
      return
    }
    let tokenData = BeneosUtility.getTokenImageInfo(token.data.img)
    //console.log("TOKEN DATA used", tokenData, token.img, token.data.img)
    if (tokenData.variant != "top") {
      return // Not in "top" mode, so exit
    }

    let myToken = BeneosUtility.beneosTokens[tokenData.tokenKey]
    if (typeof (myToken) == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found " + tokenData)
      return
    }
    let benVariant = myToken[tokenData.variant]
    if (!myToken[tokenData.variant]) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Variant not found")
      return
    }

    let attributes = actorData.data.attributes
    if (attributes == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] No attributes")
      return
    }

    let hp = attributes.hp.value
    let benRotation = 0
    let benAlpha = 1

    if (hp == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] No hp")
      return
    }

    BeneosUtility.beneosHealth[token.id] = hp
    if (token.data.rotation != undefined) { benRotation = token.data.rotation }
    if (token.data.alpha != undefined) { benAlpha = token.data.alpha }
    let scaleFactor = token.data.document.getFlag(BeneosUtility.moduleID(), "scalefactor")
    if (!scaleFactor || scaleFactor != myToken.config["scalefactor"]) {
      scaleFactor = myToken.config["scalefactor"]
      token.data.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
    }

    switch (BeneosUpdateAction) {
      case "hit":
        if (typeof (benVariant["hit"]) != "undefined") {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Hit");
          if (tokenData.currentstatus != benVariant["hit"]["a"] || ("forceupdate" in BeneosExtraData)) {
            let finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["hit"]["a"] + "_" + tokenData.variant + ".webm"
            BeneosUtility.changeAnimation(token, finalimage, benVariant["hit"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["hit"]["t"], benVariant["hit"]["fx"], true)
            setTimeout(function () {
              BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
            }, benVariant["hit"]["t"] + (beneosFadingTime * 2))
          }
        }
        break;
      case "move":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Move")
        if (typeof (benVariant["move"]) != "undefined") {
          if (tokenData.currentstatus != benVariant["move"]["a"] || ("forceupdate" in BeneosExtraData)) {
            let finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["move"]["a"] + "_" + tokenData.variant + ".webm"
            let ray = token._movement;
            let instantTeleport = Math.max(Math.abs(ray.dx), Math.abs(ray.dy)) <= canvas.grid.size;
            let mvtime = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BeneosUtility.moduleID(), 'beneos-speed'));
            let mvangle = (Math.atan2(token._velocity.dy, token._velocity.dx, token._velocity.dx) / (Math.PI / 180)) - 90;

            if (instantTeleport) {
              canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, rotation: mvangle })])
              return
            }
            BeneosUtility.changeAnimation(token, finalimage, benVariant["move"]["s"] * scaleFactor, mvangle, benAlpha, mvtime, benVariant["move"]["fx"], false);
            setTimeout(function () {
              BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
            }, mvtime + 100)
          }
        }
        break;

      case "heal":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Healing")
        BeneosUtility.addFx(token, ["BFXGlow", "BFXShine"], true)
        setTimeout(function () {
          BeneosUtility.updateToken(token.id, "standing", { forceupdate: true });
        }, 3000)
        break;

      case "standing":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Standing with hp " + BeneosUtility.beneosHealth[token.id])
        if (BeneosUtility.beneosHealth[token.id] > 0 || !game.dnd5e) {
          if (token.inCombat) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] In Combat");
            if (typeof (benVariant["combat_idle"]) != "undefined") {
              if (tokenData.currentstatus != benVariant["combat_idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                let finalimage = token.data.document.getFlag(BeneosUtility.moduleID(), "idleimg")
                if (finalimage == undefined || finalimage == null || finalimage == "") {
                  finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["combat_idle"]["a"] + "_" + tokenData.variant + ".webm"
                }
                BeneosUtility.changeAnimation(token, finalimage, benVariant["combat_idle"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["combat_idle"]["t"], benVariant["combat_idle"]["fx"], true)
              }
            }
          } else {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Idle");
            if (typeof (benVariant["idle"]) != "undefined") {
              if (tokenData.currentstatus != benVariant["idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                let finalimage = token.data.document.getFlag(BeneosUtility.moduleID(), "idleimg")
                if (finalimage == undefined || finalimage == null || finalimage == "") {
                  finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["idle"]["a"] + "_" + tokenData.variant + ".webm";
                }
                console.log("IDLE standing", benVariant["idle"]["s"], scaleFactor)
                BeneosUtility.changeAnimation(token, finalimage, benVariant["idle"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["idle"]["t"], benVariant["idle"]["fx"], true);
              }
            }
          }
        } else {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Dead");
          if (typeof (benVariant["die"]) != "undefined") {
            if ((tokenData.currentstatus != benVariant["die"]["a"] && tokenData.currentstatus != benVariant["dead"]["a"]) || ("forceupdate" in BeneosExtraData)) {
              if (tokenData.extension != "webp") {
                let idToken = token.id
                let finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["die"]["a"] + "_" + tokenData.variant + ".webm";
                BeneosUtility.changeAnimation(token, finalimage, benVariant["die"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["die"]["t"], benVariant["die"]["fx"], true);
                setTimeout(function () {
                  token = BeneosUtility.getToken(idToken);
                  finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant["dead"]["a"] + "_" + tokenData.variant + ".webp";
                  BeneosUtility.changeAnimation(token, finalimage, benVariant["dead"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["dead"]["t"], benVariant["dead"]["fx"], false);
                }, benVariant["die"]["t"]);
              } else {
                if ("forceupdate" in BeneosExtraData) {
                  BeneosUtility.addFx(token, benVariant["dead"]["fx"])
                }
              }
            }
          }
        }
        break;
      case "action":
        let action = BeneosUtility.getAction(BeneosExtraData["action"], tokenData);
        if (!action) return;
        BeneosUtility.debugMessage("[BENEOS TOKENS] Action: " + action)
        if (benVariant.hasOwnProperty(action)) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Action found");
          if (typeof (benVariant[action]) != "undefined") {
            if (tokenData.currentstatus != benVariant[action]["a"] || ("forceupdate" in BeneosExtraData)) {
              let finalimage = tokenData.tokenPath + tokenData.tokenKey + "-" + benVariant[action]["a"] + "_" + tokenData.variant + ".webm";
              BeneosUtility.changeAnimation(token, finalimage, benVariant[action]["s"] * scaleFactor, benRotation, benAlpha, benVariant[action]["t"], benVariant[action]["fx"], true);
              setTimeout(function () {
                BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
              }, benVariant[action]["t"] + (beneosFadingTime * 2));
            }
          }
        }
        break;
    }
  }

  /********************************************************************************** */
  // Function to force update the renewal of beneos tokens in a scene.
  static updateSceneTokens() {
    for (let i in canvas.tokens.placeables) {
      let token = canvas.tokens.placeables[i];
      if (token !== undefined && ("id" in token)) {
        this.preloadToken(token)
        BeneosUtility.debugMessage("[BENEOS TOKENS] Force updating " + token.id)
        this.updateToken(token.id, "standing", { forceupdate: true })
      }
    }
  }

  /********************************************************************************** */
  static processCanvasReady() {
    for (let [key, token] of canvas.scene.tokens.entries()) {
      if (BeneosUtility.checkIsBeneosToken(token)) {
        let tokenData = BeneosUtility.getTokenImageInfo(token.data.img)
        let tokenConfig = this.beneosTokens[tokenData.tokenKey]
        if (typeof tokenConfig === 'object' && tokenConfig ) {
          BeneosUtility.updateToken(token.id, "standing", {})
        }
      }
    }
  }
}
