import fs from 'fs'
import { fromKana } from 'hepburn';
import * as OpenCC from 'opencc-js';
import { pinyin } from 'pinyin-pro';

const LANG_TO_REGEXES = {
    'all': {
        'replace': [
            /[\(|（|（][^\)|）|）]*[）|）\)]/gu,
            /^\s+/gu,
            /\s+$/gu,
            /^(fc|fk|sk) /gu,
            / (fc|fk|sk)$/gu,
            /[’\.\-]+/gu
        ],
        'invalid': [
            /[0-9一二两三四五六七八九十零千百]+/gu
        ]
    },
    'ko': {
        'invalid': [
            /[^\p{sc=Hangul}\s]+/gu,
            /(어|인|강|구|시|산|주|역)$/gu,
        ],
        'by-type': {
            'place': {
                'invalid': [
                    /(어|인|강|구|시|산|주|역)$/gu,
                ]
            }
        }
    },
    'latin': {
        'invalid': [
            /[^\p{sc=Latin}\s']+/gu
        ]
    },
    'cyrillic': {
        'invalid': [
            /[^\p{sc=Cyrillic}\s']+/gu
        ]
    },
    'lv': {
        'invalid': [
            /[xyqw]+/gu
        ]
    },
    'ja': {
        'replace': [
            /^・+/gu,
            /・+$/gu,
        ],
        'invalid': [
            /.+の.+/gu,
            /(港|人|川|語|国|城|圏|郷|地|区|村|化|日|岸|民|市|館|行|駅|島)$/gu
        ],
        'by-type': {
            'place': {
                'invalid': [
                    /.+の.+/gu,
                    /(港|人|川|語|国|城|圏|郷|地|区|村|化|日|岸|民|市|館|行|駅|島)$/gu
                ]
            }
        }
    },
    'zh': {
        'replace': [
            /^·+/gu,
            /·+$/gu,
        ],
        'invalid': [
            /[^\p{sc=Han}·]+/gu,
            /(鎮|海|学|區|河|港|人|川|語|国|元|徽|场|语|湖|路|党|化|堡|城|站|湾|宮|区|岛|市|會|團|镇|宫|会|团|學|國|場|黨|灣|島)$/gu
        ],
        'by-type': {
            'place': {
                'invalid': [
                    /(鎮|海|学|區|河|港|人|川|語|国|元|徽|场|语|湖|路|党|化|堡|城|站|湾|宮|区|岛|市|會|團|镇|宫|会|团|學|國|場|黨|灣|島)$/gu
                ]
            }
        }
    }
};
const LANG_CATEGORIES_REVERSE = {
    'latin': [
        'de', 'en', 'es', 'fr', 'it', 'lv', 'pl', 'pt', 'ro'
    ],
    'cyrillic': [
        'ru'
    ],
}
const SPLITTERS = {
    'default': /\s+/g,
    'zh': '·',
    'ja': '・'
}
const DIRNAME = './1-input-files'
const OUTPUT_DIRNAME = './2-cleared'
const MAX_LENGTH = 999;

async function genCategories() {
    const res = {};
    for (let cat of Object.keys(LANG_CATEGORIES_REVERSE)) {
        for (let item of LANG_CATEGORIES_REVERSE[cat]) {
            if (res[item] === undefined) res[item] = []
            res[item].push(cat)
        }
    }

    return res;
}
const LANG_CATEGORIES = await genCategories()

import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import { transliterate } from 'transliteration';
const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());

async function classifyFiles(dirname) {
    const filenames = fs.readdirSync(dirname);
    const result = {};
    const regex = /([a-z]*)_([a-z]*)_.*/gm;

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
        if (splitTwo.length === 2 || splitTwo.length === 1) {
            res.push(splitTwo)
        }
    }

    return res;
}

