import { libWrapper } from "./shim.js";
import { BeneosCompendiumManager, BeneosCompendiumReset } from "./beneos_compendium.js";
import { BeneosUtility } from "./beneos_utility.js";

/********************************************************************************** */
Hooks.once('init', () => {

  // HAck to prevent errors when the animated textures are not fully loaded
  Token.prototype.oldRefresh = Token.prototype.refresh
  Token.prototype.refresh = function () {
    if (this.icon === undefined) {
      return this
    }
    return Token.prototype.oldRefresh.call(this)
  }
})

/********************************************************************************** */
Hooks.once('ready', () => {

  BeneosUtility.debugMessage("----------------------------------------------")
  BeneosUtility.debugMessage(`Loading ${BeneosUtility.moduleName()} module...`)
  BeneosUtility.debugMessage("----------------------------------------------")

  BeneosUtility.forgeInit()
  BeneosUtility.registerSettings()
  let dataPath = BeneosUtility.getBeneosDataPath()

  //Token Magic Hack  Replacement to prevent double filters when changing animations
  if (typeof TokenMagic !== 'undefined') {
    let OrigSingleLoadFilters = TokenMagic._singleLoadFilters;
    TokenMagic._singleLoadFilters = async function (placeable, bulkLoading = false) {
      if (BeneosUtility.checkIsBeneosToken(placeable)) return;
      OrigSingleLoadFilters(placeable, bulkLoading);
    };
  }

  //Replacement of the token movement across the maps
  libWrapper.register(BeneosUtility.moduleID(), 'CanvasAnimation.animateLinear', (function () {

    return async function (wrapped, ...args) {
      let options = args[1];
      let name = options.name;
      if (options.duration === 0 || !name || !name.startsWith('Token.') || !name.endsWith('.animateMovement'))
        return wrapped.apply(this, args);

      let token = args[0][0].parent;
      let ray = token._movement;
      let instantTeleport = Math.max(Math.abs(ray.dx), Math.abs(ray.dy)) <= canvas.grid.size;
      if (instantTeleport) {
        args[1].duration = 0;
        return wrapped.apply(this, args);
      }

      options.duration = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BeneosUtility.moduleID(), 'beneos-speed'));

      return wrapped.apply(this, args);
    }
  })());

  BeneosUtility.init()
  if (!game.user.isGM) {
    return
  }

  if (game.dnd5e) {
    BeneosUtility.updateSceneTokens()


    Hooks.on("renderChatMessage", (message, data, html) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' || !canvas.ready) {
        return
      }
      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos Message Token")
      BeneosUtility.updateToken(message.data.speaker.token, "action", { "action": message })
    });


    Hooks.on('preUpdateToken', (token, changeData) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' || !canvas.ready || changeData["img"] != undefined) {
        return
      }

      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos PreUpdate Token")
      if (token == undefined) {
        BeneosUtility.debugMessage("[BENEOS TOKENS] Token not found")
        return
      }

      if (BeneosUtility.checkIsBeneosToken(token)) {
        if (changeData.scale != undefined) {
          let tokendata = BeneosUtility.getTokenImageInfo(token);
          for (let [key, value] of Object.entries( BeneosUtility.beneosTokens[tokendata.btoken][tokendata.variant])) {
            if (value["a"] == tokendata.currentstatus) {
              let scaleFactor = (changeData.scale / value["s"]);
              token.data.document.setFlag(BeneosUtility.moduleID(), "scalefactor", scaleFactor);
              break;
            }
          }
        }
      }
    });

    Hooks.on('updateToken', (token, changeData) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' || !canvas.ready || changeData["img"] != undefined) {
        return
      }
      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos UpdateToken", changeData)

      if (token == undefined) {
        BeneosUtility.debugMessage("[BENEOS TOKENS] Token not found")
        return
      }

      if (changeData["flags"] !== undefined && changeData["flags"]["tokenmagic"] !== undefined) {
        return
      }

      if (changeData.actorData != undefined && changeData.actorData.data != undefined && changeData.actorData.data.attributes != undefined && changeData.actorData.data.attributes.hp != undefined && changeData.actorData.data.attributes.hp.value != 0) {
        if (changeData.actorData.data.attributes.hp.value < BeneosUtility.beneosHealth[token.id]) {
          BeneosUtility.updateToken(token.id, "hit", changeData)
          return
        }
        if (changeData.actorData.data.attributes.hp.value > BeneosUtility.beneosHealth[token.id]) {
          BeneosUtility.updateToken(token.id, "heal", changeData)
          return
        }
      }
      if (changeData.hasOwnProperty("x") || changeData.hasOwnProperty("y")) {
        BeneosUtility.updateToken(token.id, "move", changeData)
        return
      }

      BeneosUtility.debugMessage("[BENEOS TOKENS] Nothing to do")

    });


    Hooks.on('updateActor', (actor, changeData) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' == 'iso' || !canvas.ready) {
        return
      }
      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos UpdateToken from Actor")

      let activeTokens = actor.getActiveTokens()
      if (!activeTokens) return
      activeTokens.forEach(token => {
        if (token == undefined) {
          BeneosUtility.debugMessage("[BENEOS TOKENS] Token not found")
          return
        }
        let action = "standing";
        if (changeData.data != undefined && changeData.data.attributes != undefined && changeData.data.attributes.hp != undefined && changeData.data.attributes.hp.value != 0) {
          if (changeData.data.attributes.hp.value < BeneosUtility.beneosHealth[token.id]) {
            action = "hit";
          }
          if (changeData.data.attributes.hp.value > BeneosUtility.beneosHealth[token.id]) {
            action = "heal";
          }
        }
        BeneosUtility.updateToken(token.id, action, changeData)
      });
    });

    Hooks.on('createCombatant', (combatant) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' || !canvas.ready) {
        return
      }
      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos Combat Start Token")
      BeneosUtility.updateToken(combatant.data.tokenId, "standing", {})
    });


    Hooks.on('deleteCombatant', (combatant, data) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso' || !canvas.ready) {
        return
      }
      BeneosUtility.debugMessage("[BENEOS TOKENS] Beneos Combat End Token")
      BeneosUtility.updateToken(combatant.data.tokenId, "standing", {})
    });

    Hooks.on('createToken', (token) => {
      if (!game.user.isGM || !BeneosUtility.isBeneosModule() || BeneosUtility.getTokenView() == 'iso') {
        return
      }
      BeneosUtility.createToken(token)
    })

    Hooks.on('canvasReady', () => {
      if (!game.user.isGM) {
        return
      }
      if (typeof ForgeVTT === "undefined" || !ForgeVTT.usingTheForge) {
        BeneosUtility.debugMessage("[BENEOS TOKENS] This process should only be run in Forge.")
      } else {
        BeneosUtility.updateSceneTokens()
      }

      BeneosUtility.processCanvasReady()
    });
  }



  Hooks.on('controlToken', (token) => {
    if (BeneosUtility.checkIsBeneosToken(token) && typeof (tokenHUDWildcard) == "object") {
      const actor = game.actors.get(token.data.actorId);
      actor.getTokenImages = async function () {

        let source = "data";
        let index = token.data.img.lastIndexOf("/") + 1;
        let pattern = token.data.img.substr(0, index) + "*";
        const browseOptions = { wildcard: true };
        if (/\.s3\./.test(pattern)) {
          source = "s3";
          const { bucket, keyPrefix } = FilePicker.parseS3URL(pattern);
          if (bucket) {
            browseOptions.bucket = bucket;
            pattern = keyPrefix;
          }
        }
        else if (pattern.startsWith("icons/")) source = "public";
        try {
          const content = await FilePicker.browse(source, pattern, browseOptions);
          this._tokenImages = content.files;
        } catch (err) {
          this._tokenImages = [];
          ui.notifications.error(err);
        }
        return this._tokenImages;
      }
    }
  });
});




