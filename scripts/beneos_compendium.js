/********************************************************************************** */
import { BeneosUtility } from "./beneos_utility.js";

/********************************************************************************** */
export class BeneosCompendiumReset extends FormApplication {

  /********************************************************************************** */
  async deleteCompendiumContent(comp) {
    let pack = game.packs.get(comp)
    await pack.getIndex()
    await pack.configure({ locked: false })

    for (let item of pack.index.contents) {
      let doc = await pack.getDocument(item._id)
      await doc.delete()
    }
    //console.log("PACK", pack)
  }

  /********************************************************************************** */
  async performReset() {
    ui.notifications.info("BeneosTokens : Cleanup of compendiums has started....")

    await this.deleteCompendiumContent("beneostokens.beneostokens_actors")
    await this.deleteCompendiumContent("beneostokens.beneostokens_journal")
    ui.notifications.info("BeneosTokens : Cleanup of compendiums finished.")

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
    ui.notifications.info("BeneosTokens : Compendium building .... Please wait !")

    BeneosUtility.resetTokenData()
    let tokenDataFolder = BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath()

    // get the packs to update/check
    let actorPack = game.packs.get("beneostokens.beneostokens_actors")
    let journalPack = game.packs.get("beneostokens.beneostokens_journal")
    await actorPack.getIndex()
    await journalPack.getIndex()

    await actorPack.configure({ locked: false })
    await journalPack.configure({ locked: false })

    // Parse subfolder
    let rootFolder = await FilePicker.browse("data", tokenDataFolder)
    for (let subFolder of rootFolder.dirs) {
      let res = subFolder.match("/(\\d*)_")
      if (res && res[1]) {

        // Token config
        let idleList = []
        let imgVideoList = []
        let currentId = ""
        let key = subFolder.substring(subFolder.lastIndexOf("/") + 1)
        //console.log("KEY", tokenKey, subFolder + "/tokenconfig_" + key + ".json")
        
        let JSONFilePath = subFolder + "/tokenconfig_" + key + ".json"
        try {
          let tokenJSON = await fetch( JSONFilePath )
          if (tokenJSON && tokenJSON.status == 200) {
            let recordsToken = await tokenJSON.json()
            if ( recordsToken){
              recordsToken.JSONFilePath = JSONFilePath // Auto-reference
              BeneosUtility.beneosTokens[key] = duplicate(recordsToken[key])
            } else {
              ui.notifications.warn("Warning ! Wrong token config for token " + key)
            }
          } else {
            if ( !key.match("000_") ) { 
              ui.notifications.warn("Warning ! Unable to fetch config for token " + key)
            }
          }
        } catch(error) {
          console.log("Warning ! Error in parsing JSON " + error, JSONFilePath)
        }

        let dataFolder = await FilePicker.browse("data", subFolder)        
        // Parse subfolders to build idle tokens list
        for (let subFolder2 of dataFolder.dirs) {
          let dataFolder2 = await FilePicker.browse("data", subFolder2)
          for (let filename of dataFolder2.files) {
            if (filename.toLowerCase().includes("idle_")) {
              idleList.push(filename)
            } 
            if (filename.toLowerCase().includes(".web") && !filename.toLowerCase().includes(".-preview")) {
              imgVideoList.push( filename)
            }
          }
        }
        // And root folder to get json definitions and additionnel idle tokens
        for (let filename of dataFolder.files) {
          if (filename.toLowerCase().includes("idle_")) {
            idleList.push(filename)
          }
          if (filename.toLowerCase().includes(".web") && !filename.toLowerCase().includes(".-preview")) {
            imgVideoList.push( filename)
          }
          if (filename.toLowerCase().includes("actor_") && filename.toLowerCase().includes(".json")) {
            let r = await fetch(filename)
            let records = await r.json()
            records.img = this.replaceImgPath(dataFolder.target, records.img, false)
            records.token.img = this.replaceImgPath(dataFolder.target, records.token.img, true)
            this.replaceItemsPath(records)
            let actor = await Actor.create(records, { temporary: true })
            let imported = await actorPack.importDocument(actor)
            //console.log("ACTOR IMPO", imported)
            currentId = imported.id
          }
          if (filename.toLowerCase().includes("journal_") && filename.toLowerCase().includes(".json")) {
            let r = await fetch(filename)
            let records = await r.json()
            records.img = this.replaceImgPath(dataFolder.target, records.img, false)
            records.content = this.replaceImgPathHTMLContent(dataFolder.target, records.content)
            let journal = await JournalEntry.create(records, { temporary: true })
            journalPack.importDocument(journal)
          }
        }
        if (key && BeneosUtility.beneosTokens[key]) {
          //console.log("Final IDLE list : ", idleList)
          BeneosUtility.beneosTokens[key].idleList = duplicate(idleList)
          BeneosUtility.beneosTokens[key].imgVideoList = duplicate(imgVideoList)
          BeneosUtility.beneosTokens[key].actorId = currentId
        }
      }
    }

    ui.notifications.info("BeneosTokens : Compendium building finished !")
    let toSave = JSON.stringify(BeneosUtility.beneosTokens)
    console.log("Saving data :", toSave)
    game.settings.set(BeneosUtility.moduleID(), 'beneos-json-tokenconfig', toSave) // Save the token config !

    await actorPack.configure({ locked: true })
    await journalPack.configure({ locked: true })
  }

  /********************************************************************************** */
  static replaceItemsPath(records) {
    for (let item of records.items) {
      if (item.img && item.img.match("_ability_icons")) {
        let filename = item.img.substring(item.img.lastIndexOf("/") + 1)
        item.img = BeneosUtility.getBasePath() + BeneosUtility.getBeneosDataPath() + "/_ability_icons/" + filename
      }
    }
  }

  /********************************************************************************** */
  /** Replace the initial image from exported JSON to the new actual path */
  static replaceImgPathHTMLContent(currentFolder, content) {
    let res = content.match("img\\s+src=\"([\\w/\\.\\-]*)\"")
    if (res && res[1]) { // Image found !
      let filename = res[1].substring(res[1].lastIndexOf("/") + 1)
      if (filename[2] == "_") { // No 3 digits in the preview file
        filename = "0" + filename
      }
      filename = filename.toLowerCase().replace(".gif", ".webm") // Patch to webm
      let newPath = currentFolder + "/" + filename

      let newContent = content.replace(res[1], newPath) // Replace filepath
      newContent = newContent.replace("width=\"673\" height=\"376\"", "") // Delete width/height gif
      newContent = newContent.replace("<img ", "<video autoplay=\"autoplay\" loop=\"loop\" width=\"674\" height=\"377\" ") // Replace img tag
      return newContent
    } else {
      let res = content.match("video\\s+src=\"([\\w/\\.\\-]*)\"")
      if (res && res[1]) {
        let filename = res[1].substring(res[1].lastIndexOf("/") + 1)
        if (filename[2] == "_") { // No 3 digits in the preview file
          filename = "0" + filename
        }
        let newPath = currentFolder + "/" + filename
        let newContent = content.replace(res[1], newPath) // Replace filepath
        return newContent
      }
    }
    return content
  }

  /********************************************************************************** */
  /** Replace the initial image from exported JSON to the new actual path */
  static replaceImgPath(currentFolder, filepath, isToken) {
    let filename = filepath.substring(filepath.lastIndexOf("/") + 1)
    let newPath = currentFolder + ((isToken) ? "/top/" : "/") + filename
    //console.log("Replaced", filepath, newPath)
    return newPath
  }
}