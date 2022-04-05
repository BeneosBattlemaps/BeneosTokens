/********************************************************************************* */
import { BeneosCompendiumManager, BeneosCompendiumReset } from "./beneos_compendium.js";

/********************************************************************************* */
const BENEOS_MODULE_NAME = "Beneos Tokens"
const BENEOS_MODULE_ID = "beneostokens_beta"
const BENEOS_DEFAULT_TOKEN_PATH = "beneostokens_data/"

let beneosDebug = true
let beneosFadingSteps = 10
let beneosFadingWait = 30
let beneosFadingTime = beneosFadingSteps * beneosFadingWait
let defaultDataPath = BENEOS_DEFAULT_TOKEN_PATH
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
        b
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

      game.settings.register(BeneosUtility.moduleID(), 'beneos-forcefacetoken', {
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
      });

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

    this.beneosAnimations = new Object

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
    return this.tokenDataPath
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
    return this.beneosBasePath
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
      let tokendata = BeneosUtility.getTokenImageInfo(token)
      let scaleFactor = token.data.document.getFlag(BeneosUtility.moduleID(), "scalefactor")
      if (!scaleFactor) {
        scaleFactor = BeneosUtility.beneosTokens[tokendata.btoken].config["scalefactor"]
        token.data.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
        canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, scale: scaleFactor })])
      }
      setTimeout(function () {
        BeneosUtility.beneosAnimations[token.id] = false
        BeneosUtility.updateToken(token.id, "standing", { forceupdate: true })
      }, 1000)
    }
  }

  /********************************************************************************** */
  static checkImageExists(imagefile) {
    return true
    /*if (this.file_cache[imagefile]) {
      return true
    } else {
      let req = new XMLHttpRequest()
      req.open('HEAD', imagefile, false)
      req.send();
      if (req.status == 200) {
        this.file_cache[imagefile] = true
        return true
      }
      if (beneosDebug) console.log("[BENEOS TOKENS] " + imagefile + " does not exist")
      return false
    }
    return false*/
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

    let file = "";
    if (token.data != undefined) {
      file = token.data.img;
    } else {
      if (token.img != undefined) {
        file = token.img;
      } else {
        return false;
      }
    }
    if (file == undefined) return false;
    if (file.lastIndexOf("beneostokens") == -1) {
      return false;
    }
    return true;
  }

  /********************************************************************************** */
  //Retrieves the necessary data from a token in order to be able to fire automatic animations based on the current token image file.
  static getTokenImageInfo(token) {

    let variant = this.getTokenView()

    let file = "";
    if (token.data != undefined) {
      file = token.data.img;
    } else {
      if (token.img != undefined) {
        file = token.img;
      } else {
        return false;
      }
    }
    let apath = file.split("/")
    let bindex = apath.indexOf(BENEOS_DEFAULT_TOKEN_PATH)
    let btoken = apath[bindex + 2].toLowerCase();
    let path = this.getBasePath() + apath[bindex - 1] + "/" + apath[bindex] + "/" + apath[bindex + 1] + "/";
    let subpath = btoken + "/" + variant + "/";
    let filename = apath[apath.length - 1];

    let index = filename.lastIndexOf("-") + 1;
    let basefilename = filename.substr(0, index - 1);
    let animation = filename.substr(index);
    let index3 = animation.lastIndexOf("_");
    let index4 = animation.lastIndexOf(".");
    let currentstatus = animation.substr(0, index3);

    let extension = animation.substr(index4 + 1);

    // Auto-fix with new path settings -> TODO
    if (path == undefined) path = ""
    if (subpath == undefined) subpath = ""

    let dataPath = { "id": token.id, "path": BENEOS_DEFAULT_TOKEN_PATH, "subpath": subpath, "currentstatus": currentstatus, "basefilename": basefilename, "variant": variant, "extension": extension, "btoken": btoken }
    return dataPath

  }


  /********************************************************************************** */
  //Function that preloads token animations. We need to do it to prevent the "scale not found" error in Foundry
  static preloadToken(token) {
    let tokendata = this.getTokenImageInfo(token)

    let myToken = this.beneosTokens[tokendata.btoken]
    if (typeof (myToken) == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found " + tokendata.btoken)
      return;
    }

    if (typeof (myToken[tokendata.variant]) == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Variant not found " + tokendata.variant)
      return;
    }

    Object.keys(this.beneosTokens[tokendata.btoken][tokendata.variant]).forEach(key => {
      if (key == "dead") {
        let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + this.beneosTokens[tokendata.btoken][tokendata.variant][key]["a"] + "_" + tokendata.variant + ".webp";
        if (this.beneosPreload[finalimage] == undefined) {
          this.debugMessage("[BENEOS TOKENS] Preloaded " + finalimage)
          this.preloadImage(finalimage)
          this.beneosPreload[finalimage] = true
        }
      } else {
        let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + this.beneosTokens[tokendata.btoken][tokendata.variant][key]["a"] + "_" + tokendata.variant + ".webm";
        if (this.beneosPreload[finalimage] == undefined) {
          this.debugMessage("[BENEOS TOKENS] Preloaded " + finalimage)
          this.preloadVideo(finalimage)
          this.beneosPreload[finalimage] = true
        }
      }
    })
  }

  /********************************************************************************** */
  static preloadImage(finalimage) {
    TextureLoader.loader.loadImageTexture(finalimage)
  }

  /********************************************************************************** */
  static preloadVideo(finalimage) {
    TextureLoader.loader.loadVideoTexture(finalimage)
  }

  /********************************************************************************** */
  //Function to change the token animations
  static async changeAnimation(token, animation, tkscale, tkangle, tkalpha, tkanimtime, bfx, fading) {
    if (!this.checkImageExists(animation)) {
      this.debugMessage("[BENEOS TOKENS] Image does not exists:" + animation)
      return
    }

    this.debugMessage("[BENEOS TOKENS] Changing to image:" + animation)

    // If there's any other animations playing we will not replace it.
    if (this.beneosAnimations[token.id] != false) {
      this.debugMessage("[BENEOS TOKENS] Token is busy:" + animation)
      return;
    }

    token.data.img = animation
    token.img = animation
    this.beneosAnimations[token.id] = true
    BeneosUtility.debugMessage("[BENEOS TOKENS] Change animation with scale: " + tkscale)
    token.document.update({ img: animation, scale: tkscale, rotation: tkangle, data: { img: animation } })
    this.addFx(token, bfx, true)

    setTimeout(function () {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Finished changing animation: " + tkscale)
      token.document.update({ img: animation, scale: tkscale, rotation: tkangle, data: { img: animation } })
      BeneosUtility.beneosAnimations[token.id] = false
      },
      tkanimtime - 10)
  }

  /********************************************************************************** */
  // Function to add FX from the Token Magic module or from the ones defined in the configuration files.
  static async addFx(token, bfx, replace = true) {
    if (!game.dnd5e) { return }
    if (typeof TokenMagic !== 'undefined') {
      let bpresets = [];

      let flag = token.document.getFlag('beneostokens', 'variant')
      if (flag != undefined && flag != "Default") {
        let tokendata = this.checkImageExists(token)
        bfx = bfx.concat(beneosTokens[tokendata.btoken]["config"]["variants"][flag])
      }

      $.each(bfx, function (index, value) {
        let bfxid = value;
        let effect = TokenMagic.getPreset(bfxid);
        if (effect !== undefined) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Setting Library FX: " + bfxid)
          $.each(effect, function (presetindex, pressetvalue) {
            bpresets.push(pressetvalue);
          });
        } else {
          if (beneosFX[bfxid] !== undefined) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Setting Beneos FX: " + bfxid)
            $.each(beneosFX[bfxid], function (presetindex, pressetvalue) {
              $.each(pressetvalue, function (kid, kidvalue) {
                if (kid.indexOf("eval_") != -1) {
                  let newkid = kid.replace("eval_", "")
                  kidvalue = kidvalue.replace("random()", "BeneosUtility.random()")
                  kidvalue = kidvalue.replace("__BENEOS_DATA_PATH__", BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath() )
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
  static getAction(message, tokendata) {

    let action = null
    let actionType = null
    let checkActionType = true

    if (typeof BetterRolls !== 'undefined') {
      if (message.data.flags == undefined || message.data.flags.betterrolls5e == undefined || message.data.flags.betterrolls5e.entries == undefined) {
        return action
      }
      action = message.data.flags.betterrolls5e.entries[0].title
      checkActionType = false;
    } else {
      let tmpaction = message.data.flavor.split(" - ")
      action = tmpaction[0].trim()
      if (message.data.flags.dnd5e != undefined && message.data.flags.dnd5e.roll != undefined) {
        actionType = message.data.flags.dnd5e.roll.type;
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

    let myToken = BeneosUtility.beneosTokens[tokendata.btoken][tokendata.variant]
    if (!myToken.hasOwnProperty(action)) return null;

    if (checkActionType && 
      myToken[action]["actionType"] && 
      myToken[action]["actionType"] != actionType) {
      return null
    }

    return action
  }


  /********************************************************************************** */
  // Main function that allows to control the automatic animations and decide which animations has to be shown.
  static updateToken(tokenid, BeneosUpdateAction, BeneosExtraData) {

    if (!BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso') {
      return
    }

    if (BeneosUtility.beneosAnimations[tokenid]) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Token is busy")
      return
    }

    let token = BeneosUtility.getToken(tokenid)
    if (token === null || token == undefined) return
    let actor = token.actor
    if (actor === null || actor == undefined) return
    let actorData = actor.data
    if (actorData === null || actorData == undefined) return
    if (!BeneosUtility.checkIsBeneosToken(token)) {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Not Beneos")
      return;
    }

    let tokendata = BeneosUtility.getTokenImageInfo(token)

    if (game.settings.get(BeneosUtility.moduleID(), 'beneos-forcefacetoken')) {
      finalimage = tokendata.path + tokendata.basefilename + "/" + tokendata.basefilename + "-idle_face" + ".webm"
      canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, img: finalimage, scale: 1, rotation: 0 })])
      if (actor.data.type == "character") { actor.update({ 'token.img': finalimage }); }
      return
    }

    let myToken = BeneosUtility.beneosTokens[tokendata.btoken]
    if (typeof (myToken) == "undefined") {
      BeneosUtility.debugMessage("[BENEOS TOKENS] Config not found " + tokendata.btoken)
      return
    }
    if (typeof (myToken[tokendata.variant]) == "undefined") { 
      BeneosUtility.debugMessage("[BENEOS TOKENS] Variant not found")
      return
    }

    let benVariant = myToken[tokendata.variant]

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
    if (!scaleFactor) {
      scaleFactor = myToken.config["scalefactor"]
      token.data.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor)
    }
    if ("forceupdate" in BeneosExtraData) BeneosUtility.beneosAnimations[token.id] = false;

    switch (BeneosUpdateAction) {
      case "hit":
        if (typeof (benVariant["hit"]) != "undefined") {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Hit");
          if (tokendata.currentstatus != benVariant["hit"]["a"] || ("forceupdate" in BeneosExtraData)) {
            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["hit"]["a"] + "_" + tokendata.variant + ".webm";
            BeneosUtility.changeAnimation(token, finalimage, benVariant["hit"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["hit"]["t"], benVariant["hit"]["fx"], true);
            setTimeout(function () { 
              BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
             }, benVariant["hit"]["t"] + (beneosFadingTime * 2))
          }
        }
        break;
      case "move":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Move")
        if (typeof (benVariant["move"]) != "undefined") {
          if (tokendata.currentstatus != benVariant["move"]["a"] || ("forceupdate" in BeneosExtraData)) {
            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["move"]["a"] + "_" + tokendata.variant + ".webm";
            let ray = token._movement;
            let instantTeleport = Math.max(Math.abs(ray.dx), Math.abs(ray.dy)) <= canvas.grid.size;
            let mvtime = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BeneosUtility.moduleID(), 'beneos-speed'));
            let mvangle = (Math.atan2(token._velocity.dy, token._velocity.dx, token._velocity.dx) / (Math.PI / 180)) - 90;

            if (instantTeleport) {
              canvas.scene.updateEmbeddedDocuments("Token", [({ _id: token.id, rotation: mvangle })])
              return
            }
            BeneosUtility.beneosAnimations[token.id] = false
            BeneosUtility.changeAnimation(token, finalimage, benVariant["move"]["s"] * scaleFactor, mvangle, benAlpha, mvtime, benVariant["move"]["fx"], false);
            setTimeout(function () { 
              BeneosUtility.updateToken(tokenid, "standing", { forceupdate: true })
            }, mvtime + 100)
          }
        }
        break;

      case "heal":
        this.beneosAnimations[tokenid] = true
        BeneosUtility.debugMessage("[BENEOS TOKENS] Healing")
        BeneosUtility.addFx(token, ["BFXGlow", "BFXShine"], true)
        setTimeout(function () { 
          BeneosUtility.beneosAnimations[tokenid] = false 
          BeneosUtility.updateToken(token.id, "standing", { forceupdate: true }); 
        }, 3000)
        break;

      case "standing":
        BeneosUtility.debugMessage("[BENEOS TOKENS] Standing with hp " + BeneosUtility.beneosHealth[token.id])
        if (BeneosUtility.beneosHealth[token.id] > 0 || !game.dnd5e) {
          if (token.inCombat) {
            BeneosUtility.debugMessage("[BENEOS TOKENS] In Combat");
            if (typeof (benVariant["combat_idle"]) != "undefined") {
              if (tokendata.currentstatus != benVariant["combat_idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["combat_idle"]["a"] + "_" + tokendata.variant + ".webm";
                BeneosUtility.changeAnimation(token, finalimage, benVariant["combat_idle"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["combat_idle"]["t"], benVariant["combat_idle"]["fx"], true);
              }
            }
          } else {
            BeneosUtility.debugMessage("[BENEOS TOKENS] Idle");
            if (typeof (benVariant["idle"]) != "undefined") {
              if (tokendata.currentstatus != benVariant["idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["idle"]["a"] + "_" + tokendata.variant + ".webm";
                BeneosUtility.changeAnimation(token, finalimage, benVariant["idle"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["idle"]["t"], benVariant["idle"]["fx"], true);
              }
            }
          }
        } else {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Dead");
          if (typeof (benVariant["die"]) != "undefined") {
            if ((tokendata.currentstatus != benVariant["die"]["a"] && tokendata.currentstatus != benVariant["dead"]["a"]) || ("forceupdate" in BeneosExtraData)) {
              if (tokendata.extension != "webp") {
                let idToken = token.id;
                let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["die"]["a"] + "_" + tokendata.variant + ".webm";
                BeneosUtility.changeAnimation(token, finalimage, benVariant["die"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["die"]["t"], benVariant["die"]["fx"], true);
                setTimeout(function () {
                  token = BeneosUtility.getToken(idToken);
                  finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["dead"]["a"] + "_" + tokendata.variant + ".webp";
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
        let action = BeneosUtility.getAction(BeneosExtraData["action"], tokendata);
        if (!action) return;
        BeneosUtility.debugMessage("[BENEOS TOKENS] Action: " + action)
        if (benVariant.hasOwnProperty(action)) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Action found");
          if (typeof (benVariant[action]) != "undefined") {
            if (tokendata.currentstatus != benVariant[action]["a"] || ("forceupdate" in BeneosExtraData)) {
              let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant[action]["a"] + "_" + tokendata.variant + ".webm";
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
        this.beneosAnimations[token.id] = false
        this.updateToken(token.id, "standing", { forceupdate: true })
      }
    }
  }

  /********************************************************************************** */
  static processCanvasReady() {
    for (let [key, token] of canvas.scene.tokens.entries()) {
      if (BeneosUtility.checkIsBeneosToken(token)) {
        let tokendata = BeneosUtility.getTokenImageInfo(token);
        if (typeof this.beneosTokens[tokendata.btoken] === 'object' && this.beneosTokens[tokendata.btoken] !== null) {
          this.beneosAnimations[token.id] = false
          BeneosUtility.updateToken(token.id, "standing", {})
        }
      }
    }
  }
}
