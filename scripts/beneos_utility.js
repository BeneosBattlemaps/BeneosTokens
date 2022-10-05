/********************************************************************************* */
import { BeneosCompendiumManager, BeneosCompendiumReset } from "./beneos_compendium.js";
import { BeneosSearchEngineLauncher, BeneosDatabaseHolder } from "./beneos_search_engine.js";

/********************************************************************************* */
const BENEOS_MODULE_NAME = "Beneos Tokens"
const BENEOS_MODULE_ID = "beneostokens"
const BENEOS_DEFAULT_TOKEN_PATH = "beneos_tokens_assets"

let beneosDebug = true
let beneosFadingSteps = 10
let beneosFadingWait = 30
let beneosFadingTime = beneosFadingSteps * beneosFadingWait
let __mask = 0xffffffff

/********************************************************************************** */
export class BeneosActorTokenMigration extends FormApplication {

  /********************************************************************************** */
  async performMigrate() {

    ui.notifications.info("Searching actors and token to migrate ....")

    // Migrate actors
    for (let actor of game.actors) {
      if (actor.img && actor.img.includes("beneostokens") && !actor.img.includes(BeneosUtility.tokenDataPath)) {
        let oldImgData = BeneosUtility.getTokenImageInfo(actor.img)
        let newImgPath = BeneosUtility.getFullPathWithSlash() + oldImgData.tokenKey + "/" + oldImgData.filename
        await actor.update({ 'img': newImgPath })
        console.log("actor update...", actor.name, actor.img)
      }
      if (actor.token && actor.token.img.includes("beneostokens") && !actor.token.img.includes(BeneosUtility.tokenDataPath)) {
        let oldTokenImgData = BeneosUtility.getTokenImageInfo(actor.texture.src)
        let newTokenImgPath = BeneosUtility.getFullPathWithSlash() + oldTokenImgData.tokenKey + "/" + oldTokenImgData.pathVariant + "/" + oldTokenImgData.filename
        await actor.update({ 'token.img': newTokenImgPath })
        console.log("actor token update...", actor.name, actor.token.texture.src)
      }
    }
    // Migrate tokens on scenes
    for (let scene of game.scenes) {
      for (let token of scene.tokens) {
        if (token.texture && token.texture.src.includes("beneostokens") && !token.texture.src.includes(BeneosUtility.tokenDataPath)) {
          let oldTokenImgData = BeneosUtility.getTokenImageInfo(token.texture.src)
          let newTokenImgPath = BeneosUtility.getFullPathWithSlash() + oldTokenImgData.tokenKey + "/" + oldTokenImgData.pathVariant + "/" + oldTokenImgData.filename
          console.log("scene token update : ", scene.name, token.name)
          await token.update({ 'img': newTokenImgPath })
        }
      }
    }
    ui.notifications.info("Actors/Tokens migration finished !")
  }

