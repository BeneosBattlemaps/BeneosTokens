let	beneosFX = {
    "BFXShadow": [{
        filterType: "shadow",
        filterId: "BFXShadow",
        rotation: 35,
        blur: 2,
        quality: 5,
        distance: 20,
        alpha: 0.7,
        padding: 10,
        shadowOnly: false,
        color: 0x000000,
        animated: {
            blur: {active: true, loopDuration: 1500, animType: "syncCosOscillation", val1: 2, val2: 3},
            rotation: {active: true, loopDuration: 150, animType: "syncSinOscillation", val1: 33, val2: 35}
        }
    }],
    "BFXShadowDead": [{
        filterType: "shadow",
        filterId: "BFXShadowDead",
        rotation: 35,
        blur: 2,
        quality: 5,
        distance: 10,
        alpha: 1,
        padding: 20,
        shadowOnly: false,
        color: 0x000000,
        animated: {
            rotation: {active: true, loopDuration: 150, animType: "syncSinOscillation", val1: 33, val2: 35}
        }
    }],
    "BFXDeadRedBlood": [{
        filterType: "sprite",
        filterId: "BFXDeadRedBlood",
        eval_imagePath: "'__BENEOS_DATA_PATH__/000_module_assets/blood_splat_'+( (Math.floor(random()*7)+1))+'.webp'",
        gridPadding: 2,
        eval_scaleX: "0.5+random()",
        eval_scaleY: "0.5+random()",
        eval_rotation: "random()*360",
        colorize: false,
        inverse: true,
        top: false,
    }],
    "BFXDeadBlackBlood": [{
        filterType: "sprite",
        filterId: "BFXDeadBlackBlood",
        eval_imagePath: "'__BENEOS_DATA_PATH__/000_module_assets/blood_splat_black_'+( (Math.floor(random()*7)+1))+'.webp'",
        gridPadding: 2,
        eval_scaleX: "0.5+random()",
        eval_scaleY: "0.5+random()",
        eval_rotation: "random()*360",
        colorize: false,
        inverse: true,
        top: false,
    }],
    "BFXDeadBlueBlood": [{
        filterType: "sprite",
        filterId: "BFXDeadBlueBlood",
        eval_imagePath: "'__BENEOS_DATA_PATH__/000_module_assets/blood_blue_black_'+( (Math.floor(random()*7)+1))+'.webp'",
        gridPadding: 2,
        eval_scaleX: "0.5+random()",
        eval_scaleY: "0.5+random()",
        eval_rotation: "random()*360",
        colorize: false,
        inverse: true,
        top: false,
    }],
    "BFXDeadGreenBlood": [{
        filterType: "sprite",
        filterId: "BFXDeadGreenBlood",
        eval_imagePath: "'__BENEOS_DATA_PATH__/000_module_assets/blood_splat_green_'+( (Math.floor(random()*7)+1))+'.webp'",
        gridPadding: 2,
        eval_scaleX: "0.5+random()",
        eval_scaleY: "0.5+random()",
        eval_rotation: "random()*360",
        colorize: false,
        inverse: true,
        top: false,
    }],
    "BFXDeadYellowBlood": [{
        filterType: "sprite",
        filterId: "BFXDeadYellowBlood",
        eval_imagePath: "'__BENEOS_DATA_PATH__/000_module_assets/blood_splat_yellow_'+( (Math.floor(random()*7)+1))+'.webp'",
        gridPadding: 2,
        eval_scaleX: "0.5+random()",
        eval_scaleY: "0.5+random()",
        eval_rotation: "random()*360",
        colorize: false,
        inverse: true,
        top: false,
    }],
    "BFXDeadElectric": [{
        filterType: "electric",
        filterId: "BFXDeadElectric",
        color: 0xFFFFFF,
        time: 1,
        blend: 0,
        intensity: 1.5,
        animated: {
            time: {active: true, speed: 0.0020, animType: "move"},
            twRotation: {animType: "sinOscillation", val1: -90, val2: +90, loopDuration: 5000,}
        }
    }],
    "BFXGlow": [{
        filterType: "glow",
        filterId: "BFXGlow",
        outerStrength: 4,
        innerStrength: 1,
        color: 0x5099DD,
        quality: 0.5,
        padding: 1,
        animated: {
            color: {active: true, loopDuration: 1500, loops: 3, animType: "colorOscillation", val1: 0x5099DD, val2: 0x90EEFF}
        }
    }],
    "BFXRedGlow": [{
        filterType: "glow",
        filterId: "BFXGlow",
        outerStrength: 4,
        innerStrength: 1,
        color: 0x7f100a,
        quality: 0.5,
        padding: 1,
        animated: {
            color: {active: true, loopDuration: 1500, animType: "colorOscillation", val1: 0x7f100a, val2: 0xFF7970}
        }
    }],
    "BFXShine": [{
        filterType: "xbloom",
        filterId: "BFXShine",
        bloomScale: 0,
        brightness: 1,
        blur: 0.1,
        padding: 10,
        quality: 25,
        blendMode: 0,
        animated: {
            bloomScale: {active: true, loopDuration: 2000, animType: "syncCosOscillation", val1: 1, val2: 5.5},
        }
    }],
    "BFXGhost": [{
        filterType: "adjustment",
        filterId: "BFXGhost",
        saturation: 1,
        brightness: 1,
        contrast: 1,
        alpha: 1,
        animated: {alpha: {active: true, loopDuration: 2000, animType: "syncCosOscillation", val1: 0.55, val2: 0.85}}
    }],
    "DragonBlackVariant": [{
        filterType: "adjustment",
        filterId: "DragonBlackVariant",
        saturation: 0,
        brightness: 4,
        contrast: 1,
        gamma: 1,
        red: 0.1,
        green: 0.1,
        blue: 0.1,
    }],
    "DragonRedVariant": [{
        filterType: "adjustment",
        filterId: "DragonRedVariant",
        saturation: 0.9,
        brightness: 1.3,
        contrast: 0.9,
        gamma: 0.9,
        red: 0.8,
        green: 0.3,
        blue: 0.3,
    }],
    "DragonGreenVariant": [{
        filterType: "adjustment",
        filterId: "DragonGreenVariant",
        saturation: 1,
        brightness: 1.5,
        contrast: 0.9,
        gamma: 0.7,
        red: 0.3,
        green: 0.6,
        blue: 0.3,
    }],
    "DragonBlueVariant": [{
        filterType: "adjustment",
        filterId: "DragonBlueVariant",
        saturation: 1,
        brightness: 1,
        contrast: 1,
        gamma: 1,
        red: 0.1,
        green: 0.6,
        blue: 2,
    }],
    "DragonWhiteVariant": [{
        filterType: "adjustment",
        filterId: "DragonWhiteVariant",
        saturation: 0.2,
        brightness: 0.5,
        contrast: 1,
        gamma: 1,
        red: 4,
        green: 4,
        blue: 4,
    }],
    "DragonWhiteVariant2": [{
        filterType: "adjustment",
        filterId: "DragonWhiteVariant2",
        saturation: 0,
        brightness: 3,
        contrast: 0.9,
        gamma: 1,
        red: 0.75,
        green: 0.75,
        blue: 0.75,
    }],
    "DragonBrassVariant": [{
        filterType: "adjustment",
        filterId: "DragonBrassVariant",
        saturation: 0.64,
        brightness: 1.62,
        contrast: 1,
        gamma: 1,
        red: 0.71,
        green: 0.55,
        blue: 0.26,
    }],
    "DragonBronzeVariant": [{
        filterType: "adjustment",
        filterId: "DragonBronzeVariant",
        saturation: 0.76,
        brightness: 1.60,
        contrast: 1,
        gamma: 1,
        red: 0.8,
        green: 0.50,
        blue: 0.20,
    }],
    "DragonCopperVariant": [{
        filterType: "adjustment",
        filterId: "DragonCopperVariant",
        saturation: 0.72,
        brightness: 1.29,
        contrast: 1,
        gamma: 1,
        red: 0.72,
        green: 0.45,
        blue: 0.20,
    }],
    "DragonGoldVariant": [{
        filterType: "adjustment",
        filterId: "DragonGoldVariant",
        saturation: 1.74,
        brightness: 2.46,
        contrast: 1,
        gamma: 1,
        red: 0.83,
        green: 0.69,
        blue: 0.22,
    }],
    "DragonSilverVariant": [{
        filterType: "adjustment",
        filterId: "DragonSilverVariant",
        saturation: 0,
        brightness: 2,
        contrast: 1,
        gamma: 1,
        red: 0.75,
        green: 0.75,
        blue: 0.75,
    }],
    "DragonShadowVariant": [{
        filterType: "adjustment",
        filterId: "DragonShadowVariant",
        saturation: 0,
        brightness: 2,
        contrast: 1,
        gamma: 0.3,
        red: 0.75,
        green: 0.75,
        blue: 0.75,
    }],

}