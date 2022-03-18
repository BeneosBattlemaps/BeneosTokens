
/********************************************************************************** */
export class BeneosCompendiumManager {


  /********************************************************************************** */
  // Main root importer/builder function
  static async buildDynamicCompendiums() {
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
          fetch(subFolder + "/tokenconfig_" + res[1] + ".json").then(r => r.json()).then(records => {
            for (let key in records) {
              beneosTokens[key] = duplicate(records[key])
            }
          })

          // Compendium building only if needed
          let found = actorPack.index.contents.find(it => it.name.includes(res[1]))
          if (!found) {
            let dataFolder = await FilePicker.browse("data", subFolder)
            //console.log("Get subfolder", dataFolder)
            for (let filename of dataFolder.files) {              
              if (filename.toLowerCase().includes("actor_") && filename.toLowerCase().includes(".json")) {
                let r = await fetch(filename)
                let records = await r.json()
                records.img = this.replaceImgPath( dataFolder.target, records.img,false )
                records.token.img = this.replaceImgPath( dataFolder.target, records.token.img, true)
                let actor = await Actor.create(records, { temporary: true })
                actorPack.importDocument(actor)
              }
              if (filename.toLowerCase().includes("journal_") && filename.toLowerCase().includes(".json")) {
                let r = await fetch(filename)
                let records = await r.json()
                console.log("Journal records", records)
                records.img = this.replaceImgPath( dataFolder.target, records.img, false )
                records.content = this.replaceImgPathHTMLContent( dataFolder.target, records.content )
                let journal = await JournalEntry.create(records, { temporary: true })
                journalPack.importDocument(journal)
              }
            }
          }
        }
      }
    })

    Promise.allSettled([rootFolder]).then(async (values) => {
      //await actorPack.configure({ locked: true })
      //await journalPack.configure({ locked: true })
      console.log("Folder parsing finished !")
    })
  }

  /********************************************************************************** */
  /** Replace the initial image from exported JSON to the new actual path */
  static replaceImgPathHTMLContent(currentFolder, content) {
    let res = content.match("img\\s+src=\"([\\w/\\.\\-]*)")
    if (res && res[1]) { // Image found !
      let filename = res[1].substring( res[1].lastIndexOf("/")+1 )
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
    console.log("Replaced", filepath, newPath)
    return newPath
  }
}