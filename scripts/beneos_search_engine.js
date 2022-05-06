/********************************************************************************** */
const tokenDBURL = "https://raw.githubusercontent.com/BeneosBattlemaps/beneos-database/main/tokens/beneos_tokens_database.json"
const battlemapDBURL = "https://raw.githubusercontent.com/BeneosBattlemaps/beneos-database/main/battlemaps/beneos_battlemaps_database.json"

/********************************************************************************** */
class BeneosDatabaseHolder {

  /********************************************************************************** */
  static async loadDatabaseFiles() {
    let tokenData = await fetchJsonWithTimeout(tokenDBURL)
    this.tokenData = tokenData
    let bmapData = await fetchJsonWithTimeout(battlemapDBURL)
    this.bmapData = bmapData
    this.buildSearchData()
  }

  /********************************************************************************** */
  static buildList(list) {
    let valueList = {}

    if (typeof (list) == "string") {
      if (!valueList[list]) {
        valueList[list] = 1
      } else {
        valueList[list]++
      }
      return valueList
    }

    for (let key of list) {
      if (!valueList[key]) {
        valueList[key] = 1
      } else {
        valueList[key]++
      }
    }
    return valueList
  }

  /********************************************************************************** */
  static buildSearchData() {
    this.tokenTypes = {}
    this.biomList = {}
    this.fightingStyles = {}
    this.bmapBrightness = {}

    for (let key in this.tokenData.content) {
      let tokenData = this.tokenData.content[key]
      mergeObject(this.biomList, this.buildList(tokenData.properties.biom))
      mergeObject(this.tokenTypes, this.buildList(tokenData.properties.type))
      mergeObject(this.fightingStyles, this.buildList(tokenData.properties.fightingstyle))
    }
    for (let key in this.bmapData.content) {
      let bmapData = this.bmapData.content[key]
      mergeObject(this.biomList, this.buildList(bmapData.properties.biom))
      mergeObject(this.bmapBrightness, this.buildList(bmapData.properties.brightness))
    }
  }

  /********************************************************************************** */
  static fieldTextSearch(item, text) {
    for (let field in item) {
      let value = item[field]
      if (typeof (value) == "string") {
        if (value.toLowerCase().includes(text)) {
          return true
        }
      } else if (Array.isArray(value)) {
        for (let arrayValue of value) {
          if (typeof (arrayValue) == "string" && arrayValue.toLowerCase().includes(text)) {
            return true
          }
        }
      }
    }
    return false
  }

  /********************************************************************************** */
  static objectTextSearch(objectList, text, kind) {
    let results = []

    text = text.toLowerCase()

    for (let key in objectList) {
      let item = duplicate(objectList[key])
      item.kind = (kind == "token") ? "token" : item.properties.type
      if (this.fieldTextSearch(item, text)) {
        results.push(item)
      } else if (this.fieldTextSearch(item.properties, text)) {
        results.push(item)
      }
    }
    return results
  }

  /********************************************************************************** */
  static textSearch(text) {

    let results = this.objectTextSearch(this.tokenData.content, text, "token")
    results = results.concat(this.objectTextSearch(this.bmapData.content, text, "bmap"))

    console.log("TEXT results ", results, this.bmapData.content)
    return results
  }

  /********************************************************************************** */
  static searchByProperty(type, propertyName, value, searchResults) {
    let newResults = {}
    value = value.toLowerCase()

    for (let key in searchResults) {
      let item = searchResults[key]
      item.kind = (type == "token") ? "token" : item.properties.type
      if (item.properties && item.properties[propertyName]) {
        //console.log(item.properties[propertyName], typeof(item.properties[propertyName]))
        if (typeof (item.properties[propertyName]) == "string") {
          if (item.properties[propertyName].toLowerCase().includes(value)) {
            newResults[key] = duplicate(item)
          }
        } else {
          if (Array.isArray(item.properties[propertyName])) {
            for (let valueArray of item.properties[propertyName]) {
              if ((typeof (valueArray) == "string") && valueArray.toLowerCase().includes(value)) {
                newResults[key] = duplicate(item)
              }
            }
          }
        }
      }
    }
    return newResults
    //console.log("Found", searchResults)
  }

  /********************************************************************************** */
  static getAll(type) {
    return (type == "token") ? duplicate(this.tokenData.content) : duplicate(this.bmapData.content)
  }

  /********************************************************************************** */
  static getData() {
    return {
      searchToken: true,
      searchBmap: false,
      biomList: this.biomList,
      tokenTypes: this.tokenTypes,
      fightingStyles: this.fightingStyles,
      bmapBrightness: this.bmapBrightness
    }
  }
}

/********************************************************************************** */
export class BeneosSearchResults extends Dialog {

