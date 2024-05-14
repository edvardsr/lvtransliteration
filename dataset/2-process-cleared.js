import fs from 'fs'
import { fromKana } from 'hepburn';

const SPLITTERS = {
    'default': /\s+/g,
    'zh': '·',
    'ja': '・'
}
const DIRNAME = './2-cleared'
const OUTPUT_DIRNAME = './3-keys'
const OUTPUT_DIRNAME_KEY_VAL = './3-keys-with-values'

import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import { transliterate } from 'transliteration';
const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());

async function classifyFiles(dirname) {
    const filenames = fs.readdirSync(dirname);
    const result = {};
    const regex = /([a-z]*)_([a-z]*).*/gm;

    for (let filename of filenames) {
        try {
            regex.lastIndex = 0;
            const split = regex.exec(filename);

            if (!split) throw filename;
            if (!split || split[2] === undefined) throw 'a';

            const [originalFilename, outLang, inpLang] = split;

            if (result[outLang] === undefined) result[outLang] = {}
            if (result[outLang][inpLang] === undefined) result[outLang][inpLang] = []
            result[outLang][inpLang].push(originalFilename);
        } catch (e) {
            if (e !== 'a') throw e;
        }
    }

    return result;
}
const FILES = await classifyFiles(DIRNAME)

async function getPairs(filename) {
    const split = fs.readFileSync(filename).toString().split("\n");
    const res = [];
    for (let item of split) {
        const splitTwo = item.split(',');
        if (splitTwo.length) {
            res.push(splitTwo);
        }
    }

    return res;
}

async function processFiles() {
    const keys = {};
    for (let outLang of Object.keys(FILES)) {
        let resForLang = {};
        for (let inpLang of Object.keys(FILES[outLang])) {
            if (resForLang[inpLang] === undefined) resForLang[inpLang] = [];
            for (let filename of FILES[outLang][inpLang]) {
                let pairs = await getPairs(`${DIRNAME}/${filename}`);
        
                resForLang[inpLang] = resForLang[inpLang].concat(pairs)
            }
        }

        for (let inpLang of Object.keys(resForLang)) {
            const keys = {}
            const lines = []
            const keyLines = []
            for (let pair of resForLang[inpLang]) {
                const splitInp = pair[0].split(SPLITTERS[inpLang] ?? SPLITTERS['default']);
                if (pair[0] === '') continue;
                if (inpLang !== outLang) {
                    const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS['default']);
                    for (let i = 0; i < splitInp.length; i++) {
                        if (splitInp[i] && splitOut[i]) {
                            splitInp[i] = splitInp[i].trim();
                            splitOut[i] = splitOut[i].trim();
                            if (keys[splitInp[i]] === undefined) keys[splitInp[i]] = {}
                            keys[splitInp[i]][splitOut[i]] = keys[splitInp[i]][splitOut[i]] ? keys[splitInp[i]][splitOut[i]] + 1 : 1;
                        }
                    }
                } else {
                    for (let i = 0; i < splitInp.length; i++) {
                        if (splitInp[i]) {
                            splitInp[i] = splitInp[i].trim();
                            if (keys[splitInp[i]] === undefined) keys[splitInp[i]] = 1
                        }
                    }
                }
            }
            if (inpLang !== outLang) {
                for (const inputKey of Object.keys(keys)) {
                    if (!inputKey) continue;
            
                    let maxItem = ''
                    let maxValue = 0
                    for (const maxKey of Object.keys(keys[inputKey])) {
                        if (keys[inputKey][maxKey] > maxValue) {
                            maxValue = keys[inputKey][maxKey]
                            maxItem = maxKey
                        }
                    }

                    if (!maxItem.length) continue;

                    const forLine = [inputKey, maxItem];
                    const transliterated = [inputKey, maxItem];
                    if (inpLang === 'ru') {
                        transliterated[0] = transliterate(inputKey);
                        forLine.push(transliterated[0]);
                    }
                    if (inpLang === 'ja') {
                        transliterated[0] = fromKana(inputKey).toLowerCase();
                        forLine.push(transliterated[0]);
                    }
                    if (outLang === 'ko' && outLang !== inpLang) {
                        transliterated[1] = transliterate(maxItem);
                        forLine.push(transliterated[1]);
                    }

                    const joined = forLine.join(',');
                    if (joined.length && !lines.includes(joined)) {
                        lines.push(joined)
                    }
                    if (!keyLines.includes(inputKey)) {
                        keyLines.push(inputKey)
                    }
                }
            } else {
                for (const inputKey of Object.keys(keys)) {
                    if (!inputKey) continue;

                    const forLine = [inputKey, inputKey];
                    const joined = forLine.join(',');
                    if (!lines.includes(joined)) {
                        lines.push(joined)
                    }
                    if (!keyLines.includes(inputKey)) {
                        keyLines.push(inputKey)
                    }
                }
            }

            fs.writeFileSync(`${OUTPUT_DIRNAME}/${outLang}_${inpLang}.csv`, keyLines.join("\n"))
            fs.writeFileSync(`${OUTPUT_DIRNAME_KEY_VAL}/${outLang}_${inpLang}.csv`, lines.join("\n"))
        }
    }
}

processFiles()