  /********************************************************************************** */
  render() {
    this.performMigrate()
  }

}

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

      game.beneosTokens = {
        moduleId: BENEOS_MODULE_ID
      }

      game.settings.registerMenu(BeneosUtility.moduleID(), "beneos-clean-compendium", {
        name: "Empty compendium to re-import all tokens data",
        label: "Reset & Rebuild BeneosTokens Compendiums",
        hint: "Cleanup BeneosTokens compendium and tokens configs",
        scope: 'world',
        config: true,
        type: BeneosCompendiumReset,
        restricted: true
      })

      game.settings.registerMenu(BeneosUtility.moduleID(), "beneos-migrate", {
        name: "Migrate all previous actors/tokens to new data organization",
        label: "Migrate actors and tokens",
        hint: "Convert all tokens and actors in the current world to the new BeneosTokens organization",
        scope: 'world',
        config: true,
        type: BeneosActorTokenMigration,
        restricted: true
      })

      game.settings.registerMenu(BeneosUtility.moduleID(), "beneos-search-engine", {
        name: "Search Engine",
        label: "Search in published tokens/battlemaps",
        hint: "Search in all the published tokens/battlemaps from BeneosSearch engine",
        scope: 'world',
        config: true,
        type: BeneosSearchEngineLauncher,
        restricted: true
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-datapath", {
        name: "Storage path of tokens assets",
        hint: "Location of tokens and associated datas",
        scope: 'world',
        config: true,
        default: BENEOS_DEFAULT_TOKEN_PATH,
        type: String,
        restricted: true
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-god-mode", {
        name: "Enable God Mode",
        label: "Enable token editors tools",
        hint: "",
        scope: 'world',
        config: false,
        default: false,
        type: Boolean,
        restricted: true
      })


      game.settings.register(BeneosUtility.moduleID(), 'beneos-json-tokenconfig', {
        name: 'Global JSON config for tokens',
        default: {},
        type: String,
        scope: 'world',
        default: "",
        config: false
      })

      if (game.dnd5e) {
        game.settings.register(BeneosUtility.moduleID(), 'beneos-animations', {
          name: 'Enable Automatic Animations',
          default: true,
          type: Boolean,
          scope: 'world',
          default: true,
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
    //this.tokenview = game.settings.get(BeneosUtility.moduleID(), 'beneos-tokenview')
    this.beneosModule = game.settings.get(BeneosUtility.moduleID(), 'beneos-animations')
    this.tokenDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH
    //this.tokenDataPath = BENEOS_DEFAULT_TOKEN_PATH

    this.beneosHealth = []
    this.beneosPreload = []
    this.beneosTokens = {}
    try {
      this.beneosTokens = JSON.parse(game.settings.get(BeneosUtility.moduleID(), 'beneos-json-tokenconfig'))
    }
    catch {
      console.log("BeneosTokens : *************** JSON loading error ! **************")
      this.beneosTokens = {}
    }
    console.log("Loaded", this.beneosTokens)

    this.m_w = 123456789
    this.m_z = 987654321
    this.seed(Date.now())

    Handlebars.registerHelper('beneosUpperFirst', function (text) {
      if (typeof text !== 'string') return text
      return text.charAt(0).toUpperCase() + text.slice(1)
    })
    Handlebars.registerHelper('getTagDescription', function (text) {
      return BeneosDatabaseHolder.getTagDescription(text)
    })

  }

  /********************************************************************************** */
  static resetTokenData() {
    this.beneosTokens = {}
  }

  /********************************************************************************** */
  static upperFirst(text) {
    if (typeof text !== 'string') return text
    return text.charAt(0).toUpperCase() + text.slice(1)
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
  static createToken(token) {
    if (BeneosUtility.checkIsBeneosToken(token)) {
      //console.log(">>>>>>>>>> CXRATE TOKEN BENEOS")
      BeneosUtility.preloadToken(token)
      let object = (token.document ) ? token.document : token
      let tokenData = BeneosUtility.getTokenImageInfo(object.texture.src)
      object.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
      object.setFlag("core", "randomizeVideo", false)
      let scaleFactor = this.getScaleFactor(token, object.texture.src)
      canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, scale: scaleFactor })])
      setTimeout(function () {
        BeneosUtility.updateToken(token.id, "standing", { forceupdate: true })
      }, 1000)
    }
  }

  /********************************************************************************** */
  //Foundry default get token give errors from time to time. It's better to get them directly from de canvas.
  static getToken(tokenid) {
    return canvas.tokens.placeables.find( t => t.id == tokenid )
  }

  /********************************************************************************** */
  // Checks if the token image is inside the beneos tokens module
  static checkIsBeneosToken(token) {
    if (token.document && token.document.texture && token.document.texture.src.includes(this.tokenDataPath)) {
      return true
    }
    if (token.texture && token.texture.src.includes(this.tokenDataPath)) {
      return true
    }
    return false
  }

  /********************************************************************************** */
  //Retrieves the necessary data from a token in order to be able to fire automatic animations based on the current token image file.
  static getTokenImageInfo(newImage) {
    let dataPath = {}

    let apath = newImage.split("/")
    let pathVariant = ""
    if (apath[apath.length - 2] == "iso" || apath[apath.length - 2] == "top") {
      pathVariant = apath[apath.length - 2]
    }
    let filename = apath[apath.length - 1]
    let tokenData = filename.match("([\\d_\\w]+)-([a-z]+_*\\d*)_([a-z_]+).([webpm])")
    if (tokenData) {
      let tokenKey = tokenData[1]
      let currentStatus = tokenData[2]
      let variant = tokenData[3]
      variant = (variant == "top_still") ? "top" : variant
      let extension = tokenData[4]
      let tokenPath = this.getFullPathWithSlash() + tokenKey + "/" + pathVariant + "/"

      dataPath = { img: newImage, tokenPath: tokenPath, filename: filename, pathVariant: pathVariant, currentStatus: currentStatus, tokenKey: tokenKey, variant: variant, extension: extension }
    }
    return dataPath
  }


  /********************************************************************************** */
  //Function that preloads token animations. We need to do it to prevent the "scale not found" error in Foundry
  static preloadToken(token) {
    console.log(">>>>>>> token", token)
    let tokenData = this.getTokenImageInfo(token.document?.texture.src || token.texture.src)
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
  static async changeAnimation(token, animation, tkscale, tkangle, tkalpha, tkanimtime, bfx, fading, forceStart) {

    this.debugMessage("[BENEOS TOKENS] Changing to image:" + animation, token)

    token.texture.src = animation
    tkangle = tkangle || token.rotation ||  token.document?.rotation || 0
    BeneosUtility.debugMessage("[BENEOS TOKENS] Change animation with scale: " + tkscale, tkangle)
    if (forceStart) {
      await token.document.setFlag("core", "randomizeVideo", false)
    } else {
      await token.document.setFlag("core", "randomizeVideo", true)
    }
    await token.document.update({ img: animation, scale: tkscale, rotation: tkangle, data: { img: animation } })
    if (tkscale != 1.0) {
      //token.document.update({ scale: tkscale })
    }
    //token.refresh()
    this.addFx(token, bfx, true)
    BeneosUtility.debugMessage("[BENEOS TOKENS] Finished changing animation: " + tkscale)
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
        let tokenData = this.getTokenImageInfo(token.texture.src)
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
      console.log("Adding effects", bpresets, replace)
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
      if (message.flags == undefined || message.flags.betterrolls5e == undefined || message.flags.betterrolls5e.entries == undefined) {
        return action
      }
      action = message.flags.betterrolls5e.entries[0].title
      checkActionType = false
    } else {
      let tmpaction = message.flavor.split(" - ")
      action = tmpaction[0].trim()
      if (message.flags.dnd5e != undefined && message.flags.dnd5e.roll != undefined) {
        actionType = message.flags.dnd5e.roll.type
      } else {
        let flags = message.flags
        if (typeof (MidiQOL) !== 'undefined' && flags["midi-qol"] != undefined && flags["midi-qol"].type != undefined) {
          console.log("MIDI QOL !!!!", message, flags, flags["midi-qol"])
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
          switch (message.type) {
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
    let matchArray = token.document.texture.src.match("(\\d\\d\\d[_\\d\\w]+)")
    let tokenKey = matchArray[0]
    let tokenList = []

    if (tokenKey) {
      let tokenConfig = this.beneosTokens[tokenKey]
      if (!tokenConfig || !tokenConfig) {
        ui.notifications.warn("Error in BeneosTokens : the tokenKey seems wrong " + tokenKey)
        console.log("Working tokenKey - matchArray : ", tokenKey, matchArray)
        return tokenList
      }
      //console.log("Token", tokenKey, token, tokenConfig)
      for (let idleImg of tokenConfig.idleList) {
        let modeName = idleImg.match("(idle_[\\w_]*).web")
        modeName = this.firstLetterUpper(modeName[1].replace(/_/g, ", "))
        tokenList.push({
          isVideo: idleImg.includes("webm"),
          token: idleImg, //this.getFullPathWithSlash() + tokenKey + '/' + tokenKey + "-idle_face_still.webp",
          name: modeName, tokenvideo: idleImg
        })
      }
    }
    return tokenList
  }

  /********************************************************************************** */
  static isLoaded(tokenKey) {
    return this.beneosTokens[tokenKey]
  }

  /********************************************************************************** */
  static getActorId(tokenKey) {
    let token = this.beneosTokens[tokenKey]
    if (token) {
      return token.actorId
    }
    return undefined
  }

  /********************************************************************************** */
  static getAnimatedTokens(token) {
    console.log("TOKEN: ", token)
    let tokenData = this.getTokenImageInfo(token.document.texture.src)
    let tokenList = []

    if (tokenData && tokenData.tokenKey) {
      let tokenConfig = this.beneosTokens[tokenData.tokenKey]
      for (let imgVideo of tokenConfig.imgVideoList) {
        if (imgVideo.includes("top") && imgVideo.includes(".webm")) {
          let modeName = imgVideo.match("-([\\w_]*).web")
          modeName = this.firstLetterUpper(modeName[1].replace(/_/g, ", "))
          tokenList.push({
            isVideo: imgVideo.includes("webm"),
            token: imgVideo, //this.getFullPathWithSlash() + tokenKey + '/' + tokenKey + "-idle_face_still.webp",
            name: modeName, tokenvideo: imgVideo
          })
        }
      }
    }
    return tokenList
  }

  /********************************************************************************** */
  static getScaleFactor(token, newImage) {
    let object = (token.document) ? token.document : token
    let scaleFactor = object.getFlag(BeneosUtility.moduleID(), "scalefactor") || 0

    let tokenData = this.getTokenImageInfo(newImage)
    let myToken = this.beneosTokens[tokenData.tokenKey]
    //console.log("Got token config !!!", myToken, this.beneosTokens, tokenData.tokenKey)
    let newScaleFactor = myToken.config.scalefactor
    if (newImage.includes("_top")) {
      if (myToken[tokenData.variant][tokenData.currentStatus]) {
        let s = myToken[tokenData.variant][tokenData.currentStatus].s || 1.0
        newScaleFactor *= s
      }
    }
    if (newScaleFactor != scaleFactor) {
      object.setFlag(BeneosUtility.moduleID(), "scalefactor", newScaleFactor)
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
      token.document.setFlag(BeneosUtility.moduleID(), "idleimg", newImage)
    }
    token.document.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
    let scaleFactor = this.getScaleFactor(token, newImage)
    await token.document.update({ img: newImage, scale: scaleFactor, rotation: 1.0 })
    //canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: finalimage, scale: 1.0, rotation: 0 })])
    let actor = token.actor
    if (actor && actor.type == "character") {
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
    token.document.setFlag(BeneosUtility.moduleID(), "idleimg", newImage)
    token.document.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
    //console.log("New IDLE image", scaleFactor)
    await token.document.update({ img: newImage, scale: 1.0, rotation: 1.0 })

    if (scaleFactor != 1.0) {
      await token.document.update({ scale: scaleFactor })
    }
    if (tokenData.variant == "top") {
      let tokenConfig = this.beneosTokens[tokenData.tokenKey]
      if (tokenConfig && tokenConfig.top && tokenConfig.top.idle && tokenConfig.top.idle.fx) {
        this.addFx(token, tokenConfig.top.idle.fx, true)
      }
    }
    canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: newImage, scale: scaleFactor, scalefactor: scaleFactor, rotation: 0 })])
  }
  
  /********************************************************************************** */
  static processMove(tokenid, token, variantData, tokenData, BeneosExtraData, scaleFactor, benAlpha, dx, dy) {

    if (tokenData.currentStatus != variantData.a || ("forceupdate" in BeneosExtraData)) {
      let finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
      //let ray = token._movement

      token.beneosOrigin = {x: token.x, y: token.y} // Store for refresh
      token.beneosDestination = {x: BeneosExtraData.x, y: BeneosExtraData.y} // Store for refresh

      let instantTeleport = Math.max(Math.abs(dx), Math.abs(dy)) <= canvas.grid.size
      let ray = new Ray( {x: token.x, y: token.y}, {x: BeneosExtraData.x, y: BeneosExtraData.y})
      //let mvtime = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BeneosUtility.moduleID(), 'beneos-speed'))
      let mvtime = ((ray.distance / canvas.dimensions.size) * game.settings.get(BeneosUtility.moduleID(), 'beneos-speed')) * 1000
      let mvangle = (Math.atan2(dy, dx, dx) / (Math.PI / 180)) - 90

      if (instantTeleport) {
        canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, rotation: mvangle })])
        return
      }
      token.isMoving = true
      BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, mvangle, benAlpha, mvtime, variantData.fx, false)
    }
  }

  /********************************************************************************** */
  // Main function that allows to control the automatic animations and decide which animations has to be shown.
  static updateToken(tokenid, BeneosUpdateAction, BeneosExtraData) {

    let token = BeneosUtility.getToken(tokenid)
    if (!token || !BeneosUtility.checkIsBeneosToken(token) || !token.document.texture.src) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Not Beneos/No image")
      return
    }

    let actorData = token.actor
    if (!actorData) {
      return
    }

    let tokenData = BeneosUtility.getTokenImageInfo(token.document.texture.src)
    if (tokenData.variant != "top") {
      return // Not in "top" mode, so exit
    }

    let myToken = BeneosUtility.beneosTokens[tokenData.tokenKey]
    if (!myToken) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found " + tokenData)
      return
    }
    let benVariant = myToken[tokenData.variant]
    if (!myToken[tokenData.variant]) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Variant not found")
      return
    }

    let attributes = actorData.system.attributes
    if (!attributes) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] No attributes", actorData)
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
    if (token.rotation) { benRotation = token.rotation }
    if (token.alpha) { benAlpha = token.alpha }
    let scaleFactor = token.document.getFlag(BeneosUtility.moduleID(), "scalefactor")
    if (!scaleFactor || scaleFactor != myToken.config["scalefactor"]) {
      scaleFactor = myToken.config["scalefactor"]
      token.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
    }

    let variantData
    switch (BeneosUpdateAction) {
      case "hit":
        variantData = benVariant["hit"]
        if (variantData) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Hit")
          if (tokenData.currentStatus != variantData.a || ("forceupdate" in BeneosExtraData)) {
            let finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
            BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, benRotation, benAlpha, variantData.t, variantData.fx, true, true)
            setTimeout(function () {
              BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
            }, variantData.t + (beneosFadingTime * 2))
          }
        }
        break;

      case "move":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Move")
        variantData = benVariant["move"]
        const prevPos = { x: token.x, y: token.y }
        const newPos = { x: BeneosExtraData.x ?? token.x, y: BeneosExtraData.y ?? token.y }
        let dx = newPos.x - prevPos.x
        let dy = newPos.y - prevPos.y
        //console.log("DX/DY", dx, dy)
        if (variantData && !token.isMoving && (dx != 0 || dy !=0)) {
          token.isMoving = true
          this.processMove(tokenid, token, variantData, tokenData, BeneosExtraData, scaleFactor, benAlpha, dx, dy)
        }
        break;

      case "heal":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Healing")
        BeneosUtility.addFx(token, ["BFXGlow", "BFXShine"], true)
        setTimeout(function () {
          BeneosUtility.updateToken(token.id, "standing", { forceupdate: true });
        }, 3000)
        break

      case "standing":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Standing with hp " + BeneosUtility.beneosHealth[token.id], Date.now())
        token.isMoving = false
        if (BeneosUtility.beneosHealth[token.id] > 0 || !game.dnd5e) {
          if (token.inCombat) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] In Combat")
            variantData = benVariant["combat_idle"]
            if (variantData) {
              if (tokenData.currentStatus != variantData.a || ("forceupdate" in BeneosExtraData)) {
                let finalImage = token.document.getFlag(BeneosUtility.moduleID(), "idleimg")
                if (!finalImage || finalImage == "") {
                  finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
                }
                BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, benRotation, benAlpha, variantData.t, variantData.fx, true)
              }
            }
          } else {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Idle", token)
            variantData = benVariant["idle"]
            if (variantData) {
              if (tokenData.currentStatus != variantData.a || ("forceupdate" in BeneosExtraData)) {
                let finalImage = token.document.getFlag(BeneosUtility.moduleID(), "idleimg")
                if (!finalImage || finalImage == "") {
                  finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
                }
                BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, benRotation, benAlpha, variantData.t, variantData.fx, true)
              }
            }
          }
        } else {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Dead")
          variantData = benVariant["die"]
          let variantDataDead = benVariant["dead"]
          if (variantData) {
            if ((tokenData.currentStatus != variantData.a && tokenData.currentStatus != variantDataDead.a) || ("forceupdate" in BeneosExtraData)) {
              if (tokenData.extension != "webp") {
                let finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
                BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, benRotation, benAlpha, variantData.t, variantData.fx, true,  true)
                setTimeout(function () {
                  finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantDataDead.a + "_" + tokenData.variant + ".webp"
                  console.log("Updating DEAD", finalImage, variantData.t)
                  BeneosUtility.changeAnimation(token, finalImage, variantDataDead.s * scaleFactor, benRotation, benAlpha, variantDataDead.t, variantDataDead.fx, false,  true)
                }, variantData.t)
              } else {
                if ("forceupdate" in BeneosExtraData) {
                  BeneosUtility.addFx(token, variantDataDead.fx)
                }
              }
            }
          }
        }
        break
      case "action":
        let action = BeneosUtility.getAction(BeneosExtraData["action"], tokenData);
        if (!action) return;
        BeneosUtility.debugMessage("[BENEOS TOKENS] Action: " + action)
        if (benVariant.hasOwnProperty(action)) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Action found")
          variantData = benVariant[action]
          if (variantData) {
            if (tokenData.currentStatus != variantData.a || ("forceupdate" in BeneosExtraData)) {
              let finalImage = tokenData.tokenPath + tokenData.tokenKey + "-" + variantData.a + "_" + tokenData.variant + ".webm"
              BeneosUtility.changeAnimation(token, finalImage, variantData.s * scaleFactor, benRotation, benAlpha, variantData.t, variantData.fx, true,  true)
              setTimeout(function () {
                BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
              }, variantData.t + (beneosFadingTime * 2))
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
        let tokenData = BeneosUtility.getTokenImageInfo(token.texture.src)
        let tokenConfig = this.beneosTokens[tokenData.tokenKey]
        if (typeof tokenConfig === 'object' && tokenConfig) {
          BeneosUtility.updateToken(token.id, "standing", {})
        }
      }
    }
  }

  /********************************************************************************** */
  static async changeSize(tokenId, tokenImg, incDec) {
    let token = BeneosUtility.getToken(tokenId)
    if (token === null || token == undefined) {
      return
    }

    let tokenData = this.getTokenImageInfo(tokenImg)
    if (tokenData && tokenData.tokenKey) {
      let tokenConfig = this.beneosTokens[tokenData.tokenKey]
      if (tokenConfig) {
        let status = tokenData.currentStatus
        //console.log("Updting size : ", status, tokenConfig)

        //if (tokenData.currentStatus.includes("idle") || tokenData.currentStatus.includes("special")) {
        if (tokenData.currentStatus.includes("idle")) {
          status = "idle"
        }
        let variantName = tokenData.variant
        if (!tokenConfig[tokenData.variant]) {
          variantName = "top"
        }
        if (!tokenConfig[variantName]) {
          ui.notifications.warn("Unable to find token/variant data for " + variantName)
          return
        }
        let currentData = tokenConfig[variantName][status]
        if (!currentData) {
          for (let variantKey in tokenConfig.top) {
            let variantData = tokenConfig.top[variantKey]
            if (variantData.a == tokenData.currentStatus) {
              currentData = variantData
            }
          }
        }
        if (!currentData) {
          ui.notifications.warn("Unable to find token/variant data for " + tokenData.variant + " - " + tokenData.currentStatus)
          return
        }
        currentData.s += incDec

        console.log("Status detected ", status)
        // Save scalefactor
        if (status == "die") {
          let currentDataDeath = tokenConfig[variantName]["dead"]
          if (currentDataDeath) {
            currentDataDeath.s = currentData.s
            ui.notifications.info("Token Die detected, same size applied to death token")
          }
        }

        // Save scalefactor
        let scaleFactor = currentData.s * tokenConfig.config.scalefactor
        token.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
        await token.document.update({ scale: scaleFactor })
      }
    }
  }

  /********************************************************************************** */
  static async saveJSONConfig(tokenKey) {
    let tokenConfig = this.beneosTokens[tokenKey]
    if (tokenConfig) {
      let jsonData = {}
      jsonData[tokenKey] = {
        config: duplicate(tokenConfig.config),
        top: duplicate(tokenConfig.top)
      }
      let json = JSON.stringify(jsonData)
      saveDataToFile(json, "text/json", tokenConfig.JSONFilePath)
    }
  }
}