async function clearString(lang, string, isPerson) {
    let categories = ['all'];
    if (LANG_CATEGORIES[lang]) categories = categories.concat(LANG_CATEGORIES[lang])
    categories.push(lang)
    let tmpStr = string;
    
    for (let cat of categories) {
        if (LANG_TO_REGEXES[cat]) {
            if (LANG_TO_REGEXES[cat]['replace']) {
                for (let regex of LANG_TO_REGEXES[cat]['replace']) {
                    tmpStr = tmpStr.replaceAll(regex, '')
                }
            }
        }
    }

    return tmpStr;
}

async function isStringValid(lang, string, isPerson) {
    let categories = ['all'];
    if (LANG_CATEGORIES[lang]) categories = categories.concat(LANG_CATEGORIES[lang])
    categories.push(lang)
    
    let isValid = true;
    for (let cat of categories) {
        if (isValid && LANG_TO_REGEXES[cat]) {
            if (LANG_TO_REGEXES[cat]['invalid']) {
                for (let regex of LANG_TO_REGEXES[cat]['invalid']) {
                    regex.lastIndex = 0;
                    if (isValid) {
                        const match = string.match(regex);
    
                        if (match !== null) isValid = false;
                    }
                }
            }
            if (isValid && !isPerson && LANG_TO_REGEXES[cat]['by-type'] && LANG_TO_REGEXES[cat]['by-type']['place'] && LANG_TO_REGEXES[cat]['by-type']['place']['invalid']) {
                for (let regex of LANG_TO_REGEXES[cat]['by-type']['place']['invalid']) {
                    regex.lastIndex = 0;
                    if (isValid) {
                        const match = string.match(regex);
    
                        if (match !== null) isValid = false;
                    }
                }
            }
        }
    }

    return isValid;
}

