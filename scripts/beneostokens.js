import { libWrapper } from "./shim.js";
import { BeneosCompendiumManager,BeneosCompendiumReset } from "./beneos_compendium.js";

/********************************************************************************** */
Hooks.once('init', () => {

	// HAck to prevent errors when the animated textures are not fully loaded
	Token.prototype.oldRefresh = Token.prototype.refresh
	Token.prototype.refresh = function() {
		if (this.icon === undefined) {
			return this
		}
		return Token.prototype.oldRefresh.call(this)
	}
})

/********************************************************************************** */
Hooks.once('ready', () => {

	if (beneosDebug) console.log ("----------------------------------------------");
	if (beneosDebug) console.log(`Loading ${BENEOS_MODULE_NAME} module...`);
	if (beneosDebug) console.log ("----------------------------------------------");
  
	seed(Date.now());

	if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
		if (beneosDebug) console.log("[BENEOS TOKENS] This process should only be run in Forge.");
		let ForgeVTTuserid = ForgeAPI.getUserId();
		ForgeVTTuserid.then(function(result) {beneosBasePath = ForgeVTT.ASSETS_LIBRARY_URL_PREFIX + result + "/" });		
	}


	if (game.user.isGM) {

    game.settings.registerMenu(BENEOS_MODULE_ID, "beneos-clean-compendium", {
      name: "Empty compendium to re-import all tokens data",
      label: "Reset & Rebuild BeneosTokens Compendiums",
      hint: "'Cleanup BeneosTokens compendium and tokens configs",
			scope: 'world',
			config: true,
      type: BeneosCompendiumReset,
      restricted: true
    })

    game.settings.registerMenu(BENEOS_MODULE_ID, "beneos-datapath", {
      name: "Storage path of tokens assets",
      hint: "'Location of tokens and associated datas",
			scope: 'world',
			config: true,
      default: BENEOS_DEFAULT_TOKEN_PATH,
      type: String,
      restricted: true
    })

    game.settings.register(BENEOS_MODULE_ID, 'beneos-forcefacetoken', {
			name: 'Use face rings instead of animations?',
			default: false,
			type: Boolean,
			scope: 'world',
			config: true,
			hint: 'Whether to use animated ring tokens or not.',
			onChange: value => UpdateBeneosSceneTokens()
		})

		game.settings.register(BENEOS_MODULE_ID, 'beneos-tokenview', {
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
			game.settings.register(BENEOS_MODULE_ID, 'beneos-animations', {
				name: 'Enable Automatic Animations',
				default: true,
				type: Boolean,
				scope: 'world',
				config: true,
				hint: 'Whether to animate automatically Beneos Tokens.'
			});
		}
	}

	game.settings.register(BENEOS_MODULE_ID, "beneos-speed", {
		name: 'Number of spaces walked per second.',
		hint: 'Slower speeds will give better results. Foundry default speed is 10.',
		scope: "world",
		config: true,
		default: 10,
		type: Number
	})

  dataPath = game.settings.get(BENEOS_MODULE_ID, 'beneos-datapath') || BENEOS_DEFAULT_TOKEN_PATH

	//Token Magic Hack  Replacement to prevent double filters when changing animations
	if (typeof TokenMagic !== 'undefined') {
		let OrigSingleLoadFilters = TokenMagic._singleLoadFilters;
		TokenMagic._singleLoadFilters = async function (placeable, bulkLoading = false) {
			if (BeneosCheckIsBeneosToken(placeable)) return;
			OrigSingleLoadFilters(placeable, bulkLoading);
		};
	}

	//Replacement of the token movement across the maps
	libWrapper.register(BENEOS_MODULE_ID , 'CanvasAnimation.animateLinear', (function() {

		return async function(wrapped, ...args) {
			let options = args[1];
			let name = options.name;
			if(options.duration === 0 || !name || !name.startsWith('Token.') || !name.endsWith('.animateMovement'))
				return wrapped.apply(this, args);

			let token = args[0][0].parent;
			let ray = token._movement;
			let instantTeleport = Math.max(Math.abs(ray.dx), Math.abs(ray.dy)) <= canvas.grid.size;
			if(instantTeleport) {
				args[1].duration = 0;
				return wrapped.apply(this, args);
			}

			options.duration = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BENEOS_MODULE_ID, 'beneos-speed'));

			return wrapped.apply(this, args);
		}
	})());

	if (!game.user.isGM) {return;}



	if (game.dnd5e) {
		UpdateBeneosSceneTokens();


		Hooks.on("renderChatMessage", (message, data, html) => {
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations') || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready) return;

			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos Message Token");

			BeneosUpdateToken(message.data.speaker.token, "action", {"action": message});
		});


		Hooks.on('preUpdateToken', (token, changeData) => {

			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations') || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready || changeData["img"] != undefined) return;
			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos PreUpdate Token");
			if (token == undefined) {
				if (beneosDebug) console.log("[BENEOS TOKENS] Token not found");
				return;
			}

			if (BeneosCheckIsBeneosToken(token)) {
				if (changeData.scale != undefined) {
					let tokendata = BeneosGetTokenImageInfo(token);
					for (let [key, value] of Object.entries(beneosTokens[tokendata.btoken][tokendata.variant])) {
						if (value["a"] == tokendata.currentstatus) {
							let scaleFactor = (changeData.scale / value["s"]);
							token.data.document.setFlag(BENEOS_MODULE_ID, "scalefactor", scaleFactor);
							break;
						}
					}
				}
			}
		});

		Hooks.on('updateToken', (token, changeData) => {
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready || changeData["img"] != undefined) return;
			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos Update Token", changeData);


			if (token == undefined) {
				if (beneosDebug) console.log("[BENEOS TOKENS] Token not found");
				return;
			}

			if (changeData["flags"] !== undefined && changeData["flags"]["tokenmagic"] !== undefined) {
				return;
			}

			if (changeData.actorData != undefined && changeData.actorData.data != undefined && changeData.actorData.data.attributes != undefined && changeData.actorData.data.attributes.hp != undefined && changeData.actorData.data.attributes.hp.value != 0) {
				if (changeData.actorData.data.attributes.hp.value < beneosHealth[token.id]) {
					BeneosUpdateToken(token.id, "hit", changeData);
					return;
				}
				if (changeData.actorData.data.attributes.hp.value > beneosHealth[token.id]) {
					BeneosUpdateToken(token.id, "heal", changeData);
					return;
				}
			}

			if (changeData.hasOwnProperty("x") || changeData.hasOwnProperty("y")) {
				BeneosUpdateToken(token.id, "move", changeData);
				return;
			}

			if (beneosDebug) console.log("[BENEOS TOKENS] Nothing to do");

		});


		Hooks.on('updateActor', (actor, changeData) => {
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready) return;
			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos Update Token");

			let activeTokens = actor.getActiveTokens();
			if (!activeTokens) return;
			activeTokens.forEach(token => {
				if (token == undefined) {
					if (beneosDebug) console.log("[BENEOS TOKENS] Token not found");
					return;
				}
				let action = "standing";
				if (changeData.data != undefined && changeData.data.attributes != undefined && changeData.data.attributes.hp != undefined && changeData.data.attributes.hp.value != 0) {
					if (changeData.data.attributes.hp.value < beneosHealth[token.id]) {
						action = "hit";
					}
					if (changeData.data.attributes.hp.value > beneosHealth[token.id]) {
						action = "heal";
					}
				}
				BeneosUpdateToken(token.id, action, changeData);
			});
		});

		Hooks.on('createCombatant', (combatant) => {
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready) return;
			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos Combat Start Token");
			BeneosUpdateToken(combatant.data.tokenId, "standing", {});
		});


		Hooks.on('deleteCombatant', (combatant, data) => {
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso' || !canvas.ready) return;
			if (!game.user.isGM) return;
			if (beneosDebug) console.log("[BENEOS TOKENS] Beneos Combat End Token");
			BeneosUpdateToken(combatant.data.tokenId, "standing", {});
		});

		Hooks.on('createToken',(token)=>{
			if (!game.user.isGM) return;
			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso') return;
			if (BeneosCheckIsBeneosToken(token)) {
				BeneosPreloadToken(token);
				let tokendata = BeneosGetTokenImageInfo (token);
				let scaleFactor = token.data.document.getFlag(BENEOS_MODULE_ID,"scalefactor");
				if (!scaleFactor) {
					scaleFactor = beneosTokens[tokendata.btoken].config["scalefactor"];
					token.data.document.setFlag(BENEOS_MODULE_ID, "scalefactor", scaleFactor);
					canvas.scene.updateEmbeddedDocuments("Token",[({_id: token.id,scale: scaleFactor})]);
				}
				setTimeout(function () {beneosAnimations[token.id] = false;	BeneosUpdateToken (token.id, "standing", {forceupdate:true});}, 1000);
			}
		});

		Hooks.on('canvasReady',()=>{
			if (!game.user.isGM) return;
			if (typeof ForgeVTT === "undefined" || !ForgeVTT.usingTheForge) {
				if (beneosDebug) console.log("[BENEOS TOKENS] This process should only be run in Forge.");
			} else {
				UpdateBeneosSceneTokens();
			}

			for (let [key, token] of  canvas.scene.tokens.entries()) {
				if (BeneosCheckIsBeneosToken(token)) {
					let tokendata = BeneosGetTokenImageInfo (token);
					if (typeof beneosTokens[tokendata.btoken] === 'object' && beneosTokens[tokendata.btoken] !== null) {
						beneosAnimations[token.id] = false;
						BeneosUpdateToken (token.id, "standing", {});
					}
				}
			}
		});
	}


	
	Hooks.on('controlToken',(token)=>{
		if (BeneosCheckIsBeneosToken(token) && typeof(tokenHUDWildcard) == "object") {
			const actor = game.actors.get(token.data.actorId);
			actor.getTokenImages = async function(){

				let source = "data";				
				let index = token.data.img.lastIndexOf("/") + 1;
				let pattern = token.data.img.substr(0,index) + "*";
				const browseOptions = { wildcard: true };
				if ( /\.s3\./.test(pattern) ) {
				  source = "s3";
				  const {bucket, keyPrefix} = FilePicker.parseS3URL(pattern);
				  if ( bucket ) {
					browseOptions.bucket = bucket;
					pattern = keyPrefix;
				  }
				}
				else if ( pattern.startsWith("icons/") ) source = "public";
				try {
				  const content = await FilePicker.browse(source, pattern, browseOptions);
				  this._tokenImages = content.files;
				} catch(err) {
				  this._tokenImages = [];
				  ui.notifications.error(err);
				}
				return this._tokenImages;
			} 
		}
	});
});




