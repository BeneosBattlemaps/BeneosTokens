
/********************************************************************************** */
export class BeneosCompendiumReset extends FormApplication {
  
  /********************************************************************************** */
  async deleteCompendiumContent( comp ) {
    let pack = game.packs.get( comp )
    await pack.getIndex()
    for (let item of pack.index.contents) {
      let doc = await pack.getDocument(item._id)
      await doc.delete()
    }
    //console.log("PACK", pack)
  }

  /********************************************************************************** */
  async performReset() {
    ui.notifications.info("BeneosTokens : Cleanup of compendiums has started....")
    await this.deleteCompendiumContent( "beneostokens_beta.beneostokens_actors")
    await this.deleteCompendiumContent("beneostokens_beta.beneostokens_journal")
    ui.notifications.info("BeneosTokens : Cleanup of compendiums finished, reloading !")
    
    // Force reload
   // window.location.reload(true)
   BeneosCompendiumManager.buildDynamicCompendiums()
  
  }
  /********************************************************************************** */
  render() {
    this.performReset()
  }
}

/********************************************************************************** */
export class BeneosCompendiumManager {


  /********************************************************************************** */
  // Main root importer/builder function
  static async buildDynamicCompendiums() {
    ui.notifications.info("BeneosTokens : Compendium building .... !")

    // TODO - Get data token folder
    let tokenDataFolder = BENEOS_DEFAULT_TOKEN_PATH

    // get the packs to update/check
    let actorPack = game.packs.get("beneostokens_beta.beneostokens_actors")
    let journalPack = game.packs.get("beneostokens_beta.beneostokens_journal")

    await actorPack.configure({ locked: false })
    await journalPack.configure({ locked: false })
    actorPack.getIndex()
    journalPack.getIndex()

    // Parse subfolder
    let rootFolder = FilePicker.browse("data", tokenDataFolder)
    rootFolder.then(async resp => {
      for (var subFolder of resp.dirs) {

        let res = subFolder.match("/(\\d*)_")
        if (res && res[1]) {

          // Token config
          let key = subFolder.substring( subFolder.lastIndexOf("/") + 1 )
          let compName = ""
          //console.log("KEY", subFolder, key)
          try {
            let tokenJSON = await fetch(subFolder + "/tokenconfig_" + key + ".json")
            if ( tokenJSON ) {
              let recordsToken = await tokenJSON.json()
              for (let key in recordsToken) {
                beneosTokens[key] = duplicate(recordsToken[key])
              }
              compName = beneosTokens[key].config.compendium
            }
          }
          catch {
            console.log("Unable to found token config in", subFolder)
          }

          // Compendium building only if needed
          //let found = journalPack.index.contents.find(it => it.name.toLowerCase().includes( compName.toLowerCase() ) )
          //if (!found) {
            let dataFolder = await FilePicker.browse("data", subFolder)
            //console.log("Get subfolder", dataFolder)
            for (let filename of dataFolder.files) {              
              if (filename.toLowerCase().includes("actor_") && filename.toLowerCase().includes(".json")) {
                let r = await fetch(filename)
                let records = await r.json()
                records.img = this.replaceImgPath( dataFolder.target, records.img,false )
                records.token.img = this.replaceImgPath( dataFolder.target, records.token.img, true)
                this.replaceItemsPath( records )
                let actor = await Actor.create(records, { temporary: true })
                actorPack.importDocument(actor)
              }
              if (filename.toLowerCase().includes("journal_") && filename.toLowerCase().includes(".json")) {
                let r = await fetch(filename)
                let records = await r.json()
                records.img = this.replaceImgPath( dataFolder.target, records.img, false )
                records.content = this.replaceImgPathHTMLContent( dataFolder.target, records.content )
                let journal = await JournalEntry.create(records, { temporary: true })
                journalPack.importDocument(journal)
              }
            }
          //}
        }
      }
    })

    Promise.allSettled([rootFolder]).then(async (values) => {
      //await actorPack.configure({ locked: true })
      //await journalPack.configure({ locked: true })
      ui.notifications.info("BeneosTokens : Compendium building finished !")
    })
  }

  /********************************************************************************** */
  static replaceItemsPath( records) {
    for(let item of records.items) {      
      if (item.img && item.img.match("_ability_icons") ) {
        let filename = item.img.substring( item.img.lastIndexOf("/")+1 )
        item.img = BENEOS_DEFAULT_TOKEN_PATH + "/_ability_icons/" +  filename          
      }
    }
  }

  /********************************************************************************** */
  /** Replace the initial image from exported JSON to the new actual path */
  static replaceImgPathHTMLContent(currentFolder, content) {
    let res = content.match("img\\s+src=\"([\\w/\\.\\-]*)")
    if (res && res[1]) { // Image found !
      let filename = res[1].substring( res[1].lastIndexOf("/")+1 )
      filename = filename.replace(".gif", ".webm") // Patch to webm
      let newPath = currentFolder + "/" +  filename  
      let newContent = content.replace(res[1], newPath)
      return newContent
    }
    return content
  }

  /********************************************************************************** */
  /** Replace the initial image from exported JSON to the new actual path */
  static replaceImgPath(currentFolder, filepath, isToken) {
    let filename = filepath.substring( filepath.lastIndexOf("/")+1 )
    let newPath = currentFolder + ((isToken) ? "/top/": "/") + filename
    //console.log("Replaced", filepath, newPath)
    return newPath
  }
}