async function processPairs(inpLang, outLang, pairs, filename) {
    const newPairs = [];
    const isPerson = filename.includes('person');

    let foundNonSingular = false;
    for (let i = 0; i < pairs.length; i++) {
        if (inpLang === 'zh') {
            pairs[i][0] = zhSimplify(pairs[i][0]);
        }
        if (outLang === 'zh' && pairs[i][1]) {
            pairs[i][1] = zhSimplify(pairs[i][1]);
        }

        if (pairs[i][1]) {
            foundNonSingular = true;
        }
    }

    if (!foundNonSingular) {
        for (let pair of pairs) {
            pair[0] = await clearString(outLang, pair[0].toLowerCase(), isPerson)
    
            if (!(await isStringValid(outLang, pair[0], isPerson))) {
                continue;
            }
            if (pair[0].length > MAX_LENGTH) continue;
            if (inpLang === outLang && (inpLang === 'ko' || inpLang === 'zh') && isPerson) {
                if (pair[0].length === 3) {
                    newPairs.push([pair[0][0]]);
                    newPairs.push([pair[0].slice(1)]);
                    continue;
                }
            }
            if (inpLang === 'ja' && isPerson && pair[1] === undefined) {
                const splitOut = pair[0].split(SPLITTERS[outLang] ?? SPLITTERS.default);
                if (!splitOut[1] && pair[0].length >= 3) {
                    if (!pair[0].slice(0,2).match(/[^\p{sc=Han}]/ug)) {
                        pairs.push([pair[0].slice(0, 2), 'MODIFIED']);
                        pairs.push([pair[0].slice(2), 'MODIFIED'])
                        continue;
                    } else if (!pair[0].slice(-2).match(/[^\p{sc=Han}]/ug)) {
                        pairs.push([pair[0].slice(0, pair[0].length - 2), 'MODIFIED']);
                        pairs.push([pair[0].slice(-2), 'MODIFIED']);
                        continue;
                    }
                }
            }
            if (inpLang === 'ja') {
                pair[0] = await kuroshiro.convert(pair[0], { to: "katakana" });

                if (pair[0].match(/[^ァ-・ー]+/gu)) continue;
            }
            newPairs.push([pair[0]]);
        }

        return newPairs;
    }

    for (let pair of pairs) {
        if (!pair[1]) continue;

        pair[0] = await clearString(inpLang, pair[0].toLowerCase(), isPerson)
        pair[1] = await clearString(outLang, pair[1].toLowerCase(), isPerson)

        if (inpLang === 'ko' && (outLang === 'ja' || outLang === 'zh') && isPerson && pair[2] === undefined) {
            const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS.default);
            if (pair[0].length === 3) {
                if (splitOut[1]) {
                    pairs.push([pair[0][0], splitOut[0], 'MODIFIED']);
                    pairs.push([pair[0].slice(1), splitOut[1], 'MODIFIED'])
                    continue;
                } else if (splitOut[0].length === 3) {
                    pairs.push([pair[0][0], splitOut[0][0], 'MODIFIED']);
                    pairs.push([pair[0].slice(1), splitOut[0].slice(1), 'MODIFIED'])
                    continue;
                }
            }
        }
        if (inpLang === 'ja' && outLang === 'zh' && isPerson && pair[2] === undefined) {
            const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS.default);
            if (pair[0].length >= 3) {
                if (!pair[0].slice(0,2).match(/[^\p{sc=Han}]/ug)) {
                    if (splitOut[1]) {
                        pairs.push([pair[0].slice(0, 2), splitOut[0], 'MODIFIED']);
                        pairs.push([pair[0].slice(2), splitOut[1], 'MODIFIED'])
                    } else {
                        pairs.push([pair[0].slice(0, 2), pair[1].slice(0, 2), 'MODIFIED']);
                        pairs.push([pair[0].slice(2), pair[1].slice(2), 'MODIFIED'])
                    }
                    continue;
                } else if (!pair[0].slice(-2).match(/[^\p{sc=Han}]/ug)) {
                    if (splitOut[1]) {
                        pairs.push([pair[0].slice(0, pair[0].length - 2), splitOut[0], 'MODIFIED']);
                        pairs.push([pair[0].slice(-2), splitOut[1], 'MODIFIED']);
                    } else {
                        pairs.push([pair[0].slice(0, pair[0].length - 2), pair[1].slice(0, pair[1].length - 2), 'MODIFIED']);
                        pairs.push([pair[0].slice(-2), pair[1].slice(-2), 'MODIFIED']);
                    }
                    continue;
                }
            }
        }
        if (isPerson && inpLang === 'ru') {
            const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS.default);
            const regexOne = /"(.*), (.*) (.*)"/gu
            const regexTwo = /(.*) (.*) (.*)/gu
            const matchOne = regexOne.exec(pair[0])
            const matchTwo = regexTwo.exec(pair[0])
            if (splitOut.length !== 3 && matchOne) {
                pair[0] = `${matchOne[2]} ${matchOne[1]}`;
            } else if (splitOut.length !== 3 && matchTwo) {
                pair[0] = `${matchTwo[1]} ${matchTwo[3]}`;
            }
        }
        if (inpLang === 'zh' && outLang === 'ja' && isPerson && pair[2] === undefined) {
            const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS.default);
            if (pair[0].length === 3) {
                if (splitOut[1]) {
                    pairs.push([pair[0][0], splitOut[0], 'MODIFIED']);
                    pairs.push([pair[0].slice(1), splitOut[1], 'MODIFIED']);
                } else {
                    pairs.push([pair[0][0], pair[1][0], 'MODIFIED']);
                    pairs.push([pair[0].slice(1), pair[1].slice(1), 'MODIFIED']);
                }
                continue;
            }
        }
        if (inpLang === 'zh' && outLang === 'ko' && isPerson && pair[2] === undefined) {
            if (pair[0].length === 3 || pair[0].length === 2) {
                pairs.push([pair[0][0], pair[1][0], 'MODIFIED']);
                pairs.push([pair[0].slice(1), pair[1].slice(1), 'MODIFIED']);
                continue;
            }
        }
        if (inpLang === 'ja' && outLang === 'ko' && isPerson && pair[2] === undefined) {
            const splitOut = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS.default);
            if (splitOut[1]) {
                if (!pair[0].slice(0,2).match(/[^\p{sc=Han}]/ug)) {
                    pairs.push([pair[0].slice(0, 2), splitOut[0], 'MODIFIED']);
                    pairs.push([pair[0].slice(2), splitOut[1], 'MODIFIED'])
                    continue;
                } else if (pair[0].length > 3 && !pair[0].slice(-2).match(/[^\p{sc=Han}]/ug)) {
                    pairs.push([pair[0].slice(0, pair[0].length - 2), splitOut[0], 'MODIFIED']);
                    pairs.push([pair[0].slice(-2), splitOut[1], 'MODIFIED']);
                    continue;
                } else if (pair[0].length === 2) {
                    pairs.push([pair[0][0], splitOut[0], 'MODIFIED']);
                    pairs.push([pair[0][1], splitOut[1], 'MODIFIED']);
                    continue;
                }
            }
        }
        if (!(await isStringValid(inpLang, pair[0], isPerson))) continue;
        if (!(await isStringValid(outLang, pair[1], isPerson))) continue;

        if (inpLang === 'ja') pair[0] = await kuroshiro.convert(pair[0], { to: "katakana" });
        if (outLang === 'ja') pair[1] = await kuroshiro.convert(pair[1], { to: "katakana" });

        if (inpLang === 'ja' && pair[0].match(/[^ァ-・ー]+/gu)) continue;
        if (outLang === 'ja' && pair[1].match(/[^ァ-・ー]+/gu)) continue;

        const inpSplit = pair[0].split(SPLITTERS[inpLang] ?? SPLITTERS['default'])
        const outSplit = pair[1].split(SPLITTERS[outLang] ?? SPLITTERS['default'])

        if (inpSplit.length !== outSplit.length) continue;
        if (pair[0].length > MAX_LENGTH || pair[1].length > MAX_LENGTH) continue;

        pair[0] = pair[0].trim();
        pair[1] = pair[1].trim();

        newPairs.push(pair);
    }

    return newPairs;
}

