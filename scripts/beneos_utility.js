/********************************************************************************* */
import { BeneosCompendiumManager, BeneosCompendiumReset } from "./beneos_compendium.js";
import { BeneosSearchEngineLauncher, BeneosDatabaseHolder, BeneosTokensMenu } from "./beneos_search_engine.js";

/********************************************************************************* */
const BENEOS_MODULE_NAME = "Beneos Tokens"
const BENEOS_MODULE_ID = "beneostokens"
const BENEOS_DEFAULT_TOKEN_PATH = "beneos_assets"

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
        moduleId: BENEOS_MODULE_ID,
        BeneosUtility
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
        hint: "",
        scope: 'world',
        config: false,
        default: false,
        type: Boolean,
        restricted: true
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-disable-walk", {
        name: "Disable walk animations",
        hint: "If ticked, walk animations during moves will be disabled",
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-disable-walk-updated", {
        name: "Disable walk animations - To force as default",
        hint: "If ticked, walk animations during moves will be disabled - To force as default",
        scope: 'world',
        config: false,
        default: false,
        type: Boolean
      })

      game.settings.register(BeneosUtility.moduleID(), "beneos-animated-portrait-only", {
        name: "Display only animated portrait",
        hint: "If ticked, only portraits will be available ",
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
      })

      game.settings.register(BeneosUtility.moduleID(), 'beneos-json-tokenconfig', {
        name: 'Global JSON config for tokens',
        default: {},
        type: String,
        scope: 'world',
        default: "",
        config: false
      })

      game.settings.register(BeneosUtility.moduleID(), 'beneos-user-config', {
        name: 'Internal data store for user-defined parameters',
        default: {},
        type: Object,
        scope: 'world',
        config: false
      })

      game.settings.register(BeneosUtility.moduleID(), 'beneos-animations', {
        name: 'Enable Automatic Animations',
        default: true,
        type: Boolean,
        scope: 'world',
        default: true,
        config: true,
        hint: 'Whether to animate automatically Beneos Tokens.'
      })
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
  static processUpdate() {
    let isUpdated = game.settings.get(BeneosUtility.moduleID(), 'beneos-disable-walk-updated')
    if (!isUpdated) {
      game.settings.set(BeneosUtility.moduleID(), 'beneos-disable-walk', true)
      game.settings.set(BeneosUtility.moduleID(), 'beneos-disable-walk-updated', true)
    }
  }

  /********************************************************************************** */
  static init() {
    this.file_cache = {}

    this.userSizes = duplicate(game.settings.get(BeneosUtility.moduleID(), 'beneos-user-config'))
    this.beneosModule = game.settings.get(BeneosUtility.moduleID(), 'beneos-animations')
    this.tokenDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH + "/tokens/"
<<<<<<< HEAD
    this.itemDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH + "/items/"
    this.spellDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH + "/spells/"
=======
    this.spellDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH + "/spells/"
    this.itemDataPath = game.settings.get(BeneosUtility.moduleID(), 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH + "/items/"
>>>>>>> a5bd17ff219cb7201ed6861e767aa491e02f307a

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

    Handlebars.registerHelper('beneosLength', function (text) {
      if (typeof text !== 'string') return 0
      return text.length
    })
    Handlebars.registerHelper('beneosUpperFirst', function (text) {
      if (typeof text !== 'string') return text
      return text.charAt(0).toUpperCase() + text.slice(1)
    })
    Handlebars.registerHelper('getTagDescription', function (text) {
      return BeneosDatabaseHolder.getTagDescription(text)
    })
    Handlebars.registerHelper('beneosLowerCase', function (text) {
      if (typeof text !== 'string') return text
      return text.toLowerCase()
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
  static getBeneosTokensDataPath() {
    return this.tokenDataPath + "/tokens/"
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
    return this.getBasePath() + this.getBeneosTokensDataPath()
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
  static newTokenSetup(token) {
    let object = (token.document) ? token.document : token
    let tokenData = BeneosUtility.getTokenImageInfo(object.texture.src)
    object.setFlag(BeneosUtility.moduleID(), "tokenKey", tokenData.tokenKey)
    object.setFlag("core", "randomizeVideo", false)
    let scaleFactor = this.getScaleFactor(token, object.texture.src)
    canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, scale: scaleFactor })])
    setTimeout(function () {
      BeneosUtility.updateToken(token.id, "standing", { forceupdate: true })
    }, 500)
  }

  /********************************************************************************** */
  static createToken(token) {
    if (BeneosUtility.checkIsBeneosToken(token)) {
      //console.log(">>>>>>>>>> CREATE TOKEN BENEOS")
      BeneosUtility.preloadToken(token)
      setTimeout(function () {
        BeneosUtility.newTokenSetup(token)
      }, 500)
    }
  }

  /********************************************************************************** */
  //Foundry default get token give errors from time to time. It's better to get them directly from de canvas.
  static getToken(tokenid) {
    return canvas.tokens.placeables.find(t => t.id == tokenid)
  }

  /********************************************************************************** */
  // Checks if the token image is inside the beneos tokens module
  static checkIsBeneosToken(token) {
    if (token.document && token.document.texture && token.document.texture.src.includes(this.tokenDataPath)) {
      return true
    }
    if (token.texture && token.texture.src && token.texture.src.includes(this.tokenDataPath)) {
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
  static async changeAnimation(token, animation, tkangle, tkalpha, tkanimtime, bfx, fading, forceStart) {

    this.debugMessage("[BENEOS TOKENS] Changing to image:" + animation, token)

    let tkscale = this.getScaleFactor(token, animation) // Refresh proper token scale
    token.texture.src = animation
    tkangle = tkangle || token.rotation || token.document?.rotation || 0
    BeneosUtility.debugMessage("[BENEOS TOKENS] Change animation with scale: " + tkscale, tkangle)
    if (token.state == "move" || token.state == "action") {
      await token.document.setFlag("core", "randomizeVideo", false)
    } else {
      await token.document.setFlag("core", "randomizeVideo", true)
    }
    if (token.state == "dead") {

    }
    await token.document.update({ img: animation, scale: tkscale, rotation: tkangle, alpha: 1.0, data: { img: animation } }, { animate: false })
    this.addFx(token, bfx, true, true)
    BeneosUtility.debugMessage("[BENEOS TOKENS] Finished changing animation: " + tkscale)

  }

  /********************************************************************************** */
  // Function to add FX from the Token Magic module or from the ones defined in the configuration files.
  static async addFx(token, bfx, replace = true, apply = true) {
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
          })
        } else {
          if (beneosFX[bfxid] !== undefined) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Setting Beneos FX: " + bfxid)
            $.each(beneosFX[bfxid], function (presetindex, pressetvalue) {
              $.each(pressetvalue, function (kid, kidvalue) {
                if (kid.indexOf("eval_") != -1) {
                  let newkid = kid.replace("eval_", "")
                  kidvalue = kidvalue.replace("random()", "BeneosUtility.random()")
                  kidvalue = kidvalue.replace("__BENEOS_DATA_PATH__", BeneosUtility.getBasePath() + BeneosUtility.getBeneosTokensDataPath())
                  pressetvalue[newkid] = eval(kidvalue)
                };
              });
              bpresets.push(pressetvalue)
            })
          }
        }
      })
      if (apply) {
        //console.log("Adding effects", bpresets, replace)
        token.TMFXaddFilters(bpresets, replace)
      } else {
        return bpresets
      }
    }
  }

  /********************************************************************************** */
  static firstLetterUpper(mySentence) {
    const words = mySentence.split(" ");
    return words.map((word) => {
      return word[0].toUpperCase() + word.substring(1)
    }).join(" ")
  }

  /********************************************************************************** */
  static async prepareMenu(e, sheet) {
    if (e.button == 2) {
      let tokenList = BeneosUtility.buildAvailableTokensMenu()
      const beneosTokensDisplay = await BeneosUtility.buildAvailableTokensMenuHTML("beneos-actor-menu.html", tokenList)
      let menu = new BeneosTokensMenu(beneosTokensDisplay, tokenList, sheet.actor.token?.actor || sheet.actor, e.pageX, e.pageY, "beneos-actor-menu.html")
      menu.render(true)
    }
  }

  /********************************************************************************** */
  static getIdleTokens(token) {
    let tokenData = this.getTokenImageInfo(token.document.texture.src)
    let tokenKey = tokenData.tokenKey
    let tokenList = []

    if (tokenKey) {
      let tokenConfig = this.beneosTokens[tokenKey]
      if (!tokenConfig) {
        ui.notifications.warn("Error in BeneosTokens : the tokenKey seems wrong " + tokenKey)
        ui.notifications.warn("Check that the token image is a BeneosToken image, from the beneos tokens folder")
        console.log("Working tokenKey - matchArray : ", tokenKey, matchArray)
        return tokenList
      }
      //console.log("Token", tokenKey, token, tokenConfig)
      for (let idleImg of tokenConfig.idleList) {
        if (game.settings.get(BeneosUtility.moduleID(), "beneos-animated-portrait-only")) {
          if (!idleImg.toLowerCase().match("face")) {
            continue
          }
        }
        let modeName = idleImg.match("(idle_[\\w_]*).web")
        modeName = this.firstLetterUpper(modeName[1].replace(/_/g, ", "))
        tokenList.push({
          isVideo: idleImg.includes("webm"),
          token: idleImg, //this.getFullPathWithSlash() + tokenKey + '/' + tokenKey + "-idle_face_still.webp",
          name: modeName, tokenvideo: idleImg
        })
      }
    } else {
      ui.notifications.warn("Error in BeneosTokens : tokenKey not found ")
      ui.notifications.warn("Check that the token image is a BeneosToken image, from the beneos tokens folder")
    }
    return tokenList
  }

  /********************************************************************************** */
  static getActorCompendium() {
    if (game.system.id == "pf2e") {
      return "beneostokens.beneostokens_actors_pf2"
    } else {
      return "beneostokens.beneostokens_actors"
    }

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
    //console.log("TOKEN: ", token)
    let tokenData = this.getTokenImageInfo(token.document.texture.src)
    let tokenList = []

    if (tokenData && tokenData.tokenKey) {
      let tokenConfig = this.beneosTokens[tokenData.tokenKey]
      if (tokenConfig.imgVideoList) {
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
    }
    return tokenList
  }

  /********************************************************************************** */
  static getScaleFactor(token, newImage = undefined) {
    let object = (token.document) ? token.document : token
    let scaleFactor = object.getFlag(BeneosUtility.moduleID(), "scalefactor") || 0

    let tokenData = this.getTokenImageInfo(newImage)
    let myToken = this.beneosTokens[tokenData.tokenKey]
    //console.log("Got token config !!!", tokenData, myToken, this.beneosTokens, tokenData.tokenKey)
    let newScaleFactor = myToken.config.scalefactor
    let sData
    if (newImage && newImage.includes("_top")) {
      sData = myToken[tokenData.variant][tokenData.currentStatus]
    }
    if (!sData && myToken[tokenData.variant]) {
      Object.keys(myToken[tokenData.variant]).forEach(k => {
        //console.log("Testing...", k, myToken[tokenData.variant][k])
        if (myToken[tokenData.variant][k].a == tokenData.currentStatus) {
          sData = myToken[tokenData.variant][k]
        }
      })
    }
    if (!sData && tokenData.currentStatus.includes("idle_")) {
      let testStatus = "idle_1"
      Object.keys(myToken[tokenData.variant]).forEach(k => {
        //console.log("Testing...", k, myToken[tokenData.variant][k])
        if (myToken[tokenData.variant][k].a == testStatus) {
          sData = myToken[tokenData.variant][k]
        }
      })
    }
    let userSize = this.userSizes[token.id]?.sizeFactor || 1.0
    let s = (sData && sData.s) ? sData.s : 1.0
    // When face tokens, scale is always 1.0
    if (newImage && newImage.includes("__face")) {
      newScaleFactor = 1.0
    } else {
      newScaleFactor *= s * userSize
    }
    console.log("Scale factor : ", newScaleFactor, newImage, sData, tokenData.variant, tokenData.currentStatus, userSize)
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
    //console.log(">>>>>>>>>>> UPDATE TOKEN CHANGE")
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
    console.log("New IDLE image", scaleFactor)
    await token.document.update({ img: newImage })
    await token.document.update({ scale: scaleFactor, rotation: 1.0 })

    if (tokenData.variant == "top") {
      let tokenConfig = this.beneosTokens[tokenData.tokenKey]
      if (tokenConfig && tokenConfig.top && tokenConfig.top.idle && tokenConfig.top.idle.fx) {
        this.addFx(token, tokenConfig.top.idle.fx, true)
      }
    }
    //canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: newImage, scale: scaleFactor, scalefactor: scaleFactor, rotation: 0 })])
  }

  /********************************************************************************** */
  static delayDetectEnd(token) {
    token.detectEnd = true
    setTimeout(function () { BeneosUtility.detectMoveEnd(token) }, 800)
  }

  /********************************************************************************** */
  static processEndEffect(tokenId, animeInfo) {
    BeneosUtility.debugMessage("[BENEOS TOKENS] Effect END ! ", animeInfo[0].tmFilterId)
    let token = canvas.tokens.placeables.find(t => t.id == tokenId)
    for (let a of animeInfo) {
      token.TMFXdeleteFilters(a.tmFilterId)
    }
    // Manage state change
    if (token.state == "heal" || token.state == "hit" || token.state == "action") {
      setTimeout(function () {
        BeneosUtility.updateToken(tokenId, "standing", { forceupdate: true });
      }, 20)
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
    let myToken = BeneosUtility.beneosTokens[tokenData.tokenKey]
    if (!myToken) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found " + tokenData)
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
    token.state = "standing"
    if (game.dnd5e && hp == 0) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Dead")
      token.state = "dead"
      let currentImage = token.document.texture.src
      let newImage =  currentImage
      if (currentImage.includes("_face")) {
        newImage = tokenData.tokenPath + tokenData.tokenKey + "-idle_face_still_death.webp"
      } else if (token.document.texture.src.includes("_top")) {
        newImage = tokenData.tokenPath + tokenData.tokenKey + "-dead_top.webp"
      }
      fetch(newImage).then(function(response) {
        BeneosUtility.changeAnimation(token, newImage, benRotation, benAlpha, undefined, undefined, false, true)
      }).catch(function(error) {
        console.log('Fetch error : ' + error.message);
      })
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

  /* -------------------------------------------- */
  static sortArrayObjectsByName(myArray) {
    myArray.sort((a, b) => {
      let fa = a.actorName.toLowerCase();
      let fb = b.actorName.toLowerCase();
      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    })
  }

  /********************************************************************************** */
  static buildAvailableTokensMenu() {
    let beneosTokensHUD = []

    Object.entries(BeneosUtility.beneosTokens).forEach(([key, value]) => {
      beneosTokensHUD.push({
        "token": BeneosUtility.getBasePath() + BeneosUtility.getBeneosTokensDataPath() + "/" + key + '/' + key + "-idle_face_still.webp",
        "name": key.replaceAll("_", " "), 'tokenvideo': BeneosUtility.getBasePath() + BeneosUtility.getBeneosTokensDataPath() + "/" + key + '/' + key + "-idle_face.webm",
        "actorId": value.actorId,
        "actorName": value.actorName
      })
    })
    this.sortArrayObjectsByName(beneosTokensHUD)
    return beneosTokensHUD
  }

  /********************************************************************************** */
  static async buildAvailableTokensMenuHTML(template, beneosTokensHUD) {
    const beneosTokensDisplay = await renderTemplate('modules/beneostokens/templates/' + template,
      { beneosBasePath: BeneosUtility.getBasePath(), beneosDataPath: BeneosUtility.getBeneosTokensDataPath(), beneosTokensHUD })

    return beneosTokensDisplay
  }

  /********************************************************************************** */
  static manageAvailableTokensMenu(token, html, event) {
    let beneosClickedButton = event.target.parentElement
    let beneosTokenButton = html.find('.beneos-token-hud-action')[0]

    if (beneosClickedButton === beneosTokenButton) {
      beneosTokenButton.classList.add('active')
      html.find('.beneos-selector-wrap')[0].classList.add('beneos-active')
      html.find('.beneos-selector-wrap')[0].classList.remove('beneos-disabled')
    } else {
      beneosTokenButton.classList.remove('active')
      html.find('.beneos-selector-wrap')[0].classList.remove('beneos-active')
      html.find('.beneos-selector-wrap')[0].classList.add('beneos-disabled')
      if (beneosClickedButton.classList.contains("beneos-button-token")) {
        event.preventDefault()
        let finalImage = beneosClickedButton.dataset.token
        BeneosUtility.preloadToken(token)
        setTimeout(function () {
          BeneosUtility.forceChangeToken(token.id, finalImage)
        }, 200)
      }
    }
  }

  /********************************************************************************** */
  static async userIncDecSize(tokenId, tokenKey, incDec) {
    let token = BeneosUtility.getToken(tokenId)

    let isAutoscale = false
    if (game.system.id == 'pf2e' && token.document.flags.pf2e.autoscale) {
      isAutoscale = true
      await token.document.update({ "flags.pf2e.autoscale": false })
      ui.notifications.info("Token size was in auto-scale mode. Auto-scale mode has been disabled for this token, you can re-enable it in the token configuration window.")
    }

    let tokenConfig = this.beneosTokens[tokenKey]
    if (!token || !tokenConfig) {
      return
    }

    let tokenUserSize = this.userSizes[tokenId] || { tokenId: tokenId, tokenKey: tokenKey, sizeFactor: 1.0 }
    tokenUserSize.sizeFactor += incDec
    this.userSizes[tokenId] = tokenUserSize
    game.settings.set(BeneosUtility.moduleID(), 'beneos-user-config', this.userSizes)
    //console.log("USZER SIZES", this.userSizes)
    // Update with new s
    let s = this.getScaleFactor(token, token.document.texture.src)
    await token.document.update({ scale: s })
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
        console.log("Updting size : ", tokenData, tokenConfig)

        //if (tokenData.currentStatus.includes("idle") || tokenData.currentStatus.includes("special")) {
        /*if (tokenData.currentStatus.includes("idle")) {
          status = "idle"
        }*/
        let variantName = tokenData.variant
        if (!tokenConfig[tokenData.variant]) {
          variantName = "top"
        }
        if (!tokenConfig[variantName]) {
          if (variantName != "idle" && variantName.includes("idle")) { // Dynamic stuff for idle_X
            tokenConfig[variantName] = duplicate(tokenConfig["idle"])
          } else {
            ui.notifications.warn("Unable to find token/variant data for " + variantName)
            return
          }
        }
        let currentData = tokenConfig[variantName][status]
        if (!currentData) {
          for (let variantKey in tokenConfig.top) {
            let variantData = tokenConfig.top[variantKey]
            if (variantData.a == status) {
              currentData = variantData
            }
          }
        }
        if (!currentData) {
          tokenConfig[variantName][status] = duplicate(tokenConfig.top.idle)
          currentData = tokenConfig[variantName][status]
          currentData.a = status
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
        if (status == "idle") {
          for (let key in tokenConfig.top) {
            if (key.includes("idle")) {
              let conf = tokenConfig.top[key]
              conf.s = currentData.s
              ui.notifications.info("Token idle detected, same size applied to token " + key)
            }
          }
        }
        // Save scalefactor
        let scaleFactor = currentData.s * tokenConfig.config.scalefactor
        token.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
        console.log(">>>>>>>>>>> UPDATE TOKEN CHANGE SCALE")
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