Hooks.on('renderTokenHUD', async (hud, html, token) => {
  if (!game.user.isGM){
    return
  }
  token = BeneosUtility.getToken(token._id)
  let tokendata = BeneosUtility.getTokenImageInfo(token)
  // JOURNAL HUD
  if (  BeneosUtility.checkIsBeneosToken(token) && 
        BeneosUtility.beneosTokens[tokendata.btoken] != undefined && 
        BeneosUtility.beneosTokens[tokendata.btoken]["config"] != undefined) {
      if (BeneosUtility.beneosTokens[tokendata.btoken]["config"]["compendium"] != undefined) {
      let beneosPack = game.packs.get("beneostokens_beta.beneostokens_journal");
      if (beneosPack) {
        let beneosJournalEntry = null;
        let beneosCompendiumEntry = beneosPack.index.getName(BeneosUtility.beneosTokens[tokendata.btoken]["config"]["compendium"]);
        if (beneosCompendiumEntry && beneosCompendiumEntry._id) {
          beneosJournalEntry = beneosPack.getDocument(beneosCompendiumEntry._id);
        }
        if (beneosJournalEntry) {

          const beneosJournalDisplay = await renderTemplate('modules/beneostokens_beta/templates/beneosjournal.html', 
          { beneosBasePath: BeneosUtility.getBasePath(), beneosDataPath: BeneosUtility.getBeneosDataPath() })
          html.find('div.left').append(beneosJournalDisplay);
          html.find('img.beneosJournalAction').click((event) => {
            event.preventDefault();
            beneosJournalEntry.then(function (result) { result.sheet.render(true) });
          });
        }
      }
    }

    //VARIANTS HUD

    if (BeneosUtility.beneosTokens[tokendata.btoken]["config"]["variants"] != undefined && Object.keys(BeneosUtility.beneosTokens[tokendata.btoken]["config"]["variants"]).length > 0) {
      let beneosVariantsHUD = [];
      beneosVariantsHUD.push({ "name": "Default" });
      Object.entries(BeneosUtility.beneosTokens[tokendata.btoken]["config"]["variants"]).forEach(([key, value]) => {
        beneosVariantsHUD.push({ "name": key });
      });

      const beneosVariantsDisplay = await renderTemplate('modules/beneostokens_beta/templates/beneosvariants.html', 
      { beneosBasePath:BeneosUtility.getBasePath(), beneosDataPath: BeneosUtility.getBeneosDataPath(), beneosVariantsHUD })

      if (!BeneosUtility.isBeneosModule() || BeneosUtility.moduleID() == 'iso') {
        return
      }

      html.find('div.right').append(beneosVariantsDisplay).click((event) => {
        let beneosClickedButton = event.target.parentElement;
        let beneosTokenButton = html.find('.beneos-token-variants')[0];

        if (beneosClickedButton === beneosTokenButton) {
          beneosTokenButton.classList.add('active');
          html.find('.beneos-variants-wrap')[0].classList.add('beneos-active');
          html.find('.beneos-variants-wrap')[0].classList.remove('beneos-disabled');
        } else {
          beneosTokenButton.classList.remove('active')
          html.find('.beneos-variants-wrap')[0].classList.remove('beneos-active');
          html.find('.beneos-variants-wrap')[0].classList.add('beneos-disabled');
          if (beneosClickedButton.classList.contains("beneos-button-variant")) {
            event.preventDefault();
            token.document.setFlag("beneostokens", "variant", beneosClickedButton.dataset.variant)
            setTimeout(function () { BeneosUtility.updateToken(token.id, "standing", { forceupdate: true }) }, 1000)
          }
        }
      });
    }

  }

  // REPLACEMENT TOKEN HUD
  let beneosTokensHUD = [];
  Object.entries(BeneosUtility.beneosTokens).forEach(([key, value]) => {
    beneosTokensHUD.push({
      "token": BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath() + "/" + key + '/' + key + "-idle_face_still.webp",
      "name": key.replaceAll("_", " "), 'tokenvideo': BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath() + "/" + key + '/' + key + "-idle_face.webm"
    });
  });
  const beneosTokensDisplay = await renderTemplate('modules/beneostokens_beta/templates/beneoshud.html', 
    { beneosBasePath:BeneosUtility.getBasePath(), beneosDataPath: BeneosUtility.getBeneosDataPath(), beneosTokensHUD })

  //if (!game.settings.get(BeneosUtility.moduleID(), 'beneos-animations')  || game.settings.get(BeneosUtility.moduleID(), 'beneos-tokenview') == 'iso') return;
  if (BeneosUtility.moduleID() == 'iso') {
    return
  }

  html.find('div.right').append(beneosTokensDisplay).click((event) => {
    let beneosClickedButton = event.target.parentElement;
    let beneosTokenButton = html.find('.beneos-token-hud-action')[0];

    if (beneosClickedButton === beneosTokenButton) {
      beneosTokenButton.classList.add('active');
      html.find('.beneos-selector-wrap')[0].classList.add('beneos-active');
      html.find('.beneos-selector-wrap')[0].classList.remove('beneos-disabled');
    } else {
      beneosTokenButton.classList.remove('active')
      html.find('.beneos-selector-wrap')[0].classList.remove('beneos-active');
      html.find('.beneos-selector-wrap')[0].classList.add('beneos-disabled');
      if (beneosClickedButton.classList.contains("beneos-button-token")) {
        event.preventDefault();
        let finalimage = beneosClickedButton.dataset.token;
        token.data.img = finalimage;
        token.img = finalimage;
        BeneosUtility.preloadToken(token)
        BeneosUtility.beneosAnimations[token.id] = false
        setTimeout(function () {
          BeneosUtility.updateToken(token.id, "standing", { forceupdate: true })
        }, 1000)
      }
    }
  })
})