  /********************************************************************************** */
  constructor(html, launcher, data) {

    let myButtons = {
    }

    // Common conf
    let dialogConf = { content: html, title: "Beneos Search Results", buttons: myButtons };
    let dialogOptions = { classes: ["beneostokens"], left: 620, width: 240, height: 580, 'z-index': 99999 }
    super(dialogConf, dialogOptions)
  }

}

/********************************************************************************** */
export class BeneosSearchEngine extends Dialog {

  /********************************************************************************** */
  constructor(html, data) {

    let myButtons = {
      //closeButton: { label: "Close", callback: html => this.close() }
    }

    // Common conf
    let dialogConf = { content: html, title: "Beneos Search Engine", buttons: myButtons };
    let dialogOptions = { classes: ["beneostokens"], left: 200, width: 400, height: 300, 'z-index': 99999 }
    super(dialogConf, dialogOptions)

    this.dbData = data
    this.dbData.searchToken = true
    this.dbData.searchBmap = false
  }

  /********************************************************************************** */
  close() {
    if (this.resultDialog) {
      this.resultDialog.close()
    }
    super.close()
  }


  /********************************************************************************** */
  async displayResults(results, event = undefined) {
    if (results.length == 0) {
      results.push({ name: "No results" })
    }

    let html = await renderTemplate('modules/beneostokens_beta/templates/beneossearchresults.html', { results: results })
    if (!this.resultDialog) {
      this.resultDialog = new BeneosSearchResults(html, this, results)
    } else {
      this.resultDialog.data.content = html
    }
    this.resultDialog.render(true)
  }

  /********************************************************************************** */
  processTextSearch(event) {
    console.log("Text change", event.currentTarget.value)
    if (event.currentTarget.value && event.currentTarget.value.length >= 3) {
      let results = BeneosDatabaseHolder.textSearch(event.currentTarget.value)

      this.displayResults(results, event)
    }
  }

  /********************************************************************************** */
  async updateContent() {
    let html = await renderTemplate('modules/beneostokens_beta/templates/beneossearchengine.html', this.dbData)
    this.data.content = html
    this.render(true)
  }

  /********************************************************************************** */
  processSelectorSearch() {
    let type = (this.dbData.searchToken) ? "token" : "bmap"
    let searchResults = BeneosDatabaseHolder.getAll(type)

    let biomValue = $("#bioms-selector").val()
    if (biomValue && biomValue.toLowerCase() != "any") {
      searchResults = BeneosDatabaseHolder.searchByProperty(type, "biom", biomValue, searchResults)
    }
    let brightnessValue = $("#bmap-brightness").val()
    if (brightnessValue && brightnessValue.toLowerCase() != "any") {
      searchResults = BeneosDatabaseHolder.searchByProperty(type, "brightness", brightnessValue, searchResults)
    }
    let typeValue = $("#token-types").val()
    if (typeValue && typeValue.toLowerCase() != "any") {
      searchResults = BeneosDatabaseHolder.searchByProperty(type, "type", typeValue, searchResults)
    }
    let fightValue = $("#token-fight-style").val()
    if (fightValue && fightValue.toLowerCase() != "any") {
      searchResults = BeneosDatabaseHolder.searchByProperty(type, "fightingstyle", fightValue, searchResults)
    }

    this.displayResults(searchResults)
  }

  /********************************************************************************** */
  updateSelector(event) {
    let myObject = this

    clearTimeout(myObject.timeout)
    myObject.timeout = setTimeout(function () {
      myObject.processSelectorSearch(event)
    }, 800)
  }

  /********************************************************************************** */
  activateListeners() {

    let myObject = this
1
    $("#beneos-search-text").keyup(event => {
      clearTimeout(myObject.timeout)
      myObject.timeout = setTimeout(function () {
        myObject.processTextSearch(event)
      }, 600)
    })
    $("#beneos-radio-token").click(event => {
      this.dbData.searchToken = $(event.currentTarget).val()
      this.dbData.searchBmap = !this.dbData.searchToken
      this.updateContent()
      this.updateSelector(event)
    })

    $("#beneos-radio-bmap").click(event => {
      this.dbData.searchBmap = $(event.currentTarget).val()
      this.dbData.searchToken = !this.dbData.searchBmap
      this.updateContent()
      this.updateSelector(event)
    })

    $(".beneos-selector").change(event => {
      this.updateSelector(event)
    })
  }

}

/********************************************************************************** */
export class BeneosSearchEngineLauncher extends FormApplication {

  /********************************************************************************** */
  async render() {

    await BeneosDatabaseHolder.loadDatabaseFiles()
    let dbData = BeneosDatabaseHolder.getData()

    let html = await renderTemplate('modules/beneostokens_beta/templates/beneossearchengine.html', dbData)
    let searchDialog = new BeneosSearchEngine(html, dbData)
    searchDialog.render(true)
  }

}