const converter = OpenCC.Converter({ from: 'hk', to: 'cn' });

function zhSimplify(word) {
    return converter(word);
}

async function processFiles() {
    const keys = {};
    for (let outLang of Object.keys(FILES)) {
        let resForLang = {};
        for (let inpLang of Object.keys(FILES[outLang])) {
            if (resForLang[inpLang] === undefined) resForLang[inpLang] = [];
            for (let filename of FILES[outLang][inpLang]) {
                let pairs = await getPairs(`${DIRNAME}/${filename}`);
                pairs = await processPairs(inpLang, outLang, pairs, filename);

                resForLang[inpLang] = resForLang[inpLang].concat(pairs)
            }
        }

        for (let inpLang of Object.keys(resForLang)) {
            const lines = []
            const usedKeys = {}
            for (let pair of resForLang[inpLang]) {
                if (inpLang === 'zh') {
                    pair.push(pinyin(pair[0]))
                } else if (outLang === 'zh' && outLang !== inpLang && pair[1]) {
                    pair.push(pinyin(pair[1]))
                }
                if (inpLang === 'ja') {
                    pair.push(fromKana(pair[0]).toLowerCase())
                } else if (outLang === 'ja' && outLang !== inpLang && pair[1]) {
                    pair.push(fromKana(pair[1]).toLowerCase())
                }
                if (inpLang === 'ko') {
                    pair.push(transliterate(pair[0]))
                } else if (outLang === 'ko' && outLang !== inpLang && pair[1]) {
                    pair.push(transliterate(pair[1]))
                }
                if (usedKeys[pair[0]]) continue;
                const joined = pair.join(',');
                if (!lines.includes(joined)) {
                    usedKeys[pair[0]] = 1;
                    lines.push(joined)
                }
            }
            fs.writeFileSync(`${OUTPUT_DIRNAME}/${outLang}_${inpLang}.csv`, lines.join("\n"))
        }
    }
}

processFiles()