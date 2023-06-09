import * as https from 'https'
import * as cheerio from'cheerio'
import * as fs from 'fs'
import * as path from 'path'
import cla from 'command-line-args'

const scheme = "https://"
const address = "marlinfw.org"
const slug = "/meta/gcode/"
const baseUrl = scheme + address

const outputDir = "out"
const cacheDir = path.join(outputDir, "cache")

const optionDefinitions = [
    { name: 'cache', alias: 'c', type: Boolean },
    { name: 'use-cache', alias: 'u', type: Boolean}
]
const options = cla(optionDefinitions)

go().then(d => {
    const converted = splitData(d)
    if(!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)
    for (const codeType in converted) {
        fs.writeFileSync(path.join(outputDir,`${codeType}.marlin.cncc.json`), JSON.stringify(converted[codeType], null, 2))
    }
})

async function go() {
    const indexPage = await getHtml(baseUrl + slug)
    const codes = scrapeIndexPage(indexPage)
    for (const f in codes) {
        const codePage = await getHtml(baseUrl + codes[f]._link)
        const codeData = scrapeCodePage(codePage)
        for (const cf in codeData) {
            codes[f][cf] = codeData[cf]
        }
    }

    stripfields(codes)
    return codes
}

function splitData(data) {
    const res = {}
    for (const key in data) {
        const letter = key[0].toLowerCase()
        if (!res[letter]) res[letter] = {}
        if (!res[letter].codes) res[letter].codes = {}
        res[letter].codes[key] = data[key]
    }
    return res
}

export function arrayToMap(arr, keySelector) {
    const result = {};
    arr.forEach(element => {
        const fieldName = element[keySelector]
        result[fieldName] = element
    });
    return result;
}

function repeatCommaSeperatedRecords(record, keySelector) {
    const key = record[keySelector]
    if (!key.includes(',')) return []

    const result = []
    const newKeys = key.split(',').map(i => i.trim())

    for (const newKey of newKeys) {
        const newObj = {}
        newObj[keySelector] = newKey
        result.push({...record, ...newObj})
    }

    return result
}

function padTo(str, len) {
    if (str.length >= len) return str
    else return padTo(`0${str}`, len)
}

function repeatRangeOfRecords(record, keySelector) {
    const rangedKey = record[keySelector]
    const regex = /^(?<letterCode>[MGT])(?<rangeStart>\d+)-[MGT](?<rangeEnd>\d+)$/
    if (!regex.test(rangedKey)) return []

    const result = []
    const regexResult = regex.exec(rangedKey)
    const rangeStart = parseInt(regexResult.groups.rangeStart)
    const rangeEnd = parseInt(regexResult.groups.rangeEnd)
    const letterCode = regexResult.groups.letterCode
    for (let index = rangeStart; index <= rangeEnd; index++) {
        const newObj = {}
        const indexStr = padTo(index.toString(), 2)
        const newKey = `${letterCode}${indexStr}`
        newObj[keySelector] = newKey
        result.push({...record, ...newObj})
    }

    return result
}

export function repeatEntries(arr, keySelector) {
    const result = []

    arr.forEach(el => {
        const key = el[keySelector]
        const oldLen = result.length
        const newItems = result.push(
            ...repeatCommaSeperatedRecords(el, keySelector),
            ...repeatRangeOfRecords(el, keySelector)
        )

        if (result.length === oldLen) result.push(el)
    })

    return result;
}

export function stripfields(obj) {
    if (typeof obj !== 'object') return

    for (const f in obj) {
        if (f[0] === '_') delete obj[f]
        else stripfields(obj[f])
    }
}

function scrapeCodePage(pageHtml) {
    const $ = cheerio.load(pageHtml)

    const data = $.extract({
        category: {
            selector: '.detail-header>span.label-default',
            value: (el, _) => el.children[1].data.trim()
        },
        desc: 'div.row.long>p',
        parameters: [{
            selector: 'div.row.params tr',
            value: {
                _name: {
                    selector: 'td.arg>code',
                    value: (el, _) => {
                        const txt = el.firstChild.data.trim()
                        if (txt[0] === '[') return txt[1]
                        else return txt[0]
                    }
                },
                shortDesc: 'td>p',
                optional: {
                    selector: 'td.arg>code',
                    value: (el, _) => el.firstChild.data.trim()[0] === '['
                }
            }
        }]
    })

    data.parameters = arrayToMap(data.parameters, '_name')

    return data
}

function scrapeIndexPage(pageHtml) {

    const $ = cheerio.load(pageHtml)

    const data = $.extract(
        {
            codes : [{
                selector:'li.tocify-item',
                value: {
                    _code:{
                        selector:'a>strong',
                        value: "innerText"
                    },
                    shortDesc:{
                        selector:'a',
                        value: (el, _) => el.children[1].data.substring(2)
                    },
                    _link:{
                        selector:'a',
                        value:(el, _) => el.attribs.href
                    }
                }
            }]
        }
    )

    return arrayToMap(repeatEntries(data.codes, '_code'), '_code')
}

export function urlAsFileName(url) {
    return url
      .replaceAll('/', '_FSLASH_')
      .replaceAll(':', '_COLON_')
      .replaceAll('.', '_DOT_')
}

function getHtml(url) {
    if (options['use-cache']) {
        return readFromCache(url)
    } else {
        return makeRequest(url)
    }
}

function readFromCache(url) {
    process.stdout.write(`Getting ${url} from cache...`)
    const filename = urlAsFileName(url)
    if (fs.existsSync(path.join(cacheDir, filename))) {
        const data = fs.readFileSync(path.join(cacheDir, filename))
        process.stdout.write('Done \n')
        return data
    } else {
        process.stdout.write('Not found \n')
        return makeRequest(url)
    }
    throw new Error("Not implemeted")
}

function makeRequest(url) {
    process.stdout.write(`GET ${url} ...`)
    return new Promise((resolve, reject) => {
        https
          .get(url, resp => {
              let data = "";

              resp.on("data", chunk => {
                  data += chunk;
              });

              resp.on("end", () => {
                  process.stdout.write(`Done ${resp.statusCode} `)
                  if (options.cache) {
                      const filename = urlAsFileName(url)
                      if(!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, {recursive:true})
                      fs.writeFileSync(path.join(cacheDir, filename), data)
                      process.stdout.write('Written to cache')
                  }
                  process.stdout.write('\n')
                  resolve(data);
              });
          })
          .on("error", err => {
              reject(err.message);
          });
    })
}