Hooks.on('renderTokenHUD', async (hud, html, token) => {
	if (!game.user.isGM) return;
	token =	BeneosGetToken(token._id);
    let tokendata = BeneosGetTokenImageInfo(token);
	// JOURNAL HUD
	if (BeneosCheckIsBeneosToken(token) && beneosTokens[tokendata.btoken] != undefined && beneosTokens[tokendata.btoken]["config"] != undefined) {
		if (beneosTokens[tokendata.btoken]["config"]["compendium"] != undefined) {
			let beneosPack = game.packs.get("beneostokens.beneostokens_journal");
			if (beneosPack) {
				let beneosJournalEntry = null;
				let beneosCompendiumEntry = beneosPack.index.getName(beneosTokens[tokendata.btoken]["config"]["compendium"]);
				if (beneosCompendiumEntry && beneosCompendiumEntry._id) {
					beneosJournalEntry = beneosPack.getDocument(beneosCompendiumEntry._id);
				}
				if (beneosJournalEntry) {

					const beneosJournalDisplay =  await renderTemplate( 'modules/beneostokens/templates/beneosjournal.html', { beneosBasePath});
					html.find('div.left').append(beneosJournalDisplay);
					html.find('img.beneosJournalAction').click((event) => {
						event.preventDefault();
						beneosJournalEntry.then(function(result) {result.sheet.render(true)});
					});
				}
			}
		}

		//VARIANTS HUD

		if (beneosTokens[tokendata.btoken]["config"]["variants"] != undefined && Object.keys(beneosTokens[tokendata.btoken]["config"]["variants"]).length>0) {
			let beneosVariantsHUD = [];
			beneosVariantsHUD.push ({"name": "Default"});
			Object.entries(beneosTokens[tokendata.btoken]["config"]["variants"]).forEach(([key, value]) => {
				beneosVariantsHUD.push ({"name": key});
			});

			const beneosVariantsDisplay =  await renderTemplate('modules/beneostokens/templates/beneosvariants.html', { beneosBasePath, beneosVariantsHUD})

			if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso') return;

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
						token.document.setFlag("beneostokens", "variant" , beneosClickedButton.dataset.variant);
						setTimeout (function () {BeneosUpdateToken (token.id, "standing", {forceupdate:true})} ,1000);
					}
				}
			});
		}

	}

	// REPLACEMENT TOKEN HUD
	let beneosTokensHUD = [];
	Object.entries(beneosTokens).forEach(([key, value]) => {
		beneosTokensHUD.push ({"token": beneosBasePath + dataPath + "/" + key + '/' + key + "-idle_face_still.webp", 
    "name": key.replaceAll("_"," "), 'tokenvideo': beneosBasePath + dataPath + "/" + key + '/' + key + "-idle_face.webm"});
	});
	const beneosTokensDisplay =  await renderTemplate('modules/beneostokens/templates/beneoshud.html', { beneosBasePath, beneosTokensHUD})

	//if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations')  || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso') return;

	if (game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso') return;

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
				BeneosPreloadToken(token);
				beneosAnimations[token.id] = false;			
				setTimeout (function () {BeneosUpdateToken (token.id, "standing", {forceupdate:true})} ,1000);
			}
		}				
	});
})


