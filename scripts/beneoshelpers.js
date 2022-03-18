/********************************************************************************** */
// Constants and globals
const BENEOS_MODULE_NAME = "Beneos Tokens"
const BENEOS_MODULE_ID = "beneostokens_beta"
const BENEOS_DEFAULT_TOKEN_PATH = "beneostokens_data/"

let beneosDebug = true
let beneosAnimations = new Object
let beneosFadingSteps = 10
let beneosFadingWait = 30
let beneosFadingTime = beneosFadingSteps * beneosFadingWait
let beneosBasePath = ""
let beneosHealth = []
let beneosPreload = []
let m_w = 123456789
let m_z = 987654321
let mask = 0xffffffff

/********************************************************************************** */
// Prepare seed for random
function seed(i) {
    m_w = (123456789 + i) & mask;
    m_z = (987654321 - i) & mask;
}

/********************************************************************************** */
//Random function better than the default rand.
function random()  {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    let result = ((m_z << 16) + (m_w & 65535)) >>> 0;
    result /= 4294967296;
    return result;
}


/********************************************************************************** */
//Check if an image exist.
//TODO: improve it so the request is done in a better way.
function BeneosCheckImageExists(imagefile) {
    let req = new XMLHttpRequest();
    req.open('HEAD', imagefile, false);
    req.send();
    if (req.status==200) {
        return true;
    }
    if (beneosDebug) console.log ("[BENEOS TOKENS] "+imagefile + " does not exist");
    return false;
}

/********************************************************************************** */
// Checks if the token image is inside the beneos tokens module
function BeneosCheckIsBeneosToken(token) {

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
//Foundry default get token give errors from time to time. It's better to get them directly from de canvas.
function BeneosGetToken(tokenid) {
    for (i in canvas.tokens.placeables)  {
        token = canvas.tokens.placeables[i];
        if (token !== undefined && ("id" in token) && token.id == tokenid) {
            return token;
        }
    }
    return null;
}


/********************************************************************************** */
// Function to add FX from the Token Magic module or from the ones defined in the configuration files.
async function BeneosAddFx (token , bfx, replace = true) {
    if (!game.dnd5e) { return}
    if (typeof TokenMagic !== 'undefined') {
        let bpresets = [];

        let flag = token.document.getFlag('beneostokens','variant');
        if (flag != undefined && flag != "Default") {
            let tokendata = BeneosGetTokenImageInfo (token);
            bfx= bfx.concat(beneosTokens[tokendata.btoken]["config"]["variants"][flag])
        }

        $.each(bfx, function( index, value ) {
            let bfxid = value;
            let effect = TokenMagic.getPreset(bfxid);
            if (effect !== undefined) {
                if (beneosDebug) {console.log ("[BENEOS TOKENS] Setting Library FX: " + bfxid);}
                $.each(effect, function( presetindex, pressetvalue ) {
                    bpresets.push(pressetvalue);
                });
            } else {
                if (beneosFX[bfxid] !== undefined) {
                    if (beneosDebug) {console.log ("[BENEOS TOKENS] Setting Beneos FX: " + bfxid);}
                    $.each(beneosFX[bfxid], function( presetindex, pressetvalue ) {
                        $.each(pressetvalue, function( kid, kidvalue ) {
                            if (kid.indexOf("eval_") != -1) {
                                newkid = kid.replace("eval_","");
                                pressetvalue[newkid] = eval (kidvalue);
                            };
                        });
                        bpresets.push(pressetvalue);
                    });
                }
            }

        });
        token.TMFXaddFilters(bpresets, replace);
    }
}

/********************************************************************************** */
//Function to change the token animations
function BeneosChangeanimation (token, animation, tkscale, tkangle, tkalpha, tkanimtime, bfx, fading) {
    if (!BeneosCheckImageExists(animation)) {
        if (beneosDebug) console.log ("[BENEOS TOKENS] Image does not exists:" + animation);
        return;
    }

    if (beneosDebug) console.log ("[BENEOS TOKENS] Changing to image:" + animation);

    // If there's any other animations playing we will not replace it.
    if (beneosAnimations[token.id] != false) {
        if (beneosDebug) console.log ("[BENEOS TOKENS] Token is busy:" + animation);
        return;
    }

    token.data.img = animation;
    token.img = animation;
    beneosAnimations[token.id] = true;
    token.document.update({img: animation, scale: tkscale, rotation: tkangle, data: {img: animation}});
    BeneosAddFx (token, bfx, true);

    setTimeout(function() { if (beneosDebug) console.log("[BENEOS TOKENS] Finished changing animation: " + animation); token.document.update({img: animation, scale: tkscale, rotation: tkangle, data: {img: animation}}); beneosAnimations[token.id] = false}, tkanimtime - 10);
}

/********************************************************************************** */
//Retrieves the necessary data from a token in order to be able to fire automatic animations based on the current token image file.
function BeneosGetTokenImageInfo(token) {

    let variant = game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview')

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
    let bindex = apath.indexOf( BENEOS_DEFAULT_TOKEN_PATH )
    let btoken = apath[bindex + 2].toLowerCase();
    let path = beneosBasePath + apath[bindex - 1] + "/" + apath[bindex] + "/" + apath[bindex + 1] + "/";
    let subpath = btoken + "/" + variant + "/";
    let filename = apath[apath.length - 1];

    index = filename.lastIndexOf("-") + 1;
    let basefilename = filename.substr(0,index-1);
    let animation = filename.substr(index);
    let index3 = animation.lastIndexOf("_");
    let index4 = animation.lastIndexOf(".");
    let currentstatus = animation.substr(0, index3);

    let extension = animation.substr(index4+1);

    // Auto-fix with new path settings -> TODO
    if (path == undefined) path = ""
    if (subpath == undefined) subpath = ""

    let dataPath = {"id" : token.id, "path": BENEOS_DEFAULT_TOKEN_PATH, "subpath": subpath, "currentstatus" : currentstatus, "basefilename" : basefilename, "variant" : variant, "extension" : extension, "btoken" : btoken};
    console.log("Datapath found :", dataPath)
    return dataPath

}

/********************************************************************************** */
// Function to force update the renewal of beneos tokens in a scene.
function UpdateBeneosSceneTokens() {
    for (i in canvas.tokens.placeables)  {
        token = canvas.tokens.placeables[i];
        if (token !== undefined && ("id" in token)) {
            BeneosPreloadToken(token);
            if (beneosDebug) console.log("[BENEOS TOKENS] Force updating " + token.id);
            beneosAnimations[token.id] = false;
            BeneosUpdateToken (token.id, "standing", {forceupdate:true});
        }
    }
}

/********************************************************************************** */
// Function made for be able to read the action fired and make it compatible with EasyRolls and MIDI-QOL
function BeneosGetAction (message, tokendata) {

    let action = null;
    let actionType = null;
    let checkActionType = true;

    if (typeof BetterRolls !== 'undefined') {
        if (message.data.flags == undefined || message.data.flags.betterrolls5e == undefined || message.data.flags.betterrolls5e.entries == undefined) return action;
        action = message.data.flags.betterrolls5e.entries[0].title;
        checkActionType = false;
    } else {
        tmpaction = message.data.flavor.split(" - ");
        action = tmpaction[0].trim();
        if (message.data.flags.dnd5e != undefined && message.data.flags.dnd5e.roll != undefined) {
            actionType = message.data.flags.dnd5e.roll.type;
        } else {
            flags= message.data.flags;
            if (typeof (MidiQOL) !== 'undefined' && flags["midi-qol"] != undefined && flags["midi-qol"].type != undefined) {

                switch (flags["midi-qol"].type) {
                    case 1:
                        actionType ="hits";
                        break
                    case 2:
                        actionType ="saves";
                        break;
                    case 3:
                        actionType ="attack";
                        break;
                    case 4:
                        actionType ="damage";
                        break;
                    case 0:
                        actionType ="item";
                        break;
                }
            } else {
                switch (message.data.type) {
                    case 1:
                        actionType ="ooc";
                        break
                    case 2:
                        actionType ="ic";
                        break;
                    case 3:
                        actionType ="emote";
                        break;
                    case 4:
                        actionType ="whisper";
                        break;
                    case 0:
                        actionType ="other";
                        break;
                }
            }
        }
    }

    if (!beneosTokens[tokendata.btoken][tokendata.variant].hasOwnProperty(action)) return null;

    if (checkActionType && beneosTokens[tokendata.btoken][tokendata.variant][action]["actionType"] && beneosTokens[tokendata.btoken][tokendata.variant][action]["actionType"] != actionType) {
        return null;
    }

    return action;
}

/********************************************************************************** */
//Function that preloads token animations. We need to do it to prevent the "scale not found" error in Foundry
function BeneosPreloadToken(token) {
    let tokendata = BeneosGetTokenImageInfo(token);

    if (typeof(beneosTokens[tokendata.btoken]) == "undefined") {
        if (beneosDebug) console.log("[BENEOS TOKENS] Config not found");
        return;
    }

    if (typeof(beneosTokens[tokendata.btoken][tokendata.variant]) == "undefined") {
        if (beneosDebug) console.log("[BENEOS TOKENS] Variant not found");
        return;
    }

    Object.keys(beneosTokens[tokendata.btoken][tokendata.variant]).forEach(key => {
        if (key == "dead") {
            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + beneosTokens[tokendata.btoken][tokendata.variant][key]["a"] + "_" + tokendata.variant + ".webp";
            if (beneosPreload[finalimage] == undefined) {
                if (beneosDebug) console.log("[BENEOS TOKENS] Preloaded "+finalimage);
                BeneosPreloadImage(finalimage);
                beneosPreload[finalimage] = true;
            }
        } else {
            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + beneosTokens[tokendata.btoken][tokendata.variant][key]["a"] + "_" + tokendata.variant + ".webm";
            if (beneosPreload[finalimage] == undefined) {
                if (beneosDebug) console.log("[BENEOS TOKENS] Preloaded "+finalimage);
                BeneosPreloadVideo(finalimage);
                beneosPreload[finalimage] = true;
            }
        }

    });

}

/********************************************************************************** */
function BeneosPreloadImage(finalimage) {
    TextureLoader.loader.loadImageTexture (finalimage);
}

/********************************************************************************** */
function BeneosPreloadVideo(finalimage) {
    TextureLoader.loader.loadVideoTexture (finalimage);
}

/********************************************************************************** */
// Main function that allows to control the automatic animations and decide which animations has to be shown.
function  BeneosUpdateToken (tokenid, BeneosUpdateAction, BeneosExtraData) {


    if (!game.settings.get(BENEOS_MODULE_ID, 'beneos-animations') || game.settings.get(BENEOS_MODULE_ID, 'beneos-tokenview') == 'iso') return;


    if (beneosAnimations[tokenid]) {if (beneosDebug) console.log("[BENEOS TOKENS] Token is busy");return;}

    token = BeneosGetToken(tokenid);
    if (token === null || token == undefined) return;
    actor = token.actor;
    if (actor === null || actor == undefined) return;
    actorData = actor.data;
    if (actorData === null || actorData == undefined) return;
    if (!BeneosCheckIsBeneosToken(token)) {if (beneosDebug) console.log("[BENEOS TOKENS] Not Beneos"); return;}

    let tokendata = BeneosGetTokenImageInfo (token);

    if (game.settings.get(BENEOS_MODULE_ID, 'beneos-forcefacetoken')) {
        finalimage = tokendata.path + tokendata.basefilename + "/" + tokendata.basefilename + "-idle_face" + ".webm";
        canvas.scene.updateEmbeddedDocuments("Token",[({_id: token.id, img: finalimage, scale: 1, rotation: 0})]);
        if (actor.data.type == "character") { actor.update({'token.img': finalimage});}
        return;
    }

    if (typeof(beneosTokens[tokendata.btoken]) == "undefined") {if (beneosDebug) console.log("[BENEOS TOKENS] Config not found"); return;}
    if (typeof(beneosTokens[tokendata.btoken][tokendata.variant]) == "undefined") {if (beneosDebug) console.log("[BENEOS TOKENS] Variant not found"); return;}

    let benVariant = beneosTokens[tokendata.btoken][tokendata.variant];

    attributes = actorData.data.attributes;
    if (attributes == "undefined") {if (beneosDebug)  console.log("[BENEOS TOKENS] No attributes"); return;}

    let hp = attributes.hp.value;
    let benRotation =0;
    let benAlpha = 1;




    if (hp == "undefined") {if (beneosDebug)  console.log("[BENEOS TOKENS] No hp");return;}

    beneosHealth[token.id] = hp;
    if (token.data.rotation != undefined) {benRotation = token.data.rotation}
    if (token.data.alpha != undefined) {benAlpha = token.data.alpha};
    let scaleFactor = token.data.document.getFlag(BENEOS_MODULE_ID,"scalefactor");
    if (!scaleFactor) {
        scaleFactor = beneosTokens[tokendata.btoken].config["scalefactor"];
        token.data.document.setFlag(BENEOS_MODULE_ID, "scalefactor", scaleFactor);
    }
    if ("forceupdate" in BeneosExtraData) beneosAnimations[token.id] = false;

    switch (BeneosUpdateAction) {
        case "hit":
            if (typeof(benVariant["hit"]) != "undefined") {
                if (beneosDebug)  console.log("[BENEOS TOKENS] Hit");
                if (tokendata.currentstatus != benVariant["hit"]["a"] || ("forceupdate" in BeneosExtraData)) {
                    let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["hit"]["a"] + "_" + tokendata.variant + ".webm";
                    BeneosChangeanimation (token, finalimage, benVariant["hit"]["s"] * scaleFactor, benRotation,  benAlpha, benVariant["hit"]["t"],benVariant["hit"]["fx"], true);
                    setTimeout(function () {BeneosUpdateToken (tokenid, "standing", {forceupdate: true});}, benVariant["hit"]["t"] + (beneosFadingTime *2));
                }
            }
            break;
        case "move":
            if (beneosDebug)  console.log("[BENEOS TOKENS] Move");
            if (typeof(benVariant["move"]) != "undefined") {
                if (tokendata.currentstatus != benVariant["move"]["a"] || ("forceupdate" in BeneosExtraData)) {
                    let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["move"]["a"] + "_" + tokendata.variant + ".webm";
                    let ray = token._movement;
                    let instantTeleport = Math.max(Math.abs(ray.dx), Math.abs(ray.dy)) <= canvas.grid.size;
                    let mvtime = (ray.distance * 1000) / (canvas.dimensions.size * game.settings.get(BENEOS_MODULE_ID, 'beneos-speed'));
                    let mvangle = (Math.atan2(token._velocity.dy, token._velocity.dx,token._velocity.dx)/ (Math.PI / 180)) - 90;

                    if (instantTeleport) {
                        canvas.scene.updateEmbeddedDocuments("Token",[({_id: token.id, rotation: mvangle})]);
                        return;
                    }
                    beneosAnimations[token.id] = false
                    BeneosChangeanimation (token, finalimage, benVariant["move"]["s"] * scaleFactor, mvangle,  benAlpha, mvtime,benVariant["move"]["fx"], false);
                    setTimeout(function () {BeneosUpdateToken (tokenid, "standing", {forceupdate:true});}, mvtime+100);
                }
            }
            break;
        case "heal":
            beneosAnimations[tokenid] = true;
            if (beneosDebug) console.log("[BENEOS TOKENS] Healing");
            BeneosAddFx (token, ["BFXGlow","BFXShine"], true);
            setTimeout(function() {beneosAnimations[tokenid] = false; BeneosUpdateToken (token.id, "standing", {forceupdate:true});},3000);
            break;
        case "standing":

            if (beneosDebug)  console.log("[BENEOS TOKENS] Standing with hp " + beneosHealth[token.id]);
            if (beneosHealth[token.id] > 0 || !game.dnd5e) {
                if (token.inCombat) {
                    if (beneosDebug)  console.log("[BENEOS TOKENS] In Combat");
                    if (typeof(benVariant["combat_idle"]) != "undefined") {
                        if (tokendata.currentstatus != benVariant["combat_idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["combat_idle"]["a"] + "_" + tokendata.variant + ".webm";
                            BeneosChangeanimation (token, finalimage, benVariant["combat_idle"]["s"] * scaleFactor, benRotation,  benAlpha, benVariant["combat_idle"]["t"],benVariant["combat_idle"]["fx"], true);
                        }
                    }
                } else {
                    if (beneosDebug)  console.log("[BENEOS TOKENS] Idle");
                    if (typeof(benVariant["idle"]) != "undefined") {
                        if (tokendata.currentstatus != benVariant["idle"]["a"] || ("forceupdate" in BeneosExtraData)) {
                            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["idle"]["a"] + "_" + tokendata.variant + ".webm";
                            BeneosChangeanimation (token, finalimage, benVariant["idle"]["s"] * scaleFactor, benRotation, benAlpha, benVariant["idle"]["t"],benVariant["idle"]["fx"], true);
                        }
                    }
                }
            } else {
                if (beneosDebug)  console.log("[BENEOS TOKENS] Dead");
                if (typeof(benVariant["die"]) != "undefined") {
                    if ((tokendata.currentstatus != benVariant["die"]["a"] &&  tokendata.currentstatus != benVariant["dead"]["a"]) || ("forceupdate" in BeneosExtraData)) {
                        if (tokendata.extension != "webp" ) {
                            let idToken = token.id;
                            let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["die"]["a"] + "_" + tokendata.variant + ".webm";
                            BeneosChangeanimation (token, finalimage, benVariant["die"]["s"] * scaleFactor, benRotation,  benAlpha, benVariant["die"]["t"],benVariant["die"]["fx"], true);
                            setTimeout(function () {
                                token = BeneosGetToken(idToken);
                                finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant["dead"]["a"] + "_" + tokendata.variant + ".webp";
                                BeneosChangeanimation (token, finalimage, benVariant["dead"]["s"] * scaleFactor, benRotation,  benAlpha, benVariant["dead"]["t"],benVariant["dead"]["fx"], false);
                            }, benVariant["die"]["t"]);
                        } else {
                            if ("forceupdate" in BeneosExtraData) {
                                BeneosAddFx(token, benVariant["dead"]["fx"]);
                            }
                        }
                    }
                }
            }
            break;
        case "action":
            let action = BeneosGetAction (BeneosExtraData["action"], tokendata);
            if (!action) return;
            if (beneosDebug) console.log("[BENEOS TOKENS] Action: " + action);
            if (benVariant.hasOwnProperty(action)) {
                if (beneosDebug)  console.log("[BENEOS TOKENS] Action found");
                if (typeof(benVariant[action]) != "undefined") {
                    if (tokendata.currentstatus != benVariant[action]["a"] || ("forceupdate" in BeneosExtraData)) {
                        let finalimage = tokendata.path + tokendata.subpath + tokendata.basefilename + "-" + benVariant[action]["a"] + "_" + tokendata.variant + ".webm";
                        BeneosChangeanimation (token, finalimage, benVariant[action]["s"] * scaleFactor, benRotation,  benAlpha, benVariant[action]["t"],benVariant[action]["fx"], true);
                        setTimeout(function () {BeneosUpdateToken (tokenid, "standing", {forceupdate: true});}, benVariant[action]["t"] + (beneosFadingTime *2));
                    }
                }
            }
            break;
    }

}